import { openPointModal } from './point-modal.js';
import { FALLBACK_CATEGORIES, FALLBACK_POINTS } from './points-fallback.js';
import { ICONS, categoryIcon, guardImage, linkedWhatsApp, placeholderImage } from './utils.js';

/**
 * ============================================================
 *  PONTOS DE INTERESSE — seção única com filtro por categoria
 * ------------------------------------------------------------
 *  Os dados vêm da API do backend Go (/api/pontos-interesse),
 *  lidos do banco e filtrados pela empresa vinculada na URL
 *  (site.com/<whatsapp-da-empresa>). Sem vínculo, a seção avisa
 *  que o site não está vinculado; com vínculo e API fora do ar,
 *  cai para os dados locais de exemplo (points-fallback.js).
 *
 *  O menu de chips filtra os pontos por categoria; cada card
 *  abre um modal com foto, descrição organizada em blocos e a
 *  localização no Google Maps (ver point-modal.js).
 * ============================================================
 */

const API_PONTOS_URL = '/api/pontos-interesse';

let categories = FALLBACK_CATEGORIES;
let points = FALLBACK_POINTS;

/** Carrega os pontos da empresa vinculada; mantém o fallback se a API falhar. */
export async function loadPoints() {
  const whatsapp = linkedWhatsApp();
  if (!whatsapp || typeof fetch === 'undefined') return; // sem vínculo ou jsdom

  try {
    const response = await fetch(`${API_PONTOS_URL}?whatsapp=${whatsapp}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.categories) || !Array.isArray(data.points)) {
      throw new Error('formato inesperado');
    }
    categories = data.categories;
    points = data.points;
  } catch {
    /* mantém os dados locais de exemplo */
  }
}

/** Pontos e categorias atualmente carregados (API ou fallback). */
export const getPoints = () => points;
export const getCategories = () => categories;

const categoryOf = (point) => categories.find((c) => c.id === point.categoryId) ?? null;

/* ---------- Card ---------- */

function pointCard(point) {
  const category = categoryOf(point);
  const location = point.address || [point.neighborhood, point.city].filter(Boolean).join(' · ');

  return `
    <article class="poi-card" data-point="${point.id}">
      <button type="button" class="poi-media" data-action="open" aria-label="Ver detalhes: ${point.name}">
        <img
          src="${point.image || placeholderImage(point.name)}"
          alt="${point.name}"
          loading="lazy"
          decoding="async"
        />
        ${category ? `<span class="poi-badge">${categoryIcon(category.icon || category.slug)}<span>${category.name}</span></span>` : ''}
        ${point.featured ? '<span class="poi-featured">Destaque</span>' : ''}
      </button>
      <div class="poi-body">
        <h3>${point.name}</h3>
        ${point.context ? `<p class="poi-context">${point.context}</p>` : ''}
        ${location ? `<p class="poi-location">${ICONS.pin}<span>${location}</span></p>` : ''}
        <button type="button" class="poi-more" data-action="open">
          Ver detalhes ${ICONS.arrowRight}
        </button>
      </div>
    </article>`;
}

/* ---------- Filtro + grid ---------- */

export function renderPoints() {
  const mount = document.getElementById('pointsMount');
  if (!mount) return;

  if (!linkedWhatsApp()) {
    mount.innerHTML =
      '<p class="section-sub">Este site ainda não está vinculado a uma empresa. ' +
      'Acesse o endereço com o número de WhatsApp da empresa no final (ex.: site.com/12997353792).</p>';
    return;
  }

  if (points.length === 0) {
    mount.innerHTML = '<p class="section-sub">Nenhum ponto de interesse cadastrado no momento.</p>';
    return;
  }

  const visibleCategories = categories.filter((c) => points.some((p) => p.categoryId === c.id));

  mount.innerHTML = `
    <div class="poi-filters" role="group" aria-label="Filtrar pontos de interesse por categoria">
      <button type="button" class="poi-filter is-active" data-category="all" aria-pressed="true">
        ${ICONS.compass}<span>Todos</span>
        <span class="poi-count">${points.length}</span>
      </button>
      ${visibleCategories
        .map((c) => {
          const count = points.filter((p) => p.categoryId === c.id).length;
          return `
      <button type="button" class="poi-filter" data-category="${c.id}" aria-pressed="false">
        ${categoryIcon(c.icon || c.slug)}<span>${c.name}</span>
        <span class="poi-count">${count}</span>
      </button>`;
        })
        .join('')}
    </div>
    <div class="poi-grid" data-points-grid></div>
    <p class="poi-empty" hidden>Nenhum ponto de interesse nesta categoria.</p>`;

  const grid = mount.querySelector('[data-points-grid]');
  const empty = mount.querySelector('.poi-empty');
  const filters = [...mount.querySelectorAll('.poi-filter')];

  const openPoint = (el) => {
    const point = points.find((p) => p.id === el.closest('[data-point]').dataset.point);
    if (point) openPointModal(point, categoryOf(point));
  };

  const show = (categoryId) => {
    const list = categoryId === 'all' ? points : points.filter((p) => p.categoryId === categoryId);
    empty.hidden = list.length > 0;
    grid.innerHTML = list.map(pointCard).join('');
    grid.querySelectorAll('img').forEach(guardImage);
    grid.querySelectorAll('[data-action="open"]').forEach((el) => {
      el.addEventListener('click', () => openPoint(el));
    });
  };

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      grid.classList.add('is-switching');
      setTimeout(() => {
        show(btn.dataset.category);
        grid.classList.remove('is-switching');
      }, 180);
    });
  });

  show('all');
}
