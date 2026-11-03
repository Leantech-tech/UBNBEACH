package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

func TestOverpassQueryCoversRequestedPlaces(t *testing.T) {
	query := overpassQuery(-23.5, -45.1)
	for _, part := range []string{"around:10000,-23.5000000,-45.1000000", "pharmacy", "supermarket", "restaurant", "fast_food", "beach", "waterfall", "out center"} {
		if !strings.Contains(query, part) {
			t.Errorf("query does not contain %q", part)
		}
	}
}

func TestNormalizePlaceCategoriesAndRadius(t *testing.T) {
	tests := []struct {
		name         string
		tags         map[string]string
		lat          float64
		wantCategory string
		want         bool
	}{
		{"pharmacy", map[string]string{"name": "Farmácia Central", "amenity": "pharmacy"}, -23.5, "Farmácias", true},
		{"pizza", map[string]string{"name": "Casa da Pizza", "amenity": "restaurant", "cuisine": "pizza"}, -23.5, "Pizzarias", true},
		{"burger", map[string]string{"name": "Burger", "amenity": "fast_food", "cuisine": "burger"}, -23.5, "Hamburguerias", true},
		{"market", map[string]string{"name": "Mercado", "shop": "supermarket"}, -23.5, "Mercados", true},
		{"beach", map[string]string{"name": "Praia", "natural": "beach"}, -23.5, "Praias", true},
		{"waterfall", map[string]string{"name": "Queda", "waterway": "waterfall"}, -23.5, "Cachoeiras", true},
		{"outside", map[string]string{"name": "Longe", "amenity": "pharmacy"}, -23.3, "", false},
		{"unnamed", map[string]string{"amenity": "pharmacy"}, -23.5, "", false},
		{"private", map[string]string{"name": "Privado", "amenity": "restaurant", "access": "private"}, -23.5, "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			place, ok := normalizePlace(overpassElement{Type: "node", ID: 1, Lat: tt.lat, Lon: -45.1, Tags: tt.tags}, -23.5, -45.1)
			if ok != tt.want || place.Category != tt.wantCategory {
				t.Fatalf("got (%q, %v), want (%q, %v)", place.Category, ok, tt.wantCategory, tt.want)
			}
		})
	}
}

func TestNearbyServiceCachesAndFilters(t *testing.T) {
	var calls atomic.Int32
	transport := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls.Add(1)
		if r.Method != http.MethodPost || !strings.Contains(r.Header.Get("Content-Type"), "application/x-www-form-urlencoded") {
			t.Errorf("unexpected request: %s %s", r.Method, r.Header.Get("Content-Type"))
		}
		body, _ := json.Marshal(map[string]any{"elements": []map[string]any{
			{"type": "node", "id": 1, "lat": -23.5, "lon": -45.1, "tags": map[string]string{"name": "Farmácia", "amenity": "pharmacy"}},
			{"type": "way", "id": 2, "center": map[string]float64{"lat": -23.6, "lon": -45.1}, "tags": map[string]string{"name": "Fora", "natural": "beach"}},
		}})
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(string(body)))}, nil
	})
	service := newNearbyService("https://overpass.example/api/interpreter")
	service.client = &http.Client{Transport: transport}
	for range 2 {
		places, err := service.places(t.Context(), -23.5, -45.1)
		if err != nil || len(places) != 1 || places[0].Category != "Farmácias" {
			t.Fatalf("places = %+v, err = %v", places, err)
		}
	}
	if calls.Load() != 1 {
		t.Fatalf("Overpass called %d times, want 1", calls.Load())
	}
}

func TestNearbyResponseCannotBePubliclyCached(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/imoveis/11111111-1111-1111-1111-111111111111/pontos-proximos", nil)
	(&App{}).listNearbyPlaces(recorder, request)
	if got := recorder.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", got)
	}
}
