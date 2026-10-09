import { ICONS, guardImage } from './utils.js';

/**
 * ============================================================
 *  GALERIA REUTILIZÁVEL
 * ------------------------------------------------------------
 *  Componente de galeria com imagem principal, setas, contador,
 *  miniaturas, navegação por teclado e swipe no mobile.
 *
 *  Comportamento conforme a quantidade de imagens:
 *    - várias imagens → setas, contador e miniaturas;
 *    - uma imagem     → apenas a imagem (sem controles órfãos).
 *
 *  @param {HTMLElement} mount Elemento que recebe a galeria.
 *  @param {string[]} images   URLs das fotos.
 *  @param {{ alt?: string, ratio?: number }} [opts]
 *         `ratio` (largura ÷ altura) ajusta a moldura à proporção
 *         real da foto, evitando cortes — útil quando as imagens
 *         trazem texto ou nomes na arte.
 *  @returns {{ show: (i: number) => void, destroy: () => void }}
 * ============================================================
 */
export function createGallery(mount, images, { alt = 'Foto', ratio } = {}) {
  const list = images.length ? images : [''];
  const multiple = list.length > 1;

  // Precarrega todas as fotos para troca instantânea sem piscadas
  if (multiple) {
    list.forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }

  mount.innerHTML = `
    <figure class="gallery-main${multiple ? '' : ' is-single'}">
      <img data-gallery-main alt="${alt}" decoding="async" />
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
                (src, i) => `
              <button type="button" role="tab" data-thumb="${i}" aria-label="Ver foto ${i + 1}" class="${i === 0 ? 'is-active' : ''}">
                <img src="${src}" alt="" loading="lazy" decoding="async" />
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
    mainImg.src = list[index];
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

  mainImg.src = list[0];

  /* ---------- Controles ---------- */
  mount.querySelector('[data-gallery="prev"]')?.addEventListener('click', () => show(index - 1));
  mount.querySelector('[data-gallery="next"]')?.addEventListener('click', () => show(index + 1));
  thumbs.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.thumb))));

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

  return {
    show,
    destroy() {
      document.removeEventListener('keydown', onKey);
    },
  };
}
