const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const esbuild = require('esbuild');

async function main() {
  const build = await esbuild.build({
    entryPoints: ['assets/js/gallery.js'],
    bundle: true,
    format: 'iife',
    globalName: 'GalleryTest',
    write: false,
  });
  const dom = new JSDOM('<!doctype html><body><div id="mount"></div></body>', {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.eval(build.outputFiles[0].text);

  const mount = window.document.querySelector('#mount');
  const photos = [
    ...Array.from({ length: 7 }, (_, index) => ({ url: `/quarto-${index}.jpg`, caption: 'Quarto 1 - Empresa e bairro' })),
    ...Array.from({ length: 3 }, (_, index) => ({ url: `/cozinha-${index}.jpg`, caption: 'Cozinha' })),
    ...Array.from({ length: 4 }, (_, index) => ({ url: `/sala-${index}.jpg`, caption: 'Sala de estar' })),
    { url: '/sem-identificacao.jpg', caption: 'Foto sem cômodo' },
  ];
  let selectedApartment = null;
  const gallery = window.GalleryTest.createGallery(mount, photos, {
    apartment: { id: 'current', name: 'Imóvel atual' },
    otherApartments: [
      { id: 'current', name: 'Imóvel atual' },
      { id: 'other', name: 'Outro imóvel', capacity: 4, bedrooms: 2, images: ['/other.jpg'] },
      { id: 'third', name: 'Terceiro imóvel', imageDetails: [{ url: '/third.jpg' }] },
    ],
    onSelectApartment: (item) => { selectedApartment = item; },
  });

  const textarea = window.document.createElement('textarea');
  mount.appendChild(textarea);
  textarea.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(mount.querySelector('[data-gallery-main]').getAttribute('src'), '/quarto-0.jpg');
  mount.querySelector('[data-thumb="1"]').click();
  assert.equal(mount.querySelector('[data-thumb="1"]').getAttribute('aria-pressed'), 'true');
  assert.equal(mount.querySelector('[data-thumb="0"]').getAttribute('aria-pressed'), 'false');
  mount.querySelector('[data-gallery-open]').click();
  const document = window.document;
  assert.equal(document.querySelector('.gallery-lightbox-header-title').textContent, 'Galeria do imóvel');
  assert.equal(document.querySelector('.gallery-lightbox-header-count').textContent, '15 fotos');
  assert.deepEqual([...document.querySelectorAll('.gallery-photo-group h3')].map((item) => item.textContent), [
    'Quarto 1', 'Cozinha', 'Sala de estar', 'Outras fotos',
  ]);
  const sections = [...document.querySelectorAll('.gallery-photo-group')];
  assert.deepEqual(sections.map((section) => section.querySelectorAll('.gallery-photo').length), [5, 3, 4, 1]);
  assert.equal(sections[0].querySelector('.gallery-photo-grid').classList.contains('has-5'), true);
  assert.equal(sections[1].querySelector('.gallery-photo-grid').classList.contains('has-3'), true);
  assert.equal(sections[2].querySelector('.gallery-photo-grid').classList.contains('has-4'), true);
  assert.equal(sections[3].querySelector('.gallery-photo-grid').classList.contains('has-1'), true);
  assert.equal(sections[0].querySelectorAll('.gallery-photo-label')[0].textContent, 'Quarto 1');
  assert.equal(document.querySelector('.gallery-lightbox').textContent.includes('Empresa e bairro'), false);
  assert.equal(sections[0].querySelectorAll('.gallery-show-all').length, 1);
  assert.equal(sections[1].querySelectorAll('.gallery-show-all').length, 0);

  sections[0].querySelector('.gallery-show-all').click();
  assert.equal(document.querySelector('[data-viewer-count]').textContent, '1 / 7');
  for (let index = 0; index < 6; index++) {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  }
  assert.equal(document.querySelector('[data-viewer-count]').textContent, '7 / 7');
  assert.equal(document.querySelector('[data-viewer-image]').getAttribute('src'), '/quarto-6.jpg');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(document.querySelector('.gallery-photo-viewer'), null);
  assert.ok(document.querySelector('.gallery-lightbox'));
  sections[1].querySelector('.gallery-photo').click();
  assert.equal(document.querySelector('.gallery-photo-viewer [data-viewer-image]').getAttribute('src'), '/cozinha-0.jpg');
  document.querySelector('[data-viewer-close]').click();
  assert.equal(document.querySelector('.gallery-photo-viewer'), null);

  assert.equal(document.querySelector('.gallery-related-heading h3').textContent, 'Outros imóveis');
  assert.equal(document.querySelectorAll('.gallery-related-card').length, 2);
  assert.equal(document.querySelector('.gallery-related-card-summary').textContent, '4 hóspedes · 2 quartos');
  assert.equal(document.querySelectorAll('.gallery-related-card img').length, 2);
  document.querySelector('[data-related-index="0"]').click();
  assert.equal(selectedApartment.id, 'other');
  assert.equal(document.querySelector('.gallery-lightbox'), null);
  gallery.destroy();

  const knownRoom = window.GalleryTest.createGallery(mount, [
    'https://apilocacao.leantechautomacao.com.br/api/v1/storage/object?url=https%3A%2F%2Fs3.leantechautomacao.com.br%2Flocacao%2Fimoveis%2F626febeda7ce000000000000000000000000.jpg',
    '/46b20a1ffaf2000000000000000000000000.jpg',
  ]);
  mount.querySelector('[data-gallery-open]').click();
  const identified = document.querySelector('.gallery-photo-group');
  assert.equal(identified.querySelector('h3').textContent, 'Quarto 1');
  assert.equal(identified.querySelectorAll('.gallery-photo').length, 2);
  assert.equal(identified.querySelector('.gallery-photo-grid').classList.contains('has-2'), true);
  knownRoom.destroy();
  dom.window.close();
  console.log('PASS galeria por cômodo, mosaico, visualizador e outros imóveis');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
