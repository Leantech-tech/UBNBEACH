import { getCategories, getPoints } from './points.js';
import { ICONS, categoryIcon } from './utils.js';

/**
 * ============================================================
 *  LOCALIZAÇÃO E INTERESSES PRÓXIMOS — detalhe do imóvel
 * ------------------------------------------------------------
 *  Renderizado dentro do modal do imóvel. Usa apenas coordenadas
 *  publicadas pela API para calcular o raio; endereço/localidade
 *  servem somente como fallback de mapa aproximado.
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

function radiusFor(apartment) {
  const configured = Number(apartment.nearbyRadiusKm);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(configured, 100)
    : DEFAULT_RADIUS_KM;
}

function mapQuery(apartment, origin) {
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

function emptyMessage({ origin, allPoints, pointsWithCoords, radiusKm }) {
  if (!origin) {
    return 'Este imóvel não possui coordenadas públicas; por isso não é possível calcular atrações dentro do raio.';
  }
  if (allPoints.length === 0) return 'Nenhum ponto turístico está cadastrado no momento.';
  if (pointsWithCoords.length === 0) {
    return 'Os pontos turísticos cadastrados ainda não possuem coordenadas para calcular a distância.';
  }
  return `Nenhum ponto turístico cadastrado foi encontrado em um raio de ${formatDistance(radiusKm)}.`;
}

/**
 * Renderiza mapa e pontos turísticos diretamente no detalhe do imóvel.
 * O raio só usa coordenadas publicadas; nenhum endereço é geocodificado.
 */
export function renderNearby(mount, apartment) {
  if (!mount) return;

  const origin = coordinates(apartment.latitude, apartment.longitude);
  const radiusKm = radiusFor(apartment);
  const query = mapQuery(apartment, origin);
  const embedUrl = query
    ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${origin ? 15 : 12}&output=embed`
    : '';
  const directionsUrl = query
    ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(query) + '&travelmode=driving'
    : '';

  const allPoints = getPoints().filter((point) => point && point.name);
  const pointsWithCoords = allPoints
    .map((point) => ({ point, coords: coordinates(point.latitude, point.longitude) }))
    .filter(({ coords }) => coords);
  const nearbyPoints = origin
    ? pointsWithCoords
        .map(({ point, coords }) => ({ point, distanceKm: haversineKm(origin, coords) }))
        .filter(({ distanceKm }) => distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

  const categories = getCategories();
  const categoryOf = (point) => categories.find((category) => category.id === point.categoryId) ?? null;
  const originQuery = origin ? `${origin.latitude},${origin.longitude}` : '';

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
             ${
               origin
                 ? '<p class="nearby-note">Mapa baseado nas coordenadas públicas do imóvel. Abra a rota no Google Maps para ver o trajeto a partir da sua localização.</p>'
                 : '<p class="nearby-note">Mapa aproximado. Este imóvel não possui coordenadas públicas.</p>'
             }`
          : '<p class="nearby-empty">Localização e coordenadas públicas não disponíveis para este imóvel.</p>'
      }
    </div>

    <div class="detail-block nearby-attractions">
      <h4>Pontos turísticos próximos</h4>
      <p class="nearby-radius">Atrações cadastradas em um raio de ${formatDistance(radiusKm)}.</p>
      ${
        nearbyPoints.length
          ? `<ol class="nearby-list">
               ${nearbyPoints
                 .map(({ point, distanceKm }) => nearbyItem(point, categoryOf(point), distanceKm, originQuery))
                 .join('')}
             </ol>
             <p class="nearby-note">Distâncias em linha reta a partir do imóvel.</p>`
          : `<p class="nearby-empty nearby-empty-card">${emptyMessage({
              origin,
              allPoints,
              pointsWithCoords,
              radiusKm,
            })}</p>`
      }
    </div>`;
}
