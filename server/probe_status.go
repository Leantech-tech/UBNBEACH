//go:build ignore

// Inspeção pontual (somente leitura): mostra as CHECK constraints da
// tabela reservas para descobrir os valores válidos de status.
// Rodar com  go run probe_status.go config.go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	loadEnvFile(".env")
	cfg := ConfigFromEnv()

	conn, err := sql.Open("postgres", cfg.DSN())
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	rows, err := conn.Query(`
		SELECT cc.constraint_name, cc.check_clause
		FROM information_schema.check_constraints cc
		JOIN information_schema.table_constraints tc
		  ON tc.constraint_name = cc.constraint_name
		WHERE tc.table_name = 'reservas'`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var name, clause string
		if err := rows.Scan(&name, &clause); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%s:\n  %s\n", name, clause)
	}

	// Distinct de status já usados (ajuda a confirmar o valor de cancelado)
	dist, err := conn.Query(`SELECT DISTINCT status FROM reservas ORDER BY 1`)
	if err == nil {
		defer dist.Close()
		fmt.Println("status em uso:")
		for dist.Next() {
			var s string
			if err := dist.Scan(&s); err != nil {
				log.Fatal(err)
			}
			fmt.Printf("  %q\n", s)
		}
	}
}
