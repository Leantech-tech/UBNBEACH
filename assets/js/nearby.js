import { openModal } from './modal.js';
import { ICONS, categoryIcon } from './utils.js';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatDistance = (km) => km < 1
  ? `${Math.round(km * 1000)} m`
  : `${km.toFixed(1).replace('.', ',')} km`;

const normalizeSearchText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

function googleMapsURL(value) {
  try {
    const url = new URL(String(value ?? ''));
    if (url.protocol === 'https:' && url.hostname === 'www.google.com' && url.pathname.startsWith('/maps/')) {
      return url.href;
    }
  } catch {
    // links externos inválidos simplesmente não são mostrados
  }
  return '';
}

function nearbyItem(point, hidden) {
  const distance = !hidden && Number.isFinite(Number(point.distanceKm)) && Number(point.distanceKm) > 0
    ? `<span class="nearby-dist">${formatDistance(Number(point.distanceKm))}</span>` : '';
  const mapsURL = googleMapsURL(point.googleMapsUrl);
  return `<li class="nearby-item">
    ${distance}
    <div class="nearby-info">
      <span class="nearby-cat">${categoryIcon(point.icon || '')}<span>${esc(point.category || 'Ponto de interesse')}</span></span>
      <h4>${esc(point.name)}</h4>
      ${point.address ? `<p class="nearby-address">${ICONS.pin}<span>${esc(point.address)}</span></p>` : ''}
      ${point.source === 'registered' ? '<span class="nearby-local-source">Cadastro local</span>' : ''}
    </div>
    ${mapsURL ? `<a class="nearby-map-link" href="${esc(mapsURL)}" target="_blank" rel="noopener noreferrer">${ICONS.pin}<span>Ver no Google Maps</span></a>` : ''}
  </li>`;
}

function renderResults(container, data, hidden) {
  const points = Array.isArray(data.points)
    ? data.points.filter((point) => point && typeof point.name === 'string' && point.name.trim()) : [];
  if (!points.length) {
    container.innerHTML = `<p class="nearby-empty nearby-empty-card">${data.partial
      ? 'O catálogo de lugares está temporariamente indisponível.'
      : 'Nenhum lugar cadastrado neste raio.'}</p>`;
    return;
  }
  const categories = [...new Set(points.map((point) => point.category || 'Ponto de interesse'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  container.innerHTML = `<div class="nearby-search">
    <label for="nearby-search-input">Buscar ponto de interesse</label>
    <input id="nearby-search-input" type="search" data-nearby-search autocomplete="off"
      placeholder="Ex.: praia, cachoeira, restaurante">
  </div>
  <div class="nearby-controls">
    <label for="nearby-category">Categoria</label>
    <select id="nearby-category" data-nearby-category>
      <option value="">Todas (${points.length})</option>
      ${categories.map((category) => `<option value="${esc(category)}">${esc(category)} (${points.filter((point) => point.category === category).length})</option>`).join('')}
    </select>
  </div>
  <p class="nearby-count" data-nearby-count></p>
  <ol class="nearby-list" data-nearby-list></ol>
  ${hidden ? '<p class="nearby-note">A distância individual não aparece para preservar a localização do imóvel.</p>' : '<p class="nearby-note">Distâncias em linha reta a partir do imóvel.</p>'}
  ${data.partial ? '<p class="nearby-note">O catálogo de lugares está temporariamente incompleto.</p>' : ''}
  <p class="nearby-note">Dados de lugares: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© colaboradores do OpenStreetMap (ODbL)</a>. Lugares ainda não mapeados podem não aparecer.</p>`;
  const searchInput = container.querySelector('[data-nearby-search]');
  const categorySelect = container.querySelector('[data-nearby-category]');
  const show = () => {
    const category = categorySelect.value;
    const term = normalizeSearchText(searchInput.value);
    const visible = points.filter((point) => {
      const matchesCategory = !category || point.category === category;
      const searchable = normalizeSearchText([point.name, point.address, point.category].join(' '));
      return matchesCategory && (!term || searchable.includes(term));
    });
    container.querySelector('[data-nearby-list]').innerHTML = visible.length
      ? visible.map((point) => nearbyItem(point, hidden)).join('')
      : '<li class="nearby-search-empty">Nenhum ponto corresponde à sua busca.</li>';
    container.querySelector('[data-nearby-count]').textContent = `${visible.length} ${visible.length === 1 ? 'lugar encontrado' : 'lugares encontrados'}`;
  };
  show();
  searchInput.addEventListener('input', show);
  categorySelect.addEventListener('change', show);
}

export function renderNearby(mount, apartment) {
  if (!mount) return;
  mount.innerHTML = `<div class="detail-block nearby-attractions">
    <h4>Pontos de interesse</h4>
    <p class="nearby-radius">Explore lugares a até 10 km deste imóvel.</p>
    <button type="button" class="btn btn-secondary nearby-open" data-nearby-open>Ver pontos de interesse</button>
  </div>`;

  let popup;
  let controller;
  const open = () => {
    if (popup) return;
    const detailOverlay = mount.closest('.modal-overlay');
    if (detailOverlay) {
      detailOverlay.style.visibility = 'hidden';
      detailOverlay.setAttribute('aria-hidden', 'true');
    }
    popup = openModal(`<div class="nearby-head">
      <h3>Pontos de interesse próximos</h3>
      <p class="nearby-sub">Lugares em um raio de 10 km a partir deste imóvel.</p>
    </div>
    <div data-nearby-results aria-live="polite"><p class="nearby-empty">Consultando lugares próximos...</p></div>`, {
      variant: 'modal-nearby',
      onClose: () => {
        controller?.abort();
        controller = null;
        popup = null;
        if (detailOverlay?.isConnected) {
          detailOverlay.style.visibility = '';
          detailOverlay.removeAttribute('aria-hidden');
          mount.querySelector('[data-nearby-open]')?.focus({ preventScroll: true });
        }
      },
    });
    const results = popup.body.querySelector('[data-nearby-results]');
    if (!/^[0-9a-f-]{36}$/i.test(String(apartment.id)) || typeof fetch === 'undefined') {
      results.innerHTML = '<p class="nearby-empty nearby-empty-card">Localização deste imóvel indisponível.</p>';
      return;
    }
    const requestController = new AbortController();
    controller = requestController;
    void fetch(`/api/imoveis/${encodeURIComponent(apartment.id)}/pontos-proximos`, { signal: requestController.signal })
      .then(async (response) => {
        if (requestController.signal.aborted || !results.isConnected) return;
        if (response.status === 422) {
          results.innerHTML = '<p class="nearby-empty nearby-empty-card">Para consultar lugares a 10 km, é preciso cadastrar a localização deste imóvel.</p>';
        } else if (response.status === 503) {
          results.innerHTML = '<p class="nearby-empty nearby-empty-card">O banco de lugares está indisponível agora.</p>';
        } else if (!response.ok) {
          results.innerHTML = '<p class="nearby-empty nearby-empty-card">Não foi possível consultar os lugares agora. Tente novamente mais tarde.</p>';
        } else {
          const data = await response.json();
          if (!requestController.signal.aborted && results.isConnected) renderResults(results, data, apartment.hideAddress);
        }
      })
      .catch(() => {
        if (!requestController.signal.aborted && results.isConnected) {
          results.innerHTML = '<p class="nearby-empty nearby-empty-card">Não foi possível consultar os lugares agora. Tente novamente mais tarde.</p>';
        }
      });
  };
  mount.querySelector('[data-nearby-open]').addEventListener('click', open);
  return () => {
    controller?.abort();
    popup?.close();
  };
}
