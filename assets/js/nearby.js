import { openModal } from './modal.js';
import { getCategories, getPoints } from './points.js';
import { ICONS, categoryIcon } from './utils.js';

/**
 * ============================================================
 *  INTERESSES PRÓXIMOS — popup do detalhe do imóvel
 * ------------------------------------------------------------
 *  Aberto a partir do botão "Interesses próximos" no modal de
 *  detalhes do imóvel. Calcula a distância (Haversine) do imóvel
 *  até cada ponto de interesse cadastrado e lista os mais
 *  próximos, com atalho de rota no Google Maps.
 *
 *  Origem das coordenadas do imóvel: se o imóvel vier com
 *  latitude/longitude (API), usa direto; caso contrário,
 *  geocodifica o endereço uma única vez via Nominatim
 *  (OpenStreetMap, gratuito) e guarda em cache na sessão.
 *  Pontos sem coordenadas ficam no fim da lista, sem distância.
 * ============================================================
 */

const NEARBY_LIMIT = 8;

const esc = (text) =>
  String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const hasCoords = (lat, lng) =>
  typeof lat === 'number' && typeof lng === 'number' && (lat !== 0 || lng !== 0);

/** Distância em linha reta entre duas coordenadas, em quilômetros. */
function haversineKm(latA, lngA, latB, lngB) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;

/* ---------- Geocodificação do endereço do imóvel (cacheada) ---------- */

const geocodeCache = new Map();

function geocode(query) {
  if (geocodeCache.has(query)) return geocodeCache.get(query);
  const promise = (async () => {
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt-BR&q=' +
        encodeURIComponent(query);
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const hit = Array.isArray(data) && data[0];
      const lat = Number(hit?.lat);
      const lng = Number(hit?.lon);
      return hasCoords(lat, lng) ? { latitude: lat, longitude: lng } : null;
    } catch {
      return null;
    }
  })();
  geocodeCache.set(query, promise);
  return promise;
}

/** Coordenadas de origem: as do imóvel, ou geocodificação do endereço. */
async function resolveOrigin(apartment) {
  if (hasCoords(apartment.latitude, apartment.longitude)) {
    return { latitude: apartment.latitude, longitude: apartment.longitude };
  }
  const query = apartment.address || apartment.location;
  if (!query) return null;
  return geocode(query);
}

/* ---------- Montagem do conteúdo ---------- */

function nearbyItem(point, category, distanceKm, originQuery) {
  const location = point.address || [point.neighborhood, point.city].filter(Boolean).join(' · ');
  const destination =
    hasCoords(point.latitude, point.longitude)
      ? `${point.latitude},${point.longitude}`
      : point.address || [point.name, point.city, point.state].filter(Boolean).join(', ');
  const directionsUrl =
    'https://www.google.com/maps/dir/?api=1' +
    (originQuery ? `&origin=${encodeURIComponent(originQuery)}` : '') +
    `&destination=${encodeURIComponent(destination)}`;

  return `
    <li class="nearby-item">
      <span class="nearby-dist ${distanceKm == null ? 'nearby-dist-unknown' : ''}">
        ${distanceKm == null ? '—' : formatDistance(distanceKm)}
      </span>
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

function nearbyHtml(apartment, origin, ranked) {
  const categories = getCategories();
  const categoryOf = (point) => categories.find((c) => c.id === point.categoryId) ?? null;
  const originQuery = origin ? `${origin.latitude},${origin.longitude}` : (apartment.address || apartment.location || '');
  const withDistance = ranked.filter((r) => r.distanceKm != null).length;

  const note = !origin
    ? 'Não foi possível localizar o imóvel automaticamente — exibindo todos os pontos cadastrados, sem distâncias.'
    : withDistance === 0
      ? 'As distâncias aparecem quando os pontos têm localização cadastrada no sistema.'
      : 'Distâncias em linha reta a partir do imóvel.';

  return `
    <article class="nearby">
      <header class="nearby-head">
        <span class="badge badge-gold">${ICONS.compass}<span>Interesses próximos</span></span>
        <h3>Perto de ${esc(apartment.name)}</h3>
        <p class="nearby-sub">${esc(apartment.location)}</p>
      </header>

      ${
        ranked.length
          ? `<ol class="nearby-list">
              ${ranked
                .map(({ point, distanceKm }) => nearbyItem(point, categoryOf(point), distanceKm, originQuery))
                .join('')}
            </ol>`
          : '<p class="nearby-empty">Nenhum ponto de interesse cadastrado no momento.</p>'
      }

      <p class="nearby-note">${note}</p>
    </article>`;
}

/* ---------- API pública ---------- */

/**
 * Abre o popup de interesses próximos do imóvel.
 * @param {object} apartment Imóvel do modal de detalhes.
 * @param {() => void} [onClose] Restaura o modal de detalhes subjacente.
 */
export async function openNearbyModal(apartment, onClose) {
  const modal = openModal(
    `<div class="nearby nearby-loading">${ICONS.compass}<p>Buscando os pontos mais próximos…</p></div>`,
    { onClose }
  );

  const origin = await resolveOrigin(apartment);
  if (!modal.sheet.isConnected) return; // usuário fechou enquanto buscava

  const ranked = getPoints()
    .map((point) => ({
      point,
      distanceKm:
        origin && hasCoords(point.latitude, point.longitude)
          ? haversineKm(origin.latitude, origin.longitude, point.latitude, point.longitude)
          : null,
    }))
    .sort((a, b) => (a.distanceKm == null ? 1 : b.distanceKm == null ? -1 : a.distanceKm - b.distanceKm))
    .slice(0, NEARBY_LIMIT);

  modal.body.innerHTML = nearbyHtml(apartment, origin, ranked);
}
