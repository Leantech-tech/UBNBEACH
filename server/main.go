package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	loadEnvFile(filepath.Join(filepath.Dir(mustExePath()), ".env"))

	cfg := ConfigFromEnv()

	// O site funciona sem banco: a API fica indisponível (503) e o
	// frontend usa os dados de exemplo embutidos.
	// Conexão com banco é feita em background para não bloquear startup.
	// Criado antes da goroutine para que a conexão, quando estabelecida,
	// seja publicada no App (e não perdida numa cópia de valor nil).
	app := &App{}

	go func() {
		conn, err := sql.Open("postgres", cfg.DSN())
		if err != nil {
			log.Printf("AVISO: erro ao configurar conexão com banco: %v", err)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := conn.PingContext(ctx); err != nil {
			log.Printf("AVISO: banco indisponível (%v) — a API de imóveis ficará fora do ar e o site usará os dados de exemplo", err)
			conn.Close()
			return
		}

		app.db.Store(conn)
		log.Printf("conectado ao banco %s@%s:%s/%s", cfg.DBUser, cfg.DBHost, cfg.DBPort, cfg.DBName)

		if _, err := conn.ExecContext(context.Background(), `
			CREATE TABLE IF NOT EXISTS avaliacoes (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
				nome VARCHAR(100) NOT NULL,
				nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
				comentario TEXT,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);
			CREATE INDEX IF NOT EXISTS idx_avaliacoes_imovel ON avaliacoes(imovel_id);
		`); err != nil {
			log.Printf("AVISO: não foi possível criar tabela avaliacoes: %v", err)
		}
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/imoveis", app.listImoveis)
	mux.HandleFunc("GET /api/imoveis/{id}", app.getImovel)
	mux.HandleFunc("GET /api/empresa", app.getEmpresa)
	mux.HandleFunc("GET /api/pontos-interesse", app.listPontosInteresse)
	mux.HandleFunc("GET /api/status", app.getStatus)
	mux.HandleFunc("GET /api/imoveis/{id}/avaliacoes", app.listAvaliacoes)
	mux.HandleFunc("POST /api/imoveis/{id}/avaliacoes", app.createAvaliacao)
	mux.HandleFunc("GET /api/clientes/lookup", app.lookupCliente)
	mux.HandleFunc("POST /api/clientes", app.createCliente)
	mux.HandleFunc("POST /api/reservas", app.createReserva)
	mux.HandleFunc("GET /debug/pontos", app.debugPontos)
	mux.Handle("/", staticHandler(cfg.SiteDir))

	addr := ":" + cfg.Port
	log.Printf("servidor em http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func mustExePath() string {
	if exe, err := os.Executable(); err == nil {
		if abs, err := filepath.Abs(exe); err == nil {
			return abs
		}
	}
	return "."
}
