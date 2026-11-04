package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestNearbySearchUsesGoogleRadiusCategoriesAndWaterfallPages(t *testing.T) {
	const originLat, originLon = -23.5, -45.1
	var calls atomic.Int32
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Method != http.MethodPost || r.Header.Get("X-Goog-Api-Key") != "test-key" {
			t.Errorf("unexpected Google Places request: method=%s key=%q", r.Method, r.Header.Get("X-Goog-Api-Key"))
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("decode request: %v", err)
		}
		if r.URL.Path == "/v1/places:searchNearby" {
			if r.Header.Get("X-Goog-FieldMask") == "" {
				t.Error("Nearby Search is missing its field mask")
			}
			if got := body["maxResultCount"]; got != float64(nearbyMaxResults) {
				t.Errorf("maxResultCount = %v, want %d", got, nearbyMaxResults)
			}
			restriction := body["locationRestriction"].(map[string]any)
			circle := restriction["circle"].(map[string]any)
			if got := circle["radius"]; got != float64(nearbyRadiusMeters) {
				t.Errorf("Nearby radius = %v, want %d", got, nearbyRadiusMeters)
			}
			types := body["includedTypes"].([]any)
			primary := types[0].(string)
			name := "Praça turística"
			categoryType := primary
			switch primary {
			case "pharmacy":
				name = "Farmácia Central"
			case "restaurant":
				name = "Restaurante do Mar"
			case "supermarket":
				name = "Mercado Central"
			case "beach":
				name = "Praia Central"
			}
			writeGooglePlacesResponse(w, googlePlacesResponse{Places: []googlePlace{testGooglePlace(
				"place-"+primary, name, categoryType, originLat+0.001, originLon,
			)}})
			return
		}
		if r.URL.Path != "/v1/places:searchText" {
			t.Errorf("unexpected endpoint %q", r.URL.Path)
			http.NotFound(w, r)
			return
		}
		if r.Header.Get("X-Goog-FieldMask") == "" || !strings.Contains(r.Header.Get("X-Goog-FieldMask"), "nextPageToken") {
			t.Error("waterfall Text Search is missing its field mask or nextPageToken")
		}
		bias := body["locationBias"].(map[string]any)
		circle := bias["circle"].(map[string]any)
		if got := circle["radius"]; got != float64(nearbyRadiusMeters) {
			t.Errorf("waterfall bias radius = %v, want %d", got, nearbyRadiusMeters)
		}
		query := body["textQuery"].(string)
		pageToken, _ := body["pageToken"].(string)
		id, name := "waterfall-main", "Cachoeira do Prumirim"
		if pageToken != "" {
			id, name = "waterfall-page-2", "Cachoeira da Renata"
		}
		response := googlePlacesResponse{Places: []googlePlace{testGooglePlace(id, name, "tourist_attraction", originLat+0.002, originLon)}}
		if query == "cachoeira" && pageToken == "" {
			response.NextPageToken = "next-waterfall-page"
		}
		writeGooglePlacesResponse(w, response)
	})

	service := newNearbyService("test-key")
	service.endpoint = "https://places.test/v1"
	service.client = testGoogleClient(handler)
	places, partial, limited, err := service.places(context.Background(), originLat, originLon)
	if err != nil || partial || limited {
		t.Fatalf("places = %d, partial=%v limited=%v err=%v", len(places), partial, limited, err)
	}
	if got := calls.Load(); got != int32(len(nearbySearchGroups)+len(waterfallSearchTerms)+1) {
		t.Fatalf("Google calls = %d, want base searches plus one waterfall page", got)
	}
	if len(places) != 6 {
		t.Fatalf("got %d unique places, want four categories plus two waterfall pages: %+v", len(places), places)
	}
	for _, point := range places {
		if point.MapsURL == "" || point.Source != "google" {
			t.Errorf("Google place is missing its Maps link or source: %+v", point)
		}
	}
	if !strings.Contains(places[0].MapsURL, "google.com/maps/search/") {
		t.Errorf("invalid Google Maps URL %q", places[0].MapsURL)
	}

	// Google place content is not cached between independent popup openings.
	if _, _, _, err := service.places(context.Background(), originLat, originLon); err != nil {
		t.Fatalf("second lookup: %v", err)
	}
	if got := calls.Load(); got != 2*int32(len(nearbySearchGroups)+len(waterfallSearchTerms)+1) {
		t.Fatalf("second lookup reused cached Google content: calls=%d", got)
	}
}

func TestNearbyPartialResultsSurviveOneGoogleFailure(t *testing.T) {
	var calls atomic.Int32
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if r.URL.Path == "/v1/places:searchNearby" {
			if body["includedTypes"].([]any)[0].(string) == "restaurant" {
				http.Error(w, "unavailable", http.StatusBadGateway)
				return
			}
			writeGooglePlacesResponse(w, googlePlacesResponse{Places: []googlePlace{testGooglePlace("ok", "Praia", "beach", -23.5, -45.1)}})
			return
		}
		writeGooglePlacesResponse(w, googlePlacesResponse{})
	})
	service := newNearbyService("test-key")
	service.endpoint = "https://places.test/v1"
	service.client = testGoogleClient(handler)
	places, partial, _, err := service.places(context.Background(), -23.5, -45.1)
	if err != nil || !partial || len(places) == 0 {
		t.Fatalf("partial lookup = places:%d partial:%v err:%v", len(places), partial, err)
	}
}

func TestNearbyRequiresGoogleKey(t *testing.T) {
	service := newNearbyService("")
	if _, _, _, err := service.places(context.Background(), -23.5, -45.1); err == nil {
		t.Fatal("lookup succeeded without a Google Places API key")
	}
}

func TestNearbyRateLimitsPerIPAndPerInstance(t *testing.T) {
	var limiter nearbyRateLimiter
	start := time.Date(2026, 11, 4, 12, 0, 0, 0, time.UTC)
	for i := 0; i < nearbyIPLimit; i++ {
		if !limiter.allow("192.0.2.1", start.Add(time.Duration(i)*time.Second)) {
			t.Fatalf("request %d was unexpectedly rejected for first IP", i+1)
		}
	}
	if limiter.allow("192.0.2.1", start.Add(10*time.Second)) {
		t.Fatal("sixth request from the same IP was allowed")
	}
	for ipIndex := 0; ipIndex < nearbyInstanceLimit/nearbyIPLimit-1; ipIndex++ {
		for request := 0; request < nearbyIPLimit; request++ {
			ip := "198.51.100." + string(rune('1'+ipIndex))
			if !limiter.allow(ip, start.Add(time.Minute)) {
				t.Fatalf("request %d from IP %d was unexpectedly rejected", request+1, ipIndex)
			}
		}
	}
	if limiter.allow("203.0.113.1", start.Add(time.Minute)) {
		t.Fatal("request beyond the instance-wide limit was allowed")
	}
	if !limiter.allow("192.0.2.1", start.Add(nearbyLimitWindow+time.Second)) {
		t.Fatal("request was not allowed after the hourly window expired")
	}
}

func TestHiddenPropertyNearbyResponseHidesDistanceAndCoordinates(t *testing.T) {
	places := []nearbyPlace{
		{ID: "near", Name: "Z", DistanceKm: 0.1, Latitude: -23.5, Longitude: -45.1},
		{ID: "far", Name: "A", DistanceKm: 9.5, Latitude: -23.6, Longitude: -45.2},
	}
	public := publicNearbyPlaces(places, true)
	if public[0].ID != "far" || public[0].DistanceKm != 0 || public[1].DistanceKm != 0 {
		t.Fatalf("hidden response exposes distance or distance order: %+v", public)
	}
	encoded, err := json.Marshal(public)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "latitude") || strings.Contains(string(encoded), "longitude") || strings.Contains(string(encoded), "distanceKm") {
		t.Fatalf("public nearby response exposes private coordinates or distance: %s", encoded)
	}
	if places[0].DistanceKm != 0.1 {
		t.Fatal("internal distance was modified")
	}
}

func TestNearbyFiltersGooglePlacesOutsideTenKilometers(t *testing.T) {
	within := testGooglePlace("within", "Farmácia", "pharmacy", -23.5, -45.1)
	outside := testGooglePlace("outside", "Farmácia distante", "pharmacy", -23.7, -45.1)
	for _, candidate := range []struct {
		place googlePlace
		want  bool
	}{{within, true}, {outside, false}} {
		_, got := normalizeGooglePlace(candidate.place, -23.5, -45.1, "Farmácias", "pharmacy")
		if got != candidate.want {
			t.Errorf("normalizeGooglePlace(%q) accepted=%v, want %v", candidate.place.DisplayName.Text, got, candidate.want)
		}
	}
}

func TestWaterfallNamesAndCategories(t *testing.T) {
	for _, name := range []string{"Cachoeira do Prumirim", "Cascata da Renata", "Queda d'água do Ipiranguinha", "Waterfall Trail"} {
		if !looksLikeWaterfall(name) {
			t.Errorf("looksLikeWaterfall(%q) = false", name)
		}
	}
	if looksLikeWaterfall("Praia do Prumirim") {
		t.Fatal("a beach was classified as a waterfall")
	}
	if category, icon := googlePlaceCategory("pharmacy", nil); category != "Farmácias" || icon != "pharmacy" {
		t.Errorf("pharmacy category = %q/%q", category, icon)
	}
	if category, icon := googlePlaceCategory("beach", nil); category != "Praias" || icon != "beach" {
		t.Errorf("beach category = %q/%q", category, icon)
	}
}

func TestGoogleMapsURLsOpenTheSelectedPlaceOrExactPin(t *testing.T) {
	placeURL, err := url.Parse(googleMapsURLForPlace("ChIJtest", "Praia Azul", "Ubatuba, SP", -23.5, -45.1))
	if err != nil {
		t.Fatal(err)
	}
	if placeURL.Host != "www.google.com" || placeURL.Query().Get("api") != "1" || placeURL.Query().Get("query_place_id") != "ChIJtest" {
		t.Fatalf("unexpected place Maps URL: %s", placeURL)
	}
	exactURL, err := url.Parse(googleMapsSearchURL("-23.5000012,-45.1000023"))
	if err != nil || exactURL.Query().Get("query") != "-23.5000012,-45.1000023" {
		t.Fatalf("exact pin URL lost coordinates: %v (%v)", exactURL, err)
	}
}

func TestMergeNearbyPlacesKeepsRegisteredFallbackAndDeduplicates(t *testing.T) {
	registered := []nearbyPlace{{ID: "local", Name: "Mercado", Latitude: -23.5, Longitude: -45.1, DistanceKm: 0.2, Source: "registered"}}
	if got := mergeNearbyPlaces(nil, registered); len(got) != 1 || got[0].Source != "registered" || got[0].MapsURL == "" {
		t.Fatalf("registered fallback was lost or has no Maps link: %+v", got)
	}
	google := []nearbyPlace{{ID: "google", Name: "mercado", Latitude: -23.5001, Longitude: -45.1, DistanceKm: 0.21, Source: "google"}}
	if got := mergeNearbyPlaces(google, registered); len(got) != 1 || got[0].Source != "google" {
		t.Fatalf("duplicate registered point was not removed: %+v", got)
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

func testGooglePlace(id, name, placeType string, lat, lon float64) googlePlace {
	place := googlePlace{ID: id, FormattedAddress: "Ubatuba, SP", Location: &googleLocation{Latitude: lat, Longitude: lon}, PrimaryType: placeType, Types: []string{placeType}}
	place.DisplayName.Text = name
	return place
}

func writeGooglePlacesResponse(w http.ResponseWriter, response googlePlacesResponse) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		panic(err)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func testGoogleClient(handler http.Handler) *http.Client {
	return &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, request)
		return recorder.Result(), nil
	})}
}
