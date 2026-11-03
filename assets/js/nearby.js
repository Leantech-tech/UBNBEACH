import { getCategories, getPoints } from './points.js';
import { ICONS, categoryIcon } from './utils.js';

/**
 * ============================================================
 *  LOCALIZAÇÃO E INTERESSES PRÓXIMOS — detalhe do imóvel
 * ------------------------------------------------------------
 *  Renderizado dentro do modal do imóvel. O mapa usa o destino
 *  preciso publicado pela API; atrações próximas usam coordenadas.
 * ============================================================
 */

const DEFAULT_RADIUS_KM = 10;

const esc = (text) =>
  String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function coordinates(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

/** Distância em linha reta entre duas coordenadas, em quilômetros. */
function haversineKm(origin, destination) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLng = toRad(destination.longitude - origin.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(origin.latitude)) * Math.cos(toRad(destination.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;

function mapQuery(apartment) {
  if (apartment.hideAddress || apartment.mapQuerySource === 'unavailable') return '';
  if (typeof apartment.mapQuery === 'string' && apartment.mapQuery.trim()) return apartment.mapQuery.trim();
  const origin = coordinates(apartment.latitude, apartment.longitude);
  if (origin) return `${origin.latitude},${origin.longitude}`;
  if (typeof apartment.address === 'string' && apartment.address.trim()) return apartment.address.trim();
  if (typeof apartment.location === 'string' && apartment.location.trim()) return apartment.location.trim();
  return '';
}

/* ---------- Montagem do conteúdo ---------- */

function nearbyItem(point, category, distanceKm, originQuery) {
  const location = point.address || [point.neighborhood, point.city].filter(Boolean).join(' · ');
  const pointCoords = coordinates(point.latitude, point.longitude);
  const destination =
    pointCoords
      ? `${pointCoords.latitude},${pointCoords.longitude}`
      : point.address || [point.name, point.city, point.state].filter(Boolean).join(', ');
  const directionsUrl =
    'https://www.google.com/maps/dir/?api=1' +
    (originQuery ? `&origin=${encodeURIComponent(originQuery)}` : '') +
    `&destination=${encodeURIComponent(destination)}`;

  return `
    <li class="nearby-item">
      <span class="nearby-dist">${formatDistance(distanceKm)}</span>
      <div class="nearby-info">
        <span class="nearby-cat">
          ${categoryIcon(category?.icon || category?.slug || '')}<span>${esc(category?.name ?? 'Ponto de interesse')}</span>
        </span>
        <h4>${esc(point.name)}</h4>
        ${location ? `<p class="nearby-address">${ICONS.pin}<span>${esc(location)}</span></p>` : ''}
      </div>
      <a class="btn btn-outline btn-sm nearby-route" href="${directionsUrl}" target="_blank" rel="noopener">
        ${ICONS.compass}<span>Como chegar</span>
      </a>
    </li>`;
}

function emptyMessage({ origin, allPoints, pointsWithCoords, radiusKm, failed }) {
  if (!origin) {
    return 'Este imóvel não possui coordenadas públicas; por isso não é possível calcular atrações dentro do raio.';
  }
  if (failed) return 'A busca de lugares está indisponível no momento. Tente novamente mais tarde.';
  if (allPoints.length === 0) return 'Nenhum lugar mapeado foi encontrado neste raio.';
  if (pointsWithCoords.length === 0) {
    return 'Os pontos turísticos cadastrados ainda não possuem coordenadas para calcular a distância.';
  }
  return `Nenhum ponto de interesse foi encontrado em um raio de ${formatDistance(radiusKm)}.`;
}

function renderAttractions(mount, origin, failed, externalPoints = []) {
  const listMount = mount.querySelector('[data-nearby-results]');
  if (!listMount || !mount.isConnected) return;
  const allPoints = getPoints().filter((point) => point && point.name);
  const pointsWithCoords = allPoints
    .map((point) => ({ point, coords: coordinates(point.latitude, point.longitude) }))
    .filter(({ coords }) => coords);
  const categories = getCategories();
  const entries = [
    ...externalPoints.map((point) => ({
      point,
      category: { name: point.category, icon: point.icon },
      coords: coordinates(point.latitude, point.longitude),
      source: 'osm',
    })),
    ...pointsWithCoords.map(({ point, coords }) => ({
      point,
      category: categories.find((category) => category.id === point.categoryId) ?? null,
      coords,
      source: 'local',
    })),
  ];
  const seen = new Map();
  const nearbyPoints = [];
  for (const entry of entries) {
    if (!origin || !entry.coords) continue;
    const distanceKm = haversineKm(origin, entry.coords);
    if (distanceKm > DEFAULT_RADIUS_KM) continue;
    const key = entry.point.name.trim().toLocaleLowerCase('pt-BR');
    const previous = seen.get(key) ?? [];
    if (entry.source === 'local' && previous.some((coords) => haversineKm(coords, entry.coords) < 0.05)) continue;
    if (entry.source === 'osm') seen.set(key, [...previous, entry.coords]);
    nearbyPoints.push({ ...entry, distanceKm });
  }
  nearbyPoints.sort((a, b) => a.distanceKm - b.distanceKm);
  const originQuery = origin ? `${origin.latitude},${origin.longitude}` : '';
  const categoryNames = [...new Set(nearbyPoints.map(({ category }) => category?.name || 'Ponto de interesse'))].sort();
  listMount.innerHTML = nearbyPoints.length
    ? `<div class="nearby-controls">
         <label for="nearby-category">Categoria</label>
         <select id="nearby-category" data-nearby-category>
           <option value="">Todas (${nearbyPoints.length})</option>
           ${categoryNames.map((name) => `<option value="${esc(name)}">${esc(name)} (${nearbyPoints.filter(({ category }) => (category?.name || 'Ponto de interesse') === name).length})</option>`).join('')}
         </select>
       </div>
       <p class="nearby-count" data-nearby-count>${nearbyPoints.length} lugares encontrados</p>
       <ol class="nearby-list" data-nearby-list></ol>
       <p class="nearby-note">Distâncias em linha reta a partir do imóvel.${failed ? ' A busca de lugares mapeados está indisponível; exibindo os pontos cadastrados.' : ''}</p>
       ${externalPoints.length ? '<p class="nearby-note">Dados de lugares: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors (ODbL)</a>.</p>' : ''}`
    : `<p class="nearby-empty nearby-empty-card">${emptyMessage({ origin, allPoints, pointsWithCoords, radiusKm: DEFAULT_RADIUS_KM, failed })}</p>`;
  const renderList = (categoryName = '') => {
    const visible = categoryName
      ? nearbyPoints.filter(({ category }) => (category?.name || 'Ponto de interesse') === categoryName)
      : nearbyPoints;
    const list = listMount.querySelector('[data-nearby-list]');
    if (!list) return;
    list.innerHTML = visible.map(({ point, category, distanceKm }) => nearbyItem(point, category, distanceKm, originQuery)).join('');
    listMount.querySelector('[data-nearby-count]').textContent = `${visible.length} ${visible.length === 1 ? 'lugar encontrado' : 'lugares encontrados'}`;
  };
  renderList();
  listMount.querySelector('[data-nearby-category]')?.addEventListener('change', (event) => renderList(event.target.value));
}

/**
 * Renderiza mapa e pontos turísticos diretamente no detalhe do imóvel.
 * O raio só usa coordenadas publicadas; nenhum endereço é geocodificado.
 */
export function renderNearby(mount, apartment) {
  if (!mount) return;

  const origin = apartment.hideAddress ? null : coordinates(apartment.latitude, apartment.longitude);
  const radiusKm = DEFAULT_RADIUS_KM;
  const query = mapQuery(apartment);
  const mapSource = String(apartment.mapQuerySource ?? '');
  const zoom = mapSource === 'description' || mapSource === 'address' || mapSource === 'coordinates' ? 17 : origin ? 15 : 12;
  const hasAddress = mapSource === 'description' || mapSource === 'address' ||
    (!mapSource && apartment.address && !apartment.hideAddress);
  const hasCoordinates = mapSource === 'coordinates' || (!mapSource && origin);
  const mapNote = hasAddress
      ? 'O Google Maps usa o endereço completo cadastrado para este imóvel.'
      : mapSource === 'partial-address' || mapSource === 'location' || !hasCoordinates
        ? 'O endereço completo não está disponível no cadastro; confirme a localização com a empresa antes de sair.'
        : 'A rota usa as coordenadas cadastradas para este imóvel.';
  const embedUrl = query
    ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`
    : '';
  const directionsUrl = query
    ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(query) + '&travelmode=driving'
    : '';

  mount.innerHTML = `
    <div class="detail-block nearby-map-block">
      <h4>Localização e rota</h4>
      ${
        embedUrl
          ? `<div class="nearby-map">
               <iframe
                 src="${embedUrl}"
                 title="Localização de ${esc(apartment.name)} no Google Maps"
                 loading="lazy"
                 referrerpolicy="no-referrer-when-downgrade"
                 allowfullscreen></iframe>
             </div>
             <div class="nearby-map-actions">
               <a class="btn btn-outline btn-sm" href="${directionsUrl}" target="_blank" rel="noopener">
                 ${ICONS.compass} Ver rota até o imóvel
               </a>
             </div>
             <p class="nearby-note">${mapNote}</p>`
          : '<p class="nearby-empty">A localização exata ainda não está cadastrada para este imóvel. Consulte a empresa antes de sair.</p>'
      }
    </div>

    <div class="detail-block nearby-attractions">
      <h4>Pontos de interesse próximos</h4>
      <p class="nearby-radius">Lugares em um raio de ${formatDistance(radiusKm)} a partir deste imóvel.</p>
      <div data-nearby-results aria-live="polite">${origin && /^[0-9a-f-]{36}$/i.test(String(apartment.id))
        ? '<p class="nearby-empty">Buscando lugares próximos...</p>'
        : ''}</div>
    </div>`;

  if (!origin || !/^[0-9a-f-]{36}$/i.test(String(apartment.id)) || typeof fetch === 'undefined') {
    renderAttractions(mount, origin, false);
    return;
  }
  const controller = new AbortController();
  let externalPoints = [];
  let failed = false;
  const refresh = () => renderAttractions(mount, origin, failed, externalPoints);
  document.addEventListener('points-loaded', refresh);
  void fetch(`/api/imoveis/${encodeURIComponent(apartment.id)}/pontos-proximos`, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      externalPoints = Array.isArray(data.points) ? data.points : [];
      refresh();
    })
    .catch(() => {
      if (!controller.signal.aborted) {
        failed = true;
        refresh();
      }
    });
  return () => {
    document.removeEventListener('points-loaded', refresh);
    controller.abort();
  };
}
