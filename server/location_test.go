package main

import (
	"database/sql"
	"testing"
)

func TestMapDestinationRequiresPreciseLocation(t *testing.T) {
	empty := sql.NullFloat64{}
	tests := []struct {
		name, description, street, number, wantQuery, wantSource string
		latitude, longitude                                      sql.NullFloat64
	}{
		{
			name:        "registered coordinates take precedence",
			description: "Rua Exemplo, 10, Ubatuba",
			latitude:    sql.NullFloat64{Float64: -23.5000012, Valid: true},
			longitude:   sql.NullFloat64{Float64: -45.1000023, Valid: true},
			wantQuery:   "-23.5000012,-45.1000023", wantSource: "coordinates",
		},
		{
			name:        "street and number in description",
			description: "Perto da praia\n📍Rua Exemplo, 10, Ubatuba/SP",
			wantQuery:   "Rua Exemplo, 10, Ubatuba/SP", wantSource: "description",
		},
		{
			name:   "complete structured address",
			street: "Rua Exemplo", number: "10",
			wantQuery: "Rua Exemplo, 10, Ubatuba - SP", wantSource: "address",
		},
		{
			name:      "street without number has no route",
			street:    "Rua Exemplo",
			wantQuery: "", wantSource: "unavailable",
		},
		{
			name:      "missing address has no route",
			wantQuery: "", wantSource: "unavailable",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			latitude, longitude := tt.latitude, tt.longitude
			if !latitude.Valid {
				latitude = empty
			}
			if !longitude.Valid {
				longitude = empty
			}
			gotQuery, gotSource := mapDestination(tt.description, "", tt.street, tt.number, "", "", "Ubatuba", "SP", "", latitude, longitude)
			if gotQuery != tt.wantQuery || gotSource != tt.wantSource {
				t.Fatalf("mapDestination() = (%q, %q), want (%q, %q)", gotQuery, gotSource, tt.wantQuery, tt.wantSource)
			}
		})
	}
}

func TestBuildAddressEmpty(t *testing.T) {
	if got := buildAddress("", "", "", "", "", "", "", false); got != "" {
		t.Fatalf("buildAddress() = %q, want empty", got)
	}
}
