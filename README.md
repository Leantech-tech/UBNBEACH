# Site — apartamentos em Ubatuba

## Pontos de interesse no detalhe do imóvel

O botão **Ver pontos de interesse** consulta o PostgreSQL do próprio site e mostra lugares em um raio de 10 km em linha reta a partir das coordenadas internas do imóvel. Não há chamada a serviços de mapas em cada abertura, chave de API, faturamento por consulta ou limite de aberturas no código. A busca combina os pontos cadastrados pela empresa com o catálogo local do OpenStreetMap, elimina duplicatas próximas e oferece filtros por categoria.

Após a conexão com o banco, o servidor cria a tabela `osm_pontos_interesse` e inicia uma sincronização em segundo plano. Se houver dados locais com menos de sete dias, ele os reutiliza. Caso contrário, faz uma consulta regional ao Overpass e substitui o catálogo numa transação. Se a atualização falhar, o catálogo anterior continua disponível e o servidor tenta novamente no dia seguinte. O servidor precisa acessar o Overpass apenas durante a sincronização; o serviço público pode atrasar ou recusar essa atualização. A primeira sincronização pode levar alguns minutos. Os dados do OpenStreetMap podem não incluir todos os lugares existentes.

As categorias incluem praias, cachoeiras, mercados, lojas, restaurantes, cafés, farmácias, parques e atrações. A fonte é [OpenStreetMap, sob ODbL](https://www.openstreetmap.org/copyright); a atribuição aparece no popup. Para endereços ocultos, a resposta omite as coordenadas do imóvel e a distância de cada lugar, e ordena os resultados por nome. Sem coordenadas internas válidas, a busca informa que a localização deve ser cadastrada. A resposta não pode ser armazenada em cache público.

O mapa incorporado do imóvel usa OpenStreetMap. O link para traçar a rota até o imóvel usa uma URL do Google Maps sem chave de API. Os links dos pontos importados abrem o respectivo elemento no OpenStreetMap.
