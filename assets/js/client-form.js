import { openModal } from './modal.js';
import { ICONS, linkedWhatsApp } from './utils.js';

const API_LOOKUP_URL = '/api/clientes/lookup';
const API_CREATE_URL = '/api/clientes';
const LOOKUP_DEBOUNCE_MS = 400;

/* ------------------------------------------------------------
 *  Máscaras de entrada
 * ------------------------------------------------------------ */

/** Máscara de CPF: 000.000.000-00 */
function maskCPF(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

/** Máscara de celular BR: (00) 00000-0000 (ou 0000-0000 em números antigos). */
function maskPhone(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return '';
}

/**
 * Validação oficial do CPF (dígitos verificadores, módulo 11).
 * Rejeita também CPFs com todos os dígitos iguais.
 */
export function cpfValido(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const [n, pos] of [[9, 9], [10, 10]]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    if ((resto === 10 ? 0 : resto) !== Number(d[pos])) return false;
  }
  return true;
}

/* ------------------------------------------------------------
 *  Popup de cadastro do cliente (pré-reserva)
 * ------------------------------------------------------------
 *  Abre o formulário CPF/Nome/WhatsApp/E-mail. Com o CPF completo,
 *  busca o cadastro na API e, se existir, preenche o restante dos
 *  campos sozinho. Ao confirmar, grava o cliente (origem fixa =
 *  nome do site, definida no servidor) e chama onDone() para o
 *  site seguir para o WhatsApp.
 *
 *  @param {{ onDone?: () => void }} opts
 */
export function openClientForm({ onDone } = {}) {
  const html = `
    <div class="client-form">
      <header class="client-form-head">
        <h3 class="client-form-title">Quase lá! Confirme seus dados</h3>
        <p class="client-form-sub">Cadastro rápido para finalizar sua pré-reserva.</p>
      </header>

      <form id="clientForm" novalidate>
        <div class="form-group">
          <label for="cfCpf">CPF <span class="required">*</span></label>
          <input type="text" id="cfCpf" name="cpf" inputmode="numeric" autocomplete="off"
                 placeholder="000.000.000-00" required maxlength="14" />
          <p class="client-form-status" data-role="status" aria-live="polite"></p>
        </div>

        <div class="form-group">
          <label for="cfNome">Nome completo <span class="required">*</span></label>
          <input type="text" id="cfNome" name="nome" autocomplete="name"
                 placeholder="Seu nome" required maxlength="200" />
        </div>

        <div class="form-group">
          <label for="cfWhatsapp">WhatsApp <span class="required">*</span></label>
          <input type="tel" id="cfWhatsapp" name="whatsapp" inputmode="numeric" autocomplete="off"
                 placeholder="(00) 00000-0000" required maxlength="15" />
        </div>

        <div class="form-group">
          <label for="cfEmail">E-mail <small>(opcional)</small></label>
          <input type="email" id="cfEmail" name="email" autocomplete="email"
                 placeholder="voce@exemplo.com" maxlength="200" />
        </div>

        <p class="client-form-error" data-role="error" role="alert" hidden></p>

        <button type="submit" class="btn btn-primary btn-lg client-form-submit" data-role="submit">
          Confirmar e continuar no WhatsApp
        </button>
      </form>
    </div>`;

  const modal = openModal(html);
  const form = modal.body.querySelector('#clientForm');
  const cpfInput = modal.body.querySelector('#cfCpf');
  const nomeInput = modal.body.querySelector('#cfNome');
  const waInput = modal.body.querySelector('#cfWhatsapp');
  const emailInput = modal.body.querySelector('#cfEmail');
  const statusEl = modal.body.querySelector('[data-role="status"]');
  const errorEl = modal.body.querySelector('[data-role="error"]');
  const submitBtn = modal.body.querySelector('[data-role="submit"]');

  let foundCliente = null;
  let lookupTimer = null;
  let lookupSeq = 0;

  /* ---------- máscaras ---------- */
  cpfInput.addEventListener('input', () => {
    cpfInput.value = maskCPF(cpfInput.value);
    scheduleLookup();
  });
  waInput.addEventListener('input', () => {
    waInput.value = maskPhone(waInput.value);
  });

  /* ---------- busca automática por CPF ---------- */
  function scheduleLookup() {
    // CPF mudou/apagado após um preenchimento automático: limpa os
    // campos para não ficar dados de outra pessoa na tela.
    if (foundCliente) {
      nomeInput.value = '';
      waInput.value = '';
      emailInput.value = '';
    }
    foundCliente = null;
    statusEl.textContent = '';
    statusEl.classList.remove('is-found', 'is-error');
    clearTimeout(lookupTimer);
    const digits = cpfInput.value.replace(/\D/g, '');
    if (digits.length !== 11) return;
    if (!cpfValido(digits)) {
      statusEl.textContent = 'CPF inválido. Confira os números digitados.';
      statusEl.classList.add('is-error');
      return;
    }
    lookupTimer = setTimeout(lookupByCPF, LOOKUP_DEBOUNCE_MS);
  }

  async function lookupByCPF() {
    const seq = ++lookupSeq;
    const cpf = cpfInput.value.replace(/\D/g, '');
    const empresa = linkedWhatsApp();
    if (cpf.length !== 11 || !empresa || typeof fetch === 'undefined') return;

    statusEl.textContent = 'Buscando cadastro...';
    try {
      const res = await fetch(`${API_LOOKUP_URL}?cpf=${cpf}&whatsapp=${empresa}`);
      if (seq !== lookupSeq) return; // CPF mudou enquanto buscava
      if (res.status === 404) {
        statusEl.textContent = 'Primeira vez por aqui? Complete os campos abaixo.';
        statusEl.classList.remove('is-found');
        return;
      }
      if (!res.ok) {
        statusEl.textContent = '';
        return;
      }
      const cliente = await res.json();
      if (seq !== lookupSeq) return;
      foundCliente = cliente;
      nomeInput.value = cliente.nome ?? '';
      waInput.value = maskPhone(cliente.whatsapp ?? '');
      emailInput.value = cliente.email ?? '';
      statusEl.textContent = 'Cadastro encontrado! Campos preenchidos automaticamente.';
      statusEl.classList.add('is-found');
    } catch {
      if (seq === lookupSeq) statusEl.textContent = '';
    }
  }

  /* ---------- validação ---------- */
  function validate() {
    const cpf = cpfInput.value.replace(/\D/g, '');
    if (!cpfValido(cpf)) return 'Informe um CPF válido.';
    if (!nomeInput.value.trim()) return 'Informe seu nome completo.';
    const wa = waInput.value.replace(/\D/g, '');
    if (wa.length < 10) return 'Informe um WhatsApp válido com DDD.';
    const email = emailInput.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Informe um e-mail válido ou deixe em branco.';
    return null;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  /* ---------- envio do cadastro ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const error = validate();
    if (error) {
      showError(error);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Confirmando...';

    let clienteData = null;
    try {
      const res = await fetch(API_CREATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cpfInput.value,
          nome: nomeInput.value.trim(),
          whatsapp: waInput.value,
          email: emailInput.value.trim(),
          empresa: linkedWhatsApp(),
        }),
      });

      if (res.status >= 400 && res.status < 500) {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? 'Não foi possível confirmar o cadastro. Verifique os campos.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar e continuar no WhatsApp';
        return;
      }
      if (!res.ok) throw new Error('api indisponível');
      // Dados do cliente (id) vão para o onDone: quem chama pode
      // vincular a pré-reserva a esse cadastro.
      clienteData = await res.json().catch(() => null);
    } catch {
      // API fora do ar: não travar a reserva — segue para o WhatsApp.
    }

    modal.close();
    onDone?.(clienteData);
  });

  cpfInput.focus({ preventScroll: true });
}
