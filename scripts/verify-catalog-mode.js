/* Verificação funcional (não faz parte do site): modo catálogo na raiz
   (todos os imóveis/pontos de todas as empresas, propaganda em
   /detalhes) e direcionamento da reserva para o WhatsApp da empresa
   do imóvel escolhido. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const bundle = fs.readFileSync('assets/js/bundle.js', 'utf8');

const IMOVEIS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'A1',
    name: 'Imóvel Empresa Um',
    location: 'Praia Grande · Ubatuba',
    capacity: 4,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1,
    amenities: ['Wi-Fi'],
    images: [],
    price: 'R$ 500 / noite',
    dailyPrice: 500,
    available: true,
    empresaNome: 'Empresa Um',
    empresaWhatsapp: '12997353793',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'A2',
    name: 'Imóvel Empresa Dois',
    location: 'Enseada · Ubatuba',
    capacity: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    amenities: ['Wi-Fi', 'TV'],
    images: [],
    price: 'R$ 700 / noite',
    dailyPrice: 700,
    available: true,
    empresaNome: 'Empresa Dois',
    empresaWhatsapp: '(12) 99735-3792',
  },
];

const PONTOS = {
  categories: [{ id: 'cat1', name: 'Praias', slug: 'praias', icon: 'beach', order: 1 }],
  points: [
    {
      id: 'p1',
      name: 'Praia Teste',
      description: 'Ponto do catálogo público',
      address: 'Ubatuba',
      neighborhood: 'Centro',
      city: 'Ubatuba',
      state: 'SP',
      zip: '',
      latitude: -23.5,
      longitude: -45.1,
      phone: '',
      site: '',
      image: '',
      featured: false,
      categoryId: 'cat1',
    },
  ],
};

function makeDom(url) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url, pretendToBeVisual: true });
  const { window } = dom;
  const calls = [];
  window.fetch = async (u, opts) => {
    const urlStr = String(u);
    calls.push({ url: urlStr, body: opts?.body ? JSON.parse(opts.body) : null });
    if (urlStr.includes('/api/imoveis')) {
      return { ok: true, status: 200, json: async () => IMOVEIS };
    }
    if (urlStr.includes('/api/pontos-interesse')) {
      return { ok: true, status: 200, json: async () => PONTOS };
    }
    if (urlStr.includes('/api/clientes/lookup')) {
      return { ok: false, status: 404, json: async () => ({ error: 'não encontrado' }) };
    }
    if (urlStr.includes('/api/reservas/cancelar')) {
      return { ok: true, status: 200, json: async () => ({ status: 'CANCELADA' }) };
    }
    if (urlStr.includes('/api/reservas')) {
      return { ok: true, status: 201, json: async () => ({ id: 'r1', status: 'PRE_RESERVA' }) };
    }
    return { ok: true, status: 201, json: async () => ({ id: 'c1', created: 'true' }) };
  };
  window.eval(bundle);
  return { window, doc: window.document, calls };
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + label + (extra ? '  → ' + extra : ''));
  if (!cond) failures++;
};

/* ---------- Cenário 1: catálogo na raiz "/" ---------- */
async function scenarioCatalogRoot() {
  console.log('\n--- Raiz "/" (catálogo de todas as empresas) ---');
  const { window, doc, calls } = makeDom('http://localhost/');
  doc.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await wait(80);

  const cards = doc.querySelectorAll('#apartmentsGrid .apt-card');
  check('todos os imóveis renderizados (2 empresas)', cards.length === 2, String(cards.length));
  check(
    'selo da empresa no card 1',
    cards[0]?.querySelector('.apt-empresa')?.textContent.includes('Empresa Um'),
    cards[0]?.querySelector('.apt-empresa')?.textContent
  );
  check(
    'selo da empresa no card 2',
    cards[1]?.querySelector('.apt-empresa')?.textContent.includes('Empresa Dois'),
    cards[1]?.querySelector('.apt-empresa')?.textContent
  );
  check('catálogo busca /api/imoveis SEM filtro', calls.some((c) => c.url === '/api/imoveis'));
  check(
    'pontos de interesse renderizados',
    !!doc.querySelector('#pointsMount .poi-card') &&
      doc.querySelector('#pointsMount .poi-card h3').textContent === 'Praia Teste'
  );
  check('propaganda Leantech OCULTA na raiz', doc.getElementById('leantechPromo').hasAttribute('hidden'));
  check('seção apartamentos visível', !doc.getElementById('apartamentos').hasAttribute('hidden'));
  check('CTA genérico de WhatsApp oculto', doc.querySelector('.cta-banner').hasAttribute('hidden'));
  check(
    'contato genérico do rodapé oculto',
    doc.querySelector('.footer-phone').hasAttribute('hidden')
  );

  // Fluxo de reserva do imóvel 2 (Empresa Dois, WhatsApp (12) 99735-3792)
  cards[1].querySelector('[data-action="details"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(50);
  check(
    'detalhe mostra empresa anunciante',
    !!doc.querySelector('.modal-overlay .detail-empresa') &&
      doc.querySelector('.modal-overlay .detail-empresa').textContent.includes('Empresa Dois')
  );

  let waUrl = null;
  window.open = (u) => {
    waUrl = u;
    return {};
  };

  doc.querySelector('[data-action="rent"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(400);

  const booking = doc.querySelector('.modal-booking');
  const days = booking.querySelectorAll('.cal-day:not(.is-empty):not(.is-past):not(:disabled)');
  days[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(20);
  const days2 = booking.querySelectorAll('.cal-day:not(.is-empty):not(.is-past):not(:disabled)');
  days2[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(20);
  booking.querySelector('[data-role="next"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(20);
  booking.querySelector('[data-role="next"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(30);

  const form = doc.querySelector('.client-form');
  check('cadastro abriu na etapa 3', !!form);
  const set = (sel, v) => {
    const el = form.querySelector(sel);
    el.value = v;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  set('#cfCpf', '52998224725');
  set('#cfNome', 'Cliente Teste');
  set('#cfWhatsapp', '12981234567');
  await wait(20);
  form.querySelector('#clientForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(400);

  const clienteCall = calls.find((c) => c.url === '/api/clientes');
  check(
    'cadastro do cliente vinculado à empresa DO IMÓVEL (12997353792)',
    clienteCall?.body?.empresa === '12997353792',
    JSON.stringify(clienteCall?.body)
  );

  booking.querySelector('[data-role="wa"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(1800);
  check(
    'reserva vai para o WhatsApp da empresa do imóvel (wa.me/5512997353792)',
    typeof waUrl === 'string' && waUrl.startsWith('https://wa.me/5512997353792?'),
    waUrl
  );
  check(
    'mensagem menciona o imóvel da Empresa Dois',
    typeof waUrl === 'string' && decodeURIComponent(waUrl).includes('Imóvel Empresa Dois')
  );

  const reservaCall = calls.find((c) => c.url === '/api/reservas');
  check(
    'pré-reserva gravada na empresa DO IMÓVEL',
    reservaCall?.body?.empresa === '12997353792' && reservaCall?.body?.imovelId === IMOVEIS[1].id,
    JSON.stringify(reservaCall?.body)
  );
}

/* ---------- Cenário 2: propaganda em "/detalhes" ---------- */
async function scenarioPromo() {
  console.log('\n--- "/detalhes" (propaganda Leantech) ---');
  const { doc, calls } = makeDom('http://localhost/detalhes');
  await wait(80);

  check('propaganda VISÍVEL em /detalhes', !doc.getElementById('leantechPromo').hasAttribute('hidden'));
  check('seção apartamentos oculta', doc.getElementById('apartamentos').hasAttribute('hidden'));
  check('seção pontos oculta', doc.getElementById('pontos-interesse').hasAttribute('hidden'));
  check('seção como-funciona oculta', doc.getElementById('como-funciona').hasAttribute('hidden'));
  check(
    'nada carregado da API',
    !calls.some((c) => c.url.includes('/api/imoveis') || c.url.includes('/api/pontos-interesse'))
  );
  check(
    'link "Adquirir esse sistema" aponta para o WhatsApp da Leantech',
    doc.querySelector('#leantechPromo a[href*="wa.me/551238333927"]') !== null
  );
}

/* ---------- Cenário 3: vínculo de empresa inalterado ---------- */
async function scenarioLinked() {
  console.log('\n--- "/12997353792" (empresa vinculada, comportamento antigo) ---');
  const { window, doc, calls } = makeDom('http://localhost/12997353792');
  doc.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await wait(80);

  check('modo empresa busca /api/imoveis?whatsapp=12997353792',
    calls.some((c) => c.url === '/api/imoveis?whatsapp=12997353792'));
  check(
    'sem selo de empresa no modo empresa',
    doc.querySelector('#apartmentsGrid .apt-empresa') === null
  );
  check('propaganda oculta no modo empresa', doc.getElementById('leantechPromo').hasAttribute('hidden'));
  check('CTA de WhatsApp visível no modo empresa', !doc.querySelector('.cta-banner').hasAttribute('hidden'));
}

(async () => {
  await scenarioCatalogRoot();
  await scenarioPromo();
  await scenarioLinked();
  console.log(failures === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${failures} TESTE(S) FALHARAM`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
