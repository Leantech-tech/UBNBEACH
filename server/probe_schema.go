//go:build ignore

// Inspeção pontual (somente leitura) do schema da tabela de clientes
// no banco compartilhado com o app externo. Não faz parte do servidor:
// rodar com  go run probe_schema.go config.go
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

	tables, err := conn.Query(`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
		  AND (table_name ILIKE '%client%' OR table_name ILIKE '%reserva%' OR table_name ILIKE '%locac%')`)
	if err != nil {
		log.Fatal(err)
	}
	defer tables.Close()

	var names []string
	for tables.Next() {
		var n string
		if err := tables.Scan(&n); err != nil {
			log.Fatal(err)
		}
		names = append(names, n)
	}
	fmt.Println("tabelas:", names)

	for _, t := range names {
		fmt.Println("\n=== " + t + " ===")
		cols, err := conn.Query(`
			SELECT column_name, data_type, is_nullable, column_default
			FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = $1
			ORDER BY ordinal_position`, t)
		if err != nil {
			log.Fatal(err)
		}
		for cols.Next() {
			var name, typ, nullable string
			var def sql.NullString
			if err := cols.Scan(&name, &typ, &nullable, &def); err != nil {
				log.Fatal(err)
			}
			fmt.Printf("  %-25s %-15s null=%-3s default=%s\n", name, typ, nullable, def.String)
		}
		cols.Close()

		if t != "clientes" {
			continue
		}
		fmt.Println("  -- origem distintas:")
		origens, err := conn.Query(`SELECT DISTINCT origem FROM ` + t + ` ORDER BY 1`)
		if err != nil {
			log.Fatal(err)
		}
		for origens.Next() {
			var o sql.NullString
			if err := origens.Scan(&o); err != nil {
				log.Fatal(err)
			}
			fmt.Printf("     %q\n", o.String)
		}
		origens.Close()

		fmt.Println("  -- amostra (até 3):")
		rows, err := conn.Query(`SELECT nome, telefone, whatsapp, email, documento, origem FROM ` + t + ` ORDER BY criado_em DESC LIMIT 3`)
		if err != nil {
			log.Fatal(err)
		}
		for rows.Next() {
			var nome, tel, wa, email, doc, origem sql.NullString
			if err := rows.Scan(&nome, &tel, &wa, &email, &doc, &origem); err != nil {
				log.Fatal(err)
			}
			fmt.Printf("     nome=%q tel=%q wa=%q email=%q doc=%q origem=%q\n", nome.String, tel.String, wa.String, email.String, doc.String, origem.String)
		}
		rows.Close()
	}
}
