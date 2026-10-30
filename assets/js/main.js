import { SITE_CONFIG } from './config.js';
import { APARTMENTS as FALLBACK_APARTMENTS } from './apartments.js';
import { openApartmentDetail } from './detail.js';
import { loadPoints } from './points.js';
import {
  ICONS,
  amenityIcon,
  formatGuests,
  plural,
  buildWhatsAppLink,
  guardImage,
  isPromoRoute,
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
 *  direto do banco. Com /<whatsapp-da-empresa> na URL (ex.:
 *  site.com/12997353792) mostra só os imóveis daquela empresa; sem
 *  vínculo (raiz do site) mostra o catálogo público de todas as
 *  empresas. Na rota /detalhes (propaganda Leantech) nada é carregado.
 *  Se a API estiver fora do ar e houver vínculo, o site cai para os
 *  dados locais de exemplo (apartments.js).
 * ============================================================ */
const API_IMOVEIS_URL = '/api/imoveis';
const API_EMPRESA_URL = '/api/empresa';
let APARTMENTS = FALLBACK_APARTMENTS;

async function loadApartments() {
  if (isPromoRoute()) {
    APARTMENTS = [];
    return;
  }
  if (typeof fetch === 'undefined') return; // ambiente de teste (jsdom)

  const whatsapp = linkedWhatsApp();
  try {
    const response = await fetch(whatsapp ? `${API_IMOVEIS_URL}?whatsapp=${whatsapp}` : API_IMOVEIS_URL);
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
  const amenities = Array.isArray(apartment.amenities) ? apartment.amenities : [];
  const amenitiesPreview = amenities.slice(0, 3);
  const extra = amenities.length - amenitiesPreview.length;
  const cover =
    (Array.isArray(apartment.imageDetails) && apartment.imageDetails.find((image) => image?.url)?.url) ||
    (Array.isArray(apartment.images) && apartment.images[0]) ||
    '';

  return `
    <article class="apt-card reveal" data-delay="${(index % 3) * 100}" data-apartment="${apartment.id}">
      <button type="button" class="apt-media" data-action="details" aria-label="Ver detalhes do ${apartment.name}">
        <img src="${cover}" alt="Foto do ${apartment.name}" loading="lazy" decoding="async" fetchpriority="low" />
      </button>

      <div class="apt-body">
        <h3>${apartment.name}</h3>
        <p class="apt-location">${ICONS.pin}<span>${apartment.location}</span></p>
        ${
          !linkedWhatsApp() && apartment.empresaNome
            ? `<p class="apt-empresa">${ICONS.building}<span>Anunciado por ${apartment.empresaNome}</span></p>`
            : ''
        }

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

function renderApartments(filtered = null) {
  const grid = document.getElementById('apartmentsGrid');
  if (!grid || isPromoRoute()) return;

  const list = filtered ?? APARTMENTS;

  if (list.length === 0) {
    grid.innerHTML = filtered
      ? '<p class="section-sub apt-empty">Nenhum imóvel encontrado com esses filtros. Ajuste a busca ou limpe os filtros.</p>'
      : '<p class="section-sub">Nenhum imóvel disponível no momento.</p>';
    return;
  }

  grid.innerHTML = list.map(apartmentCard).join('');

  // Re-render por filtro: cards novos não passam pelo observer de reveal,
  // então entram direto com a animação concluída
  if (filtered) grid.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));

  grid.querySelectorAll('img').forEach(guardImage);

  grid.querySelectorAll('[data-action="details"]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.closest('[data-apartment]').dataset.apartment;
      const apartment = APARTMENTS.find((a) => a.id === id);
      if (apartment) openApartmentDetail(apartment, { apartments: APARTMENTS });
    });
  });
}

/* ============================================================
 *  Filtros da seção de imóveis
 * ------------------------------------------------------------
 *  Nome (busca parcial), quantidade de pessoas (capacidade mínima)
 *  e local. As opções de pessoas e local são montadas a partir
 *  dos próprios imóveis carregados.
 * ============================================================ */
function applyApartmentFilters() {
  const name = (document.getElementById('aptFilterName')?.value ?? '').trim().toLowerCase();
  const guests = Number(document.getElementById('aptFilterGuests')?.value || 0);
  const location = document.getElementById('aptFilterLocation')?.value ?? '';

  return APARTMENTS.filter((a) => {
    if (name && !(a.name ?? '').toLowerCase().includes(name)) return false;
    if (guests && (a.capacity ?? 0) < guests) return false;
    if (location && a.location !== location) return false;
    return true;
  });
}

function initApartmentFilters() {
  const form = document.getElementById('aptFilters');
  if (!form || isPromoRoute()) return;

  refreshApartmentFilterOptions();

  const update = () => renderApartments(applyApartmentFilters());
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('reset', () => setTimeout(update));
}

function refreshApartmentFilterOptions() {
  const guestsEl = document.getElementById('aptFilterGuests');
  const locationEl = document.getElementById('aptFilterLocation');
  if (!guestsEl || !locationEl) return;

  const selectedGuests = guestsEl.value;
  const selectedLocation = locationEl.value;
  guestsEl.innerHTML = '<option value="">Todas</option>';
  locationEl.innerHTML = '<option value="">Todos</option>';

  const capacities = [...new Set(APARTMENTS.map((a) => a.capacity).filter(Number.isFinite))].sort((x, y) => x - y);
  capacities.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = String(c);
    opt.textContent = `${c} ou mais`;
    guestsEl.appendChild(opt);
  });

  [...new Set(APARTMENTS.map((a) => a.location).filter(Boolean))].sort().forEach((loc) => {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = loc;
    locationEl.appendChild(opt);
  });

  if (capacities.some((capacity) => String(capacity) === selectedGuests)) guestsEl.value = selectedGuests;
  if ([...locationEl.options].some((option) => option.value === selectedLocation)) locationEl.value = selectedLocation;
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
    toggle.setAttribute('aria-label', 'Abrir menu');
    menu.setAttribute('aria-hidden', 'true');
    header.classList.remove('menu-open');
    document.body.classList.remove('no-scroll');
  };

  toggle.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    toggle.classList.toggle('is-active', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.setAttribute('aria-hidden', String(!open));
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open);
  });

  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  menu.querySelector('.mobile-menu-backdrop')?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
  });

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
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const LETTER_STEP = 24;
  const WORD_PAUSE = 70;
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

  let started = false;
  const startAnimation = () => {
    if (started) return;
    started = true;
    h1.classList.add('play');
    io.disconnect();
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) startAnimation();
      });
    },
    { threshold: 0.4 }
  );
  io.observe(h1);
  window.setTimeout(startAnimation, 900);
}

/* ============================================================
 *  Vídeo do hero sob demanda
 * ------------------------------------------------------------
 *  Mantém o pôster visível durante o carregamento inicial. Só busca
 *  o vídeo depois da primeira carga, quando a seção está visível e
 *  o dispositivo não pediu menos movimento ou economia de dados.
 * ============================================================ */
function initHeroVideo() {
  const video = document.querySelector('.hero-bg video');
  const source = video?.querySelector('source[data-src]');
  if (!video || !source) return;

  const hero = video.closest('.hero');
  if (!hero) return;

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'hero-video-control';
  playButton.hidden = true;
  playButton.setAttribute('aria-label', 'Reproduzir animação do destaque');
  playButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg><span>Reproduzir animação</span>';
  hero.appendChild(playButton);

  const buttonText = playButton.querySelector('span');
  const showPlayButton = (label = 'Reproduzir animação') => {
    buttonText.textContent = label;
    playButton.setAttribute('aria-label', label);
    playButton.hidden = false;
  };
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const conserveData = connection?.saveData || /^(slow-2g|2g)$/.test(connection?.effectiveType ?? '');

  let ready = false;
  let loaded = false;
  let visible = !('IntersectionObserver' in window);
  let waitingForVideo = false;
  let loadTimer = 0;

  const syncPlayback = () => {
    if (!ready || !visible || document.hidden) {
      video.pause();
      return;
    }

    if (!loaded) {
      loaded = true;
      source.src = source.dataset.src || source.getAttribute('src');
      source.removeAttribute('data-src');
      video.load();
      window.clearTimeout(loadTimer);
      loadTimer = window.setTimeout(() => {
        if (video.paused && video.readyState < 2) showPlayButton('Tentar reproduzir novamente');
      }, 8000);
    }

    if (video.readyState >= 2) {
      try {
        const playback = video.play();
        playback?.then(() => {
          window.clearTimeout(loadTimer);
          playButton.hidden = true;
        }).catch(() => showPlayButton());
      } catch {
        showPlayButton();
      }
      return;
    }

    if (!waitingForVideo) {
      waitingForVideo = true;
      video.addEventListener(
        'canplay',
        () => {
          waitingForVideo = false;
          syncPlayback();
        },
        { once: true }
      );
    }
  };

  playButton.addEventListener('click', () => {
    ready = true;
    visible = true;
    if (video.error) loaded = false;
    syncPlayback();
  });
  video.addEventListener('playing', () => {
    window.clearTimeout(loadTimer);
    playButton.hidden = true;
  });
  video.addEventListener('error', () => {
    loaded = false;
    waitingForVideo = false;
    showPlayButton('Tentar reproduzir novamente');
  });

  if (reducedMotion || conserveData) {
    showPlayButton();
    return;
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      syncPlayback();
    }, { threshold: 0.01 });
    observer.observe(video);
  }

  document.addEventListener('visibilitychange', syncPlayback);

  const scheduleVideo = () => {
    const startWhenIdle = () => {
      ready = true;
      syncPlayback();
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(startWhenIdle, { timeout: 2500 });
    else window.setTimeout(startWhenIdle, 1400);
  };

  if (document.readyState === 'complete') scheduleVideo();
  else window.addEventListener('load', scheduleVideo, { once: true });
}

/* ============================================================
 *  Modo propaganda (rota /detalhes)
 * ------------------------------------------------------------
 *  Em site.com/detalhes o site vira a página de apresentação da
 *  Leantech Automação (criadora do sistema): as seções de imóveis
 *  e como funciona saem de cena e aparece a
 *  propaganda. Nas demais rotas — raiz (catálogo de todas as
 *  empresas) ou /<whatsapp> (empresa vinculada) — o site funciona
 *  normalmente.
 * ============================================================ */
function setupPromoMode() {
  if (!isPromoRoute()) return;

  document.getElementById('apartamentos')?.setAttribute('hidden', '');
  document.getElementById('como-funciona')?.setAttribute('hidden', '');
  document.getElementById('leantechPromo')?.removeAttribute('hidden');

  // Esconde os links de navegação das seções removidas
  document
    .querySelectorAll('a[href="#apartamentos"], a[href="#como-funciona"]')
    .forEach((a) => a.setAttribute('hidden', ''));

  // Na propaganda não há para quem reservar: some os botões de
  // WhatsApp (header, menu mobile, faixa de CTA e botão flutuante).
  document.querySelectorAll('[data-whatsapp-general]').forEach((el) => el.setAttribute('hidden', ''));
  document.querySelector('.wa-float')?.setAttribute('hidden', '');
  document.querySelector('.cta-banner')?.setAttribute('hidden', '');
  document.querySelector('.site-footer')?.setAttribute('hidden', '');
}

/* ============================================================
 *  Modo catálogo (raiz do site, sem empresa vinculada)
 * ------------------------------------------------------------
 *  Sem /<whatsapp> na URL, o site mostra os imóveis de todas as
 *  empresas. Como não há uma empresa única por trás da
 *  página, os botões genéricos de WhatsApp (faixa de CTA e contato
 *  do rodapé) saem de cena — o contato acontece pelo botão Alugar
 *  de cada imóvel, que abre o WhatsApp da empresa daquele imóvel.
 * ============================================================ */
function setupCatalogMode() {
  if (linkedWhatsApp() || isPromoRoute()) return;

  document.querySelectorAll('[data-whatsapp-general]').forEach((el) => el.setAttribute('hidden', ''));
  document.querySelector('.wa-float')?.setAttribute('hidden', '');
  document.querySelector('.cta-banner')?.setAttribute('hidden', '');
}

/* ============================================================
 *  Inicialização
 * ============================================================ */
function init() {
  bindConfig();
  injectIcons();
  setupPromoMode();
  setupCatalogMode();
  renderApartments();
  initApartmentFilters();
  initNavigation();
  initReveals();
  initHeroTitle();
  initHeroVideo();

  const year = document.getElementById('currentYear');
  if (year) year.textContent = String(new Date().getFullYear());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

function start() {
  init();

  void loadApartments()
    .then(() => {
      refreshApartmentFilterOptions();
      renderApartments(applyApartmentFilters());
    })
    .catch(() => {});
  void loadCompany().then(bindConfig).catch(() => {});
  void loadPoints().catch(() => {});
}
