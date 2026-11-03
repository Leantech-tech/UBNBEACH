package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
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
	Source     string  `json:"source,omitempty"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	DistanceKm float64 `json:"distanceKm,omitempty"`
}

type overpassElement struct {
	Type   string                      `json:"type"`
	ID     int64                       `json:"id"`
	Lat    float64                     `json:"lat"`
	Lon    float64                     `json:"lon"`
	Center *struct{ Lat, Lon float64 } `json:"center"`
	Tags   map[string]string           `json:"tags"`
}

type nearbyCacheEntry struct {
	places  []nearbyPlace
	expires time.Time
}

type nearbyService struct {
	endpoint string
	client   *http.Client
	mu       sync.Mutex
	cache    map[string]nearbyCacheEntry
	pending  map[string]chan struct{}
	serial   chan struct{}
}

func newNearbyService(endpoint string) *nearbyService {
	if endpoint == "" {
		endpoint = "https://overpass-api.de/api/interpreter"
	}
	return &nearbyService{
		endpoint: endpoint,
		client:   &http.Client{Timeout: 30 * time.Second},
		cache:    make(map[string]nearbyCacheEntry),
		pending:  make(map[string]chan struct{}),
		serial:   make(chan struct{}, 1),
	}
}

// A localização é lida do cadastro ativo no servidor; o cliente não escolhe
// coordenadas. Para um endereço oculto, só os próprios pontos são publicados.
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
	service := a.nearby
	if service == nil {
		service = newNearbyService(os.Getenv("OVERPASS_URL"))
	}
	places, err := service.places(r.Context(), lat.Float64, lon.Float64)
	if err != nil {
		log.Printf("AVISO: busca de pontos próximos indisponível: %v", err)
		if len(registered) == 0 {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "busca de pontos indisponível"})
			return
		}
	}
	combined := mergeNearbyPlaces(places, registered)
	writeJSON(w, http.StatusOK, map[string]any{"radiusKm": 10, "points": publicNearbyPlaces(combined, hidden), "partial": err != nil})
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
		places = append(places, point)
	}
	return places, rows.Err()
}

func mergeNearbyPlaces(osm, registered []nearbyPlace) []nearbyPlace {
	out := append([]nearbyPlace(nil), osm...)
	for _, point := range registered {
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
	sort.Slice(out, func(i, j int) bool { return out[i].DistanceKm < out[j].DistanceKm })
	return out
}

func publicNearbyPlaces(places []nearbyPlace, hidden bool) []nearbyPlace {
	if !hidden {
		return places
	}
	public := append([]nearbyPlace(nil), places...)
	for i := range public {
		public[i].DistanceKm = 0
	}
	// A ordem por distância também poderia indicar a origem oculta.
	sort.Slice(public, func(i, j int) bool { return public[i].Name < public[j].Name })
	return public
}

func validGeo(lat, lon float64) bool {
	return !math.IsNaN(lat) && !math.IsNaN(lon) &&
		lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && (lat != 0 || lon != 0)
}

func (s *nearbyService) places(ctx context.Context, lat, lon float64) ([]nearbyPlace, error) {
	key := fmt.Sprintf("%.7f,%.7f", lat, lon)
	for {
		s.mu.Lock()
		if entry, ok := s.cache[key]; ok && time.Now().Before(entry.expires) {
			s.mu.Unlock()
			return entry.places, nil
		}
		if wait, ok := s.pending[key]; ok {
			s.mu.Unlock()
			select {
			case <-wait:
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}
		wait := make(chan struct{})
		s.pending[key] = wait
		s.mu.Unlock()

		var places []nearbyPlace
		var err error
		select {
		case s.serial <- struct{}{}:
			places, err = s.fetch(ctx, lat, lon)
			<-s.serial
		case <-ctx.Done():
			err = ctx.Err()
		}
		s.mu.Lock()
		if err == nil {
			s.cache[key] = nearbyCacheEntry{places: places, expires: time.Now().Add(24 * time.Hour)}
		}
		delete(s.pending, key)
		close(wait)
		s.mu.Unlock()
		return places, err
	}
}

func overpassQuery(lat, lon float64) string {
	area := fmt.Sprintf("(around:%d,%.7f,%.7f)", nearbyRadiusMeters, lat, lon)
	return "[out:json][timeout:25];(" +
		"nwr" + area + `[name][amenity~"^(pharmacy|restaurant|fast_food|cafe|bar|pub|ice_cream|food_court|marketplace|hospital|clinic|cinema|theatre)$"];` +
		"nwr" + area + `[name][shop~"^(supermarket|convenience|bakery|greengrocer|mall|department_store|general|seafood|butcher|beverages)$"];` +
		"nwr" + area + `[name][tourism~"^(attraction|museum|viewpoint|gallery|zoo|theme_park|aquarium)$"];` +
		"nwr" + area + `[name][natural~"^(beach|waterfall)$"];` +
		"nwr" + area + `[name][waterway=waterfall];` +
		"nwr" + area + `[name][leisure~"^(park|nature_reserve|water_park|playground)$"];` +
		"nwr" + area + `[name][historic];` +
		");out center;"
}

func (s *nearbyService) fetch(ctx context.Context, lat, lon float64) ([]nearbyPlace, error) {
	form := url.Values{"data": {overpassQuery(lat, lon)}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "UBNBeach/1.0 (property-nearby-places)")
	response, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Overpass HTTP %d", response.StatusCode)
	}
	var data struct {
		Elements []overpassElement `json:"elements"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 20<<20)).Decode(&data); err != nil {
		return nil, err
	}
	places := make([]nearbyPlace, 0, len(data.Elements))
	for _, element := range data.Elements {
		if place, ok := normalizePlace(element, lat, lon); ok {
			places = append(places, place)
		}
	}
	sort.Slice(places, func(i, j int) bool {
		if places[i].DistanceKm == places[j].DistanceKm {
			return places[i].Name < places[j].Name
		}
		return places[i].DistanceKm < places[j].DistanceKm
	})
	return places, nil
}

func normalizePlace(element overpassElement, originLat, originLon float64) (nearbyPlace, bool) {
	name := strings.TrimSpace(element.Tags["name:pt"])
	if name == "" {
		name = strings.TrimSpace(element.Tags["name"])
	}
	if name == "" || element.Tags["access"] == "private" {
		return nearbyPlace{}, false
	}
	lat, lon := element.Lat, element.Lon
	if element.Center != nil {
		lat, lon = element.Center.Lat, element.Center.Lon
	}
	if !validGeo(lat, lon) {
		return nearbyPlace{}, false
	}
	distance := geoDistanceKm(originLat, originLon, lat, lon)
	if distance > 10 {
		return nearbyPlace{}, false
	}
	category, icon := placeCategory(element.Tags)
	if category == "" {
		return nearbyPlace{}, false
	}
	address := strings.Join(nonEmpty(element.Tags["addr:street"], element.Tags["addr:housenumber"]), ", ")
	if address == "" {
		address = strings.TrimSpace(element.Tags["addr:suburb"])
	}
	return nearbyPlace{
		ID: fmt.Sprintf("osm-%s-%d", element.Type, element.ID), Name: name,
		Category: category, Icon: icon, Address: address, Source: "osm",
		Latitude: lat, Longitude: lon, DistanceKm: distance,
	}, true
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

func placeCategory(tags map[string]string) (string, string) {
	switch tags["amenity"] {
	case "pharmacy":
		return "Farmácias", "pharmacy"
	case "hospital", "clinic":
		return "Saúde", "pharmacy"
	case "restaurant", "fast_food", "food_court":
		cuisine := strings.ToLower(tags["cuisine"] + ";" + tags["name"])
		if strings.Contains(cuisine, "pizza") {
			return "Pizzarias", "restaurant"
		}
		if strings.Contains(cuisine, "burger") || strings.Contains(cuisine, "hamburg") {
			return "Hamburguerias", "restaurant"
		}
		return "Restaurantes e lanches", "restaurant"
	case "cafe", "ice_cream":
		return "Cafés e sorveterias", "cafe"
	case "bar", "pub":
		return "Bares", "bar"
	case "marketplace":
		return "Mercados", "cart"
	case "cinema", "theatre":
		return "Cultura e lazer", "ticket"
	}
	switch tags["shop"] {
	case "supermarket", "convenience", "greengrocer", "general", "butcher", "seafood":
		return "Mercados", "cart"
	case "bakery":
		return "Padarias", "cart"
	case "mall", "department_store":
		return "Compras", "store"
	case "beverages":
		return "Bebidas", "store"
	}
	switch tags["natural"] {
	case "beach":
		return "Praias", "beach"
	case "waterfall":
		return "Cachoeiras", "waterfall"
	}
	if tags["waterway"] == "waterfall" {
		return "Cachoeiras", "waterfall"
	}
	if tags["tourism"] != "" {
		return "Atrações turísticas", "tour"
	}
	if tags["leisure"] != "" {
		return "Parques e lazer", "park"
	}
	if tags["historic"] != "" {
		return "História e cultura", "tour"
	}
	return "", ""
}

func geoDistanceKm(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371
	toRadians := func(degrees float64) float64 { return degrees * math.Pi / 180 }
	dLat := toRadians(lat2 - lat1)
	dLon := toRadians(lon2 - lon1)
	h := math.Pow(math.Sin(dLat/2), 2) + math.Cos(toRadians(lat1))*math.Cos(toRadians(lat2))*math.Pow(math.Sin(dLon/2), 2)
	return 2 * earthRadiusKm * math.Asin(math.Sqrt(h))
}
