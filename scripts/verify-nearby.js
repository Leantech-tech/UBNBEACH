const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const bundle = fs.readFileSync('assets/js/bundle.js', 'utf8');
const apartment = (id, hidden = false) => ({
  id, name: id, code: id, location: 'Ubatuba', latitude: null, longitude: null,
  hideAddress: hidden, mapQuery: '', mapQuerySource: 'unavailable',
  capacity: 4, bedrooms: 2, beds: 2, bathrooms: 1, amenities: [], images: [],
  available: true, empresaNome: 'Empresa', empresaWhatsapp: '12999999999',
});
const apartments = [
  apartment('11111111-1111-1111-1111-111111111111', true),
  apartment('22222222-2222-2222-2222-222222222222', true),
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;
  const calls = [];
  window.fetch = async (url) => {
    calls.push(String(url));
    if (url === '/api/imoveis') return { ok: true, json: async () => apartments };
    if (url === '/api/pontos-interesse') return { ok: true, json: async () => ({ categories: [], points: [] }) };
    if (String(url).includes('22222222-2222-2222-2222-222222222222/pontos-proximos')) return { ok: false, status: 422 };
    if (String(url).includes('/pontos-proximos')) return { ok: true, json: async () => ({
      limited: true, points: [
        { id: 'one', name: 'Farmácia próxima', category: 'Farmácias', icon: 'pharmacy', address: 'Rua Exemplo' },
        { id: 'two', name: '<script>malicioso</script>', category: 'Restaurantes', icon: 'restaurant' },
      ],
    }) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await pause(100);
  const cards = [...document.querySelectorAll('#apartmentsGrid .apt-card')];
  if (cards.length !== 2) throw new Error(`expected 2 apartments, got ${cards.length}`);
  cards[0].querySelector('[data-action="details"]').click();
  await pause(50);
  if (calls.some((url) => url.includes('/pontos-proximos'))) throw new Error('places loaded before popup click');
  if (document.querySelector('.modal-overlay iframe')) throw new Error('map should be absent');
  document.querySelector('[data-nearby-open]').click();
  await pause(50);
  if (!calls.some((url) => url.includes('11111111-1111-1111-1111-111111111111/pontos-proximos'))) throw new Error('popup did not fetch nearby places');
  const popup = document.querySelector('.modal-nearby');
  if (!popup || !popup.textContent.includes('Farmácia próxima')) throw new Error('popup did not show places');
  if (!popup.textContent.includes('Google Maps') || !popup.textContent.includes('outros lugares podem existir')) throw new Error('attribution or limit missing');
  if (popup.querySelector('script, .nearby-dist, iframe')) throw new Error('unsafe content or hidden location exposed');
  const filter = popup.querySelector('[data-nearby-category]');
  filter.value = 'Farmácias';
  filter.dispatchEvent(new window.Event('change'));
  if (popup.querySelectorAll('.nearby-item').length !== 1) throw new Error('category filter failed');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await pause(320);
  if (document.querySelectorAll('.modal-overlay').length !== 1) throw new Error('Escape closed the property along with the popup');
  document.querySelector('.modal-close').click();
  await pause(320);
  cards[1].querySelector('[data-action="details"]').click();
  await pause(50);
  document.querySelector('[data-nearby-open]').click();
  await pause(50);
  if (!document.querySelector('.modal-nearby')?.textContent.includes('é preciso cadastrar a localização')) throw new Error('missing location message absent');
  console.log('PASS popup opens on click, radius source, filtering and private location');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
