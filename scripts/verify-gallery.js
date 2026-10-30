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
  let selectedApartment = null;
  const gallery = window.GalleryTest.createGallery(mount, [
    { url: '/quarto-1.jpg', caption: 'Quarto 1' },
    { url: '/quarto-1b.jpg', caption: 'Quarto 1' },
    { url: '/banheiro.jpg', caption: 'Banheiro social' },
    { url: '/banheiro-suite.jpg', caption: 'Banheiro da suíte' },
    { url: '/quarto-2.jpg', caption: 'Suíte' },
    { url: '/jantar.jpg', caption: 'Sala de jantar' },
    { url: '/externa.jpg', caption: 'Área externa' },
    { url: '/varanda-suite.jpg', caption: 'Varanda da suíte' },
    { url: '/706fdd2f7bbb96cdcbbe2f65edef819d4b3adb5b.jpg', caption: 'Foto 1' },
    { url: '/560fe27b03e2000000000000000000000000.jpg', caption: 'Foto 2' },
    { url: '/sem-legenda.jpg' },
  ], {
    apartment: { id: 'current', name: 'Empresa e bairro do imóvel', capacity: 4, bedrooms: 2, beds: 3, bathrooms: 1 },
    otherApartments: [
      { id: 'current', name: 'Empresa e bairro do imóvel' },
      { id: 'other', name: 'Outro imóvel', images: ['/other.jpg'] },
    ],
    onSelectApartment: (item) => { selectedApartment = item; },
  });
  mount.querySelector('[data-gallery-open]').click();
  assert.equal(window.document.querySelector('.gallery-lightbox-header-title').textContent, 'Fotos do imóvel');
  assert.equal(window.document.querySelector('.gallery-lightbox-intro h2').textContent, 'Quarto 1');
  assert.equal(window.document.querySelector('.gallery-related-heading h3').textContent, 'Outros imóveis');
  assert.equal(window.document.querySelectorAll('.gallery-related-card').length, 1);
  assert.equal(window.document.querySelectorAll('.gallery-property-meta li').length, 4);
  const sections = [...window.document.querySelectorAll('.gallery-photo-group')];
  assert.deepEqual(sections.map((section) => section.querySelector('h3').textContent), [
    'Quarto 1', 'Suíte 1', 'Banheiro 1', 'Banheiro 2', 'Sala de jantar', 'Área externa', 'Varanda da suíte', 'Varanda', 'Outras fotos',
  ]);
  assert.equal(sections[2].querySelector('.gallery-photo-group-heading p').textContent, 'Banheiro social');
  assert.deepEqual(sections.map((section) => section.querySelectorAll('img').length), [2, 1, 1, 1, 1, 1, 1, 2, 1]);
  assert.equal(sections[0].querySelectorAll('img')[1].getAttribute('src'), '/quarto-1b.jpg');
  assert.equal(sections[7].querySelectorAll('img')[1].getAttribute('src'), '/560fe27b03e2000000000000000000000000.jpg');
  assert.equal(window.document.querySelector('[data-lightbox-viewer]'), null);
  assert.equal(window.document.querySelector('.gallery-lightbox').textContent.includes('Empresa e bairro do imóvel'), false);
  assert.ok(window.document.querySelector('.gallery-lightbox'));
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(window.document.querySelector('.gallery-lightbox'), null);
  assert.equal(window.document.body.style.overflow, '');
  mount.querySelector('[data-gallery-open]').click();
  window.document.querySelector('[data-related-index="0"]').click();
  assert.equal(selectedApartment.id, 'other');
  assert.equal(window.document.querySelector('.gallery-lightbox'), null);
  gallery.destroy();

  const knownRoom = window.GalleryTest.createGallery(mount, [
    'https://apilocacao.leantechautomacao.com.br/api/v1/storage/object?url=https%3A%2F%2Fs3.leantechautomacao.com.br%2Flocacao%2Fimoveis%2F626febeda7ce000000000000000000000000.jpg',
    '/46b20a1ffaf2000000000000000000000000.jpg',
  ]);
  mount.querySelector('[data-gallery-open]').click();
  const identified = window.document.querySelector('.gallery-photo-group');
  assert.equal(identified.querySelector('h3').textContent, 'Quarto 1');
  assert.equal(identified.querySelector('.gallery-photo-group-heading p').textContent, 'Quarto com beliche e cama vermelha');
  assert.equal(identified.querySelectorAll('img').length, 2);
  knownRoom.destroy();
  dom.window.close();
  console.log('PASS galeria por cômodo, outros imóveis e fechamento');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
