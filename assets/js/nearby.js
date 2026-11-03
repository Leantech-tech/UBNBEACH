import { getCategories, getPoints } from './points.js';
import { ICONS, categoryIcon } from './utils.js';

// O servidor calcula o raio usando as coordenadas internas do imóvel.
// Para endereços ocultos, a resposta não inclui a origem nem distâncias.
const RADIUS_KM = 10;

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function coordinates(lat, lng) {
  if (lat == null || lng == null || lat === '' || lng === '') return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

function haversineKm(origin, destination) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLng = toRad(destination.longitude - origin.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(origin.latitude)) * Math.cos(toRad(destination.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const formatDistance = (km) => km < 1
  ? `${Math.round(km * 1000)} m`
  : `${km.toFixed(1).replace('.', ',')} km`;

function nearbyItem({ point, category, distanceKm }) {
  const location = point.address || [point.neighborhood, point.city].filter(Boolean).join(' · ');
  return `<li class="nearby-item">
    ${distanceKm == null ? '' : `<span class="nearby-dist">${formatDistance(distanceKm)}</span>`}
    <div class="nearby-info">
      <span class="nearby-cat">${categoryIcon(category?.icon || category?.slug || '')}<span>${esc(category?.name ?? 'Ponto de interesse')}</span></span>
      <h4>${esc(point.name)}</h4>
      ${location ? `<p class="nearby-address">${ICONS.pin}<span>${esc(location)}</span></p>` : ''}
    </div>
  </li>`;
}

function renderResults(mount, apartment, externalPoints, status) {
  const results = mount.querySelector('[data-nearby-results]');
  if (!results || !mount.isConnected) return;

  const origin = apartment.hideAddress ? null : coordinates(apartment.latitude, apartment.longitude);
  const categories = getCategories();
  const entries = externalPoints
    .filter((point) => point && typeof point.name === 'string' && coordinates(point.latitude, point.longitude))
    .map((point) => ({
      point,
      category: { name: point.category, icon: point.icon },
      distanceKm: origin ? haversineKm(origin, coordinates(point.latitude, point.longitude)) : null,
    }))
    .filter(({ distanceKm }) => distanceKm == null || distanceKm <= RADIUS_KM);

  // Pontos cadastrados podem ser calculados no navegador apenas quando a
  // localização do imóvel já é pública. Para imóveis ocultos, a API filtra.
  if (origin) {
    for (const point of getPoints()) {
      const destination = coordinates(point?.latitude, point?.longitude);
      if (!destination || !point.name) continue;
      const distanceKm = haversineKm(origin, destination);
      if (distanceKm > RADIUS_KM) continue;
      const duplicate = entries.some(({ point: known }) =>
        known.name.trim().toLocaleLowerCase('pt-BR') === point.name.trim().toLocaleLowerCase('pt-BR') &&
        haversineKm(coordinates(known.latitude, known.longitude), destination) < 0.05);
      if (duplicate) continue;
      entries.push({ point, category: categories.find((item) => item.id === point.categoryId), distanceKm });
    }
    entries.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  if (status === 'missing') {
    results.innerHTML = '<p class="nearby-empty nearby-empty-card">Para mostrar lugares a 10 km deste imóvel, é preciso cadastrar sua localização. O mapa permanece oculto.</p>';
    return;
  }
  if (entries.length === 0) {
    results.innerHTML = `<p class="nearby-empty nearby-empty-card">${status === 'failed'
      ? 'A busca de lugares está indisponível no momento. Tente novamente mais tarde.'
      : 'Nenhum lugar mapeado foi encontrado neste raio.'}</p>`;
    return;
  }

  const names = [...new Set(entries.map(({ category }) => category?.name || 'Ponto de interesse'))].sort();
  results.innerHTML = `<div class="nearby-controls">
    <label for="nearby-category">Categoria</label>
    <select id="nearby-category" data-nearby-category>
      <option value="">Todas (${entries.length})</option>
      ${names.map((name) => `<option value="${esc(name)}">${esc(name)} (${entries.filter(({ category }) => (category?.name || 'Ponto de interesse') === name).length})</option>`).join('')}
    </select>
  </div>
  <p class="nearby-count" data-nearby-count></p>
  <ol class="nearby-list" data-nearby-list></ol>
  ${origin ? '<p class="nearby-note">Distâncias em linha reta a partir do imóvel.</p>' : '<p class="nearby-note">A distância de cada lugar não é exibida para preservar a localização do imóvel.</p>'}
  ${status === 'partial' || status === 'failed' ? '<p class="nearby-note">A busca de lugares mapeados está indisponível; exibindo apenas os pontos cadastrados.</p>' : ''}
  ${externalPoints.some((point) => point.source === 'osm') ? '<p class="nearby-note">Dados de lugares: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors (ODbL)</a>.</p>' : ''}`;

  const show = (categoryName = '') => {
    const visible = categoryName
      ? entries.filter(({ category }) => (category?.name || 'Ponto de interesse') === categoryName)
      : entries;
    results.querySelector('[data-nearby-list]').innerHTML = visible.map(nearbyItem).join('');
    results.querySelector('[data-nearby-count]').textContent = `${visible.length} ${visible.length === 1 ? 'lugar encontrado' : 'lugares encontrados'}`;
  };
  show();
  results.querySelector('[data-nearby-category]').addEventListener('change', (event) => show(event.target.value));
}

export function renderNearby(mount, apartment) {
  if (!mount) return;
  mount.innerHTML = `<div class="detail-block nearby-attractions">
    <h4>Pontos de interesse próximos</h4>
    <p class="nearby-radius">Lugares em um raio de ${formatDistance(RADIUS_KM)} a partir deste imóvel.</p>
    <div data-nearby-results aria-live="polite"><p class="nearby-empty">Buscando lugares próximos...</p></div>
  </div>`;

  if (!/^[0-9a-f-]{36}$/i.test(String(apartment.id)) || typeof fetch === 'undefined') {
    renderResults(mount, apartment, [], 'missing');
    return;
  }

  const controller = new AbortController();
  let externalPoints = [];
  let status = 'loading';
  const refresh = () => {
    if (status !== 'loading') renderResults(mount, apartment, externalPoints, status);
  };
  document.addEventListener('points-loaded', refresh);
  void fetch(`/api/imoveis/${encodeURIComponent(apartment.id)}/pontos-proximos`, { signal: controller.signal })
    .then(async (response) => {
      if (response.status === 422) {
        status = 'missing';
      } else if (!response.ok) {
        status = 'failed';
      } else {
        const data = await response.json();
        externalPoints = Array.isArray(data.points) ? data.points : [];
        status = data.partial ? 'partial' : 'ready';
      }
      refresh();
    })
    .catch(() => {
      if (!controller.signal.aborted) {
        status = 'failed';
        refresh();
      }
    });
  return () => {
    document.removeEventListener('points-loaded', refresh);
    controller.abort();
  };
}
