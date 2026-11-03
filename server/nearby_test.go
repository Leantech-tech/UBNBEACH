package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type nearbyRoundTrip func(*http.Request) (*http.Response, error)

func (fn nearbyRoundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

func TestGoogleNearbyUsesInternalCenterAndTenKilometerRadius(t *testing.T) {
	transport := nearbyRoundTrip(func(r *http.Request) (*http.Response, error) {
		if !strings.HasSuffix(r.URL.Path, "/places:searchNearby") || r.Method != http.MethodPost {
			t.Errorf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if r.Header.Get("X-Goog-Api-Key") != "test-key" {
			t.Error("server key was not passed to Google")
		}
		if strings.Contains(r.Header.Get("X-Goog-FieldMask"), "nextPageToken") {
			t.Error("nearby field mask contains unsupported paging field")
		}
		var body struct {
			IncludedTypes       []string `json:"includedTypes"`
			LocationRestriction struct {
				Circle struct {
					Center struct{ Latitude, Longitude float64 } `json:"center"`
					Radius float64                               `json:"radius"`
				} `json:"circle"`
			} `json:"locationRestriction"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body.LocationRestriction.Circle.Radius != 10000 || body.LocationRestriction.Circle.Center.Latitude != -23.5 || body.LocationRestriction.Circle.Center.Longitude != -45.1 {
			t.Errorf("wrong search circle: %+v", body.LocationRestriction.Circle)
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(`{"places":[{"id":"near","displayName":{"text":"Praia próxima"},"location":{"latitude":-23.501,"longitude":-45.1}},{"id":"far","displayName":{"text":"Praia longe"},"location":{"latitude":-23.3,"longitude":-45.1}}]}`))}, nil
	})
	service := newNearbyService("test-key")
	service.client = &http.Client{Transport: transport}
	places, limited, err := service.search(t.Context(), -23.5, -45.1, nearbySearch{category: "Praias", icon: "beach", types: []string{"beach"}})
	if err != nil || limited || len(places) != 1 || places[0].ID != "near" {
		t.Fatalf("places=%+v limited=%v err=%v", places, limited, err)
	}
}

func TestGoogleTextSearchFiltersRectangleToCircle(t *testing.T) {
	transport := nearbyRoundTrip(func(r *http.Request) (*http.Response, error) {
		if !strings.HasSuffix(r.URL.Path, "/places:searchText") || !strings.Contains(r.Header.Get("X-Goog-FieldMask"), "nextPageToken") {
			t.Errorf("unexpected text search: %s %s", r.URL.Path, r.Header.Get("X-Goog-FieldMask"))
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body["textQuery"] != "cachoeira" || body["locationRestriction"] == nil {
			t.Errorf("wrong text search: %+v", body)
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(`{"places":[{"id":"inside","displayName":{"text":"Cachoeira"},"location":{"latitude":-23.51,"longitude":-45.1}},{"id":"outside","displayName":{"text":"Outra"},"location":{"latitude":-23.4,"longitude":-45.01}}]}`))}, nil
	})
	service := newNearbyService("test-key")
	service.client = &http.Client{Transport: transport}
	places, _, err := service.search(t.Context(), -23.5, -45.1, nearbySearch{category: "Cachoeiras", icon: "waterfall", text: "cachoeira"})
	if err != nil || len(places) != 1 || places[0].ID != "inside" {
		t.Fatalf("places=%+v err=%v", places, err)
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

func TestHiddenPropertyOmitsDistanceAndCoordinates(t *testing.T) {
	places := []nearbyPlace{{ID: "near", Name: "Z", DistanceKm: 0.1, Latitude: -23.5, Longitude: -45.1}, {ID: "far", Name: "A", DistanceKm: 9.5}}
	public := publicNearbyPlaces(places, true)
	data, _ := json.Marshal(public)
	if public[0].ID != "far" || strings.Contains(string(data), "distanceKm") || strings.Contains(string(data), "latitude") || strings.Contains(string(data), "longitude") {
		t.Fatalf("hidden response exposes location: %s", data)
	}
}

func TestNearbyRateLimitPreventsRepeatedChargedSearches(t *testing.T) {
	service := newNearbyService("test-key")
	now := time.Now()
	for i := 0; i < 5; i++ {
		if !service.allowRequest("127.0.0.1", now) {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if service.allowRequest("127.0.0.1", now) {
		t.Fatal("sixth request from same IP should be limited")
	}
	if !service.allowRequest("127.0.0.1", now.Add(time.Hour+time.Second)) {
		t.Fatal("request should be allowed after the window ends")
	}
}
