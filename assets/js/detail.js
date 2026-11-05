import { openModal } from './modal.js';
import { openBooking } from './booking.js';
import { createGallery } from './gallery.js';
import { renderNearby } from './nearby.js';
import { openReviewsModal } from './reviews.js';
import {
  ICONS,
  amenityIcon,
  formatGuests,
  plural,
  linkedWhatsApp,
} from './utils.js';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Escapa texto do banco antes de injetar no HTML. */
function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Prioriza as mídias com legenda fornecidas pela API e complementa
 * com URLs legadas sem duplicar fotos.
 */
function propertyImages(apartment) {
  const result = [];
  const seen = new Set();
  const add = (url, caption = '') => {
    if (typeof url !== 'string' || !url.trim() || seen.has(url)) return;
    seen.add(url);
    result.push({ url, caption: typeof caption === 'string' ? caption.trim() : '' });
  };

  if (Array.isArray(apartment.imageDetails)) {
    apartment.imageDetails.forEach((image) => add(image?.url, image?.caption));
  }
  if (Array.isArray(apartment.images)) {
    apartment.images.forEach((url) => add(url));
  }
  return result;
}

function propertyMapURL(apartment) {
  const id = String(apartment?.id ?? '');
  const isUUID = /^[0-9a-f-]{36}$/i.test(id);
  if (isUUID) {
    return `/api/imoveis/${encodeURIComponent(id)}/mapa`;
  }
  if (!apartment?.hideAddress && typeof apartment?.mapQuery === 'string' && apartment.mapQuery.trim()) {
    const query = new URLSearchParams({ api: '1', destination: apartment.mapQuery.trim(), travelmode: 'driving' });
    return `https://www.google.com/maps/dir/?${query.toString()}`;
  }
  return '';
}

function renderPropertyLocation(mount, apartment) {
  if (!mount) return;
  const mapURL = propertyMapURL(apartment);
  mount.innerHTML = `<section class="detail-property-location" aria-label="Localização do imóvel">
    <div class="detail-location-card-head">
      <div><span class="detail-location-eyebrow">LOCALIZAÇÃO</span><h4>Mapa do imóvel</h4></div>
      ${ICONS.pin}
    </div>
    <div class="detail-map-content" data-property-map-content>
      <p class="detail-map-loading">Carregando localização…</p>
    </div>
  </section>`;

  const content = mount.querySelector('[data-property-map-content]');
  const showFallback = (message, link = mapURL) => {
    if (!content?.isConnected) return;
    content.innerHTML = `<div class="detail-map-fallback">
      <span class="detail-map-fallback-pin">${ICONS.pin}</span>
      <p>${esc(message)}</p>
      ${link ? `<a class="detail-map-open" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Traçar rota no Google Maps ${ICONS.arrowRight}</a>` : ''}
    </div>`;
  };

  if (!mapURL) {
    showFallback('Cadastre a latitude e a longitude para mostrar a localização deste imóvel.', '');
    return;
  }
  if (!/^[0-9a-f-]{36}$/i.test(String(apartment?.id)) || typeof fetch === 'undefined') {
    showFallback('Abra o mapa para conferir a localização do imóvel.');
    return;
  }

  const controller = new AbortController();
  void fetch(`/api/imoveis/${encodeURIComponent(apartment.id)}/mapa-embed`, { signal: controller.signal })
    .then(async (response) => {
      if (!content?.isConnected || controller.signal.aborted) return;
      if (response.status === 422) {
        showFallback('As coordenadas ainda não aparecem no cadastro deste imóvel.', '');
        return;
      }
      if (!response.ok) {
        showFallback('Não foi possível carregar o mapa agora.');
        return;
      }
      const data = await response.json();
      let embedURL;
      try {
        const candidate = new URL(String(data.embedUrl ?? ''));
        if (candidate.protocol === 'https:' && candidate.hostname === 'www.openstreetmap.org' && candidate.pathname === '/export/embed.html') {
          embedURL = candidate.href;
        }
      } catch {
        // Se o mapa falhar, mantém o link de rota do Google Maps.
      }
      if (!embedURL) {
        showFallback('Não foi possível carregar o mapa do imóvel agora.');
        return;
      }
      let routeURL = mapURL;
      try {
        const routeCandidate = new URL(String(data.mapUrl ?? ''), window.location.href);
        if (routeCandidate.protocol === 'https:' && routeCandidate.hostname === 'www.google.com' && routeCandidate.pathname === '/maps/dir/') {
          routeURL = routeCandidate.href;
        }
      } catch {
        // Mantém o endpoint próprio como rota de fallback.
      }
      content.innerHTML = `<div class="detail-map-frame">
        <iframe title="Mapa com a localização do imóvel no OpenStreetMap" src="${esc(embedURL)}" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        <a class="detail-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>
      </div>
      <a class="detail-map-open detail-map-open-inline" href="${esc(routeURL)}" target="_blank" rel="noopener noreferrer">Traçar rota no Google Maps ${ICONS.arrowRight}</a>`;
    })
    .catch(() => {
      if (!controller.signal.aborted) showFallback('Não foi possível carregar o mapa agora.');
    });
  return () => controller.abort();
}

/** Monta o resumo das camas ("2 de casal · 2 beliches · 1 sofá-cama"). */
function bedsBreakdown(a) {
  const parts = [];
  if (a.doubleBeds > 0) parts.push(plural(a.doubleBeds, 'cama de casal', 'camas de casal'));
  if (a.singleBeds > 0) parts.push(plural(a.singleBeds, 'cama de solteiro', 'camas de solteiro'));
  if (a.bunkBeds > 0) parts.push(plural(a.bunkBeds, 'beliche', 'beliches'));
  if (a.sofaBeds > 0) parts.push(plural(a.sofaBeds, 'sofá-cama', 'sofás-cama'));
  return parts.join(' · ');
}

/**
 * Abre a experiência de detalhes do imóvel. No topo, galeria à
 * esquerda e identificação + descrição à direita; abaixo, os blocos
 * (comodidades, regras, valores) divididos automaticamente em duas
 * colunas de altura equilibrada.
 */
export function openApartmentDetail(apartment, { apartments = [] } = {}) {
  const images = propertyImages(apartment);
  const amenities = Array.isArray(apartment.amenities) ? apartment.amenities : [];

  const meta = [
    { icon: ICONS.users, label: formatGuests(apartment.capacity) },
    { icon: ICONS.bedroom, label: plural(apartment.bedrooms, 'quarto', 'quartos') },
    ...(apartment.suites > 0 ? [{ icon: ICONS.bedroom, label: plural(apartment.suites, 'suíte', 'suítes') }] : []),
    ...(apartment.beds > 0
      ? [{ icon: ICONS.bed, label: `${plural(apartment.beds, 'cama', 'camas')} (${bedsBreakdown(apartment)})` }]
      : []),
    { icon: ICONS.bath, label: plural(apartment.bathrooms, 'banheiro', 'banheiros') },
    ...(apartment.parkingSpaces > 0
      ? [{ icon: ICONS.pin, label: plural(apartment.parkingSpaces, 'vaga de garagem', 'vagas de garagem') }]
      : []),
    ...(apartment.sizeM2 ? [{ icon: ICONS.area, label: `${apartment.sizeM2} m²` }] : []),
  ];

  const rules = [
    apartment.checkin && { label: 'Check-in', value: `a partir das ${apartment.checkin}` },
    apartment.checkout && { label: 'Check-out', value: `até as ${apartment.checkout}` },
    apartment.minStay > 0 && { label: 'Estadia mínima', value: plural(apartment.minStay, 'noite', 'noites') },
    { label: 'Aceita animais', value: apartment.petsAllowed ? 'Sim' : 'Não' },
    { label: 'Permite eventos', value: apartment.eventsAllowed ? 'Sim' : 'Não' },
    { label: 'Permite fumar', value: apartment.smokingAllowed ? 'Sim' : 'Não' },
  ].filter(Boolean);

  const costs = [
    apartment.dailyPrice && { label: 'Diária (semana)', value: brl.format(apartment.dailyPrice) },
    apartment.weekendPrice && { label: 'Diária (fim de semana)', value: brl.format(apartment.weekendPrice) },
    apartment.cleaningFee && { label: 'Taxa de limpeza', value: brl.format(apartment.cleaningFee) },
    apartment.securityDeposit && { label: 'Caução', value: brl.format(apartment.securityDeposit) },
  ].filter(Boolean);

  const html = `
    <article class="detail">
      <div class="detail-col-left">
        <div class="detail-gallery" data-gallery-mount></div>

        <div class="detail-blocks">
          ${
            amenities.length
              ? `<div class="detail-block">
                   <h4>Comodidades</h4>
                   <ul class="detail-amenities">
                     ${amenities.map((a) => `<li>${amenityIcon(a)}<span>${esc(a)}</span></li>`).join('')}
                   </ul>
                 </div>`
              : ''
          }

          <div class="detail-block">
            <h4>Regras da estadia</h4>
            <ul class="detail-facts">
              ${rules.map((r) => `<li><span>${esc(r.label)}</span><strong>${esc(r.value)}</strong></li>`).join('')}
            </ul>
            ${apartment.houseRules ? `<p class="detail-notes">${esc(apartment.houseRules)}</p>` : ''}
          </div>
        </div>
        <div data-property-map-mount></div>
      </div>

      <div class="detail-info">
        <div class="detail-head">
          <div>
            ${apartment.featured ? '<span class="badge badge-gold">Destaque</span>' : ''}
            <h3>${esc(apartment.name)}</h3>
            <p class="detail-location">${ICONS.pin}<span>${esc(apartment.location)}</span></p>
            ${
              !linkedWhatsApp() && apartment.empresaNome
                ? `<p class="detail-empresa">${ICONS.building}<span>Anunciado por ${esc(apartment.empresaNome)}</span></p>`
                : ''
            }
            ${apartment.address ? `<p class="detail-address">${esc(apartment.address)}</p>` : ''}
            ${apartment.referencePoint ? `<p class="detail-address">${esc(apartment.referencePoint)}</p>` : ''}
          </div>
        </div>

        <ul class="detail-meta">
          ${meta.map((m) => `<li>${m.icon}<span>${esc(m.label)}</span></li>`).join('')}
        </ul>

        ${
          apartment.description
            ? `<div class="detail-block">
                 <h4>Sobre o imóvel</h4>
                 <p>${esc(apartment.description)}</p>
               </div>`
            : ''
        }

        ${
          costs.length
            ? `<div class="detail-block">
                 <h4>Valores</h4>
                 <ul class="detail-facts">
                   ${costs.map((c) => `<li><span>${esc(c.label)}</span><strong>${esc(c.value)}</strong></li>`).join('')}
                 </ul>
               </div>`
            : ''
        }

        ${
          apartment.priceNotes
            ? `<div class="detail-block">
                 <h4>Observações sobre os valores</h4>
                 <p>${esc(apartment.priceNotes)}</p>
               </div>`
            : ''
        }

      </div>

      <section class="detail-nearby" data-nearby-mount aria-label="Localização e pontos próximos"></section>

      <div class="detail-cta">
        <div class="detail-price">
          <span class="detail-price-label">Investimento</span>
          <strong>${apartment.price ? esc(apartment.price) : 'Sob consulta'}</strong>
        </div>
        <div class="detail-actions">
          ${
            apartment.available
              ? `<button type="button" class="btn btn-primary btn-lg" data-action="rent">Alugar ${ICONS.arrowRight}</button>`
              : '<p class="detail-unavailable">Este imóvel não está disponível no momento. Fale conosco para conhecer outras opções.</p>'
          }
          <button type="button" class="btn btn-secondary" data-action="reviews">Avaliar ${ICONS.star || ''}</button>
        </div>
      </div>
    </article>`;

  let cleanupDetail = () => {};
  const modal = openModal(html, { variant: 'modal-detail', onBeforeClose: () => cleanupDetail() });

  /* ---------- Galeria ---------- */
  const gallery = createGallery(modal.body.querySelector('[data-gallery-mount]'), images, {
    alt: `Foto do ${apartment.name}`,
    apartment,
    otherApartments: apartments.filter((candidate) => candidate?.id !== apartment.id),
    onSelectApartment: (selected) => {
      modal.close();
      openApartmentDetail(selected, { apartments });
    },
    onBook: apartment.available
      ? () => {
          modal.close();
          setTimeout(() => openBooking(apartment), 240);
        }
      : undefined,
  });
  const stopPropertyLocation = renderPropertyLocation(modal.body.querySelector('[data-property-map-mount]'), apartment);
  const stopNearby = renderNearby(modal.body.querySelector('[data-nearby-mount]'), apartment);

  /* ---------- CTA Alugar → fluxo de reserva ---------- */
  modal.body.querySelector('[data-action="rent"]')?.addEventListener('click', () => {
    modal.close();
    setTimeout(() => openBooking(apartment), 240);
  });

  const detailOverlay = modal.sheet.closest('.modal-overlay');
  modal.body.querySelector('[data-action="reviews"]')?.addEventListener('click', () => {
    // Esconde o modal de detalhes (não fecha) para evitar flash da grade
    if (detailOverlay) detailOverlay.style.display = 'none';
    openReviewsModal(apartment.id, apartment.name, () => {
      if (detailOverlay) detailOverlay.style.display = 'flex';
    });
  });

  // Remove listeners e pedidos pendentes em qualquer caminho de fechamento.
  cleanupDetail = () => {
    stopPropertyLocation?.();
    stopNearby?.();
    gallery.destroy();
  };
}
