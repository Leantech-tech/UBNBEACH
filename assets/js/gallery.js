import { ICONS, guardImage } from './utils.js';

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
  { key: 'parking', label: 'Garagem', terms: ['garagem', 'estacionamento'] },
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

function photoGroup(caption) {
  if (!caption) return PHOTO_GROUPS.at(-1);
  const normalized = caption
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
  return matches[0]?.group ?? PHOTO_GROUPS.at(-1);
}

/**
 * ============================================================
 *  GALERIA REUTILIZÁVEL
 * ------------------------------------------------------------
 *  Componente de galeria com imagem principal, setas, contador,
 *  miniaturas, navegação por teclado, swipe e tela de fotos por ambiente.
 *  A legenda define o ambiente quando contém um termo reconhecível;
 *  sem essa informação, a foto permanece em "Outras fotos".
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
export function createGallery(mount, images, { alt = 'Foto', ratio } = {}) {
  const normalized = normalizeImages(images);
  const list = normalized.length ? normalized : [{ url: '', caption: '' }];
  const hasPhotos = normalized.length > 0;
  const multiple = list.length > 1;

  // Precarrega todas as fotos para troca instantânea sem piscadas
  if (multiple) {
    list.forEach(({ url }) => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }

  mount.innerHTML = `
    <figure class="gallery-main${multiple ? '' : ' is-single'}">
      <button type="button" class="gallery-open" data-gallery-open aria-label="Ampliar foto" ${hasPhotos ? '' : 'disabled'}>
        <img data-gallery-main alt="${esc(alt)}" decoding="async" />
        ${hasPhotos ? '<span class="gallery-expand-label">Ampliar</span>' : ''}
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

  // Troca imediata: as fotos já foram precarregadas no mount, então o
  // navegador as tem em cache e a troca acontece no mesmo clique.
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
  let lightboxIndex = 0;
  let returnFocus = null;
  const grouped = PHOTO_GROUPS.map((group) => ({
    ...group,
    images: list.filter((image) => photoGroup(image.caption).key === group.key),
  })).filter((group) => group.images.length);
  const ordered = grouped.flatMap((group) => group.images);

  const updateLightbox = (nextIndex) => {
    if (!lightbox || !ordered.length) return;
    lightboxIndex = (nextIndex + ordered.length) % ordered.length;
    const image = ordered[lightboxIndex];
    const stage = lightbox.querySelector('[data-lightbox-image]');
    const caption = lightbox.querySelector('[data-lightbox-caption]');
    const counter = lightbox.querySelector('[data-lightbox-count]');
    stage.src = image.url;
    stage.alt = image.caption ? `${alt}: ${image.caption}` : `${alt} ${lightboxIndex + 1}`;
    caption.textContent = image.caption || photoGroup(image.caption).label;
    counter.textContent = `${lightboxIndex + 1} / ${ordered.length}`;
    const originalIndex = list.indexOf(image);
    if (originalIndex >= 0) apply(originalIndex);
  };

  const closeViewer = () => {
    if (!lightbox) return;
    lightbox.querySelector('[data-lightbox-viewer]').hidden = true;
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
  };

  const openViewer = (nextIndex, trigger) => {
    if (!lightbox) return;
    returnFocus = trigger;
    updateLightbox(nextIndex);
    lightbox.querySelector('[data-lightbox-viewer]').hidden = false;
    lightbox.querySelector('[data-viewer-close]').focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.remove();
    lightbox = null;
    document.removeEventListener('keydown', onLightboxKey, true);
    document.body.style.overflow = previousOverflow;
    returnFocus = null;
    mount.querySelector('[data-gallery-open]')?.focus({ preventScroll: true });
  };

  let previousOverflow = '';

  const onLightboxKey = (event) => {
    if (!lightbox) return;
    if (event.key === 'Tab') {
      const viewer = lightbox.querySelector('[data-lightbox-viewer]');
      const active = viewer.hidden ? lightbox : viewer;
      const buttons = [...active.querySelectorAll('button')].filter((button) => !button.closest('[hidden]'));
      const first = buttons[0];
      const last = buttons.at(-1);
      if (first && (!active.contains(document.activeElement) || (event.shiftKey && document.activeElement === first))) {
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
      if (lightbox.querySelector('[data-lightbox-viewer]').hidden) closeLightbox();
      else closeViewer();
      return;
    }
    if (!lightbox.querySelector('[data-lightbox-viewer]').hidden && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      updateLightbox(lightboxIndex + (event.key === 'ArrowRight' ? 1 : -1));
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
          <div class="gallery-lightbox-heading">
            <span class="gallery-lightbox-eyebrow">Conheça cada ambiente</span>
            <h2>Fotos do imóvel</h2>
            <p>${ordered.length} ${ordered.length === 1 ? 'foto' : 'fotos'} organizadas por ambiente</p>
          </div>
          <button type="button" class="gallery-lightbox-close" data-lightbox-close aria-label="Voltar aos detalhes do imóvel">×</button>
        </header>
        <main class="gallery-lightbox-content" aria-label="Fotos organizadas por ambiente">
          ${grouped
            .map(
              (group) => `<section class="gallery-photo-group" aria-label="${group.label}">
                <div class="gallery-photo-group-head">
                  <h3>${group.label}</h3>
                  <span>${group.images.length} ${group.images.length === 1 ? 'foto' : 'fotos'}</span>
                </div>
                <div class="gallery-photo-grid">
                  ${group.images
                    .map((image) => {
                      const orderedIndex = ordered.indexOf(image);
                      return `<button type="button" data-lightbox-thumb="${orderedIndex}" aria-label="Ampliar ${esc(image.caption || `foto ${orderedIndex + 1} de ${group.label}`)}">
                        <img src="${esc(image.url)}" alt="" loading="lazy" decoding="async" />
                      </button>`;
                    })
                    .join('')}
                </div>
              </section>`
            )
            .join('')}
        </main>
        <div class="gallery-lightbox-viewer" data-lightbox-viewer hidden role="dialog" aria-modal="true" aria-label="Foto ampliada">
          <div class="gallery-viewer-toolbar">
            <span data-lightbox-count></span>
            <button type="button" data-viewer-close aria-label="Voltar às fotos">×</button>
          </div>
          <div class="gallery-lightbox-stage">
            <img data-lightbox-image alt="" />
            ${ordered.length > 1 ? `<button type="button" class="gallery-lightbox-arrow prev" data-lightbox-prev aria-label="Foto anterior">${ICONS.arrowLeft}</button>
              <button type="button" class="gallery-lightbox-arrow next" data-lightbox-next aria-label="Próxima foto">${ICONS.arrowRight}</button>` : ''}
          </div>
          <p class="gallery-viewer-caption" data-lightbox-caption></p>
        </div>
      </div>`;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(lightbox);
    lightbox.querySelectorAll('img').forEach(guardImage);
    lightbox.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
    lightbox.querySelector('[data-viewer-close]').addEventListener('click', closeViewer);
    lightbox.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => updateLightbox(lightboxIndex - 1));
    lightbox.querySelector('[data-lightbox-next]')?.addEventListener('click', () => updateLightbox(lightboxIndex + 1));
    lightbox.querySelectorAll('[data-lightbox-thumb]').forEach((button) => {
      button.addEventListener('click', () => openViewer(Number(button.dataset.lightboxThumb), button));
    });
    document.addEventListener('keydown', onLightboxKey, true);
    const currentImage = list[index];
    const currentThumb = lightbox.querySelector(`[data-lightbox-thumb="${Math.max(0, ordered.indexOf(currentImage))}"]`);
    currentThumb?.scrollIntoView({ block: 'center' });
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
