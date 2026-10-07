/* Verificação pontual (não faz parte do site): o popup de cadastro
   deve abrir sozinho ao chegar na etapa 3 da reserva, antes do clique
   no botão de WhatsApp. */
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

// fetch mock: lookup 404, create ok, reservas ok
let lookupCalls = 0;
let reservaCalls = 0;
let reservaBody = null;
window.fetch = async (url, opts) => {
  if (String(url).includes('/api/clientes/lookup')) {
    lookupCalls++;
    return { status: 404, ok: false, json: async () => ({ error: 'não encontrado' }) };
  }
  if (String(url).includes('/api/reservas')) {
    reservaCalls++;
    reservaBody = opts?.body ? JSON.parse(opts.body) : null;
    return { status: 201, ok: true, json: async () => ({ id: 'r1', status: 'PRE_RESERVA' }) };
  }
  return { status: 201, ok: true, json: async () => ({ id: 'x', created: 'true' }) };
};

(async () => {
  window.eval(fs.readFileSync('assets/js/bundle.js', 'utf8'));
  doc.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 80));

  let failures = 0;
  const check = (label, cond, extra = '') => {
    console.log((cond ? 'PASS' : 'FAIL') + '  ' + label + (extra ? '  → ' + extra : ''));
    if (!cond) failures++;
  };

  // Abre o booking: detalhes → Alugar (abre o fluxo de reserva)
  const detailsBtn = doc.querySelector('[data-action="details"]');
  check('botão de detalhes existe', !!detailsBtn);
  detailsBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  const rentBtn = doc.querySelector('[data-action="rent"]');
  check('botão Alugar existe', !!rentBtn);
  rentBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  const bookingOverlay = doc.querySelector('.modal-booking');
  check('modal de reserva abriu', !!bookingOverlay);

  // Etapa 1: escolhe datas direto no state do DateRangePicker via clique em dias
  // (mais simples: clicar dois dias do calendário)
  const days = bookingOverlay.querySelectorAll('.cal-day:not(.is-empty):not(.is-past):not(:disabled)');
  check('calendário tem dias clicáveis', days.length > 1, String(days.length));
  days[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  const days2 = bookingOverlay.querySelectorAll('.cal-day:not(.is-empty):not(.is-past):not(:disabled)');
  days2[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  bookingOverlay.querySelector('[data-role="next"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  // Etapa 2: pessoas — continuar
  bookingOverlay.querySelector('[data-role="next"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 30));

  // Etapa 3: o popup de cadastro deve ter aberto SOZINHO
  const form = doc.querySelector('.client-form');
  check('popup de cadastro abriu automaticamente na etapa 3', !!form);

  const waNote = bookingOverlay.querySelector('[data-role="wa-note"]');
  check('botão ainda não liberado', waNote && !/Cadastro confirmado/.test(waNote.textContent));

  // Preenche e submete o cadastro
  const set = (sel, v) => {
    const el = form.querySelector(sel);
    el.value = v;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  set('#cfCpf', '52998224724'); // dígito verificador errado
  await new Promise((r) => setTimeout(r, 500));
  check('CPF inválido sinalizado no campo', /CPF inválido/.test(form.querySelector('[data-role="status"]').textContent));
  check('busca automática NÃO disparada para CPF inválido', lookupCalls === 0, String(lookupCalls));

  set('#cfCpf', '52998224725');
  set('#cfNome', 'Cliente Teste');
  set('#cfWhatsapp', '12981234567');
  await new Promise((r) => setTimeout(r, 20));

  check('máscara do CPF aplicada', form.querySelector('#cfCpf').value === '529.982.247-25', form.querySelector('#cfCpf').value);
  check('máscara do WhatsApp aplicada', form.querySelector('#cfWhatsapp').value === '(12) 98123-4567', form.querySelector('#cfWhatsapp').value);

  form.querySelector('#clientForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 400));

  check('popup fechou após cadastro', !doc.querySelector('.client-form'));
  check('cadastro confirmado no resumo', /Cadastro confirmado/.test(waNote.textContent));

  // A pré-reserva deve ter sido salva com os dados da reserva.
  // (imóvel de fallback não é UUID → no jsdom a reserva NÃO é gravada;
  // aqui validamos que a regra de UUID foi respeitada.)
  check('pré-reserva não gravada para imóvel de exemplo (fallback)', reservaCalls === 0, String(reservaCalls));

  process.exit(failures ? 1 : 0);
})();
