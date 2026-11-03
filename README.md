# Site---Aptos

## Pontos de interesse no detalhe do imóvel

Ao abrir **Ver detalhes**, o site consulta lugares mapeados em até 10 km em linha reta das coordenadas do imóvel. A busca inclui farmácias, mercados, praias, cachoeiras, restaurantes, pizzarias, hamburguerias e outras atrações e serviços, com filtro por categoria. O mapa foi retirado da tela. Se o endereço estiver oculto, as coordenadas e as distâncias individuais também ficam ocultas; o servidor usa a localização apenas para filtrar os lugares. Sem coordenadas cadastradas, a tela informa que a localização precisa ser completada.

O servidor consulta o Overpass/OpenStreetMap e guarda cada resultado por 24 horas. Configure `OVERPASS_URL` com o endereço de uma instância Overpass adequada ao volume de acesso em produção. Sem essa variável, usa `https://overpass-api.de/api/interpreter`; a instância pública tem limites de uso e não garante disponibilidade. Pontos publicados no cadastro também entram na lista quando estão no raio. Se a consulta externa falhar, esses pontos aparecem com aviso de resultado parcial, inclusive para imóveis com endereço oculto. As coordenadas do imóvel não são enviadas ao navegador. Os dados de OpenStreetMap recebem atribuição na própria lista quando presentes.
