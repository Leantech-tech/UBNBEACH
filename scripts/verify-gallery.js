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
  window.HTMLElement.prototype.scrollIntoView = function () {};
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
    { url: '/sem-legenda.jpg' },
  ]);
  mount.querySelector('[data-gallery-open]').click();
  const sections = [...window.document.querySelectorAll('.gallery-photo-group')];
  assert.deepEqual(sections.map((section) => section.querySelector('h3').textContent), [
    'Quartos', 'Banheiros', 'Sala de jantar', 'Área externa', 'Outras fotos',
  ]);
  assert.deepEqual(sections.map((section) => section.querySelectorAll('button').length), [2, 2, 1, 2, 1]);
  assert.equal(sections[1].querySelectorAll('button')[1].querySelector('img').getAttribute('src'), '/banheiro-suite.jpg');
  assert.equal(sections[3].querySelectorAll('button')[1].querySelector('img').getAttribute('src'), '/varanda-suite.jpg');

  const bedroom = sections[0].querySelector('button');
  bedroom.click();
  assert.equal(window.document.querySelector('[data-lightbox-viewer]').hidden, false);
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(window.document.activeElement, window.document.querySelector('[data-lightbox-next]'));
  assert.equal(window.document.querySelector('[data-lightbox-image]').getAttribute('src'), '/quarto-1.jpg');
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(window.document.querySelector('[data-lightbox-image]').getAttribute('src'), '/quarto-2.jpg');
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(window.document.querySelector('[data-lightbox-viewer]').hidden, true);
  assert.ok(window.document.querySelector('.gallery-lightbox'));
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(window.document.querySelector('.gallery-lightbox'), null);
  assert.equal(window.document.body.style.overflow, '');
  gallery.destroy();
  dom.window.close();
  console.log('PASS galeria agrupada, navegação e fechamento');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
