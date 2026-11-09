package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

// O catálogo é atualizado em segundo plano. Abrir o popup consulta somente o banco local.
const osmPOIQuery = `[out:json][timeout:100];(
  nwr["natural"="beach"](-23.70,-45.50,-23.15,-44.65);
  nwr["natural"="waterfall"](-23.70,-45.50,-23.15,-44.65);
  nwr["waterway"="waterfall"](-23.70,-45.50,-23.15,-44.65);
  nwr["shop"](-23.70,-45.50,-23.15,-44.65);
  nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub|pharmacy|hospital|clinic|marketplace|ice_cream|food_court)$"](-23.70,-45.50,-23.15,-44.65);
  nwr["tourism"~"^(attraction|viewpoint|museum|gallery|zoo|aquarium|theme_park)$"](-23.70,-45.50,-23.15,-44.65);
  nwr["leisure"~"^(park|nature_reserve)$"](-23.70,-45.50,-23.15,-44.65);
);out center;`

type osmElement struct {
	Type   string  `json:"type"`
	ID     int64   `json:"id"`
	Lat    float64 `json:"lat"`
	Lon    float64 `json:"lon"`
	Center *struct {
		Lat float64 `json:"lat"`
		Lon float64 `json:"lon"`
	} `json:"center"`
	Tags map[string]string `json:"tags"`
}

func ensureLocalPOITable(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS osm_pontos_interesse (
		id TEXT PRIMARY KEY,
		nome TEXT NOT NULL,
		categoria TEXT NOT NULL,
		icone TEXT NOT NULL,
		endereco TEXT NOT NULL DEFAULT '',
		latitude DOUBLE PRECISION NOT NULL,
		longitude DOUBLE PRECISION NOT NULL,
		url TEXT NOT NULL,
		atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_osm_pontos_coords ON osm_pontos_interesse(latitude, longitude);`)
	return err
}

func runLocalPOISync(db *sql.DB) {
	refresh := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 140*time.Second)
		defer cancel()
		var updated sql.NullTime
		if err := db.QueryRowContext(ctx, `SELECT max(atualizado_em) FROM osm_pontos_interesse`).Scan(&updated); err != nil {
			log.Printf("AVISO: não foi possível verificar catálogo OSM: %v", err)
			return
		}
		if updated.Valid && time.Since(updated.Time) < 7*24*time.Hour {
			return
		}
		if err := syncLocalPOIs(ctx, db); err != nil {
			log.Printf("AVISO: atualização de pontos OSM adiada: %v", err)
		}
	}
	refresh()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		refresh()
	}
}

func syncLocalPOIs(ctx context.Context, db *sql.DB) error {
	points, err := fetchOSMPoints(ctx)
	if err != nil {
		return err
	}
	if len(points) == 0 {
		return fmt.Errorf("consulta OSM não retornou pontos utilizáveis")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `DELETE FROM osm_pontos_interesse`); err != nil {
		return err
	}
	for _, point := range points {
		_, err := tx.ExecContext(ctx, `INSERT INTO osm_pontos_interesse
			(id, nome, categoria, icone, endereco, latitude, longitude, url)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, point.ID, point.Name, point.Category,
			point.Icon, point.Address, point.Latitude, point.Longitude, point.OSMURL)
		if err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	log.Printf("catálogo OSM atualizado: %d pontos", len(points))
	return nil
}

func fetchOSMPoints(ctx context.Context) ([]nearbyPlace, error) {
	endpoints := []string{
		"https://overpass.private.coffee/api/interpreter",
		"https://maps.mail.ru/osm/tools/overpass/api/interpreter",
	}
	return fetchOSMPointsFrom(ctx, endpoints, &http.Client{Timeout: 60 * time.Second})
}

func fetchOSMPointsFrom(ctx context.Context, endpoints []string, client *http.Client) ([]nearbyPlace, error) {
	form := url.Values{"data": {osmPOIQuery}}.Encode()
	var lastErr error
	for _, endpoint := range endpoints {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("User-Agent", "UBNBeach-POI/1.0 (weekly local catalog sync)")
		response, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		if response.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("Overpass HTTP %d em %s", response.StatusCode, endpoint)
			response.Body.Close()
			continue
		}
		var data struct {
			Elements []osmElement `json:"elements"`
		}
		err = json.NewDecoder(io.LimitReader(response.Body, 32<<20)).Decode(&data)
		response.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}
		points := normalizeOSMElements(data.Elements)
		if len(points) > 0 {
			return points, nil
		}
		lastErr = fmt.Errorf("Overpass não retornou pontos utilizáveis em %s", endpoint)
	}
	return nil, lastErr
}

func normalizeOSMElements(elements []osmElement) []nearbyPlace {
	points := make([]nearbyPlace, 0, len(elements))
	seen := make(map[string]bool, len(elements))
	for _, element := range elements {
		if element.Type != "node" && element.Type != "way" && element.Type != "relation" {
			continue
		}
		id := fmt.Sprintf("%s/%d", element.Type, element.ID)
		if seen[id] {
			continue
		}
		seen[id] = true
		name := strings.TrimSpace(element.Tags["name"])
		if name == "" {
			name = strings.TrimSpace(element.Tags["name:pt"])
		}
		if name == "" {
			continue
		}
		category, icon := osmCategory(element.Tags)
		if category == "" {
			continue
		}
		lat, lon := element.Lat, element.Lon
		if element.Center != nil {
			lat, lon = element.Center.Lat, element.Center.Lon
		}
		if !validGeo(lat, lon) {
			continue
		}
		address := strings.Join(nonEmpty(element.Tags["addr:street"], element.Tags["addr:housenumber"]), ", ")
		if address == "" {
			address = strings.TrimSpace(element.Tags["addr:suburb"])
		}
		points = append(points, nearbyPlace{ID: id, Name: name, Category: category, Icon: icon,
			Address: address, Latitude: lat, Longitude: lon, Source: "osm",
			OSMURL: "https://www.openstreetmap.org/" + id})
	}
	return points
}

func osmCategory(tags map[string]string) (string, string) {
	switch {
	case tags["natural"] == "beach":
		return "Praias", "beach"
	case tags["natural"] == "waterfall" || tags["waterway"] == "waterfall":
		return "Cachoeiras", "waterfall"
	case tags["amenity"] == "pharmacy":
		return "Farmácias", "pharmacy"
	case tags["amenity"] == "hospital" || tags["amenity"] == "clinic":
		return "Saúde", "pharmacy"
	case tags["shop"] == "supermarket" || tags["shop"] == "convenience" || tags["amenity"] == "marketplace":
		return "Mercados", "cart"
	case tags["shop"] == "bakery":
		return "Padarias", "cart"
	case tags["shop"] != "":
		return "Lojas e compras", "store"
	case tags["amenity"] == "cafe":
		return "Cafés", "cafe"
	case tags["amenity"] == "bar" || tags["amenity"] == "pub":
		return "Bares", "bar"
	case tags["amenity"] == "ice_cream":
		return "Sorveterias", "cafe"
	case tags["amenity"] == "restaurant" || tags["amenity"] == "fast_food" || tags["amenity"] == "food_court":
		return "Restaurantes e lanches", "restaurant"
	case tags["leisure"] == "park" || tags["leisure"] == "nature_reserve":
		return "Parques e natureza", "park"
	case tags["tourism"] != "":
		return "Atrações turísticas", "tour"
	default:
		return "", ""
	}
}

func localOSMNearby(ctx context.Context, db *sql.DB, lat, lon float64) ([]nearbyPlace, error) {
	rows, err := db.QueryContext(ctx, `SELECT id, nome, categoria, icone, endereco, latitude, longitude, url
		FROM osm_pontos_interesse WHERE latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4`,
		lat-0.11, lat+0.11, lon-0.12, lon+0.12)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	points := []nearbyPlace{}
	for rows.Next() {
		var point nearbyPlace
		if err := rows.Scan(&point.ID, &point.Name, &point.Category, &point.Icon, &point.Address,
			&point.Latitude, &point.Longitude, &point.OSMURL); err != nil {
			return nil, err
		}
		point.MapsURL = googleMapsSearchURL(fmt.Sprintf("%.7f,%.7f", point.Latitude, point.Longitude))
		point.DistanceKm = geoDistanceKm(lat, lon, point.Latitude, point.Longitude)
		if point.DistanceKm > float64(nearbyRadiusMeters)/1000 {
			continue
		}
		point.Source = "osm"
		points = append(points, point)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	sort.Slice(points, func(i, j int) bool { return points[i].DistanceKm < points[j].DistanceKm })
	return points, nil
}
