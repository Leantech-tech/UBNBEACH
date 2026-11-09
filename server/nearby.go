package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strings"
)

const nearbyRadiusMeters = 10000

type nearbyPlace struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Category   string  `json:"category"`
	Icon       string  `json:"icon"`
	Address    string  `json:"address"`
	Source     string  `json:"source,omitempty"`
	MapsURL    string  `json:"googleMapsUrl,omitempty"`
	OSMURL     string  `json:"osmUrl,omitempty"`
	Latitude   float64 `json:"-"`
	Longitude  float64 `json:"-"`
	DistanceKm float64 `json:"distanceKm,omitempty"`
}

// A localização é lida do cadastro ativo no servidor. O pin do imóvel não é
// devolvido neste resultado; para endereço oculto também omitimos distâncias.
func (a *App) listNearbyPlaces(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}
	id := r.PathValue("id")
	if !isUUID(id) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	var lat, lon sql.NullFloat64
	var hidden bool
	err := a.DB().QueryRowContext(r.Context(), `
		SELECT latitude, longitude, coalesce(ocultar_endereco, false)
		FROM imoveis WHERE id = $1::uuid AND status = 'ATIVO'`, id).Scan(&lat, &lon, &hidden)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	if err != nil {
		respondError(w, err)
		return
	}
	if !lat.Valid || !lon.Valid || !validGeo(lat.Float64, lon.Float64) {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "localização do imóvel indisponível"})
		return
	}
	registered, err := registeredNearby(r.Context(), a.DB(), lat.Float64, lon.Float64)
	if err != nil {
		respondError(w, err)
		return
	}
	places, searchErr := localOSMNearby(r.Context(), a.DB(), lat.Float64, lon.Float64)
	ready := false
	if searchErr == nil {
		searchErr = a.DB().QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM osm_pontos_interesse)`).Scan(&ready)
	}
	if searchErr != nil {
		log.Printf("AVISO: catálogo local de pontos indisponível: %v", searchErr)
	}
	combined := mergeNearbyPlaces(places, registered)
	writeJSON(w, http.StatusOK, map[string]any{
		"radiusKm": 10,
		"points":   publicNearbyPlaces(combined, hidden),
		"partial":  searchErr != nil || !ready,
		"limited":  false,
	})
}

// A rota usa o pin exato em um Google Maps URL, sem publicar coordenadas como
// campos do catálogo. Sem origem explícita, o Google usa a localização do
// aparelho quando disponível.
func (a *App) redirectImovelToGoogleMaps(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}
	id := r.PathValue("id")
	if !isUUID(id) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	var lat, lon sql.NullFloat64
	var hidden bool
	var description, shortDescription, street, number, complement, neighborhood, city, state, zip sql.NullString
	err := a.DB().QueryRowContext(r.Context(), `
		SELECT latitude, longitude, coalesce(ocultar_endereco, false),
		       coalesce(descricao_completa, ''), coalesce(descricao_curta, ''),
		       coalesce(endereco, ''), coalesce(numero, ''), coalesce(complemento, ''),
		       coalesce(bairro, ''), coalesce(cidade, ''), coalesce(uf, ''), coalesce(cep, '')
		FROM imoveis WHERE id = $1::uuid AND status = 'ATIVO'`, id).Scan(
		&lat, &lon, &hidden, &description, &shortDescription, &street, &number,
		&complement, &neighborhood, &city, &state, &zip,
	)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	if err != nil {
		respondError(w, err)
		return
	}
	destination := ""
	if lat.Valid && lon.Valid && validGeo(lat.Float64, lon.Float64) {
		destination = fmt.Sprintf("%.7f,%.7f", lat.Float64, lon.Float64)
	} else if !hidden {
		destination, _ = mapDestination(
			description.String, shortDescription.String,
			street.String, number.String, complement.String,
			neighborhood.String, city.String, state.String, zip.String, lat, lon,
		)
	}
	if destination == "" {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "localização exata indisponível"})
		return
	}
	http.Redirect(w, r, googleMapsDirectionsURL(destination), http.StatusFound)
}

// O mapa do imóvel é incorporado pelo export oficial do OpenStreetMap, sem
// chave. A rota é aberta no Google Maps por URL, também sem chave. As
// coordenadas continuam fora dos campos JSON do catálogo.
func (a *App) getImovelMapEmbed(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if a.DB() == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "banco de dados indisponível"})
		return
	}
	id := r.PathValue("id")
	if !isUUID(id) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	var lat, lon sql.NullFloat64
	err := a.DB().QueryRowContext(r.Context(), `
		SELECT latitude, longitude
		FROM imoveis WHERE id = $1::uuid AND status = 'ATIVO'`, id).Scan(&lat, &lon)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "imóvel não encontrado"})
		return
	}
	if err != nil {
		respondError(w, err)
		return
	}
	if !lat.Valid || !lon.Valid || !validGeo(lat.Float64, lon.Float64) {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "localização do imóvel indisponível"})
		return
	}
	center := fmt.Sprintf("%.7f,%.7f", lat.Float64, lon.Float64)
	mapURL := googleMapsDirectionsURL(center)
	embedURL := openStreetMapEmbedURL(lat.Float64, lon.Float64)
	writeJSON(w, http.StatusOK, map[string]string{"embedUrl": embedURL, "mapUrl": mapURL})
}

func registeredNearby(ctx context.Context, db *sql.DB, lat, lon float64) ([]nearbyPlace, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT p.id, p.nome, coalesce(p.endereco, ''), coalesce(p.numero, ''),
		       coalesce(p.bairro, ''), coalesce(p.cidade, ''),
		       p.latitude, p.longitude, c.nome, coalesce(c.icone, '')
		FROM pontos_interesse p
		JOIN categorias_ponto_interesse c ON c.id = p.categoria_id AND c.ativo
		WHERE p.ativo AND p.publicado AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	places := []nearbyPlace{}
	for rows.Next() {
		var point nearbyPlace
		var street, number, neighborhood, city string
		if err := rows.Scan(&point.ID, &point.Name, &street, &number, &neighborhood, &city,
			&point.Latitude, &point.Longitude, &point.Category, &point.Icon); err != nil {
			return nil, err
		}
		if point.Name == "" || !validGeo(point.Latitude, point.Longitude) {
			continue
		}
		point.DistanceKm = geoDistanceKm(lat, lon, point.Latitude, point.Longitude)
		if point.DistanceKm > 10 {
			continue
		}
		point.Address = strings.Join(nonEmpty(street, number), ", ")
		if point.Address == "" {
			point.Address = strings.Join(nonEmpty(neighborhood, city), " · ")
		}
		point.Source = "registered"
		point.MapsURL = googleMapsURLForPlace("", point.Name, point.Address, point.Latitude, point.Longitude)
		places = append(places, point)
	}
	return places, rows.Err()
}

func mergeNearbyPlaces(osm, registered []nearbyPlace) []nearbyPlace {
	out := append([]nearbyPlace(nil), osm...)
	for _, point := range registered {
		if point.MapsURL == "" {
			point.MapsURL = googleMapsURLForPlace("", point.Name, point.Address, point.Latitude, point.Longitude)
		}
		duplicate := false
		for _, known := range osm {
			if strings.EqualFold(strings.TrimSpace(known.Name), strings.TrimSpace(point.Name)) &&
				geoDistanceKm(known.Latitude, known.Longitude, point.Latitude, point.Longitude) < 0.05 {
				duplicate = true
				break
			}
		}
		if !duplicate {
			out = append(out, point)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].DistanceKm == out[j].DistanceKm {
			return out[i].Name < out[j].Name
		}
		return out[i].DistanceKm < out[j].DistanceKm
	})
	return out
}

func publicNearbyPlaces(places []nearbyPlace, hidden bool) []nearbyPlace {
	public := append([]nearbyPlace(nil), places...)
	if !hidden {
		return public
	}
	for i := range public {
		public[i].DistanceKm = 0
	}
	// A ordem por distância também poderia indicar a origem oculta.
	sort.Slice(public, func(i, j int) bool { return public[i].Name < public[j].Name })
	return public
}

func googleMapsURLForPlace(placeID, name, address string, lat, lon float64) string {
	queryText := strings.TrimSpace(name)
	if address = strings.TrimSpace(address); address != "" {
		queryText = strings.Join(nonEmpty(queryText, address), ", ")
	}
	if queryText == "" && validGeo(lat, lon) {
		queryText = fmt.Sprintf("%.7f,%.7f", lat, lon)
	}
	query := url.Values{"api": {"1"}, "query": {queryText}}
	if placeID != "" {
		query.Set("query_place_id", placeID)
	}
	return "https://www.google.com/maps/search/?" + query.Encode()
}

func googleMapsSearchURL(queryText string) string {
	query := url.Values{"api": {"1"}, "query": {queryText}}
	return "https://www.google.com/maps/search/?" + query.Encode()
}

func googleMapsDirectionsURL(destination string) string {
	query := url.Values{
		"api":         {"1"},
		"destination": {destination},
		"travelmode":  {"driving"},
	}
	return "https://www.google.com/maps/dir/?" + query.Encode()
}

func openStreetMapEmbedURL(lat, lon float64) string {
	minLat := math.Max(-90, lat-0.006)
	maxLat := math.Min(90, lat+0.006)
	minLon := math.Max(-180, lon-0.01)
	maxLon := math.Min(180, lon+0.01)
	query := url.Values{
		"bbox":   {fmt.Sprintf("%.7f,%.7f,%.7f,%.7f", minLon, minLat, maxLon, maxLat)},
		"layer":  {"mapnik"},
		"marker": {fmt.Sprintf("%.7f,%.7f", lat, lon)},
	}
	return "https://www.openstreetmap.org/export/embed.html?" + query.Encode()
}

func validGeo(lat, lon float64) bool {
	return !math.IsNaN(lat) && !math.IsNaN(lon) &&
		lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && (lat != 0 || lon != 0)
}

func geoDistanceKm(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371
	toRadians := func(degrees float64) float64 { return degrees * math.Pi / 180 }
	dLat := toRadians(lat2 - lat1)
	dLon := toRadians(lon2 - lon1)
	h := math.Pow(math.Sin(dLat/2), 2) + math.Cos(toRadians(lat1))*math.Cos(toRadians(lat2))*math.Pow(math.Sin(dLon/2), 2)
	return 2 * earthRadiusKm * math.Asin(math.Sqrt(h))
}

func nonEmpty(values ...string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			out = append(out, strings.TrimSpace(value))
		}
	}
	return out
}
