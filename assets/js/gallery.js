import { ICONS, guardImage } from './utils.js';
import { PHOTO_ROOMS } from './photo-rooms.js';

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const PHOTO_GROUPS = [
  { key: 'bedrooms', label: 'Quarto', terms: ['quarto', 'dormitorio', 'suite'] },
  { key: 'bathrooms', label: 'Banheiro', terms: ['banheiro', 'lavabo'] },
  { key: 'kitchen', label: 'Cozinha', terms: ['cozinha'] },
  { key: 'dining', label: 'Sala de jantar', terms: ['sala de jantar', 'jantar'] },
  { key: 'living', label: 'Sala de estar', terms: ['sala de estar', 'sala', 'estar'] },
  { key: 'outside', label: 'Área externa', terms: ['area externa', 'varanda', 'sacada', 'piscina', 'quintal', 'jardim', 'fachada', 'terraco', 'churrasqueira', 'patio'] },
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

function normalizedCaption(caption) {
  return caption
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function photoFileKey(url) {
  let filePath = url;
  try {
    const parsed = new URL(url, 'https://site.local');
    filePath = parsed.searchParams.get('url') || parsed.pathname;
    filePath = decodeURIComponent(filePath);
  } catch {
    // URLs legadas podem não seguir o formato do proxy.
  }
  const filename = filePath.split('/').pop()?.split(/[?#]/)[0] || '';
  return filename.match(/^([a-f0-9]{12})[a-f0-9]*\.(?:jpe?g|png|webp)$/i)?.[1]?.toLowerCase();
}

function roomFromCaption(caption) {
  const normalized = normalizedCaption(caption);
  const match = normalized.match(/\b(quarto|dormitorio|suite|banheiro|lavabo)\s*(?:n\s*)?(\d+)\b/);
  if (match) {
    const type = match[1] === 'dormitorio' ? 'Quarto' : match[1] === 'suite' ? 'Suíte' : match[1] === 'lavabo' ? 'Lavabo' : match[1] === 'banheiro' ? 'Banheiro' : 'Quarto';
    return { key: `caption-${type}-${match[2]}`, label: `${type} ${match[2]}`, category: /Banheiro|Lavabo/.test(type) ? 'bathrooms' : 'bedrooms' };
  }
  const prefix = normalized.replace(/^fotos? (?:do|da|de) /, '');
  const descriptive = prefix.match(/^(quarto de casal|quarto com beliche|quarto com armario|suite master|banheiro social|banheiro da suite|banheiro de servico|lavabo)\b/);
  if (descriptive) {
    const name = descriptive[1];
    const isBath = /^(banheiro|lavabo)/.test(name);
    return { key: `caption-${name.replaceAll(' ', '-')}`, label: isBath ? (name === 'lavabo' ? 'Lavabo' : 'Banheiro') : name.startsWith('suite') ? 'Suíte' : 'Quarto', category: isBath ? 'bathrooms' : 'bedrooms' };
  }
  const namedRooms = [
    ['varanda e churrasqueira', 'Varanda e churrasqueira', 'outside'],
    ['sala de jantar', 'Sala de jantar', 'dining'],
    ['sala de estar', 'Sala de estar', 'living'],
    ['area de servico', 'Área de serviço', 'service'],
    ['area externa', 'Área externa', 'outside'],
    ['cozinha', 'Cozinha', 'kitchen'],
    ['varanda', 'Varanda', 'outside'],
    ['piscina', 'Piscina', 'outside'],
    ['patio', 'Pátio', 'outside'],
    ['fachada', 'Fachada', 'outside'],
    ['garagem', 'Garagem', 'parking'],
  ];
  const named = namedRooms.find(([term]) => prefix === term || prefix.startsWith(`${term} `));
  if (named) return { key: `caption-${named[0].replaceAll(' ', '-')}`, label: named[1], category: named[2], generic: true };
  // Legendas genéricas não distinguem dois quartos ou banheiros do mesmo imóvel.
  return null;
}

function groupByRoom(images) {
  const rooms = new Map();
  images.forEach((image, index) => {
    const fileKey = photoFileKey(image.url);
    const captionRoom = roomFromCaption(image.caption);
    const knownRoom = fileKey ? PHOTO_ROOMS[fileKey] : null;
    const room = captionRoom?.generic && knownRoom ? knownRoom : captionRoom || knownRoom;
    const category = room?.category || PHOTO_GROUPS.find((group) =>
      group.terms.some((term) => normalizedCaption(room?.label || '').includes(term))
    )?.key || 'other';
    const key = room?.key || 'unidentified';
    if (!rooms.has(key)) rooms.set(key, { key, label: room?.label || 'Outras fotos', category, firstIndex: index, images: [] });
    rooms.get(key).images.push(image);
  });
  const sorted = [...rooms.values()].sort((a, b) =>
    PHOTO_GROUPS.findIndex((group) => group.key === a.category) - PHOTO_GROUPS.findIndex((group) => group.key === b.category)
    || a.firstIndex - b.firstIndex
  );
  const totals = new Map();
  const positions = new Map();
  let bedroomPosition = 0;
  let suitePosition = 0;
  sorted.forEach((room) => totals.set(room.category, (totals.get(room.category) || 0) + 1));
  return sorted.map((room) => {
    const position = (positions.get(room.category) || 0) + 1;
    positions.set(room.category, position);
    let title = room.label;
    if (room.category === 'bedrooms' && !/^studio$/i.test(title)) {
      if (/^suíte/i.test(title)) {
        suitePosition++;
        if (!/^suíte\s+\d+$/i.test(title)) title = `Suíte ${suitePosition}`;
      } else {
        bedroomPosition++;
        if (!/^quarto\s+\d+$/i.test(title)) title = `Quarto ${bedroomPosition}`;
      }
    } else if (room.category === 'bathrooms' && !/^lavabo/i.test(title)) {
      if (!/^banheiro\s+\d+$/i.test(title)) title = totals.get('bathrooms') > 1 ? `Banheiro ${position}` : 'Banheiro';
    }
    return { ...room, title };
  });
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
 *  @param {{ alt?: string, ratio?: number, apartment?: object, otherApartments?: object[], onSelectApartment?: Function }} [opts]
 *         `ratio` (largura ÷ altura) ajusta a moldura à proporção
 *         real da foto, evitando cortes — útil quando as imagens
 *         trazem texto ou nomes na arte.
 *  @returns {{ show: (i: number) => void, destroy: () => void }}
 * ============================================================
 */
export function createGallery(mount, images, { alt = 'Foto', apartment = {}, otherApartments = [], onSelectApartment, ratio } = {}) {
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
        ? `<div class="gallery-thumbs" aria-label="Miniaturas das fotos">
            ${list
              .map(
                (image, i) => `
              <button type="button" data-thumb="${i}" aria-label="Ver foto ${i + 1}" aria-pressed="${i === 0}" class="${i === 0 ? 'is-active' : ''}">
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
    thumbs.forEach((t, ti) => {
      t.classList.toggle('is-active', ti === index);
      t.setAttribute('aria-pressed', String(ti === index));
    });
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
  const grouped = groupByRoom(list);
  const related = (Array.isArray(otherApartments) ? otherApartments : []).filter((item) => item?.id && item.id !== apartment.id);
  const relatedCards = related.map((item, i) => {
    const cover = (Array.isArray(item.imageDetails) && item.imageDetails.find((image) => image?.url)?.url)
      || (Array.isArray(item.images) && item.images[0]) || '';
    const summary = [
      Number(item.capacity) > 0 ? `${item.capacity} ${Number(item.capacity) === 1 ? 'hóspede' : 'hóspedes'}` : '',
      Number(item.bedrooms) > 0 ? `${item.bedrooms} ${Number(item.bedrooms) === 1 ? 'quarto' : 'quartos'}` : '',
    ].filter(Boolean).join(' · ');
    return `<button type="button" class="gallery-related-card" data-related-index="${i}" aria-label="Ver detalhes de ${esc(item.name)}">
      ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async" />` : '<span class="gallery-related-placeholder" aria-hidden="true"></span>'}
      <span class="gallery-related-card-name">${esc(item.name)}</span>
      ${summary ? `<span class="gallery-related-card-summary">${esc(summary)}</span>` : ''}
    </button>`;
  }).join('');

  let viewer = null;
  let viewerTrigger = null;
  let viewerIndex = 0;
  let viewerRoom = 0;
  let footerObserver = null;
  let previousOverflow = '';

  const closeViewer = () => {
    if (!viewer) return;
    viewer.remove();
    viewer = null;
    lightbox.querySelector('.gallery-lightbox-panel').inert = false;
    viewerTrigger?.focus({ preventScroll: true });
    viewerTrigger = null;
  };

  const renderViewer = () => {
    const group = grouped[viewerRoom];
    const image = group.images[viewerIndex];
    const photo = viewer.querySelector('[data-viewer-image]');
    photo.src = image.url;
    photo.alt = `${group.title}, foto ${viewerIndex + 1} de ${group.images.length}`;
    viewer.querySelector('[data-viewer-count]').textContent = `${viewerIndex + 1} / ${group.images.length}`;
  };

  const stepViewer = (step) => {
    const count = grouped[viewerRoom].images.length;
    viewerIndex = (viewerIndex + step + count) % count;
    renderViewer();
  };

  const openViewer = (roomIndex, photoIndex, trigger) => {
    const group = grouped[roomIndex];
    if (!group || viewer) return;
    viewerRoom = roomIndex;
    viewerIndex = photoIndex;
    viewerTrigger = trigger;
    viewer = document.createElement('div');
    viewer.className = group.images.length > 1 ? 'gallery-photo-viewer' : 'gallery-photo-viewer is-single';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', `Fotos de ${group.title}`);
    viewer.innerHTML = `
      <div class="gallery-viewer-top">
        <strong>${esc(group.title)}</strong>
        <span data-viewer-count></span>
        <button type="button" class="gallery-viewer-close" data-viewer-close aria-label="Fechar foto ampliada">${ICONS.close || '×'}</button>
      </div>
      <div class="gallery-viewer-stage">
        ${group.images.length > 1 ? `<button type="button" class="gallery-viewer-arrow" data-viewer-step="-1" aria-label="Foto anterior">${ICONS.arrowLeft}</button>` : ''}
        <img data-viewer-image decoding="async" />
        ${group.images.length > 1 ? `<button type="button" class="gallery-viewer-arrow" data-viewer-step="1" aria-label="Próxima foto">${ICONS.arrowRight}</button>` : ''}
      </div>`;
    lightbox.querySelector('.gallery-lightbox-panel').inert = true;
    lightbox.appendChild(viewer);
    viewer.querySelector('[data-viewer-close]').addEventListener('click', closeViewer);
    viewer.querySelectorAll('[data-viewer-step]').forEach((button) =>
      button.addEventListener('click', () => stepViewer(Number(button.dataset.viewerStep)))
    );
    const photo = viewer.querySelector('[data-viewer-image]');
    guardImage(photo);
    let touchStart = null;
    photo.addEventListener('touchstart', (event) => { touchStart = event.touches[0].clientX; }, { passive: true });
    photo.addEventListener('touchend', (event) => {
      if (touchStart === null || group.images.length < 2) return;
      const delta = event.changedTouches[0].clientX - touchStart;
      if (Math.abs(delta) > 40) stepViewer(delta < 0 ? 1 : -1);
      touchStart = null;
    }, { passive: true });
    renderViewer();
    viewer.querySelector('[data-viewer-close]').focus({ preventScroll: true });
  };

  const syncRelatedHeight = () => {
    const footer = lightbox?.querySelector('.gallery-related');
    if (footer) lightbox.style.setProperty('--gallery-related-height', `${footer.getBoundingClientRect().height}px`);
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    footerObserver?.disconnect();
    footerObserver = null;
    window.removeEventListener('resize', syncRelatedHeight);
    viewer = null;
    viewerTrigger = null;
    lightbox.remove();
    lightbox = null;
    document.removeEventListener('keydown', onLightboxKey, true);
    document.body.style.overflow = previousOverflow;
    mount.querySelector('[data-gallery-open]')?.focus({ preventScroll: true });
  };

  const onLightboxKey = (event) => {
    if (!lightbox) return;
    if (event.key === 'Tab') {
      const focusRoot = viewer || lightbox;
      const buttons = [...focusRoot.querySelectorAll('button, a[href]')];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (first && (!focusRoot.contains(document.activeElement) || (event.shiftKey && document.activeElement === first))) {
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
      if (viewer) closeViewer();
      else closeLightbox();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopImmediatePropagation();
      if (viewer && grouped[viewerRoom].images.length > 1) {
        event.preventDefault();
        stepViewer(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }
  };

  const openLightbox = () => {
    if (!hasPhotos || lightbox) return;
    lightbox = document.createElement('div');
    lightbox.className = related.length ? 'gallery-lightbox has-related' : 'gallery-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Todas as fotos do imóvel');
    lightbox.innerHTML = `
      <div class="gallery-lightbox-panel">
        <header class="gallery-lightbox-header">
          <button type="button" class="gallery-lightbox-close" data-lightbox-close aria-label="Voltar aos detalhes do imóvel">${ICONS.arrowLeft}<span>Voltar</span></button>
          <span class="gallery-lightbox-header-title">Galeria do imóvel</span>
          <span class="gallery-lightbox-header-count">${list.length} ${list.length === 1 ? 'foto' : 'fotos'}</span>
        </header>
        <main class="gallery-lightbox-content" aria-label="Fotos organizadas por cômodo">
          ${grouped
            .map(
              (group, groupIndex) => `<section class="gallery-photo-group" id="gallery-${group.key}" aria-label="${esc(group.title)}">
                <div class="gallery-photo-group-head">
                  <span class="gallery-photo-group-index">${String(groupIndex + 1).padStart(2, '0')}</span>
                  <div class="gallery-photo-group-heading">
                    <h3>${esc(group.title)}</h3>
                  </div>
                  <span class="gallery-photo-group-count">${group.images.length} ${group.images.length === 1 ? 'foto' : 'fotos'}</span>
                </div>
                <div class="gallery-photo-grid has-${Math.min(group.images.length, 5)}">
                  ${group.images.slice(0, 5)
                    .map((image, photoIndex) => `<button type="button" class="gallery-photo" data-room="${groupIndex}" data-photo="${photoIndex}" aria-label="Ampliar ${esc(group.title)}, foto ${photoIndex + 1} de ${group.images.length}">
                      <img src="${esc(image.url)}" alt="${esc(group.title)}, foto ${photoIndex + 1}" loading="lazy" decoding="async" />
                      <span class="gallery-photo-label" aria-hidden="true">${esc(group.title)}</span>
                    </button>`)
                    .join('')}
                  ${group.images.length > 5 ? `<button type="button" class="gallery-show-all" data-room="${groupIndex}" aria-label="Mostrar todas as ${group.images.length} fotos de ${esc(group.title)}">Mostrar todas as fotos ${ICONS.arrowRight}</button>` : ''}
                </div>
              </section>`
            )
            .join('')}
        </main>
        ${related.length ? `<aside class="gallery-related" aria-label="Outros imóveis">
          <div class="gallery-related-inner">
            <div class="gallery-related-heading">
              <h3>Outros imóveis</h3>
              <div class="gallery-related-controls">
                <button type="button" data-related-scroll="-1" aria-label="Imóveis anteriores">${ICONS.arrowLeft}</button>
                <button type="button" data-related-scroll="1" aria-label="Próximos imóveis">${ICONS.arrowRight}</button>
              </div>
            </div>
            <div class="gallery-related-track" data-related-track>${relatedCards}</div>
          </div>
        </aside>` : ''}
      </div>`;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(lightbox);
    lightbox.querySelectorAll('img').forEach(guardImage);
    lightbox.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
    lightbox.querySelectorAll('.gallery-photo').forEach((button) => {
      button.addEventListener('click', () =>
        openViewer(Number(button.dataset.room), Number(button.dataset.photo), button)
      );
    });
    lightbox.querySelectorAll('.gallery-show-all').forEach((button) => {
      button.addEventListener('click', () => openViewer(Number(button.dataset.room), 0, button));
    });
    lightbox.querySelectorAll('[data-related-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const selected = related[Number(button.dataset.relatedIndex)];
        if (!selected || !onSelectApartment) return;
        closeLightbox();
        onSelectApartment(selected);
      });
    });
    lightbox.querySelectorAll('[data-related-scroll]').forEach((button) => {
      button.addEventListener('click', () => {
        const track = lightbox.querySelector('[data-related-track]');
        track?.scrollBy?.({ left: Number(button.dataset.relatedScroll) * Math.max(track.clientWidth * 0.8, 240), behavior: 'smooth' });
      });
    });
    if (related.length) {
      syncRelatedHeight();
      window.addEventListener('resize', syncRelatedHeight);
      if (typeof ResizeObserver !== 'undefined') {
        footerObserver = new ResizeObserver(syncRelatedHeight);
        footerObserver.observe(lightbox.querySelector('.gallery-related'));
      }
    }
    document.addEventListener('keydown', onLightboxKey, true);
    lightbox.querySelector('[data-lightbox-close]').focus({ preventScroll: true });
  };

  mount.querySelector('[data-gallery-open]')?.addEventListener('click', openLightbox);

  const onKey = (e) => {
    if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (mount.closest('.modal-overlay')?.style.display === 'none') return;
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
