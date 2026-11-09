package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

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

func TestGoogleMapsDirectionsUsesExactDestinationAndCurrentDeviceOrigin(t *testing.T) {
	routeURL, err := url.Parse(googleMapsDirectionsURL("-23.5000012,-45.1000023"))
	if err != nil {
		t.Fatal(err)
	}
	query := routeURL.Query()
	if routeURL.Host != "www.google.com" || routeURL.Path != "/maps/dir/" {
		t.Fatalf("unexpected Google Maps directions URL: %s", routeURL)
	}
	if query.Get("api") != "1" || query.Get("destination") != "-23.5000012,-45.1000023" || query.Get("travelmode") != "driving" {
		t.Fatalf("route URL does not contain the exact destination: %s", routeURL)
	}
	if query.Has("origin") {
		t.Fatalf("route URL should let Google use the visitor's current location: %s", routeURL)
	}
}

func TestOpenStreetMapEmbedURLShowsExactMarker(t *testing.T) {
	embedURL, err := url.Parse(openStreetMapEmbedURL(-23.5000012, -45.1000023))
	if err != nil {
		t.Fatal(err)
	}
	query := embedURL.Query()
	if embedURL.Scheme != "https" || embedURL.Host != "www.openstreetmap.org" || embedURL.Path != "/export/embed.html" {
		t.Fatalf("unexpected OpenStreetMap embed URL: %s", embedURL)
	}
	if query.Get("marker") != "-23.5000012,-45.1000023" || query.Get("layer") != "mapnik" || query.Get("bbox") == "" {
		t.Fatalf("map URL does not contain the exact pin and map bounds: %s", embedURL)
	}
}

func TestMergeNearbyPlacesKeepsRegisteredFallbackAndDeduplicates(t *testing.T) {
	registered := []nearbyPlace{{ID: "local", Name: "Mercado", Latitude: -23.5, Longitude: -45.1, DistanceKm: 0.2, Source: "registered"}}
	if got := mergeNearbyPlaces(nil, registered); len(got) != 1 || got[0].Source != "registered" || got[0].MapsURL == "" {
		t.Fatalf("registered fallback was lost or has no Maps link: %+v", got)
	}
	osm := []nearbyPlace{{ID: "node/1", Name: "mercado", Latitude: -23.5001, Longitude: -45.1, DistanceKm: 0.21, Source: "osm"}}
	if got := mergeNearbyPlaces(osm, registered); len(got) != 1 || got[0].Source != "osm" {
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
