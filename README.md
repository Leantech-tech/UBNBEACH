# Site---Aptos

## Pontos de interesse no detalhe do imóvel

Ao abrir **Ver detalhes**, o site consulta lugares mapeados em até 10 km em linha reta das coordenadas públicas do imóvel. A busca inclui farmácias, mercados, praias, cachoeiras, restaurantes, pizzarias, hamburguerias e outras atrações e serviços. Os pontos cadastrados no aplicativo também aparecem, com filtro por categoria. Imóveis sem coordenadas ou com endereço oculto não disparam a busca.

O servidor consulta o Overpass/OpenStreetMap e guarda cada resultado por 24 horas. Configure `OVERPASS_URL` com o endereço de uma instância Overpass adequada ao volume de acesso em produção. Sem essa variável, usa `https://overpass-api.de/api/interpreter`; a instância pública tem limites de uso e não garante disponibilidade. Quando a consulta falha, a tela mostra os pontos cadastrados que tiverem coordenadas. Os dados de OpenStreetMap recebem atribuição na própria lista.
