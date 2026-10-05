import { openModal } from './modal.js';
import { openBooking } from './booking.js';
import { createGallery } from './gallery.js';
import { openNearbyModal } from './nearby.js';
import { openReviewsModal } from './reviews.js';
import {
  ICONS,
  amenityIcon,
  formatGuests,
  plural,
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
export function openApartmentDetail(apartment) {
  const images = apartment.images.length ? apartment.images : [''];

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
            apartment.amenities.length
              ? `<div class="detail-block">
                   <h4>Comodidades</h4>
                   <ul class="detail-amenities">
                     ${apartment.amenities.map((a) => `<li>${amenityIcon(a)}<span>${esc(a)}</span></li>`).join('')}
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
            ${apartment.guestInstructions ? `<p class="detail-notes">${esc(apartment.guestInstructions)}</p>` : ''}
            ${
              !apartment.houseRules && !apartment.guestInstructions
                ? `<p class="detail-notes">🔑Para entrar na casa:
O portão fica encostado, na porta da sala tem o cofre com a chave dentro (senha 4995). Coloque a senha e abra a tampa, a chave da casa e do portão estará lá dentro
➡️Porta cadeado: *4995*

➡️Wi-Fi
Rede: Recanto Uba
Senha: recantouba23

♻️COLETA DE LIXO (manhã)
terça, quinta e sábado

🚫PROIBIDO SOM AUTOMOTIVO

🎦 Existe uma câmera de segurança voltada para o portão de entrada.

🏊♀️ A PISCINA PODE ser usada após as 23:00hs, apenas pedimos pra controlar o barulho e não pular, pra respeitarmos os vizinhos.


Olá, boa noite , do lado de fora da casa de máquina tem 2 interruptor, lado esquerdo é o Led dentro da piscina , da direita liga os jatos de hidromassagem, com essa da hidromassagem ligado , abre a porta da casa de máquina e abre aos poucos o registro que esta escrito cascata nele ,,, quando quiser pressão mais forte na hidromassagem tem que fechar a cascata , pois se utiliza apenas um motor , quando encerrar o uso , só desligar o interruptor do lado de fora da direita

Lembrando que amanhã cedo irá ligar automaticamente, para filtrar a água, deixe que vai desligar automaticamente no timer</p>`
                : ''
            }
          </div>
        </div>
      </div>

      <div class="detail-info">
        <div class="detail-head">
          <div>
            ${apartment.featured ? '<span class="badge badge-gold">Destaque</span>' : ''}
            <h3>${esc(apartment.name)}</h3>
            <p class="detail-location">${ICONS.pin}<span>${esc(apartment.location)}</span></p>
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

        <div class="detail-block">
          <button type="button" class="btn btn-secondary" data-action="nearby">${ICONS.compass} Interesses próximos</button>
        </div>
      </div>

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

  const modal = openModal(html, { variant: 'modal-detail' });

  /* ---------- Galeria ---------- */
  const gallery = createGallery(modal.body.querySelector('[data-gallery-mount]'), images, {
    alt: `Foto do ${apartment.name}`,
  });

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

  modal.body.querySelector('[data-action="nearby"]')?.addEventListener('click', () => {
    // Mesmo esquema do botão Avaliar: esconde o detalhe e restaura ao fechar
    if (detailOverlay) detailOverlay.style.display = 'none';
    openNearbyModal(apartment, () => {
      if (detailOverlay) detailOverlay.style.display = 'flex';
    });
  });

  // Remove os listeners da galeria quando o modal fechar
  const originalClose = modal.close;
  modal.close = () => {
    gallery.destroy();
    originalClose();
  };
}
