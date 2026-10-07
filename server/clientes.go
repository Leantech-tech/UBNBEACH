package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
)

// origemSite é o valor fixo gravado em clientes.origem ("Origem do
// contato") para todo cadastro feito pelo site. O campo não aparece
// no formulário: quem define a origem é sempre o site.
const origemSite = "UB N' BEACH"

// ClienteDTO é a ficha pública do cliente devolvida à API do site.
type ClienteDTO struct {
	ID        string `json:"id"`
	Nome      string `json:"nome"`
	WhatsApp  string `json:"whatsapp"`
	Email     string `json:"email"`
	Documento string `json:"documento"`
}

// isCPFValido valida o CPF com os dígitos verificadores oficiais
// (módulo 11). Rejeita também CPFs com todos os dígitos iguais.
func isCPFValido(s string) bool {
	digits := onlyDigits(s)
	if len(digits) != 11 {
		return false
	}
	allSame := true
	for i := 1; i < 11; i++ {
		if digits[i] != digits[0] {
			allSame = false
			break
		}
	}
	if allSame {
		return false
	}
	digit := func(n int) bool {
		soma := 0
		for i := 0; i < n; i++ {
			soma += int(digits[i]-'0') * (n + 1 - i)
		}
		resto := (soma * 10) % 11
		if resto == 10 {
			resto = 0
		}
		return resto == int(digits[n]-'0')
	}
	return digit(9) && digit(10)
}

// lookupCliente localiza um cliente da empresa vinculada pelo CPF
// (?cpf=...&whatsapp=...). Encontrado → 200 com a ficha; ausente →
// 404. É a busca automática que preenche o formulário do site.
func (a *App) lookupCliente(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}

	empresaID, ok := a.resolveEmpresa(r, r.URL.Query().Get("whatsapp"))
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "empresa não encontrada"})
		return
	}

	cpf := onlyDigits(r.URL.Query().Get("cpf"))
	if !isCPFValido(cpf) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "CPF inválido"})
		return
	}

	var c ClienteDTO
	err := a.DB().QueryRowContext(r.Context(), `
		SELECT id, nome, coalesce(whatsapp, ''), coalesce(email, ''), coalesce(documento, '')
		FROM clientes
		WHERE empresa_id = $1::uuid
		  AND regexp_replace(coalesce(documento, ''), '\D', '', 'g') = $2
		  AND ativo
		ORDER BY criado_em DESC
		LIMIT 1`, empresaID, cpf).Scan(&c.ID, &c.Nome, &c.WhatsApp, &c.Email, &c.Documento)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "cliente não encontrado"})
		return
	}
	if err != nil {
		respondError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

// createCliente cadastra o cliente que finalizou a pré-reserva no
// site. Idempotente por CPF: se o cliente já existe na empresa, os
// dados são atualizados (mantendo a origem original); se não existe,
// é inserido com origem fixa = nome do site.
func (a *App) createCliente(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}

	var input struct {
		CPF             string `json:"cpf"`
		Nome            string `json:"nome"`
		WhatsApp        string `json:"whatsapp"`
		Email           string `json:"email"`
		EmpresaWhatsApp string `json:"empresa"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo inválido"})
		return
	}

	nome := strings.TrimSpace(input.Nome)
	cpf := onlyDigits(input.CPF)
	wa := onlyDigits(input.WhatsApp)
	email := strings.TrimSpace(input.Email)

	if !isCPFValido(cpf) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "CPF inválido"})
		return
	}
	if nome == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nome é obrigatório"})
		return
	}
	if len(wa) < 10 || len(wa) > 15 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "WhatsApp inválido"})
		return
	}
	if email != "" && !strings.Contains(email, "@") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "e-mail inválido"})
		return
	}

	empresaID, ok := a.resolveEmpresa(r, input.EmpresaWhatsApp)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "empresa não encontrada"})
		return
	}

	// Já cadastrado com esse CPF? Atualiza a ficha e mantém a origem.
	var existingID string
	err := a.DB().QueryRowContext(r.Context(), `
		SELECT id FROM clientes
		WHERE empresa_id = $1::uuid
		  AND regexp_replace(coalesce(documento, ''), '\D', '', 'g') = $2
		ORDER BY criado_em DESC
		LIMIT 1`, empresaID, cpf).Scan(&existingID)
	if err != nil && err != sql.ErrNoRows {
		respondError(w, err)
		return
	}

	if existingID != "" {
		_, err = a.DB().ExecContext(r.Context(), `
			UPDATE clientes
			SET nome = $2, whatsapp = $3, email = NULLIF($4, ''),
			    alterado_em = now()
			WHERE id = $1::uuid`, existingID, nome, wa, email)
		if err != nil {
			respondError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"id": existingID, "created": "false"})
		return
	}

	var id string
	err = a.DB().QueryRowContext(r.Context(), `
		INSERT INTO clientes (empresa_id, nome, whatsapp, email, documento, origem)
		VALUES ($1::uuid, $2, $3, NULLIF($4, ''), $5, $6)
		RETURNING id`, empresaID, nome, wa, email, cpf, origemSite).Scan(&id)
	if err != nil {
		respondError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "created": "true"})
}
