/* Teste pontual: menu mobile redesenhado (temporário). */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
  runScripts: 'outside-only',
  url: 'http://localhost/12997353792',
  pretendToBeVisual: true,
});
const { window } = dom;
const doc = window.document;

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + label + (extra ? '  → ' + extra : ''));
  if (!cond) failures++;
};

(async () => {
  window.fetch = async () => ({ ok: false });
  window.eval(fs.readFileSync('assets/js/bundle.js', 'utf8'));
  await new Promise((r) => setTimeout(r, 150)); // jsdom dispara o DOMContentLoaded sozinho

  const toggle = doc.getElementById('navToggle');
  const menu = doc.getElementById('mobileMenu');

  toggle.click();
  check('menu abre', menu.classList.contains('is-open'));
  check('body trava rolagem', doc.body.classList.contains('no-scroll'));
  check('header em modo menu', doc.getElementById('siteHeader').classList.contains('menu-open'));

  const links = [...menu.querySelectorAll('nav a')];
  check('3 links de navegação', links.length === 3, String(links.length));
  check('cada link tem ícone svg', links.every((a) => a.querySelector('.mobile-menu-icon svg')),
    links.map((a) => a.textContent.trim()).join(' | '));

  const cta = menu.querySelector('.mobile-menu-cta');
  check('CTA WhatsApp presente', !!cta);
  check('CTA com ícone whatsapp', !!cta?.querySelector('svg'));
  check('CTA com link wa.me', (cta?.href || '').includes('wa.me/5512997353793'), cta?.href);

  const foot = menu.querySelector('.mobile-menu-foot');
  check('rodapé do menu presente', (foot?.textContent || '').includes("UB N' BEACH"));

  toggle.click();
  check('clique no X fecha o menu', !menu.classList.contains('is-open'));

  toggle.click();
  links[1].click();
  check('clique no link fecha o menu', !menu.classList.contains('is-open'));

  console.log(failures ? `\n${failures} TESTE(S) FALHARAM` : '\nTODOS OS TESTES PASSARAM');
  process.exit(failures ? 1 : 0);
})();
