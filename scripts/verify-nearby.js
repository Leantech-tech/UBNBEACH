const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const bundle = fs.readFileSync('assets/js/bundle.js', 'utf8');
const apartment = (id, name, hidden = false) => ({
  id, name, code: name, location: 'Ubatuba', latitude: -23.5, longitude: -45.1,
  hideAddress: hidden, mapQuery: hidden ? '' : '-23.5,-45.1',
  mapQuerySource: hidden ? 'unavailable' : 'coordinates',
  capacity: 4, bedrooms: 2, beds: 2, bathrooms: 1, amenities: [], images: [],
  available: true, empresaNome: 'Empresa', empresaWhatsapp: '12999999999',
});
const apartments = [
  apartment('11111111-1111-1111-1111-111111111111', 'Com localização'),
  apartment('22222222-2222-2222-2222-222222222222', 'Endereço oculto', true),
];

async function main() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;
  const calls = [];
  window.fetch = async (url) => {
    calls.push(String(url));
    if (url === '/api/imoveis') return { ok: true, json: async () => apartments };
    if (url === '/api/pontos-interesse') return { ok: true, json: async () => ({
      categories: [{ id: 'beach', name: 'Praias', icon: 'beach' }],
      points: [{ id: 'local', name: 'Praia cadastrada', latitude: -23.51, longitude: -45.1, categoryId: 'beach' }],
    }) };
    if (String(url).includes('/pontos-proximos')) return { ok: true, json: async () => ({ points: [
      { id: 'osm-1', name: 'Farmácia próxima', latitude: -23.5, longitude: -45.1, category: 'Farmácias', icon: 'pharmacy' },
      { id: 'osm-4', name: 'Farmácia próxima', latitude: -23.5005, longitude: -45.1, category: 'Farmácias', icon: 'pharmacy' },
      { id: 'osm-2', name: 'Mercado distante', latitude: -23.3, longitude: -45.1, category: 'Mercados', icon: 'cart' },
      { id: 'osm-3', name: '<script>malicioso</script>', latitude: -23.501, longitude: -45.1, category: 'Restaurantes', icon: 'restaurant' },
    ] }) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  window.eval(bundle);
  document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const cards = [...document.querySelectorAll('#apartmentsGrid .apt-card')];
  if (cards.length !== 2) throw new Error(`expected 2 apartments, got ${cards.length}`);
  cards[0].querySelector('[data-action="details"]').click();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const nearby = document.querySelector('.modal-overlay .nearby-attractions');
  const names = [...nearby.querySelectorAll('.nearby-info h4')].map((el) => el.textContent);
  if (!calls.includes('/api/imoveis/11111111-1111-1111-1111-111111111111/pontos-proximos')) throw new Error('missing nearby request');
  if (!names.includes('Farmácia próxima') || !names.includes('Praia cadastrada') || names.includes('Mercado distante')) {
    throw new Error(`incorrect 10 km results: ${names.join(', ')}`);
  }
  if (nearby.querySelector('script')) throw new Error('external name was not escaped');
  const filter = nearby.querySelector('[data-nearby-category]');
  filter.value = 'Farmácias';
  filter.dispatchEvent(new window.Event('change'));
  if (nearby.querySelectorAll('.nearby-item').length !== 2) throw new Error('category filter or same-name places failed');
  document.querySelector('.modal-close').click();
  await new Promise((resolve) => setTimeout(resolve, 320));
  cards[1].querySelector('[data-action="details"]').click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  if (calls.some((url) => url.includes('22222222-2222-2222-2222-222222222222/pontos-proximos'))) {
    throw new Error('hidden location triggered nearby request');
  }
  if (document.querySelector('.modal-overlay .nearby-map iframe')) throw new Error('hidden location exposed a map');
  console.log('PASS nearby radius, categories, escaping and hidden location');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
