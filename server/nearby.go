package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

const nearbyRadiusMeters = 10000

type nearbyPlace struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Category   string  `json:"category"`
	Icon       string  `json:"icon"`
	Address    string  `json:"address"`
	DistanceKm float64 `json:"distanceKm,omitempty"`
	Latitude   float64 `json:"-"`
	Longitude  float64 `json:"-"`
}

type googlePlace struct {
	ID          string `json:"id"`
	DisplayName struct {
		Text string `json:"text"`
	} `json:"displayName"`
	FormattedAddress string `json:"formattedAddress"`
	Location         struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"location"`
	PrimaryType string `json:"primaryType"`
}

type googlePlacesResponse struct {
	Places        []googlePlace `json:"places"`
	NextPageToken string        `json:"nextPageToken"`
}

type nearbySearch struct {
	category string
	icon     string
	types    []string
	text     string
}

var nearbySearches = []nearbySearch{
	{category: "Farmácias", icon: "pharmacy", types: []string{"pharmacy", "drugstore"}},
	{category: "Mercados", icon: "cart", types: []string{"supermarket", "grocery_store", "convenience_store", "market"}},
	{category: "Praias", icon: "beach", types: []string{"beach"}},
	{category: "Restaurantes", icon: "restaurant", types: []string{"restaurant"}},
	{category: "Pizzarias", icon: "restaurant", types: []string{"pizza_restaurant"}},
	{category: "Hamburguerias", icon: "restaurant", types: []string{"hamburger_restaurant"}},
	{category: "Cafés", icon: "cafe", types: []string{"cafe", "coffee_shop"}},
	{category: "Padarias", icon: "cart", types: []string{"bakery"}},
	{category: "Atrações turísticas", icon: "tour", types: []string{"tourist_attraction", "historical_landmark", "museum", "scenic_spot"}},
	{category: "Parques e trilhas", icon: "park", types: []string{"park", "hiking_area"}},
	{category: "Cachoeiras", icon: "waterfall", text: "cachoeira"},
}

type nearbyService struct {
	key      string
	endpoint string
	client   *http.Client
	mu       sync.Mutex
	requests []time.Time
	perIP    map[string][]time.Time
}

func newNearbyService(key string) *nearbyService {
	return &nearbyService{
		key:      strings.TrimSpace(key),
		endpoint: "https://places.googleapis.com/v1",
		client:   &http.Client{Timeout: 12 * time.Second},
		perIP:    make(map[string][]time.Time),
	}
}

// O servidor usa o pino interno do imóvel. O navegador não recebe esse pino.
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
	if service.key == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "Google Maps ainda não configurado"})
		return
	}
	clientIP, _, splitErr := net.SplitHostPort(r.RemoteAddr)
	if splitErr != nil {
		clientIP = r.RemoteAddr
	}
	if !service.allowRequest(clientIP, time.Now()) {
		w.Header().Set("Retry-After", "3600")
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "limite temporário de consultas atingido"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
	defer cancel()
	places, limited, partial, err := service.places(ctx, lat.Float64, lon.Float64)
	if err != nil {
		log.Printf("AVISO: consulta Google Places indisponível: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "consulta de lugares indisponível"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"radiusKm": 10,
		"points":   publicNearbyPlaces(places, hidden),
		"limited":  limited,
		"partial":  partial,
	})
}

func (s *nearbyService) places(ctx context.Context, lat, lon float64) ([]nearbyPlace, bool, bool, error) {
	type result struct {
		places  []nearbyPlace
		limited bool
		err     error
	}
	results := make(chan result, len(nearbySearches))
	semaphore := make(chan struct{}, 4)
	var jobs sync.WaitGroup
	for _, search := range nearbySearches {
		jobs.Add(1)
		go func(search nearbySearch) {
			defer jobs.Done()
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-ctx.Done():
				results <- result{err: ctx.Err()}
				return
			}
			places, limited, err := s.search(ctx, lat, lon, search)
			results <- result{places: places, limited: limited, err: err}
		}(search)
	}
	jobs.Wait()
	close(results)
	unique := map[string]nearbyPlace{}
	var limited, partial, succeeded bool
	for result := range results {
		if result.err != nil {
			partial = true
			log.Printf("AVISO: uma categoria do Google Places falhou: %v", result.err)
			continue
		}
		succeeded = true
		limited = limited || result.limited
		for _, place := range result.places {
			if previous, ok := unique[place.ID]; !ok || place.Category == "Pizzarias" || place.Category == "Hamburguerias" || previous.Category == "Atrações turísticas" {
				unique[place.ID] = place
			}
		}
	}
	if !succeeded {
		return nil, false, true, fmt.Errorf("todas as categorias falharam")
	}
	places := make([]nearbyPlace, 0, len(unique))
	for _, place := range unique {
		places = append(places, place)
	}
	sort.Slice(places, func(i, j int) bool {
		if places[i].DistanceKm == places[j].DistanceKm {
			return places[i].Name < places[j].Name
		}
		return places[i].DistanceKm < places[j].DistanceKm
	})
	return places, limited, partial, nil
}

func (s *nearbyService) search(ctx context.Context, lat, lon float64, search nearbySearch) ([]nearbyPlace, bool, error) {
	points := []nearbyPlace{}
	pageToken := ""
	for page := 0; page < 3; page++ {
		path := "/places:searchNearby"
		var body map[string]any
		if search.text == "" {
			body = map[string]any{
				"includedTypes": search.types, "maxResultCount": 20,
				"rankPreference": "DISTANCE", "languageCode": "pt-BR", "regionCode": "BR",
				"locationRestriction": map[string]any{"circle": map[string]any{
					"center": map[string]float64{"latitude": lat, "longitude": lon}, "radius": nearbyRadiusMeters,
				}},
			}
		} else {
			// Text Search não possui tipo waterfall: busca no retângulo e filtra no círculo.
			latDelta := 10.2 / 111.32
			lonDelta := 10.2 / (111.32 * math.Cos(lat*math.Pi/180))
			body = map[string]any{
				"textQuery": search.text, "pageSize": 20,
				"languageCode": "pt-BR", "regionCode": "BR",
				"locationRestriction": map[string]any{"rectangle": map[string]any{
					"low":  map[string]float64{"latitude": lat - latDelta, "longitude": lon - lonDelta},
					"high": map[string]float64{"latitude": lat + latDelta, "longitude": lon + lonDelta},
				}},
			}
			if pageToken != "" {
				body["pageToken"] = pageToken
			}
			path = "/places:searchText"
		}
		response, err := s.request(ctx, path, body)
		if err != nil {
			return nil, false, err
		}
		for _, item := range response.Places {
			if point, ok := normalizeGooglePlace(item, search, lat, lon); ok {
				points = append(points, point)
			}
		}
		if search.text == "" {
			return points, len(response.Places) == 20, nil
		}
		pageToken = response.NextPageToken
		if pageToken == "" {
			return points, false, nil
		}
	}
	return points, pageToken != "", nil
}

func (s *nearbyService) request(ctx context.Context, path string, body map[string]any) (googlePlacesResponse, error) {
	var output googlePlacesResponse
	data, err := json.Marshal(body)
	if err != nil {
		return output, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint+path, bytes.NewReader(data))
	if err != nil {
		return output, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", s.key)
	mask := "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType"
	if path == "/places:searchText" {
		mask += ",nextPageToken"
	}
	req.Header.Set("X-Goog-FieldMask", mask)
	response, err := s.client.Do(req)
	if err != nil {
		return output, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return output, fmt.Errorf("Google Places HTTP %d", response.StatusCode)
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 2<<20)).Decode(&output); err != nil {
		return output, err
	}
	return output, nil
}

func normalizeGooglePlace(item googlePlace, search nearbySearch, originLat, originLon float64) (nearbyPlace, bool) {
	name := strings.TrimSpace(item.DisplayName.Text)
	lat, lon := item.Location.Latitude, item.Location.Longitude
	if item.ID == "" || name == "" || !validGeo(lat, lon) {
		return nearbyPlace{}, false
	}
	distance := geoDistanceKm(originLat, originLon, lat, lon)
	if distance > 10 {
		return nearbyPlace{}, false
	}
	category, icon := search.category, search.icon
	switch item.PrimaryType {
	case "pizza_restaurant":
		category, icon = "Pizzarias", "restaurant"
	case "hamburger_restaurant":
		category, icon = "Hamburguerias", "restaurant"
	}
	return nearbyPlace{
		ID: item.ID, Name: name, Category: category, Icon: icon,
		Address: item.FormattedAddress, Latitude: lat, Longitude: lon, DistanceKm: distance,
	}, true
}

func publicNearbyPlaces(places []nearbyPlace, hidden bool) []nearbyPlace {
	public := append([]nearbyPlace(nil), places...)
	if hidden {
		for i := range public {
			public[i].DistanceKm = 0
		}
		// A ordem por distância também poderia indicar a origem oculta.
		sort.Slice(public, func(i, j int) bool { return public[i].Name < public[j].Name })
	}
	return public
}

func validGeo(lat, lon float64) bool {
	return !math.IsNaN(lat) && !math.IsNaN(lon) &&
		lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && (lat != 0 || lon != 0)
}

// Limite local para evitar que um botão público gere tráfego cobrado sem controle.
// O projeto Google Cloud também deve ter quota configurada.
func (s *nearbyService) allowRequest(ip string, now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	cutoff := now.Add(-time.Hour)
	fresh := func(times []time.Time) []time.Time {
		out := times[:0]
		for _, at := range times {
			if at.After(cutoff) {
				out = append(out, at)
			}
		}
		return out
	}
	s.requests = fresh(s.requests)
	for knownIP, times := range s.perIP {
		if remaining := fresh(times); len(remaining) > 0 {
			s.perIP[knownIP] = remaining
		} else {
			delete(s.perIP, knownIP)
		}
	}
	if len(s.requests) >= 30 || len(s.perIP[ip]) >= 5 {
		return false
	}
	s.requests = append(s.requests, now)
	s.perIP[ip] = append(s.perIP[ip], now)
	return true
}

func geoDistanceKm(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371
	toRadians := func(degrees float64) float64 { return degrees * math.Pi / 180 }
	dLat := toRadians(lat2 - lat1)
	dLon := toRadians(lon2 - lon1)
	h := math.Pow(math.Sin(dLat/2), 2) + math.Cos(toRadians(lat1))*math.Cos(toRadians(lat2))*math.Pow(math.Sin(dLon/2), 2)
	return 2 * earthRadiusKm * math.Asin(math.Sqrt(h))
}
