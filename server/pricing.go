package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"
)

const dateLayout = "2006-01-02"

type bookingProperty struct {
	ID           string
	EmpresaID    string
	Capacity     int
	MinStay      int
	DailyPrice   sql.NullFloat64
	WeekendPrice sql.NullFloat64
	CleaningFee  sql.NullFloat64
	Checkin      sql.NullString
	Checkout     sql.NullString
}

type stayPackage struct {
	Name  string
	Start time.Time
	End   time.Time // data de saída: intervalo [Start, End)
	Price float64
}

type quotePackage struct {
	Name  string  `json:"name"`
	Start string  `json:"start"`
	End   string  `json:"end"`
	Price float64 `json:"price"`
}

type stayQuote struct {
	Nights        int            `json:"nights"`
	MinStay       int            `json:"minStay"`
	RegularNights int            `json:"regularNights"`
	DailySubtotal float64        `json:"dailySubtotal"`
	Packages      []quotePackage `json:"packages"`
	CleaningFee   float64        `json:"cleaningFee"`
	Total         *float64       `json:"total"`
}

type occupiedPeriod struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type availabilityResponse struct {
	MinStay  int              `json:"minStay"`
	Occupied []occupiedPeriod `json:"occupied"`
	Packages []quotePackage   `json:"packages"`
}

func (a *App) loadBookingProperty(r *http.Request, id, whatsapp string) (bookingProperty, error) {
	var out bookingProperty
	out.ID = id
	var capacidade, minStay sql.NullInt64
	err := a.DB().QueryRowContext(r.Context(), `
		SELECT empresa_id::text, capacidade, estadia_minima,
		       valor_diaria, valor_diaria_fim_semana, taxa_limpeza,
		       checkin_padrao::text, checkout_padrao::text
		FROM imoveis WHERE id = $1::uuid AND status = 'ATIVO'`, id).Scan(
		&out.EmpresaID, &capacidade, &minStay,
		&out.DailyPrice, &out.WeekendPrice, &out.CleaningFee,
		&out.Checkin, &out.Checkout,
	)
	if err != nil {
		return out, err
	}
	out.Capacity = int(capacidade.Int64)
	out.MinStay = max(1, int(minStay.Int64))
	if strings.TrimSpace(whatsapp) != "" {
		owner, ok := a.resolveEmpresa(r, whatsapp)
		if !ok || owner != out.EmpresaID {
			return bookingProperty{}, sql.ErrNoRows
		}
	}
	return out, nil
}

func writeBookingPropertyError(w http.ResponseWriter, err error) {
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	respondError(w, err)
}

func parseStayDates(entrada, saida string) (time.Time, time.Time, error) {
	start, err := time.Parse(dateLayout, strings.TrimSpace(entrada))
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("data de entrada inválida")
	}
	end, err := time.Parse(dateLayout, strings.TrimSpace(saida))
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("data de saída inválida")
	}
	if !end.After(start) {
		return time.Time{}, time.Time{}, errors.New("a saída deve ser após a entrada")
	}
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.Local
	}
	if start.Format(dateLayout) < time.Now().In(loc).Format(dateLayout) {
		return time.Time{}, time.Time{}, errors.New("a entrada não pode ser no passado")
	}
	return start, end, nil
}

func dateOnly(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}

// calculateStayQuote aplica cada pacote integral quando a seleção ocupa ao
// menos uma noite do seu período. O valor do pacote já inclui limpeza.
// Noites fora de pacotes usam a diária comum ou de sexta/sábado.
func calculateStayQuote(property bookingProperty, packages []stayPackage, start, end time.Time) (stayQuote, error) {
	quote := stayQuote{
		Nights:   int(end.Sub(start).Hours() / 24),
		MinStay:  property.MinStay,
		Packages: []quotePackage{},
	}
	if quote.Nights <= 0 {
		return quote, errors.New("período inválido")
	}

	sort.Slice(packages, func(i, j int) bool { return packages[i].Start.Before(packages[j].Start) })
	var applied []stayPackage
	packageTotal := 0.0
	for _, raw := range packages {
		p := raw
		p.Start, p.End = dateOnly(p.Start), dateOnly(p.End)
		if !p.Start.Before(end) || !p.End.After(start) {
			continue
		}
		if !p.End.After(p.Start) || p.Price <= 0 {
			return quote, errors.New("pacote com datas ou valor inválidos")
		}
		if len(applied) > 0 && applied[len(applied)-1].End.After(p.Start) {
			return quote, errors.New("pacotes sobrepostos no imóvel")
		}
		applied = append(applied, p)
		quote.Packages = append(quote.Packages, quotePackage{
			Name: p.Name, Start: p.Start.Format(dateLayout), End: p.End.Format(dateLayout), Price: roundMoney(p.Price),
		})
		packageTotal += p.Price
	}

	knownPrice := true
	for day := start; day.Before(end); day = day.AddDate(0, 0, 1) {
		covered := false
		for _, p := range applied {
			if !day.Before(p.Start) && day.Before(p.End) {
				covered = true
				break
			}
		}
		if covered {
			continue
		}
		quote.RegularNights++
		rate := property.DailyPrice.Float64
		if (day.Weekday() == time.Friday || day.Weekday() == time.Saturday) && property.WeekendPrice.Valid && property.WeekendPrice.Float64 > 0 {
			rate = property.WeekendPrice.Float64
		}
		if rate <= 0 {
			knownPrice = false
			continue
		}
		quote.DailySubtotal += rate
	}
	quote.DailySubtotal = roundMoney(quote.DailySubtotal)
	if len(applied) == 0 && property.CleaningFee.Valid && property.CleaningFee.Float64 > 0 {
		quote.CleaningFee = roundMoney(property.CleaningFee.Float64)
	}
	if knownPrice {
		total := roundMoney(packageTotal + quote.DailySubtotal + quote.CleaningFee)
		quote.Total = &total
	}
	return quote, nil
}

func (a *App) loadStayPackages(ctx context.Context, property bookingProperty, start, end time.Time) ([]stayPackage, error) {
	rows, err := a.DB().QueryContext(ctx, `
		SELECT coalesce(nome, ''), data_inicio, data_fim, valor_pacote
		FROM imovel_pacotes
		WHERE imovel_id = $1::uuid AND empresa_id = $2::uuid
		  AND data_inicio < $4::date AND data_fim > $3::date
		ORDER BY data_inicio, data_fim`, property.ID, property.EmpresaID,
		start.Format(dateLayout), end.Format(dateLayout))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var packages []stayPackage
	for rows.Next() {
		var p stayPackage
		if err := rows.Scan(&p.Name, &p.Start, &p.End, &p.Price); err != nil {
			return nil, err
		}
		packages = append(packages, p)
	}
	return packages, rows.Err()
}

func (a *App) quoteStay(ctx context.Context, property bookingProperty, start, end time.Time) (stayQuote, error) {
	packages, err := a.loadStayPackages(ctx, property, start, end)
	if err != nil {
		return stayQuote{}, err
	}
	return calculateStayQuote(property, packages, start, end)
}

func (a *App) hasBookingConflict(ctx context.Context, property bookingProperty, start, end time.Time) (bool, error) {
	entrada := mergeTime(start, property.Checkin.String, "14:00")
	saida := mergeTime(end, property.Checkout.String, "11:00")
	var exists bool
	err := a.DB().QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM reservas
			WHERE empresa_id = $1::uuid AND imovel_id = $2::uuid
			  AND status IN ('PRE_RESERVA', 'CONFIRMADA', 'HOSPEDADO', 'BLOQUEIO')
			  AND entrada < $4::timestamp AND saida > $3::timestamp
		)`, property.EmpresaID, property.ID, entrada, saida).Scan(&exists)
	return exists, err
}

func (a *App) getAvailability(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}
	id := r.PathValue("id")
	if !isUUID(id) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	property, err := a.loadBookingProperty(r, id, r.URL.Query().Get("whatsapp"))
	if err != nil {
		writeBookingPropertyError(w, err)
		return
	}
	response := availabilityResponse{MinStay: property.MinStay, Occupied: []occupiedPeriod{}, Packages: []quotePackage{}}
	rows, err := a.DB().QueryContext(r.Context(), `
		SELECT to_char(entrada::date, 'YYYY-MM-DD'), to_char(saida::date, 'YYYY-MM-DD')
		FROM reservas
		WHERE empresa_id = $1::uuid AND imovel_id = $2::uuid
		  AND status IN ('PRE_RESERVA', 'CONFIRMADA', 'HOSPEDADO', 'BLOQUEIO')
		  AND saida::date >= CURRENT_DATE
		ORDER BY entrada`, property.EmpresaID, property.ID)
	if err != nil {
		respondError(w, err)
		return
	}
	for rows.Next() {
		var period occupiedPeriod
		if err := rows.Scan(&period.Start, &period.End); err != nil {
			rows.Close()
			respondError(w, err)
			return
		}
		response.Occupied = append(response.Occupied, period)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		respondError(w, err)
		return
	}
	today, _ := time.Parse(dateLayout, time.Now().Format(dateLayout))
	packages, err := a.loadStayPackages(r.Context(), property, today, today.AddDate(2, 0, 0))
	if err != nil {
		respondError(w, err)
		return
	}
	for _, p := range packages {
		response.Packages = append(response.Packages, quotePackage{
			Name: p.Name, Start: p.Start.Format(dateLayout), End: p.End.Format(dateLayout), Price: roundMoney(p.Price),
		})
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, response)
}

func (a *App) getStayQuote(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}
	id := r.PathValue("id")
	if !isUUID(id) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	start, end, err := parseStayDates(r.URL.Query().Get("entrada"), r.URL.Query().Get("saida"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	property, err := a.loadBookingProperty(r, id, r.URL.Query().Get("whatsapp"))
	if err != nil {
		writeBookingPropertyError(w, err)
		return
	}
	nights := int(end.Sub(start).Hours() / 24)
	if nights < property.MinStay {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error": fmt.Sprintf("A estadia mínima é de %d noite(s).", property.MinStay), "minStay": property.MinStay,
		})
		return
	}
	conflict, err := a.hasBookingConflict(r.Context(), property, start, end)
	if err != nil {
		respondError(w, err)
		return
	}
	if conflict {
		writeJSON(w, http.StatusConflict, map[string]any{"error": "Esse período desejado já está reservado!", "conflict": true})
		return
	}
	quote, err := a.quoteStay(r.Context(), property, start, end)
	if err != nil {
		respondError(w, err)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, quote)
}
