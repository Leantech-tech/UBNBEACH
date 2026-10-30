import { ICONS, guardImage } from './utils.js';
import { PHOTO_CATEGORIES } from './photo-categories.js';

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const PHOTO_GROUPS = [
  { key: 'bedrooms', label: 'Quartos', terms: ['quarto', 'dormitorio', 'suite'] },
  { key: 'bathrooms', label: 'Banheiros', terms: ['banheiro', 'lavabo'] },
  { key: 'kitchen', label: 'Cozinha', terms: ['cozinha'] },
  { key: 'dining', label: 'Sala de jantar', terms: ['sala de jantar', 'jantar'] },
  { key: 'living', label: 'Sala', terms: ['sala', 'estar'] },
  { key: 'outside', label: 'Área externa', terms: ['area externa', 'varanda', 'sacada', 'piscina', 'quintal', 'jardim', 'fachada', 'terraco', 'churrasqueira'] },
  { key: 'service', label: 'Área de serviço', terms: ['area de servico', 'lavanderia'] },
  { key: 'shared', label: 'Áreas comuns', terms: ['area comum', 'areas comuns', 'elevador', 'sala de jogos', 'sauna', 'academia', 'recepcao'] },
  { key: 'access', label: 'Escadas e acessos', terms: ['escada', 'corredor', 'hall', 'entrada'] },
  { key: 'parking', label: 'Garagem', terms: ['garagem', 'estacionamento'] },
  { key: 'location', label: 'Localização', terms: ['localizacao', 'mapa', 'praia proxima'] },
  { key: 'other', label: 'Outras fotos', terms: [] },
];

function normalizeImages(images) {
  return (Array.isArray(images) ? images : [])
    .map((image) =>
      typeof image === 'string'
        ? { url: image, caption: '' }
        : { url: String(image?.url ?? ''), caption: typeof image?.caption === 'string' ? image.caption.trim() : '' }
    )
    .filter((image) => image.url);
}

function photoGroup(image) {
  const normalized = image.caption
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const searchable = ` ${normalized} `;
  const matches = PHOTO_GROUPS.flatMap((group) =>
    group.terms.map((term) => ({ group, position: searchable.indexOf(` ${term} `), length: term.length }))
  ).filter((match) => match.position >= 0);
  matches.sort((a, b) => a.position - b.position || b.length - a.length);
  if (matches[0]) return matches[0].group;
  const filename = image.url.match(/([a-f0-9]{12})[a-f0-9]*\.(?:jpe?g|png|webp)/i)?.[1]?.toLowerCase();
  const key = PHOTO_CATEGORIES[filename];
  return PHOTO_GROUPS.find((group) => group.key === key) ?? PHOTO_GROUPS.at(-1);
}

/**
 * ============================================================
 *  GALERIA REUTILIZÁVEL
 * ------------------------------------------------------------
 *  Componente de galeria com imagem principal, setas, contador,
 *  miniaturas, navegação por teclado, swipe e tela de fotos por ambiente.
 *  A legenda define o ambiente quando contém um termo reconhecível;
 *  fotos publicadas sem legenda podem ter classificação visual explícita.
 *
 *  Comportamento conforme a quantidade de imagens:
 *    - várias imagens → setas, contador e miniaturas;
 *    - uma imagem     → apenas a imagem (sem controles órfãos).
 *
 *  @param {HTMLElement} mount Elemento que recebe a galeria.
 *  @param {(string|{url:string, caption?:string})[]} images Fotos.
 *  @param {{ alt?: string, ratio?: number }} [opts]
 *         `ratio` (largura ÷ altura) ajusta a moldura à proporção
 *         real da foto, evitando cortes — útil quando as imagens
 *         trazem texto ou nomes na arte.
 *  @returns {{ show: (i: number) => void, destroy: () => void }}
 * ============================================================
 */
export function createGallery(mount, images, { alt = 'Foto', title = 'Imóvel', ratio } = {}) {
  const normalized = normalizeImages(images);
  const list = normalized.length ? normalized : [{ url: '', caption: '' }];
  const hasPhotos = normalized.length > 0;
  const multiple = list.length > 1;

  mount.innerHTML = `
    <figure class="gallery-main${multiple ? '' : ' is-single'}">
      <button type="button" class="gallery-open" data-gallery-open aria-label="Ver todas as fotos do imóvel" ${hasPhotos ? '' : 'disabled'}>
        <img data-gallery-main alt="${esc(alt)}" decoding="async" />
        ${hasPhotos ? '<span class="gallery-expand-label">Ver fotos</span>' : ''}
      </button>
      ${
        multiple
          ? `<figcaption class="gallery-counter"><span data-gallery-counter>1</span> / ${list.length}</figcaption>
             <button type="button" class="gallery-arrow prev" data-gallery="prev" aria-label="Foto anterior">${ICONS.arrowLeft}</button>
             <button type="button" class="gallery-arrow next" data-gallery="next" aria-label="Próxima foto">${ICONS.arrowRight}</button>`
          : ''
      }
    </figure>
    ${
      multiple
        ? `<div class="gallery-thumbs" role="tablist" aria-label="Miniaturas das fotos">
            ${list
              .map(
                (image, i) => `
              <button type="button" role="tab" data-thumb="${i}" aria-label="Ver foto ${i + 1}" class="${i === 0 ? 'is-active' : ''}">
                <img src="${esc(image.url)}" alt="" loading="lazy" decoding="async" />
              </button>`
              )
              .join('')}
          </div>`
        : ''
    }`;

  const mainImg = mount.querySelector('[data-gallery-main]');
  const counter = mount.querySelector('[data-gallery-counter]');
  const thumbs = [...mount.querySelectorAll('[data-thumb]')];
  guardImage(mainImg);
  mount.querySelectorAll('.gallery-thumbs img').forEach(guardImage);

  if (ratio) mount.querySelector('.gallery-main').style.aspectRatio = String(ratio);

  let index = 0;

  const apply = (i) => {
    index = (i + list.length) % list.length;
    const image = list[index];
    mainImg.src = image.url;
    mainImg.alt = image.caption ? `${alt}: ${image.caption}` : `${alt} ${index + 1}`;
    if (counter) counter.textContent = String(index + 1);
    thumbs.forEach((t, ti) => t.classList.toggle('is-active', ti === index));
  };

  // Carrega apenas a foto escolhida. Miniaturas e fotos da galeria
  // ampliada usam lazy loading para evitar baixar a galeria inteira.
  const show = (i) => {
    if (!multiple) return;
    const targetIndex = (i + list.length) % list.length;
    if (targetIndex === index) return;
    apply(targetIndex);
  };

  apply(0);

  /* ---------- Controles ---------- */
  mount.querySelector('[data-gallery="prev"]')?.addEventListener('click', () => show(index - 1));
  mount.querySelector('[data-gallery="next"]')?.addEventListener('click', () => show(index + 1));
  thumbs.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.thumb))));

  let lightbox = null;
  const grouped = PHOTO_GROUPS.map((group) => ({
    ...group,
    images: list.filter((image) => photoGroup(image).key === group.key),
  })).filter((group) => group.images.length);

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.remove();
    lightbox = null;
    document.removeEventListener('keydown', onLightboxKey, true);
    document.body.style.overflow = previousOverflow;
    mount.querySelector('[data-gallery-open]')?.focus({ preventScroll: true });
  };

  let previousOverflow = '';

  const onLightboxKey = (event) => {
    if (!lightbox) return;
    if (event.key === 'Tab') {
      const buttons = [...lightbox.querySelectorAll('button, a[href]')];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (first && (!lightbox.contains(document.activeElement) || (event.shiftKey && document.activeElement === first))) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (last && !event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeLightbox();
      return;
    }
  };

  const openLightbox = () => {
    if (!hasPhotos || lightbox) return;
    lightbox = document.createElement('div');
    lightbox.className = 'gallery-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Todas as fotos do imóvel');
    lightbox.innerHTML = `
      <div class="gallery-lightbox-panel">
        <header class="gallery-lightbox-header">
          <button type="button" class="gallery-lightbox-close" data-lightbox-close aria-label="Voltar aos detalhes do imóvel">${ICONS.arrowLeft}<span>Voltar</span></button>
          <span class="gallery-lightbox-header-title">Fotos de ${esc(title)}</span>
          <span class="gallery-lightbox-header-count">${list.length} ${list.length === 1 ? 'foto' : 'fotos'}</span>
        </header>
        <main class="gallery-lightbox-content" aria-label="Fotos organizadas por ambiente">
          <div class="gallery-lightbox-intro">
            <span class="gallery-lightbox-eyebrow">GALERIA DO IMÓVEL</span>
            <h2>Explore cada ambiente</h2>
            <p>${esc(title)} · ${list.length} ${list.length === 1 ? 'foto' : 'fotos'}</p>
          </div>
          <nav class="gallery-lightbox-nav" aria-label="Ir para um ambiente">
            ${grouped.map((group) => `<button type="button" data-gallery-jump="${group.key}">${group.label}</button>`).join('')}
          </nav>
          ${grouped
            .map(
              (group) => `<section class="gallery-photo-group" id="gallery-${group.key}" aria-label="${group.label}">
                <div class="gallery-photo-group-head">
                  <h3>${group.label}</h3>
                  <span>${group.images.length} ${group.images.length === 1 ? 'foto' : 'fotos'}</span>
                </div>
                <div class="gallery-photo-grid">
                  ${group.images
                    .map((image, photoIndex) => `<figure class="gallery-photo">
                      <img src="${esc(image.url)}" alt="${esc(image.caption || `${group.label}, foto ${photoIndex + 1}`)}" loading="lazy" decoding="async" />
                    </figure>`)
                    .join('')}
                </div>
              </section>`
            )
            .join('')}
        </main>
      </div>`;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(lightbox);
    lightbox.querySelectorAll('img').forEach(guardImage);
    lightbox.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
    lightbox.querySelectorAll('[data-gallery-jump]').forEach((button) => {
      button.addEventListener('click', () => {
        lightbox.querySelector(`#gallery-${button.dataset.galleryJump}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    document.addEventListener('keydown', onLightboxKey, true);
    lightbox.querySelector('[data-lightbox-close]').focus({ preventScroll: true });
  };

  mount.querySelector('[data-gallery-open]')?.addEventListener('click', openLightbox);

  const onKey = (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  };
  if (multiple) document.addEventListener('keydown', onKey);

  // Deslizar (swipe) no mobile
  let touchX = null;
  mainImg.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
  mainImg.addEventListener(
    'touchend',
    (e) => {
      if (touchX === null) return;
      const delta = e.changedTouches[0].clientX - touchX;
      if (Math.abs(delta) > 40) show(index + (delta < 0 ? 1 : -1));
      touchX = null;
    },
    { passive: true }
  );

  let destroyed = false;
  const observer = new MutationObserver(() => {
    if (!mount.isConnected) destroy();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    observer.disconnect();
    closeLightbox();
    document.removeEventListener('keydown', onKey);
  };

  return {
    show,
    destroy,
  };
}
