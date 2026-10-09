import { openModal } from './modal.js';
import { openClientForm } from './client-form.js';
import { DateRangePicker } from './calendar.js';
import { showToast } from './toast.js';
import {
  ICONS,
  formatDate,
  formatGuests,
  formatBRL,
  plural,
  nightsBetween,
  buildWhatsAppLink,
  buildBookingMessage,
  bookingPrice,
  linkedWhatsApp,
} from './utils.js';

/** Data local em formato ISO (YYYY-MM-DD) para a API. */
const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Imóvel real vem do banco (UUID); os de exemplo do fallback não são. */
const isUUID = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s ?? ''));

/**
 * Fluxo de reserva em 3 etapas:
 *   1. Período (calendário entrada → saída)
 *   2. Quantidade de pessoas
 *   3. Resumo + redirecionamento para o WhatsApp
 */
export function openBooking(apartment) {
  const state = {
    step: 1,
    checkIn: null,
    checkOut: null,
    guests: Math.min(2, apartment.capacity),
    registered: false,
  };

  const html = `
    <div class="booking">
      <header class="bk-head">
        <p class="bk-eyebrow">Reserva · ${apartment.name}</p>
        <ol class="bk-steps">
          <li class="bk-step is-active" data-step-dot="1"><i>1</i><span>Período</span></li>
          <li class="bk-step" data-step-dot="2"><i>2</i><span>Pessoas</span></li>
          <li class="bk-step" data-step-dot="3"><i>3</i><span>Resumo</span></li>
        </ol>
      </header>
      <div class="bk-body" data-role="body"></div>
      <footer class="bk-foot" data-role="foot"></footer>
    </div>`;

  const modal = openModal(html, { variant: 'modal-booking' });
  const body = modal.body.querySelector('[data-role="body"]');
  const foot = modal.body.querySelector('[data-role="foot"]');

  let picker = null;
  let reservaId = null; // id da pré-reserva gravada (para poder cancelar)
  let clientName = null; // nome do cliente após o cadastro

  /* ---------------- Etapa 1: período ---------------- */
  function renderStep1() {
    body.innerHTML = `
      <div class="bk-step-body">
        <h3 class="bk-title">Quando você pretende ficar?</h3>
        <p class="bk-hint">Toque na <strong>data de entrada</strong> e depois na <strong>data de saída</strong>.</p>
        <div data-role="calendar"></div>
        <p class="bk-selection" data-role="selection" aria-live="polite"></p>
      </div>`;

    picker = new DateRangePicker(body.querySelector('[data-role="calendar"]'), {
      onChange: (start, end) => {
        state.checkIn = start;
        state.checkOut = end;
        updateSelection();
        renderFoot();
      },
    });

    updateSelection();
    renderFoot();
  }

  function updateSelection() {
    const el = body.querySelector('[data-role="selection"]');
    if (!el) return;
    if (state.checkIn && state.checkOut) {
      const n = nightsBetween(state.checkIn, state.checkOut);
      el.innerHTML =
        `<strong>Entrada:</strong> ${formatDate(state.checkIn)} &nbsp;·&nbsp; ` +
        `<strong>Saída:</strong> ${formatDate(state.checkOut)} &nbsp;·&nbsp; ` +
        `<strong>${plural(n, 'noite', 'noites')}</strong>`;
      el.classList.add('has-value');
    } else if (state.checkIn) {
      el.innerHTML = `<strong>Entrada:</strong> ${formatDate(state.checkIn)} — agora escolha a saída`;
      el.classList.add('has-value');
    } else {
      el.textContent = '';
      el.classList.remove('has-value');
    }
  }

  /* ---------------- Etapa 2: pessoas ---------------- */
  function renderStep2() {
    body.innerHTML = `
      <div class="bk-step-body">
        <h3 class="bk-title">Quantas pessoas vão se hospedar?</h3>
        <p class="bk-hint">O ${apartment.name} acomoda até <strong>${formatGuests(apartment.capacity)}</strong>.</p>
        <div class="stepper" data-role="stepper">
          <button type="button" data-step="minus" aria-label="Diminuir quantidade de pessoas">${ICONS.minus}</button>
          <output data-role="guests" aria-live="polite">${state.guests}</output>
          <button type="button" data-step="plus" aria-label="Aumentar quantidade de pessoas">${ICONS.plus}</button>
        </div>
        <p class="bk-hint bk-hint-small">Inclua adultos e crianças.</p>
      </div>`;

    const output = body.querySelector('[data-role="guests"]');
    body.querySelector('[data-step="minus"]').addEventListener('click', () => {
      state.guests = Math.max(1, state.guests - 1);
      output.textContent = state.guests;
      renderFoot();
    });
    body.querySelector('[data-step="plus"]').addEventListener('click', () => {
      state.guests = Math.min(apartment.capacity, state.guests + 1);
      output.textContent = state.guests;
      renderFoot();
    });

    renderFoot();
  }

  /* ---------------- Etapa 3: resumo ---------------- */
  function renderStep3() {
    const nights = nightsBetween(state.checkIn, state.checkOut);

    // Valores: diária × noites, somando a taxa de limpeza quando houver.
    // Sem diária cadastrada, os campos aparecem como "Sob consulta".
    const price = bookingPrice(apartment, nights);

    const priceRows = price
      ? `
          <div><dt>Valor da diária</dt><dd>${formatBRL(price.daily)}</dd></div>
          ${price.cleaning ? `<div><dt>Taxa de limpeza</dt><dd>${formatBRL(price.cleaning)}</dd></div>` : ''}
          <div class="bk-total"><dt>Total estimado</dt><dd>${formatBRL(price.total)}</dd></div>`
      : `
          <div><dt>Valor da diária</dt><dd>Sob consulta</dd></div>
          <div class="bk-total"><dt>Total estimado</dt><dd>Sob consulta</dd></div>`;

    body.innerHTML = `
      <div class="bk-step-body">
        <h3 class="bk-title">Confira as informações</h3>
        <dl class="bk-summary">
          <div><dt>Apartamento</dt><dd>${apartment.name}</dd></div>
          <div><dt>Entrada</dt><dd>${formatDate(state.checkIn)}</dd></div>
          <div><dt>Saída</dt><dd>${formatDate(state.checkOut)}</dd></div>
          <div><dt>Permanência</dt><dd>${plural(nights, 'diária', 'diárias')}</dd></div>
          ${priceRows}
          <div><dt>Pessoas</dt><dd>${formatGuests(state.guests)}</dd></div>
        </dl>
        <button type="button" class="btn btn-primary btn-lg bk-wa" data-role="wa">
          ${ICONS.whatsapp} Finalizar reserva
        </button>
        <button type="button" class="btn btn-text bk-cancel" data-role="cancel">Cancelar reserva</button>
        <p class="bk-hint bk-hint-small bk-wa-note" data-role="wa-note">
          ${state.registered
            ? 'Cadastro confirmado! Clique em "Finalizar reserva" para concluir.'
            : 'Para continuar, confirme o cadastro rápido com CPF, nome e WhatsApp.'}
        </p>
      </div>`;

    const waBtn = body.querySelector('[data-role="wa"]');
    waBtn.addEventListener('click', () => {
      // Antes do cadastro o botão reabre o popup; depois avisa o
      // cliente e abre o WhatsApp do proprietário.
      if (!state.registered) {
        openClientFormOnce();
        return;
      }
      showToast(
        'Sua pré reserva foi realizada com sucesso! Agora vou enviar para o WhatsApp do proprietário(a) do imóvel',
        { duration: 2600 }
      );
      // Pequena pausa para a mensagem aparecer antes do redirecionamento.
      setTimeout(() => {
        const link = buildWhatsAppLink(
          buildBookingMessage(apartment, state.checkIn, state.checkOut, state.guests, clientName)
        );
        const win = window.open(link, '_blank');
        if (!win) window.location.href = link; // bloqueador de popup: abre na mesma aba
      }, 1400);
    });

    // Cancelar: anula a pré-reserva no banco (quando já gravada), fecha
    // o fluxo e confirma na tela.
    body.querySelector('[data-role="cancel"]')?.addEventListener('click', async () => {
      if (reservaId) {
        try {
          await fetch('/api/reservas/cancelar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: reservaId, empresa: linkedWhatsApp() }),
          });
        } catch {
          // API fora do ar: o cancelamento local segue mesmo assim.
        }
      }
      modal.close();
      showToast('Sua reserva foi cancelada!');
    });

    // O cadastro abre sozinho assim que o resumo aparece — antes de o
    // cliente tocar no botão de WhatsApp.
    if (!state.registered) openClientFormOnce();

    renderFoot();
  }

  // Abre o popup de cadastro uma vez só (reentrante: voltar e avançar
  // entre etapas não deve empilhar popups). Após o cadastro, grava a
  // pré-reserva e libera o botão de WhatsApp.
  function openClientFormOnce() {
    if (document.querySelector('.client-form')) return;
    openClientForm({
      onDone: (cliente) => {
        state.registered = true;
        clientName = cliente?.nome?.trim() || null;
        salvarPreReserva(cliente);
        const note = body.querySelector('[data-role="wa-note"]');
        if (note) {
          note.textContent = 'Cadastro confirmado! Clique em "Finalizar reserva" para concluir.';
        }
      },
    });
  }

  /* ---------------- Pré-reserva no banco ----------------
   *  Salva a reserva na tabela compartilhada com o app (CRUD
   *  Reservas), com status PRE RESERVA. Só é possível quando o
   *  cadastro do cliente retornou id e o imóvel é um registro real
   *  do banco (UUID); no modo de exemplo a reserva não é gravada.
   *  Falha silenciosa: nunca bloqueia o caminho para o WhatsApp.
   */
  async function salvarPreReserva(cliente) {
    if (!cliente?.id || !isUUID(apartment.id)) return;

    const nights = nightsBetween(state.checkIn, state.checkOut);
    const price = bookingPrice(apartment, nights);

    const obsParts = [
      'Pré-reserva feita pelo site.',
      `${formatGuests(state.guests)} · ${plural(nights, 'diária', 'diárias')}.`,
    ];
    if (price) obsParts.push(`Total estimado: ${formatBRL(price.total)}.`);

    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imovelId: apartment.id,
          clienteId: cliente.id,
          empresa: linkedWhatsApp(),
          entrada: isoDate(state.checkIn),
          saida: isoDate(state.checkOut),
          hospedes: state.guests,
          valorDiaria: price?.daily ?? 0,
          taxaLimpeza: price?.cleaning ?? 0,
          valorTotal: price?.total ?? 0,
          observacoes: obsParts.join(' '),
        }),
      });
      const data = await res.json().catch(() => null);
      reservaId = data?.id ?? null;
    } catch {
      // API fora do ar: segue para o WhatsApp mesmo assim.
    }
  }

  /* ---------------- Rodapé / navegação ---------------- */
  function renderFoot() {
    const canContinue =
      state.step === 1 ? !!(state.checkIn && state.checkOut) : true;

    if (state.step === 3) {
      foot.innerHTML = `
        <button type="button" class="btn btn-text" data-role="back">${ICONS.arrowLeft} Voltar</button>
        <span></span>`;
      foot.querySelector('[data-role="back"]').addEventListener('click', goBack);
      return;
    }

    foot.innerHTML = `
      <button type="button" class="btn btn-text" data-role="back" ${state.step === 1 ? 'disabled' : ''}>
        ${ICONS.arrowLeft} Voltar
      </button>
      <button type="button" class="btn btn-primary" data-role="next" ${canContinue ? '' : 'disabled'}>
        Continuar ${ICONS.arrowRight}
      </button>`;

    foot.querySelector('[data-role="back"]').addEventListener('click', goBack);
    foot.querySelector('[data-role="next"]').addEventListener('click', goNext);
  }

  function updateDots() {
    modal.body.querySelectorAll('[data-step-dot]').forEach((dot) => {
      const n = Number(dot.dataset.stepDot);
      dot.classList.toggle('is-active', n === state.step);
      dot.classList.toggle('is-done', n < state.step);
    });
  }

  function goNext() {
    if (state.step === 1 && !(state.checkIn && state.checkOut)) return;
    picker?.destroy();
    picker = null;
    state.step += 1;
    updateDots();
    if (state.step === 2) renderStep2();
    if (state.step === 3) renderStep3();
    modal.sheet.scrollTop = 0;
  }

  function goBack() {
    picker?.destroy();
    picker = null;
    state.step = Math.max(1, state.step - 1);
    updateDots();
    if (state.step === 1) renderStep1();
    if (state.step === 2) renderStep2();
    modal.sheet.scrollTop = 0;
  }

  renderStep1();
}
