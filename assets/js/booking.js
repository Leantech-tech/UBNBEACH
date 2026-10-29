import { openModal } from './modal.js';
import { openClientForm } from './client-form.js';
import { DateRangePicker } from './calendar.js';
import { showToast } from './toast.js';
import { SITE_CONFIG } from './config.js';
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
  normalizeWhatsAppNumber,
} from './utils.js';

const isoDate = (date) =>
  date.getFullYear() + '-' +
  String(date.getMonth() + 1).padStart(2, '0') + '-' +
  String(date.getDate()).padStart(2, '0');

const isUUID = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? ''));

const escapeHTML = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function dateFromISO(value) {
  const parts = String(value ?? '').split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function quoteRows(quote) {
  if (!quote) {
    return '<div class="bk-total"><dt>Total estimado</dt><dd>Sob consulta</dd></div>';
  }

  const rows = [];
  const packages = Array.isArray(quote.packages) ? quote.packages : [];
  packages.forEach((item) => {
    const start = dateFromISO(item.start);
    const end = dateFromISO(item.end);
    const range = item.start && item.end
      ? ' (' + (start ? formatDate(start) : escapeHTML(item.start)) +
        ' a ' + (end ? formatDate(end) : escapeHTML(item.end)) + ')'
      : '';
    const value = Number(item.price);
    rows.push(
      '<div><dt>' + escapeHTML('Pacote ' + (item.name || 'especial') + range) +
      '</dt><dd>' + (Number.isFinite(value) ? formatBRL(value) : 'Sob consulta') + '</dd></div>'
    );
  });

  const regularNights = Math.max(0, Number(quote.regularNights) || 0);
  const dailySubtotal = Number(quote.dailySubtotal);
  if (regularNights > 0) {
    rows.push(
      '<div><dt>' + escapeHTML('Diárias fora dos pacotes (' + plural(regularNights, 'noite', 'noites') + ')') +
      '</dt><dd>' + (Number.isFinite(dailySubtotal) && dailySubtotal > 0 ? formatBRL(dailySubtotal) : 'Sob consulta') + '</dd></div>'
    );
  }

  const cleaning = Number(quote.cleaningFee);
  if (Number.isFinite(cleaning) && cleaning > 0) {
    rows.push('<div><dt>Taxa de limpeza</dt><dd>' + formatBRL(cleaning) + '</dd></div>');
  }

  const hasTotal = quote.total !== null && quote.total !== undefined && Number.isFinite(Number(quote.total));
  rows.push(
    '<div class="bk-total"><dt>Total estimado</dt><dd>' +
    (hasTotal ? formatBRL(Number(quote.total)) : 'Sob consulta') +
    '</dd></div>'
  );
  return rows.join('');
}

function quoteCard(quote) {
  if (!quote) return '';
  return '<div class="bk-quote">' +
    '<p class="bk-quote-title">Estimativa para o período selecionado</p>' +
    '<dl class="bk-quote-lines">' + quoteRows(quote) + '</dl>' +
    '</div>';
}

function localQuote(apartment, nights, minStay) {
  const price = bookingPrice(apartment, nights);
  const daily = Number(apartment.dailyPrice) || 0;
  const cleaning = Number(apartment.cleaningFee) || 0;
  return {
    nights,
    minStay,
    regularNights: daily > 0 ? nights : 0,
    dailySubtotal: price ? price.daily * nights : 0,
    packages: [],
    cleaningFee: price ? price.cleaning : cleaning,
    total: price ? price.total : null,
  };
}

export function openBooking(apartment) {
  const empresaDigits = String(apartment.empresaWhatsapp ?? '').replace(/\D/g, '');
  const ownerNumber = normalizeWhatsAppNumber(apartment.empresaWhatsapp) || SITE_CONFIG.whatsappNumber;
  const realProperty = isUUID(apartment.id);
  const fallbackMinStay = Math.max(1, Number(apartment.minStay) || 1);

  const state = {
    step: 1,
    checkIn: null,
    checkOut: null,
    guests: Math.min(2, apartment.capacity),
    minStay: fallbackMinStay,
    occupied: [],
    quote: null,
    quoteStatus: 'idle',
    quoteError: '',
    registered: false,
    anonymous: false,
    clientChoicePrompted: false,
    priceConfirmationRequired: false,
    reservaSaving: false,
  };

  let availabilityStatus = realProperty ? 'loading' : 'ready';
  let picker = null;
  let reservaId = null;
  let clientName = null;
  let clienteSalvo = null;
  let periodoRecusado = false;
  let quoteRequestId = 0;
  let reservationSavePromise = null;

  const html =
    '<div class="booking">' +
      '<header class="bk-head">' +
        '<p class="bk-eyebrow">Reserva · ' + escapeHTML(apartment.name) + '</p>' +
        '<ol class="bk-steps">' +
          '<li class="bk-step is-active" data-step-dot="1"><i>1</i><span>Período</span></li>' +
          '<li class="bk-step" data-step-dot="2"><i>2</i><span>Pessoas</span></li>' +
          '<li class="bk-step" data-step-dot="3"><i>3</i><span>Resumo</span></li>' +
        '</ol>' +
      '</header>' +
      '<div class="bk-body" data-role="body"></div>' +
      '<footer class="bk-foot" data-role="foot"></footer>' +
    '</div>';

  const modal = openModal(html, { variant: 'modal-booking' });
  const body = modal.body.querySelector('[data-role="body"]');
  const foot = modal.body.querySelector('[data-role="foot"]');

  function companyQuery() {
    const number = linkedWhatsApp() || empresaDigits;
    return number ? '&whatsapp=' + encodeURIComponent(number) : '';
  }

  function currentQuote() {
    if (state.quote) return state.quote;
    if (!state.checkIn || !state.checkOut) return null;
    return localQuote(apartment, nightsBetween(state.checkIn, state.checkOut), state.minStay);
  }

  function updateMinStayText() {
    const el = body.querySelector('[data-role="minstay"]');
    if (el) {
      el.innerHTML = 'A estadia mínima deste imóvel é de <strong>' +
        escapeHTML(plural(state.minStay, 'noite', 'noites')) + '</strong>.';
    }
  }

  function updateSelection() {
    const el = body.querySelector('[data-role="selection"]');
    if (!el) return;
    updateMinStayText();

    if (!state.checkIn) {
      el.textContent = '';
      el.classList.remove('has-value');
      return;
    }

    let html =
      '<p><strong>Entrada:</strong> ' + formatDate(state.checkIn) +
      (state.checkOut
        ? ' &nbsp;·&nbsp; <strong>Saída:</strong> ' + formatDate(state.checkOut) +
          ' &nbsp;·&nbsp; <strong>' + plural(nightsBetween(state.checkIn, state.checkOut), 'noite', 'noites') + '</strong>'
        : ' — agora escolha a saída') + '</p>';

    if (!state.checkOut) {
      const earliest = new Date(state.checkIn);
      earliest.setDate(earliest.getDate() + state.minStay);
      html += '<p class="bk-selection-min">Para cumprir o mínimo de ' +
        escapeHTML(plural(state.minStay, 'noite', 'noites')) +
        ', escolha a saída em ' + formatDate(earliest) + ' ou depois.</p>';
    } else {
      const nights = nightsBetween(state.checkIn, state.checkOut);
      if (nights < state.minStay) {
        const earliest = new Date(state.checkIn);
        earliest.setDate(earliest.getDate() + state.minStay);
        html += '<p class="bk-selection-min is-error">O período mínimo é de ' +
          escapeHTML(plural(state.minStay, 'noite', 'noites')) +
          '. Escolha a saída em ' + formatDate(earliest) + ' ou depois.</p>';
      } else {
        html += '<p class="bk-selection-min">Período mínimo: ' +
          escapeHTML(plural(state.minStay, 'noite', 'noites')) + '.</p>';
        if (state.quoteStatus === 'loading') {
          html += '<p class="bk-quote-status" role="status">Consultando diárias e pacotes...</p>';
        } else if (state.quoteStatus === 'error') {
          html += '<p class="bk-quote-status is-error" role="alert">' +
            escapeHTML(state.quoteError || 'Não foi possível calcular o valor deste período.') +
            '</p><button type="button" class="btn btn-outline btn-sm" data-role="retry-quote">Consultar novamente</button>';
        } else if (state.quoteStatus === 'ready') {
          html += quoteCard(currentQuote());
        }
      }
    }

    el.innerHTML = html;
    el.classList.add('has-value');
    el.querySelector('[data-role="retry-quote"]')?.addEventListener('click', () => {
      if (state.checkIn && state.checkOut) void requestQuote(state.checkIn, state.checkOut);
    });
  }

  function renderStep1() {
    picker?.destroy();
    picker = null;

    let calendarContent = '';
    if (availabilityStatus === 'loading') {
      calendarContent = '<p class="bk-availability-state" role="status">Consultando as datas reservadas...</p>';
    } else if (availabilityStatus === 'error') {
      calendarContent =
        '<div class="bk-availability-error" role="alert">' +
          '<p>Não foi possível carregar a disponibilidade agora. Tente novamente para escolher as datas com segurança.</p>' +
          '<button type="button" class="btn btn-outline btn-sm" data-role="retry-availability">Tentar novamente</button>' +
        '</div>';
    }

    body.innerHTML =
      '<div class="bk-step-body">' +
        '<h3 class="bk-title">Quando você pretende ficar?</h3>' +
        '<p class="bk-hint">Toque na <strong>data de entrada</strong> e depois na <strong>data de saída</strong>.</p>' +
        '<p class="bk-minstay" data-role="minstay"></p>' +
        '<div data-role="calendar">' + calendarContent + '</div>' +
        (availabilityStatus === 'ready'
          ? '<p class="bk-calendar-legend"><span class="bk-legend-date" aria-hidden="true">15</span><span>Data reservada</span></p>'
          : '') +
        '<div class="bk-selection" data-role="selection" aria-live="polite"></div>' +
      '</div>';

    if (availabilityStatus === 'ready') {
      picker = new DateRangePicker(body.querySelector('[data-role="calendar"]'), {
        occupied: state.occupied,
        onInvalid: (reason) => {
          if (reason === 'booked') showToast('Essa data já está reservada.');
          if (reason === 'crosses') showToast('Escolha um período sem atravessar datas reservadas.');
        },
        onChange: (start, end) => handleDateChange(start, end),
      });
    } else {
      body.querySelector('[data-role="retry-availability"]')?.addEventListener('click', () => {
        void loadAvailability();
      });
    }

    updateSelection();
    renderFoot();
  }

  function handleDateChange(start, end) {
    state.checkIn = start;
    state.checkOut = end;
    state.quote = null;
    state.quoteError = '';
    state.quoteStatus = 'idle';
    state.priceConfirmationRequired = false;
    periodoRecusado = false;
    quoteRequestId++;

    if (start && end && nightsBetween(start, end) >= state.minStay) {
      if (realProperty) {
        void requestQuote(start, end);
      } else {
        state.quote = localQuote(apartment, nightsBetween(start, end), state.minStay);
        state.quoteStatus = 'ready';
      }
    }

    updateSelection();
    renderFoot();
  }

  async function loadAvailability() {
    if (!realProperty) {
      availabilityStatus = 'ready';
      return true;
    }

    availabilityStatus = 'loading';
    if (state.step === 1) renderStep1();

    try {
      const response = await fetch(
        '/api/imoveis/' + encodeURIComponent(apartment.id) +
        '/disponibilidade?' + companyQuery().replace(/^&/, ''),
        { cache: 'no-store' }
      );
      if (!response.ok) throw new Error('availability unavailable');
      const data = await response.json();
      if (!data || !Array.isArray(data.occupied)) throw new Error('invalid availability');

      state.minStay = Math.max(1, Number(data.minStay) || fallbackMinStay);
      state.occupied = data.occupied;
      availabilityStatus = 'ready';
      if (state.step === 1) renderStep1();
      return true;
    } catch {
      availabilityStatus = 'error';
      if (state.step === 1) renderStep1();
      return false;
    }
  }

  async function requestQuote(start, end) {
    const requestId = ++quoteRequestId;
    const key = isoDate(start) + '|' + isoDate(end);
    state.quote = null;
    state.quoteError = '';
    state.quoteStatus = 'loading';
    updateSelection();
    renderFoot();

    try {
      const query =
        '?entrada=' + encodeURIComponent(isoDate(start)) +
        '&saida=' + encodeURIComponent(isoDate(end)) +
        companyQuery();
      const response = await fetch(
        '/api/imoveis/' + encodeURIComponent(apartment.id) + '/cotacao' + query,
        { cache: 'no-store' }
      );
      const data = await response.json().catch(() => null);
      if (
        requestId !== quoteRequestId ||
        !state.checkIn ||
        !state.checkOut ||
        isoDate(state.checkIn) + '|' + isoDate(state.checkOut) !== key
      ) return;

      if (response.status === 409 && data?.conflict) {
        showToast('Esse período já foi reservado. Escolha outras datas.', { duration: 4000 });
        returnToDates();
        return;
      }
      if (response.status === 422) {
        state.minStay = Math.max(1, Number(data?.minStay) || state.minStay);
        state.quoteStatus = 'error';
        state.quoteError = data?.error || 'O período é menor que a estadia mínima.';
        updateSelection();
        renderFoot();
        return;
      }
      if (!response.ok || !data) throw new Error('quote unavailable');

      state.minStay = Math.max(1, Number(data.minStay) || state.minStay);
      state.quote = data;
      state.quoteStatus = 'ready';
      updateSelection();
      renderFoot();
    } catch {
      if (requestId !== quoteRequestId) return;
      state.quoteStatus = 'error';
      state.quoteError = 'Não foi possível calcular as diárias e os pacotes. Tente novamente.';
      updateSelection();
      renderFoot();
    }
  }

  function renderStep2() {
    body.innerHTML =
      '<div class="bk-step-body">' +
        '<h3 class="bk-title">Quantas pessoas vão se hospedar?</h3>' +
        '<p class="bk-hint">O ' + escapeHTML(apartment.name) + ' acomoda até <strong>' +
          escapeHTML(formatGuests(apartment.capacity)) + '</strong>.</p>' +
        '<div class="stepper" data-role="stepper">' +
          '<button type="button" data-step="minus" aria-label="Diminuir quantidade de pessoas">' + ICONS.minus + '</button>' +
          '<output data-role="guests" aria-live="polite">' + state.guests + '</output>' +
          '<button type="button" data-step="plus" aria-label="Aumentar quantidade de pessoas">' + ICONS.plus + '</button>' +
        '</div>' +
        '<p class="bk-hint bk-hint-small">Inclua adultos e crianças.</p>' +
      '</div>';

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

  function summaryNote() {
    if (state.priceConfirmationRequired) {
      return 'O valor foi atualizado. Confira o novo total e confirme para continuar.';
    }
    if (state.registered) {
      return 'Cadastro confirmado. Clique para enviar sua solicitação ao proprietário.';
    }
    if (state.anonymous) {
      return 'Você seguirá sem cadastro; os dados do período e do valor serão enviados pelo WhatsApp.';
    }
    return 'Escolha se deseja se cadastrar ou continuar sem cadastro.';
  }

  function buttonLabel() {
    if (state.reservaSaving) return 'Confirmando valor...';
    if (state.priceConfirmationRequired) return 'Confirmar novo total e continuar';
    if (state.anonymous) return 'Enviar pedido pelo WhatsApp';
    if (state.registered) return 'Finalizar reserva';
    return 'Escolher como continuar';
  }

  function updateBookingButton() {
    const button = body.querySelector('[data-role="wa"]');
    if (!button) return;
    button.innerHTML = ICONS.whatsapp + ' ' + buttonLabel();
    button.disabled = state.reservaSaving;
    const note = body.querySelector('[data-role="wa-note"]');
    if (note) note.textContent = summaryNote();
  }

  function renderStep3({ promptChoice = true } = {}) {
    const nights = nightsBetween(state.checkIn, state.checkOut);
    const quote = currentQuote();

    body.innerHTML =
      '<div class="bk-step-body">' +
        '<h3 class="bk-title">Confira as informações</h3>' +
        '<dl class="bk-summary">' +
          '<div><dt>Imóvel</dt><dd>' + escapeHTML(apartment.name) + '</dd></div>' +
          '<div><dt>Entrada</dt><dd>' + formatDate(state.checkIn) + '</dd></div>' +
          '<div><dt>Saída</dt><dd>' + formatDate(state.checkOut) + '</dd></div>' +
          '<div><dt>Permanência</dt><dd>' + escapeHTML(plural(nights, 'noite', 'noites')) + '</dd></div>' +
          quoteRows(quote) +
          '<div><dt>Pessoas</dt><dd>' + escapeHTML(formatGuests(state.guests)) + '</dd></div>' +
        '</dl>' +
        '<button type="button" class="btn btn-primary btn-lg bk-wa" data-role="wa"></button>' +
        '<button type="button" class="btn btn-text bk-cancel" data-role="cancel">Cancelar reserva</button>' +
        '<p class="bk-hint bk-hint-small bk-wa-note" data-role="wa-note"></p>' +
      '</div>';

    body.querySelector('[data-role="wa"]')?.addEventListener('click', handleBookingContinue);
    body.querySelector('[data-role="cancel"]')?.addEventListener('click', async () => {
      await cancelCurrentReservation();
      modal.close();
      showToast('Sua solicitação foi cancelada!');
    });

    if (
      promptChoice &&
      !state.registered &&
      !state.anonymous &&
      !state.clientChoicePrompted
    ) {
      state.clientChoicePrompted = true;
      openClientChoiceOnce();
    } else if (
      state.registered &&
      clienteSalvo &&
      !reservaId &&
      !state.priceConfirmationRequired
    ) {
      void salvarPreReserva(clienteSalvo);
    }

    updateBookingButton();
    renderFoot();
  }

  function openClientChoiceOnce() {
    if (document.querySelector('.client-choice')) return;
    const choice = openModal(
      '<section class="client-choice">' +
        '<h3 class="client-choice-title">Como você prefere continuar?</h3>' +
        '<p>Com cadastro, podemos registrar uma pré-reserva. Sem cadastro, enviaremos seu período e o valor ao proprietário pelo WhatsApp.</p>' +
        '<button type="button" class="btn btn-primary" data-choice="register">Cadastrar meus dados</button>' +
        '<button type="button" class="btn btn-outline" data-choice="anonymous">Seguir sem cadastro</button>' +
      '</section>',
      { variant: 'modal-client-choice' }
    );

    choice.body.querySelector('[data-choice="register"]')?.addEventListener('click', () => {
      choice.close();
      window.setTimeout(openClientFormOnce, 300);
    });
    choice.body.querySelector('[data-choice="anonymous"]')?.addEventListener('click', () => {
      state.anonymous = true;
      choice.close();
      updateBookingButton();
    });
  }

  function openClientFormOnce() {
    if (document.querySelector('.client-form')) return;
    openClientForm({
      empresa: linkedWhatsApp() || empresaDigits || null,
      onDone: (cliente) => {
        state.registered = true;
        state.anonymous = false;
        clienteSalvo = cliente;
        clientName = cliente?.nome?.trim() || null;
        void salvarPreReserva(cliente).then(updateBookingButton);
      },
    });
  }

  async function handleBookingContinue() {
    if (!state.registered && !state.anonymous) {
      openClientChoiceOnce();
      return;
    }

    if (state.priceConfirmationRequired && clienteSalvo) {
      state.priceConfirmationRequired = false;
      updateBookingButton();
      const saved = await salvarPreReserva(clienteSalvo);
      if (!saved || state.priceConfirmationRequired) return;
    } else if (reservationSavePromise) {
      const saved = await reservationSavePromise;
      if (!saved || state.priceConfirmationRequired) return;
    }

    if (state.step !== 3) return;
    if (!state.anonymous && !reservaId && periodoRecusado) {
      showToast('Esse período já está reservado. Escolha outras datas.', { duration: 4000 });
      return;
    }

    showToast('Abrindo o WhatsApp do proprietário para concluir sua solicitação.', { duration: 2600 });
    setTimeout(() => {
      const link = buildWhatsAppLink(
        buildBookingMessage(
          apartment,
          state.checkIn,
          state.checkOut,
          state.guests,
          clientName,
          currentQuote(),
          state.anonymous
        ),
        ownerNumber
      );
      const win = window.open(link, '_blank');
      if (!win) window.location.href = link;
    }, 1200);
  }

  async function salvarPreReserva(cliente) {
    if (!cliente?.id || !realProperty || !state.checkIn || !state.checkOut) return true;
    if (reservationSavePromise) return reservationSavePromise;

    state.reservaSaving = true;
    updateBookingButton();

    const work = (async () => {
      const nights = nightsBetween(state.checkIn, state.checkOut);
      const quote = currentQuote();
      const regularNights = Math.max(0, Number(quote?.regularNights) || 0);
      const dailySubtotal = Number(quote?.dailySubtotal) || 0;
      const daily = regularNights > 0 ? dailySubtotal / regularNights : 0;
      const cleaning = Number(quote?.cleaningFee) || 0;
      const total = quote?.total !== null && quote?.total !== undefined
        ? Number(quote.total) || 0
        : 0;

      const obsParts = [
        'Pré-reserva feita pelo site.',
        formatGuests(state.guests) + ' · ' + plural(nights, 'noite', 'noites') + '.',
      ];
      if (quote?.total !== null && quote?.total !== undefined) {
        obsParts.push('Total estimado: ' + formatBRL(total) + '.');
      }
      (Array.isArray(quote?.packages) ? quote.packages : []).forEach((item) => {
        obsParts.push('Pacote ' + (item.name || 'especial') + ': ' + formatBRL(Number(item.price) || 0) + '.');
      });

      try {
        const response = await fetch('/api/reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imovelId: apartment.id,
            clienteId: cliente.id,
            empresa: linkedWhatsApp() || empresaDigits || null,
            entrada: isoDate(state.checkIn),
            saida: isoDate(state.checkOut),
            hospedes: state.guests,
            valorDiaria: daily,
            taxaLimpeza: cleaning,
            valorTotal: total,
            observacoes: obsParts.join(' '),
          }),
        });
        const data = await response.json().catch(() => null);

        if (response.status === 409 && data?.priceChanged && data.quote) {
          reservaId = null;
          periodoRecusado = false;
          state.quote = data.quote;
          state.quoteStatus = 'ready';
          state.priceConfirmationRequired = true;
          showToast('O preço foi atualizado. Confira o novo total antes de continuar.', { duration: 4500 });
          if (state.step === 3) renderStep3({ promptChoice: false });
          return false;
        }

        if (response.status === 409 || data?.conflict) {
          reservaId = null;
          periodoRecusado = true;
          showToast('Esse período já está reservado. Escolha outras datas.', { duration: 4000 });
          returnToDates();
          return false;
        }
        if (!response.ok) throw new Error('reservation unavailable');

        reservaId = data?.id ?? null;
        periodoRecusado = false;
        return true;
      } catch {
        return true;
      }
    })();

    reservationSavePromise = work;
    try {
      return await work;
    } finally {
      reservationSavePromise = null;
      state.reservaSaving = false;
      updateBookingButton();
    }
  }

  async function cancelCurrentReservation() {
    if (!reservaId) return;
    const id = reservaId;
    reservaId = null;
    try {
      await fetch('/api/reservas/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, empresa: linkedWhatsApp() || empresaDigits || null }),
      });
    } catch {
      // O fluxo pode continuar pelo WhatsApp se o app estiver indisponível.
    }
  }

  function returnToDates() {
    quoteRequestId++;
    state.checkIn = null;
    state.checkOut = null;
    state.quote = null;
    state.quoteStatus = 'idle';
    state.quoteError = '';
    state.priceConfirmationRequired = false;
    state.step = 1;
    availabilityStatus = realProperty ? 'loading' : 'ready';
    updateDots();
    renderStep1();
    if (realProperty) void loadAvailability();
  }

  function renderFoot() {
    const nights = state.checkIn && state.checkOut
      ? nightsBetween(state.checkIn, state.checkOut)
      : 0;
    const canContinue =
      state.step !== 1 ||
      (
        availabilityStatus === 'ready' &&
        state.checkIn &&
        state.checkOut &&
        nights >= state.minStay &&
        state.quoteStatus === 'ready'
      );

    if (state.step === 3) {
      foot.innerHTML =
        '<button type="button" class="btn btn-text" data-role="back">' +
          ICONS.arrowLeft + ' Voltar</button><span></span>';
      foot.querySelector('[data-role="back"]').addEventListener('click', goBack);
      return;
    }

    foot.innerHTML =
      '<button type="button" class="btn btn-text" data-role="back" ' +
        (state.step === 1 ? 'disabled' : '') + '>' +
        ICONS.arrowLeft + ' Voltar</button>' +
      '<button type="button" class="btn btn-primary" data-role="next" ' +
        (canContinue ? '' : 'disabled') + '>' +
        'Continuar ' + ICONS.arrowRight + '</button>';

    foot.querySelector('[data-role="back"]').addEventListener('click', goBack);
    foot.querySelector('[data-role="next"]').addEventListener('click', goNext);
  }

  function updateDots() {
    modal.body.querySelectorAll('[data-step-dot]').forEach((dot) => {
      const step = Number(dot.dataset.stepDot);
      dot.classList.toggle('is-active', step === state.step);
      dot.classList.toggle('is-done', step < state.step);
    });
  }

  function goNext() {
    if (state.step === 1) {
      const nights = state.checkIn && state.checkOut
        ? nightsBetween(state.checkIn, state.checkOut)
        : 0;
      if (
        availabilityStatus !== 'ready' ||
        !state.checkIn ||
        !state.checkOut ||
        nights < state.minStay ||
        state.quoteStatus !== 'ready'
      ) return;
    }

    picker?.destroy();
    picker = null;
    state.step += 1;
    updateDots();
    if (state.step === 2) renderStep2();
    if (state.step === 3) renderStep3();
    modal.sheet.scrollTop = 0;
  }

  async function goBack() {
    picker?.destroy();
    picker = null;

    if (state.step === 2 && realProperty) {
      if (reservationSavePromise) await reservationSavePromise;
      await cancelCurrentReservation();
      availabilityStatus = 'loading';
    }

    state.step = Math.max(1, state.step - 1);
    updateDots();
    if (state.step === 1) {
      renderStep1();
      if (realProperty) void loadAvailability();
    }
    if (state.step === 2) renderStep2();
    modal.sheet.scrollTop = 0;
  }

  renderStep1();
  if (realProperty) void loadAvailability();
}