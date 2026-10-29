import { formatMonth, isSameDay, stripTime, addMonths } from './utils.js';

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const isoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Seletor de período (entrada → saída).
 * Exibe 1 mês por vez com seleção rápida de mês/ano.
 */
export class DateRangePicker {
  /**
   * @param {HTMLElement} mount
   * @param {{ onChange?: (start: Date|null, end: Date|null) => void,
   *           onInvalid?: (reason: string) => void,
   *           occupied?: {start: string, end: string}[] }} opts
   */
  constructor(mount, { onChange, onInvalid, occupied = [] } = {}) {
    this.mount = mount;
    this.onChange = onChange;
    this.onInvalid = onInvalid;
    this.occupied = occupied.filter((period) =>
      /^\d{4}-\d{2}-\d{2}$/.test(period.start) && /^\d{4}-\d{2}-\d{2}$/.test(period.end)
    );
    this.start = null;
    this.end = null;

    const today = stripTime(new Date());
    this.today = today;
    this.view = new Date(today.getFullYear(), today.getMonth(), 1);

    this.render();
  }

  destroy() {}

  _isBooked(date) {
    const key = isoDate(date);
    return this.occupied.some(({ start, end }) => key >= start && key < end);
  }

  _crossesBooked(start, end) {
    const from = isoDate(start);
    const until = isoDate(end);
    return this.occupied.some((period) => from < period.end && until > period.start);
  }

  get nights() {
    if (!this.start || !this.end) return 0;
    return Math.round((this.end - this.start) / 86400000);
  }

  _canGoPrev() {
    return this.view > new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  }

  render() {
    // Gerar opções para os próximos 24 meses
    const options = [];
    const baseMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    for (let i = 0; i < 24; i++) {
      const mDate = addMonths(baseMonth, i);
      const val = `${mDate.getFullYear()}-${mDate.getMonth()}`;
      const isSel =
        mDate.getFullYear() === this.view.getFullYear() &&
        mDate.getMonth() === this.view.getMonth();
      options.push(
        `<option value="${val}" ${isSel ? 'selected' : ''}>${formatMonth(mDate)}</option>`
      );
    }

    this.mount.innerHTML = `
      <div class="cal">
        <div class="cal-header">
          <div class="cal-select-wrap">
            <select class="cal-select" data-cal="month-select" aria-label="Escolher mês e ano">
              ${options.join('')}
            </select>
            <svg class="cal-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <div class="cal-nav">
            <button type="button" class="cal-nav-btn" data-cal="prev" aria-label="Mês anterior"
              ${this._canGoPrev() ? '' : 'disabled'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <button type="button" class="cal-nav-btn" data-cal="next" aria-label="Próximo mês">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
        <div class="cal-months">
          ${this._renderMonth(this.view)}
        </div>
      </div>`;

    this.mount.querySelector('[data-cal="month-select"]')?.addEventListener('change', (e) => {
      const [y, m] = e.target.value.split('-').map(Number);
      this.view = new Date(y, m, 1);
      this.render();
    });

    this.mount.querySelector('[data-cal="prev"]')?.addEventListener('click', () => {
      this.view = addMonths(this.view, -1);
      this.render();
    });

    this.mount.querySelector('[data-cal="next"]')?.addEventListener('click', () => {
      this.view = addMonths(this.view, 1);
      this.render();
    });

    this.mount.querySelectorAll('button.cal-day:not(:disabled)').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [y, m, d] = btn.dataset.date.split('-').map(Number);
        this._select(new Date(y, m - 1, d));
      });
    });
  }

  _renderMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = '';
    for (let i = 0; i < firstWeekday; i++) cells += '<span class="cal-day is-empty" aria-hidden="true"></span>';

    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(year, month, d);
      const isPast = current < this.today;
      const booked = this._isBooked(current);
      const validCheckout = booked && this.start && !this.end && current > this.start &&
        !this._crossesBooked(this.start, current);
      const unavailable = booked && !validCheckout;
      const cls = ['cal-day'];
      if (isPast) cls.push('is-past');
      if (booked) cls.push('is-booked');
      if (isSameDay(current, this.today)) cls.push('is-today');
      if (this.start && isSameDay(current, this.start)) cls.push('is-start');
      if (this.end && isSameDay(current, this.end)) cls.push('is-end');
      if (this.start && this.end && current > this.start && current < this.end) cls.push('is-range');

      const label =
        (this.start && isSameDay(current, this.start) ? 'Entrada: ' : '') +
        (this.end && isSameDay(current, this.end) ? 'Saída: ' : '') +
        current.toLocaleDateString('pt-BR') +
        (booked ? (validCheckout ? ', reservada para entrada, disponível como saída' : ', reservada') : '');

      cells += `
        <button type="button"
          class="${cls.join(' ')}"
          data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}"
          ${isPast || unavailable ? 'disabled' : ''}
          aria-label="${label}">
          <span>${d}</span>
        </button>`;
    }

    return `
      <div class="cal-month">
        <div class="cal-week" aria-hidden="true">
          ${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}
        </div>
        <div class="cal-grid">${cells}</div>
      </div>`;
  }

  _select(date) {
    if (!this.start || (this.start && this.end)) {
      if (this._isBooked(date)) return this.onInvalid?.('booked');
      this.start = date;
      this.end = null;
    } else if (date < this.start) {
      if (this._isBooked(date)) return this.onInvalid?.('booked');
      this.start = date;
    } else if (!isSameDay(date, this.start)) {
      if (this._crossesBooked(this.start, date)) {
        if (this._isBooked(date)) return this.onInvalid?.('booked');
        this.start = date;
        this.end = null;
        this.onInvalid?.('crosses');
      } else {
        this.end = date;
      }
    }
    this.render();
    this.onChange?.(this.start, this.end);
  }
}
