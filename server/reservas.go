package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"
)

// statusPreReserva é o status gravado em reservas.status para toda
// pré-reserva feita pelo site (antes da confirmação pelo WhatsApp).
// Valor conforme o CHECK constraint do banco do app (exibido lá como
// "Pré Reserva").
const statusPreReserva = "PRE_RESERVA"

// statusCancelada é o status gravado ao cancelar uma pré-reserva pelo site.
const statusCancelada = "CANCELADA"

// ReservaInput é o payload do site para criar uma pré-reserva.
type ReservaInput struct {
	ImovelID        string  `json:"imovelId"`
	ClienteID       string  `json:"clienteId"`
	EmpresaWhatsApp string  `json:"empresa"`
	Entrada         string  `json:"entrada"` // YYYY-MM-DD
	Saida           string  `json:"saida"`   // YYYY-MM-DD
	Hospedes        int     `json:"hospedes"`
	ValorDiaria     float64 `json:"valorDiaria"`
	TaxaLimpeza     float64 `json:"taxaLimpeza"`
	ValorTotal      float64 `json:"valorTotal"`
	Observacoes     string  `json:"observacoes"`
}

// createReserva grava a pré-reserva feita no site na tabela compartilhada
// com o app (CRUD Reservas), com status fixo PRE RESERVA e origem fixa =
// nome do site. Entrada/saída usam os horários de check-in/out padrão do
// imóvel (fallback 14:00 / 11:00), no fuso local do servidor.
func (a *App) createReserva(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}

	var input ReservaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo inválido"})
		return
	}

	if !isUUID(input.ImovelID) || !isUUID(input.ClienteID) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "imóvel ou cliente inválido"})
		return
	}

	entrada, saida, err := parseStayDates(input.Entrada, input.Saida)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if input.Hospedes < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "quantidade de hóspedes inválida"})
		return
	}

	property, err := a.loadBookingProperty(r, input.ImovelID, input.EmpresaWhatsApp)
	if err != nil {
		writeBookingPropertyError(w, err)
		return
	}
	if input.Hospedes > property.Capacity {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "quantidade de hóspedes acima da capacidade do imóvel"})
		return
	}
	noites := int(saida.Sub(entrada).Hours() / 24)
	if noites < property.MinStay {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error": fmt.Sprintf("A estadia mínima é de %d noite(s).", property.MinStay), "minStay": property.MinStay,
		})
		return
	}

	// Cliente deve pertencer à mesma empresa.
	var clienteEmpresa string
	err = a.DB().QueryRowContext(r.Context(), `
		SELECT empresa_id::text FROM clientes WHERE id = $1::uuid`, input.ClienteID).Scan(&clienteEmpresa)
	if err == sql.ErrNoRows || (err == nil && clienteEmpresa != property.EmpresaID) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cliente inválido"})
		return
	}
	if err != nil {
		respondError(w, err)
		return
	}

	// Horários de check-in/out: os do imóvel, ou 14:00 / 11:00.
	entradaTS := mergeTime(entrada, property.Checkin.String, "14:00")
	saidaTS := mergeTime(saida, property.Checkout.String, "11:00")

	// Período livre? ORCAMENTO, FINALIZADA e CANCELADA não ocupam o imóvel.
	conflict, err := a.hasBookingConflict(r.Context(), property, entrada, saida)
	if err != nil {
		respondError(w, err)
		return
	}
	if conflict {
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":    "Esse período desejado já está reservado!",
			"conflict": true,
		})
		return
	}

	// O banco do sistema de locação é a fonte do preço. Nunca aceita
	// valorDiaria/taxaLimpeza/valorTotal enviados pelo navegador.
	quote, err := a.quoteStay(r.Context(), property, entrada, saida)
	if err != nil {
		respondError(w, err)
		return
	}
	if quote.Total != nil && input.ValorTotal > 0 && math.Abs(input.ValorTotal-*quote.Total) > 0.01 {
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":        "O preço deste período mudou. Confira o novo total antes de continuar.",
			"priceChanged": true, "quote": quote,
		})
		return
	}
	diaria := 0.0
	if len(quote.Packages) == 0 && quote.RegularNights > 0 {
		diaria = roundMoney(quote.DailySubtotal / float64(quote.RegularNights))
	}
	limpeza := quote.CleaningFee
	total := 0.0
	if quote.Total != nil {
		total = *quote.Total
	}
	observacoes := strings.TrimSpace(input.Observacoes)
	for _, p := range quote.Packages {
		observacoes += fmt.Sprintf(" Pacote %s (%s a %s): R$ %.2f; valor integral aplicado.", p.Name, p.Start, p.End, p.Price)
	}

	var id string
	err = a.DB().QueryRowContext(r.Context(), `
		INSERT INTO reservas (empresa_id, imovel_id, cliente_id, entrada, saida,
		                      hospedes, valor_diaria, taxa_limpeza, valor_total,
		                      observacoes, origem, status)
		VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamp, $5::timestamp,
		        $6, $7, $8, $9, $10, $11, $12)
		RETURNING id`,
		property.EmpresaID, input.ImovelID, input.ClienteID, entradaTS, saidaTS,
		input.Hospedes, diaria, limpeza, total,
		strings.TrimSpace(observacoes), origemSite, statusPreReserva).Scan(&id)
	if err != nil {
		respondError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"id": id, "status": statusPreReserva, "quote": quote})
}

// ReservaCancelInput é o payload para cancelar uma pré-reserva feita pelo site.
type ReservaCancelInput struct {
	ID              string `json:"id"`
	EmpresaWhatsApp string `json:"empresa"`
}

// cancelReserva marca uma pré-reserva do site como CANCELADA na tabela
// compartilhada com o app (CRUD Reservas). Só cancela reservas da
// empresa informada.
func (a *App) cancelReserva(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}

	var input ReservaCancelInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo inválido"})
		return
	}
	if !isUUID(input.ID) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "reserva inválida"})
		return
	}

	// Com vínculo na URL o cancelamento fica limitado à empresa; no
	// catálogo (sem empresa) o id da pré-reserva já identifica o registro.
	query := `UPDATE reservas SET status = $2, alterado_em = NOW() WHERE id = $1::uuid`
	args := []any{input.ID, statusCancelada}
	if empresaID, ok := a.resolveEmpresa(r, input.EmpresaWhatsApp); ok {
		query += ` AND empresa_id = $3::uuid`
		args = append(args, empresaID)
	}

	res, err := a.DB().ExecContext(r.Context(), query, args...)
	if err != nil {
		respondError(w, err)
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "reserva não encontrada"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": statusCancelada})
}

// mergeTime combina uma data com um horário "HH:MM" (ou "HH:MM:SS"),
// com fallback quando o horário veio vazio/malformado.
func mergeTime(d time.Time, hm, fallback string) time.Time {
	h, m, ok := parseHM(hm)
	if !ok {
		h, m, _ = parseHM(fallback)
	}
	return time.Date(d.Year(), d.Month(), d.Day(), h, m, 0, 0, time.Local)
}

func parseHM(s string) (int, int, bool) {
	parts := strings.Split(strings.TrimSpace(s), ":")
	if len(parts) < 2 {
		return 0, 0, false
	}
	var h, m int
	if _, err := fmt.Sscanf(parts[0], "%d", &h); err != nil || h < 0 || h > 23 {
		return 0, 0, false
	}
	if _, err := fmt.Sscanf(parts[1], "%d", &m); err != nil || m < 0 || m > 59 {
		return 0, 0, false
	}
	return h, m, true
}
