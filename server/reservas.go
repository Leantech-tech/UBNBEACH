package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
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
	ImovelID      string  `json:"imovelId"`
	ClienteID     string  `json:"clienteId"`
	EmpresaWhatsApp string `json:"empresa"`
	Entrada       string  `json:"entrada"` // YYYY-MM-DD
	Saida         string  `json:"saida"`   // YYYY-MM-DD
	Hospedes      int     `json:"hospedes"`
	ValorDiaria   float64 `json:"valorDiaria"`
	TaxaLimpeza   float64 `json:"taxaLimpeza"`
	ValorTotal    float64 `json:"valorTotal"`
	Observacoes   string  `json:"observacoes"`
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

	// Empresa do vínculo da URL, quando existe. A empresa da reserva é
	// sempre a proprietária do imóvel — no catálogo (raiz do site) não
	// há vínculo na URL e o imóvel é a única fonte da empresa.
	empresaVinculo, _ := a.resolveEmpresa(r, input.EmpresaWhatsApp)

	entrada, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(input.Entrada), time.Local)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "data de entrada inválida"})
		return
	}
	saida, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(input.Saida), time.Local)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "data de saída inválida"})
		return
	}
	if !saida.After(entrada) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "a saída deve ser após a entrada"})
		return
	}
	if entrada.Before(time.Now().Truncate(24 * time.Hour)) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "a entrada não pode ser no passado"})
		return
	}
	if input.Hospedes < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "quantidade de hóspedes inválida"})
		return
	}

	// Imóvel ativo com a empresa proprietária e horários padrão de
	// check-in/out. A empresa da reserva é sempre a do imóvel.
	var capacidade int
	var empresaID string
	var diariaBD, limpezaBD sql.NullFloat64
	var checkin, checkout sql.NullString
	err = a.DB().QueryRowContext(r.Context(), `
		SELECT capacidade, empresa_id::text, valor_diaria, taxa_limpeza,
		       checkin_padrao::text, checkout_padrao::text
		FROM imoveis
		WHERE id = $1::uuid AND status = 'ATIVO'`,
		input.ImovelID).Scan(&capacidade, &empresaID, &diariaBD, &limpezaBD, &checkin, &checkout)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	if err != nil {
		respondError(w, err)
		return
	}
	// Vínculo da URL (modo empresa) apontando para outra empresa:
	// o imóvel não pertence a ela.
	if empresaVinculo != "" && empresaVinculo != empresaID {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	if input.Hospedes > capacidade {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "quantidade de hóspedes acima da capacidade do imóvel"})
		return
	}

	// Cliente deve pertencer à mesma empresa.
	var clienteEmpresa string
	err = a.DB().QueryRowContext(r.Context(), `
		SELECT empresa_id::text FROM clientes WHERE id = $1::uuid`, input.ClienteID).Scan(&clienteEmpresa)
	if err == sql.ErrNoRows || (err == nil && clienteEmpresa != empresaID) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cliente inválido"})
		return
	}
	if err != nil {
		respondError(w, err)
		return
	}

	// Horários de check-in/out: os do imóvel, ou 14:00 / 11:00.
	entradaTS := mergeTime(entrada, checkin.String, "14:00")
	saidaTS := mergeTime(saida, checkout.String, "11:00")

	// Período livre? ORCAMENTO, FINALIZADA e CANCELADA não ocupam o imóvel.
	var conflitoID string
	err = a.DB().QueryRowContext(r.Context(), `
		SELECT id FROM reservas
		WHERE empresa_id = $1::uuid
		  AND imovel_id = $2::uuid
		  AND status IN ('PRE_RESERVA', 'CONFIRMADA', 'HOSPEDADO', 'BLOQUEIO')
		  AND entrada < $4::timestamp
		  AND saida > $3::timestamp
		LIMIT 1`,
		empresaID, input.ImovelID, entradaTS, saidaTS).Scan(&conflitoID)
	if err != nil && err != sql.ErrNoRows {
		respondError(w, err)
		return
	}
	if conflitoID != "" {
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":    "Esse período desejado já está reservado!",
			"conflict": true,
		})
		return
	}

	// Valores: os enviados pelo site (o que o cliente viu no resumo);
	// sem preço cadastrado, caem para os valores do imóvel/0.
	diaria := input.ValorDiaria
	if diaria <= 0 && diariaBD.Valid {
		diaria = diariaBD.Float64
	}
	limpeza := input.TaxaLimpeza
	if limpeza <= 0 && limpezaBD.Valid {
		limpeza = limpezaBD.Float64
	}
	total := input.ValorTotal
	if total <= 0 {
		noites := int(saida.Sub(entrada).Hours() / 24)
		total = diaria*float64(noites) + limpeza
	}

	var id string
	err = a.DB().QueryRowContext(r.Context(), `
		INSERT INTO reservas (empresa_id, imovel_id, cliente_id, entrada, saida,
		                      hospedes, valor_diaria, taxa_limpeza, valor_total,
		                      observacoes, origem, status)
		VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamp, $5::timestamp,
		        $6, $7, $8, $9, $10, $11, $12)
		RETURNING id`,
		empresaID, input.ImovelID, input.ClienteID, entradaTS, saidaTS,
		input.Hospedes, diaria, limpeza, total,
		strings.TrimSpace(input.Observacoes), origemSite, statusPreReserva).Scan(&id)
	if err != nil {
		respondError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "status": statusPreReserva})
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
