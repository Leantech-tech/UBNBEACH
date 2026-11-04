/**
 * Gerenciador genérico de modais.
 * Abre um overlay com um painel (sheet) e devolve uma API de controle.
 *
 * @param {string} html Conteúdo injetado no painel.
 * @param {{ variant?: string, labelledBy?: string, onBeforeClose?: () => void, onClose?: () => void }} opts
 * @returns {{ sheet: HTMLElement, body: HTMLElement, close: () => void }}
 */
export function openModal(html, { variant = '', onBeforeClose, onClose } = {}) {
  const root = document.getElementById('modal-root');
  if (!root) throw new Error('#modal-root não encontrado no HTML.');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-sheet ${variant}" role="dialog" aria-modal="true">
      <button type="button" class="modal-close" aria-label="Fechar janela">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>
      </button>
      <div class="modal-body"></div>
    </div>`;

  const sheet = overlay.querySelector('.modal-sheet');
  const body = overlay.querySelector('.modal-body');
  body.innerHTML = html;
  root.appendChild(overlay);
  document.body.classList.add('no-scroll');

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    onBeforeClose?.();
    overlay.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      overlay.remove();
      if (!document.querySelector('.modal-overlay')) {
        document.body.classList.remove('no-scroll');
      }
      onClose?.();
    }, 280);
  };

  const onKey = (e) => {
    if (e.key === 'Escape' && overlay === root.querySelector('.modal-overlay:last-child')) close();
  };
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.modal-close').addEventListener('click', close);

  // Foca o primeiro controle focável para acessibilidade
  requestAnimationFrame(() => {
    overlay.classList.add('is-open');
    const focusable = body.querySelector('button:not(:disabled), [href], [tabindex]');
    if (focusable) focusable.focus({ preventScroll: true });
  });

  return { sheet, body, close };
}
