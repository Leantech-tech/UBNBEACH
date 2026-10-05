import { SITE_CONFIG } from './config.js';
import { APARTMENTS as FALLBACK_APARTMENTS } from './apartments.js';
import { openApartmentDetail } from './detail.js';
import { loadPoints, renderPoints } from './points.js';
import {
  ICONS,
  amenityIcon,
  formatGuests,
  plural,
  buildWhatsAppLink,
  guardImage,
  linkedWhatsApp,
} from './utils.js';

/* ============================================================
 *  Liga os dados de configuração ao HTML (brand e links de
 *  WhatsApp). O contato mostra apenas o telefone.
 * ============================================================ */
function bindConfig() {
  document.querySelectorAll('[data-bind="brandName"]').forEach((el) => (el.textContent = SITE_CONFIG.brandName));
  document.querySelectorAll('[data-bind="whatsappDisplay"]').forEach((el) => (el.textContent = SITE_CONFIG.whatsappDisplay));

  const generalLink = buildWhatsAppLink(SITE_CONFIG.whatsappDefaultMessage);
  document.querySelectorAll('[data-whatsapp-general]').forEach((a) => (a.href = generalLink));
}

/* ============================================================
 *  Injeta os ícones estáticos declarados via [data-icon]
 * ============================================================ */
function injectIcons() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    const icon = ICONS[el.dataset.icon];
    if (icon) el.innerHTML = icon;
  });
}

/* ============================================================
 *  Cards dos apartamentos
 * ------------------------------------------------------------
 *  Os dados vêm da API do backend Go (/api/imoveis), lida
 *  direto do banco, filtrada pela empresa vinculada na URL:
 *  acessar o site com /<whatsapp-da-empresa> no final (ex.:
 *  site.com/12997353792). Sem vínculo válido nenhum imóvel é
 *  exibido. Se a API estiver fora do ar e houver vínculo, o
 *  site cai para os dados locais de exemplo (apartments.js).
 * ============================================================ */
const API_IMOVEIS_URL = '/api/imoveis';
const API_EMPRESA_URL = '/api/empresa';
let APARTMENTS = FALLBACK_APARTMENTS;

async function loadApartments() {
  const whatsapp = linkedWhatsApp();
  if (!whatsapp) {
    APARTMENTS = [];
    return;
  }
  if (typeof fetch === 'undefined') return; // ambiente de teste (jsdom)

  try {
    const response = await fetch(`${API_IMOVEIS_URL}?whatsapp=${whatsapp}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const valid = Array.isArray(data) && data.every((a) => a && a.id && a.name);
    if (valid) APARTMENTS = data;
  } catch {
    /* mantém os dados locais de exemplo */
  }
}

/* ============================================================
 *  Dados da empresa vinculada
 * ------------------------------------------------------------
 *  Busca /api/empresa?whatsapp=... e sobrescreve o SITE_CONFIG
 *  (WhatsApp, endereço, mapa) com os dados cadastrados no banco.
 *  O nome do site (brandName) é fixo e não é alterado pela empresa
 *  vinculada. Se a API estiver fora, mantém o config.js.
 * ============================================================ */
function formatWhatsAppDisplay(digits) {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

async function loadCompany() {
  const whatsapp = linkedWhatsApp();
  if (!whatsapp || typeof fetch === 'undefined') return; // sem vínculo ou jsdom

  try {
    const response = await fetch(`${API_EMPRESA_URL}?whatsapp=${whatsapp}`);
    if (!response.ok) return;
    const empresa = await response.json();
    if (!empresa || !empresa.id) return;

    const digits = String(empresa.whatsapp ?? '').replace(/\D/g, '');
    if (digits) {
      const local = digits.slice(-11);
      SITE_CONFIG.whatsappNumber = '55' + local;
      SITE_CONFIG.whatsappDisplay = formatWhatsAppDisplay(local);
    }
  } catch {
    /* mantém a configuração padrão do config.js */
  }
}

function apartmentCard(apartment, index) {
  const amenitiesPreview = apartment.amenities.slice(0, 3);
  const extra = apartment.amenities.length - amenitiesPreview.length;

  return `
    <article class="apt-card reveal" data-delay="${(index % 3) * 100}" data-apartment="${apartment.id}">
      <button type="button" class="apt-media" data-action="details" aria-label="Ver detalhes do ${apartment.name}">
        <img src="${apartment.images[0] ?? ''}" alt="Foto do ${apartment.name}" loading="lazy" decoding="async" />
      </button>

      <div class="apt-body">
        <h3>${apartment.name}</h3>
        <p class="apt-location">${ICONS.pin}<span>${apartment.location}</span></p>

        <ul class="apt-meta">
          <li>${ICONS.users}<span>${apartment.capacity}</span></li>
          <li>${ICONS.bedroom}<span>${plural(apartment.bedrooms, 'quarto', 'quartos')}</span></li>
          <li>${ICONS.bed}<span>${plural(apartment.beds, 'cama', 'camas')}</span></li>
        </ul>

        <ul class="apt-amenities">
          ${amenitiesPreview.map((a) => `<li>${amenityIcon(a)}<span>${a}</span></li>`).join('')}
          ${extra > 0 ? `<li class="apt-more">+${extra}</li>` : ''}
        </ul>

        <div class="apt-foot">
          <div class="apt-price">
            <span>${apartment.price ? 'a partir de' : 'Investimento'}</span>
            <strong>${apartment.price ?? 'Sob consulta'}</strong>
          </div>
          ${
            apartment.available
              ? `<button type="button" class="btn btn-primary" data-action="details">Ver detalhes</button>`
              : `<button type="button" class="btn btn-outline" data-action="details">Ver detalhes</button>`
          }
        </div>
      </div>
    </article>`;
}

function renderApartments() {
  const grid = document.getElementById('apartmentsGrid');
  if (!grid) return;

  if (!linkedWhatsApp()) {
    grid.innerHTML =
      '<p class="section-sub">Este site ainda não está vinculado a uma empresa. ' +
      'Acesse o endereço com o número de WhatsApp da empresa no final (ex.: site.com/12997353792).</p>';
    return;
  }

  if (APARTMENTS.length === 0) {
    grid.innerHTML = '<p class="section-sub">Nenhum imóvel disponível no momento.</p>';
    return;
  }

  grid.innerHTML = APARTMENTS.map(apartmentCard).join('');
  grid.querySelectorAll('img').forEach(guardImage);

  grid.querySelectorAll('[data-action="details"]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.closest('[data-apartment]').dataset.apartment;
      const apartment = APARTMENTS.find((a) => a.id === id);
      if (apartment) openApartmentDetail(apartment);
    });
  });
}

/* ============================================================
 *  Header, menu mobile e navegação
 * ============================================================ */
function initNavigation() {
  const header = document.getElementById('siteHeader');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileMenu');

  const onScroll = () => {
    const scrolled = window.scrollY > 110;
    header.classList.toggle('is-scrolled', scrolled);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const closeMenu = () => {
    menu.classList.remove('is-open');
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    header.classList.remove('menu-open');
    document.body.classList.remove('no-scroll');
  };

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.classList.toggle('is-active', open);
    toggle.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open);
  });

  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

  const closeBtn = document.getElementById('mobileMenuClose');
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
}

/* ============================================================
 *  Animações de entrada durante o scroll
 * ============================================================ */
function initReveals() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach((el) => {
    if (el.dataset.delay) el.style.transitionDelay = `${el.dataset.delay}ms`;
    io.observe(el);
  });
}

/* ============================================================
 *  Título do hero: entra letra por letra
 * ============================================================ */
function initHeroTitle() {
  const h1 = document.querySelector('.hero h1');
  if (!h1) return;

  const LETTER_STEP = 70;
  const WORD_PAUSE = 160;
  let delay = 0;

  const wrapChars = (node, parent) => {
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        delay += WORD_PAUSE;
        parent.appendChild(document.createTextNode(' '));
      } else {
        for (const char of part) {
          const span = document.createElement('span');
          span.className = 'letter';
          span.style.setProperty('--d', `${delay}ms`);
          span.textContent = char;
          parent.appendChild(span);
          delay += LETTER_STEP;
        }
      }
    });
  };

  Array.from(h1.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      wrapChars(node, fragment);
      h1.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'BR') {
        delay += WORD_PAUSE;
        return;
      }
      const original = Array.from(node.childNodes);
      node.textContent = '';
      original.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) wrapChars(child, node);
        else node.appendChild(child);
      });
    }
  });

  if (!('IntersectionObserver' in window)) {
    h1.classList.add('play');
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          h1.classList.add('play');
          io.disconnect();
        }
      });
    },
    { threshold: 0.4 }
  );
  io.observe(h1);
}

/* ============================================================
 *  Modo sem vínculo (propaganda Leantech)
 * ------------------------------------------------------------
 *  Sem empresa vinculada na URL, as seções de imóveis e de
 *  pontos de interesse saem de cena e aparece a propaganda da
 *  Leantech Automação (criadora do sistema).
 * ============================================================ */
function setupPromoMode() {
  if (linkedWhatsApp()) return;

  document.getElementById('apartamentos')?.setAttribute('hidden', '');
  document.getElementById('pontos-interesse')?.setAttribute('hidden', '');
  document.getElementById('como-funciona')?.setAttribute('hidden', '');
  document.getElementById('leantechPromo')?.removeAttribute('hidden');

  // Esconde os links de navegação das seções removidas
  document
    .querySelectorAll('a[href="#apartamentos"], a[href="#pontos-interesse"], a[href="#como-funciona"]')
    .forEach((a) => a.setAttribute('hidden', ''));

  // Sem empresa vinculada não há para quem reservar: some os botões de
  // WhatsApp (header, menu mobile, faixa de CTA e botão flutuante).
  document.querySelectorAll('[data-whatsapp-general]').forEach((el) => el.setAttribute('hidden', ''));
  document.querySelector('.wa-float')?.setAttribute('hidden', '');
  document.querySelector('.cta-banner')?.setAttribute('hidden', '');
  document.querySelector('.site-footer')?.setAttribute('hidden', '');
}

/* ============================================================
 *  Inicialização
 * ============================================================ */
function init() {
  bindConfig();
  injectIcons();
  setupPromoMode();
  renderApartments();
  renderPoints();
  initNavigation();
  initReveals();
  initHeroTitle();

  const year = document.getElementById('currentYear');
  if (year) year.textContent = String(new Date().getFullYear());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

async function start() {
  await Promise.all([loadApartments(), loadCompany(), loadPoints()]);
  init();
}
