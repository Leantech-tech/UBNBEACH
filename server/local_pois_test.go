package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFetchOSMPointsUsesPeriodicImportRequest(t *testing.T) {
	client := &http.Client{Transport: osmRoundTrip(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodPost || !strings.Contains(r.Header.Get("User-Agent"), "UBNBeach-POI") {
			t.Errorf("unexpected import request: %s %q", r.Method, r.Header.Get("User-Agent"))
		}
		if err := r.ParseForm(); err != nil {
			t.Error(err)
		}
		if !strings.Contains(r.Form.Get("data"), `nwr["shop"]`) {
			t.Error("shop category missing from query")
		}
		recorder := httptest.NewRecorder()
		recorder.Header().Set("Content-Type", "application/json")
		_, _ = recorder.Write([]byte(`{"elements":[{"type":"node","id":1,"lat":-23.5,"lon":-45.1,"tags":{"name":"Mercado Azul","shop":"supermarket"}}]}`))
		return recorder.Result(), nil
	})}
	points, err := fetchOSMPointsFrom(context.Background(), []string{"https://osm.test/api"}, client)
	if err != nil || len(points) != 1 || points[0].Category != "Mercados" {
		t.Fatalf("import returned %+v, err=%v", points, err)
	}
}

type osmRoundTrip func(*http.Request) (*http.Response, error)

func (fn osmRoundTrip) RoundTrip(request *http.Request) (*http.Response, error) { return fn(request) }

func TestNormalizeOSMElementsKeepsNamedCategoriesAndWayCenters(t *testing.T) {
	data := `{"elements":[
		{"type":"node","id":1,"lat":-23.5,"lon":-45.1,"tags":{"name":"Praia Azul","natural":"beach"}},
		{"type":"way","id":2,"center":{"lat":-23.501,"lon":-45.102},"tags":{"name":"Cachoeira Clara","waterway":"waterfall"}},
		{"type":"node","id":3,"lat":-23.502,"lon":-45.1,"tags":{"name":"Mercado Centro","shop":"supermarket"}},
		{"type":"node","id":4,"lat":-23.503,"lon":-45.1,"tags":{"name":"Restaurante Mar","amenity":"restaurant"}},
		{"type":"node","id":5,"lat":-23.504,"lon":-45.1,"tags":{"name":"Loja Azul","shop":"clothes"}},
		{"type":"node","id":6,"lat":-23.5,"lon":-45.1,"tags":{"shop":"clothes"}},
		{"type":"node","id":7,"lat":-23.5,"lon":-45.1,"tags":{"name":"Rua","highway":"residential"}}
	]}`
	var response struct {
		Elements []osmElement `json:"elements"`
	}
	if err := json.Unmarshal([]byte(data), &response); err != nil {
		t.Fatal(err)
	}
	points := normalizeOSMElements(response.Elements)
	if len(points) != 5 {
		t.Fatalf("got %d points, want 5: %+v", len(points), points)
	}
	if points[0].Category != "Praias" || points[1].Category != "Cachoeiras" || points[2].Category != "Mercados" || points[3].Category != "Restaurantes e lanches" || points[4].Category != "Lojas e compras" {
		t.Fatalf("unexpected categories: %+v", points)
	}
	if points[1].Latitude != -23.501 || points[1].OSMURL != "https://www.openstreetmap.org/way/2" {
		t.Fatalf("way center or link lost: %+v", points[1])
	}
	public := publicNearbyPlaces(points, true)
	encoded, err := json.Marshal(public)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "latitude") || strings.Contains(string(encoded), "distanceKm") {
		t.Fatalf("hidden property's result exposed location data: %s", encoded)
	}
}
