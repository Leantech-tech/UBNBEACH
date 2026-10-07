/* Verificação funcional (não faz parte do site): render + filtro + modal via jsdom. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://localhost/12997353792',
  pretendToBeVisual: true,
});
const { window } = dom;
const doc = window.document;

(async () => {
  window.eval(fs.readFileSync('assets/js/bundle.js', 'utf8'));
  if (!doc.querySelector('#pointsMount .poi-card')) {
    doc.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  }
  // O init() é async (carrega imóveis e pontos antes de renderizar):
  // espera um tick para os grids estarem preenchidos.
  await new Promise((r) => setTimeout(r, 50));

  let failures = 0;
  const check = (label, cond, extra = '') => {
    console.log((cond ? 'PASS' : 'FAIL') + '  ' + label + (extra ? '  → ' + extra : ''));
    if (!cond) failures++;
  };

  /* ---- Estrutura das seções ---- */
  const sections = [...doc.querySelectorAll('main section')].map((s) => s.id || '(cta)');
  check(
    'ordem das seções',
    sections.join(',') === 'inicio,leantechPromo,como-funciona,apartamentos,pontos-interesse,(cta)',
    sections.join(' > ')
  );

  /* ---- Pontos de interesse (dados locais de fallback) ---- */
  const filters = [...doc.querySelectorAll('#pointsMount .poi-filter')];
  check('5 chips de filtro (Todos + 4 categorias)', filters.length === 5, String(filters.length));
  check('chip "Todos" ativo por padrão', filters[0].classList.contains('is-active'));
  check(
    'contadores nos chips',
    filters[0].querySelector('.poi-count')?.textContent === '24',
    filters[0].querySelector('.poi-count')?.textContent
  );

  const allCards = doc.querySelectorAll('#pointsMount .poi-card');
  check('24 cards de pontos renderizados', allCards.length === 24, String(allCards.length));
  check('cards são clicáveis', !!allCards[0].querySelector('[data-action="open"]'));
  check('badge de categoria no card', !!allCards[0].querySelector('.poi-badge'));

  /* ---- Filtro por categoria ---- */
  const chipCachoeira = filters.find((f) => f.dataset.category === 'cachoeira');
  chipCachoeira.click();
  await new Promise((r) => setTimeout(r, 250)); // fade de troca de filtro

  const waterfallCards = doc.querySelectorAll('#pointsMount .poi-card');
  check('filtro Cachoeiras: 7 cards', waterfallCards.length === 7, String(waterfallCards.length));
  check(
    'filtro marca chip ativo',
    chipCachoeira.classList.contains('is-active') && !filters[0].classList.contains('is-active')
  );

  /* ---- Clique: abre modal do ponto ---- */
  doc.querySelector('#pointsMount [data-point="agua-branca"] [data-action="open"]').click();
  const overlay = doc.querySelector('.modal-overlay');
  check('modal do ponto abriu', !!overlay);
  check(
    'título do modal',
    overlay?.querySelector('.detail-head h3')?.textContent === 'Cachoeira da Água Branca',
    overlay?.querySelector('.detail-head h3')?.textContent
  );
  check('badge Cachoeiras', overlay?.querySelector('.badge')?.textContent.includes('Cachoeiras'));
  check('descrição presente', (overlay?.querySelector('.detail-block p')?.textContent || '').length > 40);
  const map = overlay?.querySelector('.poi-map iframe');
  check('mapa do Google no modal', !!map && map.src.includes('google.com/maps'), map?.src);
  check(
    'botão "Como chegar"',
    !!overlay?.querySelector('.poi-map-actions a[href*="maps/dir"]')
  );
  overlay.querySelector('.modal-close').click();

  await new Promise((r) => setTimeout(r, 400));
  check('modal fechou', !doc.querySelector('.modal-overlay'));

  console.log(failures === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${failures} TESTE(S) FALHARAM`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
