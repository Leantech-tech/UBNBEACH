/**
 * ============================================================
 *  TOAST — mensagem flutuante na tela
 * ------------------------------------------------------------
 *  Exibe um aviso rápido na parte inferior da tela, sem interromper
 *  o que o usuário está fazendo. Vários toasts empilham em sequência.
 *
 *  @param {string} message Texto da mensagem.
 *  @param {{ duration?: number }} [opts] Tempo visível em ms (padrão 2600).
 * ============================================================
 */
export function showToast(message, { duration = 2600 } = {}) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }

  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  wrap.appendChild(el);

  requestAnimationFrame(() => el.classList.add('is-show'));
  setTimeout(() => {
    el.classList.remove('is-show');
    setTimeout(() => el.remove(), 350);
  }, duration);
}
