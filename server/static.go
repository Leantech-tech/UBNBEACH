package main

import (
	"net/http"
	"path"
	"strings"
)

// staticHandler serve os arquivos do site, bloqueando acesso a
// credenciais, código do servidor e dependências. Caminhos sem
// extensão (ex.: /12997353792) recebem o index.html — é o formato
// do vínculo com a empresa pelo WhatsApp.
func staticHandler(siteDir string) http.Handler {
	fileServer := http.FileServer(http.Dir(siteDir))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clean := path.Clean("/" + r.URL.Path)

		if isBlockedPath(clean) {
			http.NotFound(w, r)
			return
		}

		if strings.HasPrefix(clean, "/assets/") {
			if r.URL.Query().Has("v") {
				w.Header().Set("Cache-Control", "public, max-age=2592000, immutable")
			} else {
				w.Header().Set("Cache-Control", "public, max-age=86400")
			}
		}

		last := path.Base(clean)
		if !strings.Contains(last, ".") {
			// Sem extensão: se não existe arquivo físico (ou é um
			// diretório sem index.html), serve o SPA
			rewrite := true
			if f, err := http.Dir(siteDir).Open(strings.TrimPrefix(clean, "/")); err == nil {
				if info, statErr := f.Stat(); statErr == nil && !info.IsDir() {
					rewrite = false
				}
				f.Close()
			}
			if rewrite {
				r.URL.Path = "/"
			}
		}
		fileServer.ServeHTTP(w, r)
	})
}

func isBlockedPath(p string) bool {
	if p == "/" {
		return false
	}
	// Bloqueia qualquer segmento oculto (/.env, /.git, ...)
	for _, segment := range strings.Split(p, "/") {
		if strings.HasPrefix(segment, ".") {
			return true
		}
	}
	// Bloqueia diretórios internos do projeto
	for _, prefix := range []string{"/server/", "/node_modules/", "/scripts/"} {
		if strings.HasPrefix(p, prefix) {
			return true
		}
	}
	return false
}
