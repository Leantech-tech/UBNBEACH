package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	nearbyRadiusMeters      = 10000
	nearbyMaxResults        = 20
	nearbyMaxWaterfallPages = 2
	nearbyIPLimit           = 5
	nearbyInstanceLimit     = 30
	nearbyLimitWindow       = time.Hour
	googlePlacesBaseURL     = "https://places.googleapis.com/v1"
	googlePlacesFieldMask   = "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types"
)

var waterfallSearchTerms = []string{
	"cachoeira", "cachoeiras", "cascata", "cascatas",
	"queda d'água", "quedas d'água", "waterfall",
}

type nearbyPlace struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Category   string  `json:"category"`
	Icon       string  `json:"icon"`
	Address    string  `json:"address"`
	Source     string  `json:"source,omitempty"`
	MapsURL    string  `json:"googleMapsUrl,omitempty"`
	Latitude   float64 `json:"-"`
	Longitude  float64 `json:"-"`
	DistanceKm float64 `json:"distanceKm,omitempty"`
}

type googleLocation struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type googlePlace struct {
	ID          string `json:"id"`
	DisplayName struct {
		Text string `json:"text"`
	} `json:"displayName"`
	FormattedAddress string          `json:"formattedAddress"`
	Location         *googleLocation `json:"location"`
	PrimaryType      string          `json:"primaryType"`
	Types            []string        `json:"types"`
}

type googlePlacesResponse struct {
	Places        []googlePlace `json:"places"`
	NextPageToken string        `json:"nextPageToken"`
}

type nearbySearchGroup struct {
	types            []string
	fallbackCategory string
	fallbackIcon     string
}

var nearbySearchGroups = []nearbySearchGroup{
	{
		types:            []string{"pharmacy", "drugstore", "hospital", "general_hospital", "medical_center", "medical_clinic", "doctor"},
		fallbackCategory: "Farmácias e saúde", fallbackIcon: "pharmacy",
	},
	{
		types:            []string{"restaurant", "fast_food_restaurant", "pizza_restaurant", "cafe", "coffee_shop", "bakery", "bar", "ice_cream_shop", "food_court"},
		fallbackCategory: "Restaurantes e lanches", fallbackIcon: "restaurant",
	},
	{
		types:            []string{"supermarket", "grocery_store", "convenience_store", "market", "farmers_market", "shopping_mall", "department_store", "store"},
		fallbackCategory: "Mercados e compras", fallbackIcon: "cart",
	},
	{
		types:            []string{"beach", "tourist_attraction", "park", "national_park", "state_park", "amusement_park", "water_park", "museum", "art_gallery", "aquarium", "zoo", "scenic_spot", "nature_preserve", "historical_landmark", "hiking_area"},
		fallbackCategory: "Praias e atrações", fallbackIcon: "tour",
	},
}

type nearbyIPWindow struct {
	started time.Time
	count   int
}

type nearbyRateLimiter struct {
	mu      sync.Mutex
	started time.Time
	count   int
	byIP    map[string]nearbyIPWindow
}

type nearbyService struct {
	apiKey   string
	endpoint string
	client   *http.Client
	serial   chan struct{}
	limits   nearbyRateLimiter
}

func newNearbyService(apiKey string) *nearbyService {
	return &nearbyService{
		apiKey:   strings.TrimSpace(apiKey),
		endpoint: googlePlacesBaseURL,
		client:   &http.Client{Timeout: 8 * time.Second},
		serial:   make(chan struct{}, 1),
		limits:   nearbyRateLimiter{byIP: make(map[string]nearbyIPWindow)},
	}
}

func (s *nearbyService) configured() bool {
	return s != nil && strings.TrimSpace(s.apiKey) != ""
}

func (s *nearbyService) allowRequest(ip string) bool {
	if s == nil {
		return false
	}
	return s.limits.allow(ip, time.Now())
}

func (limiter *nearbyRateLimiter) allow(ip string, now time.Time) bool {
	limiter.mu.Lock()
	defer limiter.mu.Unlock()

	if limiter.byIP == nil {
		limiter.byIP = make(map[string]nearbyIPWindow)
	}
	if limiter.started.IsZero() || now.Sub(limiter.started) >= nearbyLimitWindow || now.Before(limiter.started) {
		limiter.started = now
		limiter.count = 0
	}
	for address, window := range limiter.byIP {
		if now.Sub(window.started) >= nearbyLimitWindow || now.Before(window.started) {
			delete(limiter.byIP, address)
		}
	}
	if ip == "" {
		ip = "unknown"
	}
	window, ok := limiter.byIP[ip]
	if !ok || now.Sub(window.started) >= nearbyLimitWindow || now.Before(window.started) {
		window = nearbyIPWindow{started: now}
	}
	if limiter.count >= nearbyInstanceLimit || window.count >= nearbyIPLimit {
		limiter.byIP[ip] = window
		return false
	}
	limiter.count++
	window.count++
	limiter.byIP[ip] = window
	return true
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
	service := a.nearby
	if service == nil {
		service = newNearbyService(os.Getenv("GOOGLE_PLACES_API_KEY"))
	}
	if !service.configured() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "Google Places API não configurada"})
		return
	}
	if !service.allowRequest(remoteIP(r.RemoteAddr)) {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "limite de consultas atingido"})
		return
	}
	registered, err := registeredNearby(r.Context(), a.DB(), lat.Float64, lon.Float64)
	if err != nil {
		respondError(w, err)
		return
	}
	places, partial, limited, searchErr := service.places(r.Context(), lat.Float64, lon.Float64)
	if searchErr != nil {
		log.Printf("AVISO: busca de pontos no Google Places indisponível: %v", searchErr)
		partial = true
		if len(places) == 0 && len(registered) == 0 {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "busca de pontos indisponível"})
			return
		}
	}
	combined := mergeNearbyPlaces(places, registered)
	writeJSON(w, http.StatusOK, map[string]any{
		"radiusKm": 10,
		"points":   publicNearbyPlaces(combined, hidden),
		"partial":  partial,
		"limited":  limited,
	})
}

// O pin é aberto sob demanda em um link do Google Maps. Isso evita devolver
// latitude e longitude no catálogo público, mas permite a localização exata
// solicitada para cada imóvel com coordenadas cadastradas.
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
	http.Redirect(w, r, googleMapsSearchURL(destination), http.StatusFound)
}

// O mapa incorporado usa uma chave pública separada, restrita no Google Cloud
// ao domínio do site e à Maps Embed API. A resposta nunca inclui coordenadas
// como campos próprios do cadastro; elas só são usadas para centralizar o mapa.
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
	mapURL := googleMapsSearchURL(center)
	embedURL := ""
	if key := strings.TrimSpace(os.Getenv("GOOGLE_MAPS_EMBED_API_KEY")); key != "" {
		embedURL = googleMapsEmbedURL(key, lat.Float64, lon.Float64)
	}
	writeJSON(w, http.StatusOK, map[string]string{"embedUrl": embedURL, "mapUrl": mapURL})
}

func remoteIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil {
		return host
	}
	return strings.TrimSpace(remoteAddr)
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

func mergeNearbyPlaces(google, registered []nearbyPlace) []nearbyPlace {
	out := append([]nearbyPlace(nil), google...)
	for _, point := range registered {
		if point.MapsURL == "" {
			point.MapsURL = googleMapsURLForPlace("", point.Name, point.Address, point.Latitude, point.Longitude)
		}
		duplicate := false
		for _, known := range google {
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

func (s *nearbyService) places(ctx context.Context, lat, lon float64) ([]nearbyPlace, bool, bool, error) {
	if !s.configured() {
		return nil, false, false, fmt.Errorf("Google Places API não configurada")
	}
	select {
	case s.serial <- struct{}{}:
		defer func() { <-s.serial }()
		return s.fetch(ctx, lat, lon)
	case <-ctx.Done():
		return nil, false, false, ctx.Err()
	}
}

func (s *nearbyService) fetch(ctx context.Context, lat, lon float64) ([]nearbyPlace, bool, bool, error) {
	places := make([]nearbyPlace, 0, 80)
	successes := 0
	var lastErr error
	partial, limited := false, false
	for _, group := range nearbySearchGroups {
		response, err := s.searchNearby(ctx, lat, lon, group.types)
		if err != nil {
			partial = true
			lastErr = err
			continue
		}
		successes++
		if len(response.Places) == nearbyMaxResults {
			limited = true
		}
		for _, result := range response.Places {
			if point, ok := normalizeGooglePlace(result, lat, lon, group.fallbackCategory, group.fallbackIcon); ok {
				places = append(places, point)
			}
		}
	}

	for _, term := range waterfallSearchTerms {
		pageToken := ""
		for page := 0; page < nearbyMaxWaterfallPages; page++ {
			response, err := s.searchWaterfalls(ctx, lat, lon, term, pageToken)
			if err != nil {
				partial = true
				lastErr = err
				break
			}
			successes++
			for _, result := range response.Places {
				if !looksLikeWaterfall(result.DisplayName.Text) {
					continue
				}
				if point, ok := normalizeGooglePlace(result, lat, lon, "Cachoeiras", "waterfall"); ok {
					places = append(places, point)
				}
			}
			pageToken = response.NextPageToken
			if pageToken == "" {
				break
			}
			if page == nearbyMaxWaterfallPages-1 {
				limited = true
			}
		}
	}
	if successes == 0 {
		return nil, partial, limited, fmt.Errorf("nenhuma busca ao Google Places foi concluída: %w", lastErr)
	}
	return deduplicateNearbyPlaces(places), partial, limited, nil
}

func (s *nearbyService) searchNearby(ctx context.Context, lat, lon float64, includedTypes []string) (googlePlacesResponse, error) {
	request := map[string]any{
		"includedTypes":  includedTypes,
		"maxResultCount": nearbyMaxResults,
		"rankPreference": "DISTANCE",
		"languageCode":   "pt-BR",
		"regionCode":     "BR",
		"locationRestriction": map[string]any{
			"circle": map[string]any{
				"center": map[string]float64{"latitude": lat, "longitude": lon},
				"radius": float64(nearbyRadiusMeters),
			},
		},
	}
	return s.post(ctx, "/places:searchNearby", googlePlacesFieldMask, request)
}

func (s *nearbyService) searchWaterfalls(ctx context.Context, lat, lon float64, term, pageToken string) (googlePlacesResponse, error) {
	request := map[string]any{
		"textQuery":      term,
		"pageSize":       nearbyMaxResults,
		"rankPreference": "DISTANCE",
		"languageCode":   "pt-BR",
		"regionCode":     "BR",
		"locationBias": map[string]any{
			"circle": map[string]any{
				"center": map[string]float64{"latitude": lat, "longitude": lon},
				"radius": float64(nearbyRadiusMeters),
			},
		},
	}
	if pageToken != "" {
		request["pageToken"] = pageToken
	}
	return s.post(ctx, "/places:searchText", googlePlacesFieldMask+",nextPageToken", request)
}

func (s *nearbyService) post(ctx context.Context, path, fieldMask string, payload any) (googlePlacesResponse, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return googlePlacesResponse{}, err
	}
	endpoint := strings.TrimRight(s.endpoint, "/") + path
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(body)))
	if err != nil {
		return googlePlacesResponse{}, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Goog-Api-Key", s.apiKey)
	request.Header.Set("X-Goog-FieldMask", fieldMask)
	response, err := s.client.Do(request)
	if err != nil {
		return googlePlacesResponse{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return googlePlacesResponse{}, fmt.Errorf("Google Places HTTP %d", response.StatusCode)
	}
	var data googlePlacesResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, 8<<20)).Decode(&data); err != nil {
		return googlePlacesResponse{}, err
	}
	return data, nil
}

func normalizeGooglePlace(place googlePlace, originLat, originLon float64, fallbackCategory, fallbackIcon string) (nearbyPlace, bool) {
	name := strings.TrimSpace(place.DisplayName.Text)
	if name == "" || place.Location == nil || !validGeo(place.Location.Latitude, place.Location.Longitude) {
		return nearbyPlace{}, false
	}
	distance := geoDistanceKm(originLat, originLon, place.Location.Latitude, place.Location.Longitude)
	if distance > float64(nearbyRadiusMeters)/1000 {
		return nearbyPlace{}, false
	}
	category, icon := googlePlaceCategory(place.PrimaryType, place.Types)
	if category == "" {
		category, icon = fallbackCategory, fallbackIcon
	}
	if category == "" {
		return nearbyPlace{}, false
	}
	return nearbyPlace{
		ID: place.ID, Name: name, Category: category, Icon: icon,
		Address: strings.TrimSpace(place.FormattedAddress), Source: "google",
		MapsURL:  googleMapsURLForPlace(place.ID, name, place.FormattedAddress, place.Location.Latitude, place.Location.Longitude),
		Latitude: place.Location.Latitude, Longitude: place.Location.Longitude, DistanceKm: distance,
	}, true
}

func googlePlaceCategory(primary string, types []string) (string, string) {
	all := append([]string{primary}, types...)
	has := func(want ...string) bool {
		for _, got := range all {
			for _, expected := range want {
				if strings.EqualFold(got, expected) {
					return true
				}
			}
		}
		return false
	}
	switch {
	case has("pharmacy", "drugstore"):
		return "Farmácias", "pharmacy"
	case has("general_hospital", "hospital", "medical_center", "medical_clinic", "doctor", "dentist", "dental_clinic"):
		return "Saúde", "pharmacy"
	case has("beach"):
		return "Praias", "beach"
	case has("supermarket", "grocery_store", "convenience_store", "market", "farmers_market", "food_store"):
		return "Mercados", "cart"
	case has("shopping_mall", "department_store"):
		return "Compras", "store"
	case has("bakery"):
		return "Padarias", "cart"
	case has("cafe", "coffee_shop"):
		return "Cafés", "cafe"
	case has("bar", "cocktail_bar", "brewery", "pub"):
		return "Bares", "bar"
	case has("ice_cream_shop"):
		return "Sorveterias", "cafe"
	case has("park", "national_park", "state_park", "nature_preserve", "hiking_area"):
		return "Parques e natureza", "park"
	case has("restaurant", "fast_food_restaurant", "pizza_restaurant", "food_court", "meal_takeaway"):
		return "Restaurantes e lanches", "restaurant"
	case has("tourist_attraction", "scenic_spot", "historical_landmark", "museum", "art_gallery", "aquarium", "zoo", "amusement_park", "water_park"):
		return "Atrações turísticas", "tour"
	default:
		return "", ""
	}
}

func looksLikeWaterfall(name string) bool {
	value := strings.ToLower(strings.TrimSpace(name))
	value = strings.NewReplacer("á", "a", "à", "a", "ã", "a", "â", "a", "é", "e", "ê", "e", "í", "i", "ó", "o", "ô", "o", "õ", "o", "ú", "u", "ç", "c").Replace(value)
	for _, term := range []string{"cachoeir", "cascat", "waterfall", "queda d", "queda de agua"} {
		if strings.Contains(value, term) {
			return true
		}
	}
	return false
}

func deduplicateNearbyPlaces(places []nearbyPlace) []nearbyPlace {
	out := make([]nearbyPlace, 0, len(places))
	ids := make(map[string]struct{}, len(places))
	for _, point := range places {
		if point.ID != "" {
			if _, exists := ids[point.ID]; exists {
				continue
			}
			ids[point.ID] = struct{}{}
		} else {
			duplicate := false
			for _, known := range out {
				if strings.EqualFold(strings.TrimSpace(known.Name), strings.TrimSpace(point.Name)) &&
					geoDistanceKm(known.Latitude, known.Longitude, point.Latitude, point.Longitude) < 0.05 {
					duplicate = true
					break
				}
			}
			if duplicate {
				continue
			}
		}
		out = append(out, point)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].DistanceKm == out[j].DistanceKm {
			return out[i].Name < out[j].Name
		}
		return out[i].DistanceKm < out[j].DistanceKm
	})
	return out
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

func googleMapsEmbedURL(key string, lat, lon float64) string {
	location := fmt.Sprintf("%.7f,%.7f", lat, lon)
	query := url.Values{
		"key":      {key},
		"q":        {location},
		"zoom":     {"17"},
		"maptype":  {"roadmap"},
		"language": {"pt-BR"},
	}
	return "https://www.google.com/maps/embed/v1/place?" + query.Encode()
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
