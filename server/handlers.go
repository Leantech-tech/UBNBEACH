package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync/atomic"
)

// ImovelDTO é o formato exposto à API, pronto para o frontend consumir.
type ImovelDTO struct {
	ID             string     `json:"id"`
	Code           string     `json:"code"`
	Name           string     `json:"name"`
	Type           string     `json:"type"`
	Location       string     `json:"location"`
	Address        string     `json:"address"`
	MapQuery       string     `json:"mapQuery"`
	MapQuerySource string     `json:"mapQuerySource"`
	HideAddress    bool       `json:"hideAddress"`
	Latitude       *float64   `json:"latitude"`
	Longitude      *float64   `json:"longitude"`
	Reference      string     `json:"referencePoint"`
	Capacity       int        `json:"capacity"`
	Bedrooms       int        `json:"bedrooms"`
	Suites         int        `json:"suites"`
	Beds           int        `json:"beds"`
	DoubleBeds     int        `json:"doubleBeds"`
	SingleBeds     int        `json:"singleBeds"`
	BunkBeds       int        `json:"bunkBeds"`
	SofaBeds       int        `json:"sofaBeds"`
	Bathrooms      int        `json:"bathrooms"`
	Parking        int        `json:"parkingSpaces"`
	SizeM2         *int       `json:"sizeM2"`
	Price          *string    `json:"price"`
	DailyPrice     *float64   `json:"dailyPrice"`
	WeekendPrice   *float64   `json:"weekendPrice"`
	CleaningFee    *float64   `json:"cleaningFee"`
	SecurityDep    *float64   `json:"securityDeposit"`
	PriceNotes     string     `json:"priceNotes"`
	Available      bool       `json:"available"`
	Description    string     `json:"description"`
	Amenities      []string   `json:"amenities"`
	Images         []string   `json:"images"`
	ImageDetails   []ImageDTO `json:"imageDetails"`
	Featured       bool       `json:"featured"`
	Checkin        string     `json:"checkin"`
	Checkout       string     `json:"checkout"`
	MinStay        int        `json:"minStay"`
	PetsAllowed    bool       `json:"petsAllowed"`
	EventsAllowed  bool       `json:"eventsAllowed"`
	SmokingAllowed bool       `json:"smokingAllowed"`
	HouseRules     string     `json:"houseRules"`
	EmpresaNome    string     `json:"empresaNome"`
	EmpresaWhats   string     `json:"empresaWhatsapp"`
}

type ImageDTO struct {
	URL     string `json:"url"`
	Caption string `json:"caption"`
}

// App guarda a conexão com o banco em um ponteiro atômico: a conexão
// é estabelecida em background após o startup e publicada via Store,
// sem corrida com os handlers que leem via DB().
type App struct {
	db atomic.Pointer[sql.DB]
}

// DB retorna a conexão ativa, ou nil se o banco ainda não conectou
// (ou está indisponível). Handlers devem responder 503 quando nil.
func (a *App) DB() *sql.DB {
	return a.db.Load()
}

// buildID identifica a build para diagnóstico em produção (via /api/status).
const buildID = "conflito-reservas 2026-10-13"

// getStatus é um endpoint de diagnóstico: informa se a build é a
// corrigida e se a conexão com o banco foi estabelecida. Não expõe
// credenciais nem dados.
func (a *App) getStatus(w http.ResponseWriter, r *http.Request) {
	db := "desconectado"
	if a.DB() != nil {
		db = "conectado"
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"build": buildID,
		"db":    db,
	})
}

// PontoCategoriaDTO é a categoria de ponto de interesse exposta à API.
type PontoCategoriaDTO struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Icon  string `json:"icon"`
	Order int    `json:"order"`
}

// PontoInteresseDTO é o ponto de interesse exposto à API, com os campos
// já prontos para o frontend (endereço montado, URL de mídia pública).
type PontoInteresseDTO struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Address      string  `json:"address"`
	Neighborhood string  `json:"neighborhood"`
	City         string  `json:"city"`
	State        string  `json:"state"`
	Zip          string  `json:"zip"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Phone        string  `json:"phone"`
	Site         string  `json:"site"`
	Image        string  `json:"image"`
	Featured     bool    `json:"featured"`
	CategoryID   string  `json:"categoryId"`
}

// PontosInteresseResponse agrupa as categorias ativas e os pontos
// publicados da empresa vinculada.
type PontosInteresseResponse struct {
	Categories []PontoCategoriaDTO `json:"categories"`
	Points     []PontoInteresseDTO `json:"points"`
}

// listPontosInteresse retorna as categorias ativas e os pontos de
// interesse ativos e publicados da empresa vinculada via WhatsApp
// (?whatsapp=...). Sem ?whatsapp= (ou sem correspondência), agrega as
// categorias e pontos de todas as empresas (catálogo público).
func (a *App) listPontosInteresse(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}

	out := PontosInteresseResponse{
		Categories: []PontoCategoriaDTO{},
		Points:     []PontoInteresseDTO{},
	}

	empresaID, _ := a.resolveEmpresa(r, r.URL.Query().Get("whatsapp"))

	catRows, err := a.DB().QueryContext(r.Context(), `
		SELECT id, coalesce(nome, ''), coalesce(slug, ''), coalesce(icone, ''), coalesce(ordem, 999)
		FROM categorias_ponto_interesse
		WHERE ($1 = '' OR empresa_id = $1::uuid) AND ativo
		ORDER BY ordem, nome`, empresaID)
	if err != nil {
		respondError(w, err)
		return
	}
	defer catRows.Close()

	for catRows.Next() {
		var c PontoCategoriaDTO
		if err := catRows.Scan(&c.ID, &c.Name, &c.Slug, &c.Icon, &c.Order); err != nil {
			respondError(w, err)
			return
		}
		out.Categories = append(out.Categories, c)
	}
	if err := catRows.Err(); err != nil {
		respondError(w, err)
		return
	}

	pontoRows, err := a.DB().QueryContext(r.Context(), `
		SELECT p.id, p.nome,
		       coalesce(p.descricao, ''),
		       coalesce(p.endereco, ''), coalesce(p.numero, ''), coalesce(p.complemento, ''),
		       coalesce(p.bairro, ''), coalesce(p.cidade, ''), coalesce(p.uf, ''), coalesce(p.cep, ''),
		       p.latitude, p.longitude,
		       coalesce(p.telefone, ''), coalesce(p.site_url, ''), coalesce(p.imagem_url, ''),
		       p.destaque, p.categoria_id
		FROM pontos_interesse p
		JOIN categorias_ponto_interesse c ON c.id = p.categoria_id AND c.ativo
		WHERE ($1 = '' OR p.empresa_id = $1::uuid)
		  AND p.ativo AND p.publicado
		ORDER BY p.destaque DESC, p.nome`, empresaID)
	if err != nil {
		respondError(w, err)
		return
	}
	defer pontoRows.Close()

	for pontoRows.Next() {
		var (
			it                            PontoInteresseDTO
			endereco, numero, complemento string
			uf, cep                       string
		)
		if err := pontoRows.Scan(
			&it.ID, &it.Name, &it.Description,
			&endereco, &numero, &complemento,
			&it.Neighborhood, &it.City, &uf, &cep,
			&it.Latitude, &it.Longitude,
			&it.Phone, &it.Site, &it.Image,
			&it.Featured, &it.CategoryID,
		); err != nil {
			respondError(w, err)
			return
		}
		it.State = uf
		it.Zip = cep
		it.Address = buildAddress(endereco, numero, complemento,
			it.Neighborhood, it.City, uf, cep, false)
		if it.Image != "" {
			it.Image = mediaURL(it.Image)
		}
		out.Points = append(out.Points, it)
	}
	if err := pontoRows.Err(); err != nil {
		respondError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, out)
}

// EmpresaDTO expõe os dados públicos da empresa vinculada ao site.
type EmpresaDTO struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	LegalName string `json:"legalName"`
	WhatsApp  string `json:"whatsapp"`
	Email     string `json:"email"`
	Address   string `json:"address"`
	City      string `json:"city"`
	State     string `json:"state"`
	Logo      string `json:"logo"`
}

// getEmpresa retorna os dados públicos da empresa vinculada via
// WhatsApp (?whatsapp=...). Sem correspondência, 404.
func (a *App) getEmpresa(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}

	empresaID, ok := a.resolveEmpresa(r, r.URL.Query().Get("whatsapp"))
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "empresa não encontrada"})
		return
	}

	var e EmpresaDTO
	err := a.DB().QueryRowContext(r.Context(), `
		SELECT id, coalesce(nullif(nome_fantasia, ''), razao_social, ''),
		       coalesce(razao_social, ''), coalesce(whatsapp, ''),
		       coalesce(email, ''), coalesce(endereco, ''),
		       coalesce(cidade, ''), coalesce(uf, ''), coalesce(logotipo_url, '')
		FROM empresas
		WHERE id = $1::uuid`, empresaID).Scan(
		&e.ID, &e.Name, &e.LegalName, &e.WhatsApp,
		&e.Email, &e.Address, &e.City, &e.State, &e.Logo,
	)
	if err != nil {
		respondError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

// listImoveis retorna os imóveis ativos da empresa vinculada via
// WhatsApp (?whatsapp=...). Sem ?whatsapp= (ou sem correspondência),
// retorna o catálogo público: imóveis ativos de todas as empresas,
// cada um com os dados da empresa proprietária (empresaNome e
// empresaWhatsapp) para o frontend direcionar a reserva.
func (a *App) listImoveis(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}
	empresaID, _ := a.resolveEmpresa(r, r.URL.Query().Get("whatsapp"))

	imoveis, err := a.fetchImoveis(r, "", empresaID)
	if err != nil {
		respondError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, imoveis)
}

// getImovel retorna um imóvel específico da empresa vinculada (ou 404).
func (a *App) getImovel(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}
	id := r.PathValue("id")
	if !isUUID(id) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}

	empresaID, ok := a.resolveEmpresa(r, r.URL.Query().Get("whatsapp"))
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}

	imoveis, err := a.fetchImoveis(r, id, empresaID)
	if err != nil {
		respondError(w, err)
		return
	}
	if len(imoveis) == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	writeJSON(w, http.StatusOK, imoveis[0])
}

const imoveisQuery = `
	SELECT i.id, i.codigo, i.titulo, i.tipo, i.bairro, i.cidade,
	       i.endereco, i.numero, i.complemento, i.uf, i.cep, i.ocultar_endereco, i.ponto_referencia,
	       i.latitude, i.longitude,
	       i.capacidade, i.quartos, i.suites, i.banheiros,
	       i.camas_casal, i.camas_solteiro, i.beliches, i.sofas_cama, i.vagas,
	       i.descricao_curta, i.descricao_completa,
	       i.valor_diaria, i.valor_diaria_fim_semana, i.taxa_limpeza, i.caucao, i.observacao_valores,
	       i.checkin_padrao::text, i.checkout_padrao::text, i.estadia_minima,
	       i.aceita_animais, i.permite_eventos, i.permite_fumar,
	       i.regras_adicionais,
	       coalesce(nullif(e.nome_fantasia, ''), e.razao_social, ''),
	       coalesce(e.whatsapp, '')
	FROM imoveis i
	JOIN empresas e ON e.id = i.empresa_id
	WHERE i.status = 'ATIVO'
	  AND ($1 = '' OR i.id = $1::uuid)
	  AND ($2 = '' OR i.empresa_id = $2::uuid)
	ORDER BY i.codigo`

// resolveEmpresa encontra a empresa pelo número de WhatsApp (somente
// dígitos, tolerando máscara/prefixo no cadastro). Sem correspondência,
// ok == false e nenhum dado deve ser exposto.
func (a *App) resolveEmpresa(r *http.Request, whatsapp string) (id string, ok bool) {
	digits := onlyDigits(whatsapp)
	if digits == "" {
		return "", false
	}

	err := a.DB().QueryRowContext(r.Context(), `
		SELECT id FROM empresas
		WHERE regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') = $1
		LIMIT 1`, digits).Scan(&id)
	if err != nil {
		return "", false
	}
	return id, true
}

// onlyDigits remove tudo que não for número da string.
func onlyDigits(s string) string {
	var sb strings.Builder
	for _, c := range s {
		if c >= '0' && c <= '9' {
			sb.WriteRune(c)
		}
	}
	return sb.String()
}

func (a *App) fetchImoveis(r *http.Request, id, empresaID string) ([]ImovelDTO, error) {
	rows, err := a.DB().QueryContext(r.Context(), imoveisQuery, id, empresaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ImovelDTO
	index := map[string]int{}

	for rows.Next() {
		var (
			it                                          ImovelDTO
			tipo, bairro, cidade                        sql.NullString
			endereco, numero, complemento               sql.NullString
			uf, cep                                     sql.NullString
			ocultarEndereco                             sql.NullBool
			pontoReferencia                             sql.NullString
			latitude, longitude                         sql.NullFloat64
			capacity, bedrooms, suites, bathrooms       sql.NullInt64
			camasCasal, camasSolteiro, beliches, sofas  sql.NullInt64
			vagas, estadiaMinima                        sql.NullInt64
			descCurta, descCompleta                     sql.NullString
			diaria, diariaFds                           sql.NullFloat64
			taxaLimpeza, caucao                         sql.NullFloat64
			obsValores                                  sql.NullString
			checkin, checkout                           sql.NullString
			aceitaAnimais, permiteEventos, permiteFumar sql.NullBool
			regras                                      sql.NullString
			empresaNome, empresaWhats                   string
		)
		if err := rows.Scan(
			&it.ID, &it.Code, &it.Name, &tipo, &bairro, &cidade,
			&endereco, &numero, &complemento, &uf, &cep, &ocultarEndereco, &pontoReferencia,
			&latitude, &longitude,
			&capacity, &bedrooms, &suites, &bathrooms,
			&camasCasal, &camasSolteiro, &beliches, &sofas, &vagas,
			&descCurta, &descCompleta,
			&diaria, &diariaFds, &taxaLimpeza, &caucao, &obsValores,
			&checkin, &checkout, &estadiaMinima,
			&aceitaAnimais, &permiteEventos, &permiteFumar,
			&regras,
			&empresaNome, &empresaWhats,
		); err != nil {
			return nil, err
		}

		it.EmpresaNome = empresaNome
		it.EmpresaWhats = empresaWhats

		it.Type = tipo.String
		it.Capacity = int(capacity.Int64)
		it.Bedrooms = int(bedrooms.Int64)
		it.Suites = int(suites.Int64)
		it.Bathrooms = int(bathrooms.Int64)
		it.DoubleBeds = int(camasCasal.Int64)
		it.SingleBeds = int(camasSolteiro.Int64)
		it.BunkBeds = int(beliches.Int64)
		it.SofaBeds = int(sofas.Int64)
		it.Beds = it.DoubleBeds + it.SingleBeds + it.BunkBeds + it.SofaBeds
		it.Parking = int(vagas.Int64)
		it.MinStay = int(estadiaMinima.Int64)
		it.PetsAllowed = aceitaAnimais.Bool
		it.EventsAllowed = permiteEventos.Bool
		it.SmokingAllowed = permiteFumar.Bool
		it.Available = true
		it.Featured = false
		it.Amenities = []string{}
		it.Images = []string{}
		it.ImageDetails = []ImageDTO{}
		it.Location = joinLocation(bairro.String, cidade.String)
		it.HideAddress = ocultarEndereco.Bool
		it.Address = buildAddress(endereco.String, numero.String, complemento.String,
			bairro.String, cidade.String, uf.String, cep.String, ocultarEndereco.Bool)
		if !it.HideAddress && latitude.Valid && longitude.Valid {
			lat, lng := latitude.Float64, longitude.Float64
			it.Latitude, it.Longitude = &lat, &lng
		}
		it.Reference = pontoReferencia.String
		it.Description = firstNonEmpty(descCompleta.String, descCurta.String)
		it.MapQuery, it.MapQuerySource = mapDestination(
			it.Description, descCurta.String,
			endereco.String, numero.String, complemento.String,
			bairro.String, cidade.String, uf.String, cep.String,
			latitude, longitude,
		)
		it.PriceNotes = obsValores.String
		it.Checkin = trimTime(checkin.String)
		it.Checkout = trimTime(checkout.String)
		it.HouseRules = regras.String

		if diaria.Valid && diaria.Float64 > 0 {
			price := fmt.Sprintf("R$ %s / noite", formatBRL(diaria.Float64))
			it.Price = &price
			d := diaria.Float64
			it.DailyPrice = &d
		}
		if diariaFds.Valid && diariaFds.Float64 > 0 {
			f := diariaFds.Float64
			it.WeekendPrice = &f
		}
		if taxaLimpeza.Valid && taxaLimpeza.Float64 > 0 {
			v := taxaLimpeza.Float64
			it.CleaningFee = &v
		}
		if caucao.Valid && caucao.Float64 > 0 {
			v := caucao.Float64
			it.SecurityDep = &v
		}

		index[it.ID] = len(out)
		out = append(out, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return out, nil
	}

	ids := make([]string, len(out))
	for i := range out {
		ids[i] = out[i].ID
	}

	if err := a.attachPhotos(r, out, index, ids); err != nil {
		return nil, err
	}
	if err := a.attachAmenities(r, out, index, ids); err != nil {
		return nil, err
	}
	return out, nil
}

func (a *App) attachPhotos(r *http.Request, out []ImovelDTO, index map[string]int, ids []string) error {
	rows, err := a.DB().QueryContext(r.Context(), `
		SELECT imovel_id, url, coalesce(legenda, '')
		FROM imovel_midias
		WHERE tipo = 'FOTO' AND imovel_id = ANY($1::uuid[])
		ORDER BY capa DESC, ordem ASC`, pqArray(ids))
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var imovelID, url, caption string
		if err := rows.Scan(&imovelID, &url, &caption); err != nil {
			return err
		}
		if i, ok := index[imovelID]; ok && url != "" {
			publicURL := mediaURL(url)
			out[i].Images = append(out[i].Images, publicURL)
			out[i].ImageDetails = append(out[i].ImageDetails, ImageDTO{URL: publicURL, Caption: caption})
		}
	}
	return rows.Err()
}

// mediaURL reescreve URLs do bucket privado (Garage/S3) para passarem
// pelo endpoint público da API de locação, que entrega o arquivo.
func mediaURL(u string) string {
	if strings.Contains(u, "s3.leantechautomacao.com.br") {
		return "https://apilocacao.leantechautomacao.com.br/api/v1/storage/object?url=" + url.QueryEscape(u)
	}
	return u
}

func (a *App) attachAmenities(r *http.Request, out []ImovelDTO, index map[string]int, ids []string) error {
	rows, err := a.DB().QueryContext(r.Context(), `
		SELECT ic.imovel_id, c.nome
		FROM imovel_comodidades ic
		JOIN comodidades c ON c.id = ic.comodidade_id
		WHERE ic.imovel_id = ANY($1::uuid[])
		ORDER BY c.nome`, pqArray(ids))
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var imovelID, nome string
		if err := rows.Scan(&imovelID, &nome); err != nil {
			return err
		}
		if i, ok := index[imovelID]; ok && nome != "" {
			out[i].Amenities = append(out[i].Amenities, nome)
		}
	}
	return rows.Err()
}

func joinLocation(bairro, cidade string) string {
	switch {
	case bairro != "" && cidade != "":
		return bairro + " · " + cidade
	case cidade != "":
		return cidade
	default:
		return bairro
	}
}

// buildAddress monta o endereço completo em uma linha. Quando o
// cadastro pede para ocultar o endereço, mostra só bairro/cidade.
func buildAddress(endereco, numero, complemento, bairro, cidade, uf, cep string, ocultar bool) string {
	if ocultar {
		return joinLocation(bairro, cidade)
	}

	var parts []string
	street := strings.TrimSpace(endereco)
	if number := strings.TrimSpace(numero); number != "" {
		if street != "" {
			street += ", "
		}
		street += number
	}
	if street != "" {
		parts = append(parts, street)
	}
	if complemento != "" {
		parts = append(parts, complemento)
	}
	if bairro != "" {
		parts = append(parts, bairro)
	}
	city := cidade
	if uf != "" {
		city = strings.TrimSpace(cidade + " - " + uf)
	}
	if city != "" && city != "-" {
		parts = append(parts, city)
	}
	if cep != "" {
		parts = append(parts, "CEP "+cep)
	}
	return strings.Join(parts, ", ")
}

var (
	mapStreetPattern = regexp.MustCompile("(?i)(^|[^[:alnum:]])(rua|r\\.?|avenida|av\\.?|travessa|tv\\.?|alameda|al\\.?|estrada|rodovia|rod\\.?|praça|praca|largo|viela|servidão|servidao)([[:space:],]|$)")
	mapNumberPattern = regexp.MustCompile("(?i)(^|[^0-9])([0-9]{1,6}|s\\s*/\\s*n)([^0-9]|$)")
)

// addressFromDescription finds an explicit street-and-number line without
// using the whole property description as a Google Maps search query.
func addressFromDescription(description string) string {
	for _, line := range strings.Split(description, "\n") {
		line = strings.TrimSpace(line)
		matches := mapStreetPattern.FindStringSubmatchIndex(line)
		if len(matches) < 6 {
			continue
		}
		address := strings.TrimSpace(line[matches[4]:])
		if mapNumberPattern.MatchString(address) {
			return address
		}
	}
	return ""
}

// mapDestination uses the registered pin when available. Without a pin, only
// a street and number can be sent to Maps; a neighborhood or partial street
// must not create a misleading route.
func mapDestination(
	description, shortDescription, endereco, numero, complemento, bairro, cidade, uf, cep string,
	latitude, longitude sql.NullFloat64,
) (string, string) {
	if latitude.Valid && longitude.Valid &&
		latitude.Float64 >= -90 && latitude.Float64 <= 90 &&
		longitude.Float64 >= -180 && longitude.Float64 <= 180 &&
		(latitude.Float64 != 0 || longitude.Float64 != 0) {
		return fmt.Sprintf("%.7f,%.7f", latitude.Float64, longitude.Float64), "coordinates"
	}
	if address := addressFromDescription(description); address != "" {
		return address, "description"
	}
	if address := addressFromDescription(shortDescription); address != "" {
		return address, "description"
	}

	address := buildAddress(endereco, numero, complemento, bairro, cidade, uf, cep, false)
	street := strings.TrimSpace(endereco)
	houseNumber := strings.TrimSpace(numero)
	if street != "" && houseNumber != "" && address != "" {
		return address, "address"
	}

	return "", "unavailable"
}

// trimTime remove os segundos de um horário vindo do banco ("14:00:00" -> "14:00").
func trimTime(t string) string {
	if h, _, ok := strings.Cut(t, ":"); ok {
		if m, _, ok2 := strings.Cut(t[len(h)+1:], ":"); ok2 {
			return h + ":" + m
		}
	}
	return t
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// formatBRL formata um valor com separador de milhar e vírgula decimal.
func formatBRL(v float64) string {
	formatted := fmt.Sprintf("%.2f", v)
	intPart, frac, _ := strings.Cut(formatted, ".")
	if frac == "00" {
		frac = ""
	} else {
		frac = "," + frac
	}

	n := len(intPart)
	if n <= 3 {
		return intPart + frac
	}
	var sb strings.Builder
	for i, digit := range intPart {
		if i > 0 && (n-i)%3 == 0 {
			sb.WriteByte('.')
		}
		sb.WriteRune(digit)
	}
	return sb.String() + frac
}

func pqArray(ids []string) interface{} {
	return "{" + strings.Join(ids, ",") + "}"
}

// isUUID valida o formato básico de um UUID antes de usá-lo na query.
func isUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, c := range s {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
			continue
		}
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F') {
			return false
		}
	}
	return true
}

// isValidImovelID verifica se é um UUID válido ou um ID local conhecido (fallback).
func isValidImovelID(s string) bool {
	if isUUID(s) {
		return true
	}
	// IDs locais conhecidos (fallback do frontend)
	localIDs := map[string]bool{
		"apto-01": true,
		"apto-02": true,
		"apto-03": true,
		"apto-04": true,
	}
	return localIDs[s]
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, err error) {
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
}

// AvaliacaoDTO representa uma avaliação de imóvel.
type AvaliacaoDTO struct {
	ID         string `json:"id"`
	ImovelID   string `json:"imovel_id"`
	Nome       string `json:"nome"`
	Nota       int    `json:"nota"`
	Comentario string `json:"comentario"`
	Data       string `json:"data"`
}

type AvaliacoesResponse struct {
	Media        float64        `json:"media"`
	Total        int            `json:"total"`
	Distribuicao map[int]int    `json:"distribuicao"`
	Avaliacoes   []AvaliacaoDTO `json:"avaliacoes"`
}

// listAvaliacoes retorna as avaliações de um imóvel.
func (a *App) listAvaliacoes(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco indisponível"})
		return
	}
	imovelID := r.PathValue("id")
	if !isValidImovelID(imovelID) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}

	// IDs locais (fallback) não existem no banco — retorna vazio
	if !isUUID(imovelID) {
		writeJSON(w, http.StatusOK, AvaliacoesResponse{
			Media:        0,
			Total:        0,
			Distribuicao: map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
			Avaliacoes:   []AvaliacaoDTO{},
		})
		return
	}

	rows, err := a.DB().QueryContext(r.Context(), `
		SELECT id, imovel_id, nome, nota, comentario, created_at
		FROM avaliacoes
		WHERE imovel_id = $1::uuid
		ORDER BY created_at DESC`, imovelID)
	if err != nil {
		respondError(w, err)
		return
	}
	defer rows.Close()

	var avaliacoes []AvaliacaoDTO
	distribuicao := map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
	var somaNotas int
	for rows.Next() {
		var av AvaliacaoDTO
		var createdAt string
		if err := rows.Scan(&av.ID, &av.ImovelID, &av.Nome, &av.Nota, &av.Comentario, &createdAt); err != nil {
			respondError(w, err)
			return
		}
		av.Data = createdAt
		avaliacoes = append(avaliacoes, av)
		distribuicao[av.Nota]++
		somaNotas += av.Nota
	}

	var media float64
	if len(avaliacoes) > 0 {
		media = float64(somaNotas) / float64(len(avaliacoes))
	}

	writeJSON(w, http.StatusOK, AvaliacoesResponse{
		Media:        media,
		Total:        len(avaliacoes),
		Distribuicao: distribuicao,
		Avaliacoes:   avaliacoes,
	})
}

// createAvaliacao cria uma nova avaliação para um imóvel.
func (a *App) createAvaliacao(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco indisponível"})
		return
	}
	imovelID := r.PathValue("id")
	if !isValidImovelID(imovelID) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}

	// IDs locais (fallback) não podem ser avaliados no banco
	if !isUUID(imovelID) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "avaliações não disponíveis para imóveis de exemplo"})
		return
	}

	var input struct {
		Nome       string `json:"nome"`
		Nota       int    `json:"nota"`
		Comentario string `json:"comentario"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo inválido"})
		return
	}

	if strings.TrimSpace(input.Nome) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nome é obrigatório"})
		return
	}
	if input.Nota < 1 || input.Nota > 5 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nota deve ser entre 1 e 5"})
		return
	}

	var id string
	err := a.DB().QueryRowContext(r.Context(), `
		INSERT INTO avaliacoes (imovel_id, nome, nota, comentario)
		VALUES ($1::uuid, $2, $3, $4)
		RETURNING id`, imovelID, strings.TrimSpace(input.Nome), input.Nota, strings.TrimSpace(input.Comentario)).Scan(&id)
	if err != nil {
		respondError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "message": "avaliação registrada"})
}

// debugPontos retorna todos os pontos da tabela (sem filtros) para debug.
func (a *App) debugPontos(w http.ResponseWriter, r *http.Request) {
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco indisponível"})
		return
	}
	rows, err := a.DB().QueryContext(r.Context(), `
		SELECT id, nome, imagem_url, ativo, publicado, categoria_id, empresa_id
		FROM pontos_interesse`)
	if err != nil {
		respondError(w, err)
		return
	}
	defer rows.Close()

	type row struct {
		ID          string `json:"id"`
		Nome        string `json:"nome"`
		ImagemURL   string `json:"imagem_url"`
		Ativo       bool   `json:"ativo"`
		Publicado   bool   `json:"publicado"`
		CategoriaID string `json:"categoria_id"`
		EmpresaID   string `json:"empresa_id"`
	}
	var out []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.Nome, &r.ImagemURL, &r.Ativo, &r.Publicado, &r.CategoriaID, &r.EmpresaID); err != nil {
			respondError(w, err)
			return
		}
		out = append(out, r)
	}

	// Also fetch empresas
	rows2, err := a.DB().QueryContext(r.Context(), `SELECT id, nome_fantasia, whatsapp FROM empresas`)
	if err != nil {
		respondError(w, err)
		return
	}
	defer rows2.Close()

	type emp struct {
		ID       string `json:"id"`
		Nome     string `json:"nome"`
		WhatsApp string `json:"whatsapp"`
	}
	var empresas []emp
	for rows2.Next() {
		var e emp
		rows2.Scan(&e.ID, &e.Nome, &e.WhatsApp)
		empresas = append(empresas, e)
	}

	// Fetch categoria
	rows3, err := a.DB().QueryContext(r.Context(), `SELECT id, nome, ativo FROM categorias_ponto_interesse WHERE id = 'a8304a08-4bd3-45bd-8760-2e20d1662432'`)
	if err != nil {
		respondError(w, err)
		return
	}
	defer rows3.Close()

	type cat struct {
		ID    string `json:"id"`
		Nome  string `json:"nome"`
		Ativo bool   `json:"ativo"`
	}
	var cats []cat
	for rows3.Next() {
		var c cat
		rows3.Scan(&c.ID, &c.Nome, &c.Ativo)
		cats = append(cats, c)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"pontos":    out,
		"empresas":  empresas,
		"categoria": cats,
	})
}
