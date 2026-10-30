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
  let scrolledTo = '';
  window.HTMLElement.prototype.scrollIntoView = function () { scrolledTo = this.id; };
  window.eval(build.outputFiles[0].text);

  const mount = window.document.querySelector('#mount');
  const gallery = window.GalleryTest.createGallery(mount, [
    { url: '/quarto-1.jpg', caption: 'Quarto 1' },
    { url: '/banheiro.jpg', caption: 'Banheiro social' },
    { url: '/banheiro-suite.jpg', caption: 'Banheiro da suíte' },
    { url: '/quarto-2.jpg', caption: 'Suíte' },
    { url: '/jantar.jpg', caption: 'Sala de jantar' },
    { url: '/externa.jpg', caption: 'Área externa' },
    { url: '/varanda-suite.jpg', caption: 'Varanda da suíte' },
    { url: '/706fdd2f7bbb96cdcbbe2f65edef819d4b3adb5b.jpg', caption: 'Foto 1' },
    { url: '/sem-legenda.jpg' },
  ]);
  mount.querySelector('[data-gallery-open]').click();
  const sections = [...window.document.querySelectorAll('.gallery-photo-group')];
  assert.deepEqual(sections.map((section) => section.querySelector('h3').textContent), [
    'Quartos', 'Banheiros', 'Sala de jantar', 'Área externa', 'Outras fotos',
  ]);
  assert.deepEqual(sections.map((section) => section.querySelectorAll('img').length), [2, 2, 1, 3, 1]);
  assert.equal(sections[1].querySelectorAll('img')[1].getAttribute('src'), '/banheiro-suite.jpg');
  assert.equal(sections[3].querySelectorAll('img')[1].getAttribute('src'), '/varanda-suite.jpg');
  assert.equal(window.document.querySelector('[data-lightbox-viewer]'), null);
  window.document.querySelector('[data-gallery-jump="bathrooms"]').click();
  assert.equal(scrolledTo, 'gallery-bathrooms');
  assert.ok(window.document.querySelector('.gallery-lightbox'));
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(window.document.querySelector('.gallery-lightbox'), null);
  assert.equal(window.document.body.style.overflow, '');
  gallery.destroy();
  dom.window.close();
  console.log('PASS galeria agrupada, navegação e fechamento');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
