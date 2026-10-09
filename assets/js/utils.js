import { SITE_CONFIG } from './config.js';

/* ============================================================
 *  ÍCONES SVG (inline, herdando `currentColor`)
 * ============================================================ */

const svg = (paths, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  pin: svg('<path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>'),
  users: svg('<path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="8" r="3.2"/><path d="M21 19v-1a4 4 0 0 0-3-3.85"/><path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.7"/>'),
  bedroom: svg('<path d="M4 18V9"/><path d="M4 13h16v5"/><path d="M4 16h16"/><path d="M20 13V9a2 2 0 0 0-2-2H9v6"/>'),
  bed: svg('<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18"/><path d="M3 21v-3"/><path d="M21 21v-3"/><path d="M7 10V8a2 2 0 0 1 2-2h1"/>'),
  bath: svg('<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2z"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M7 19l-1 2"/><path d="M17 19l1 2"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  arrowRight: svg('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  arrowLeft: svg('<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>'),
  close: svg('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  calendar: svg('<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10.5h16"/>'),
  minus: svg('<path d="M6 12h12"/>'),
  plus: svg('<path d="M12 6v12"/><path d="M6 12h12"/>'),
  building: svg('<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2"/><path d="M13 7h2"/><path d="M9 11h2"/><path d="M13 11h2"/><path d="M9 15h2"/><path d="M13 15h2"/><path d="M11 21v-3h2v3"/>'),
  area: svg('<path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M20 15v4a1 1 0 0 1-1 1h-4"/><path d="M4 4l7 7"/><path d="M20 20l-7-7"/>'),
  tag: svg('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.6"/>'),
  whatsapp:
    `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  /* Comodidades */
  wifi: svg('<path d="M2.5 9a15 15 0 0 1 19 0"/><path d="M5.5 12.5a10.5 10.5 0 0 1 13 0"/><path d="M8.6 16a6 6 0 0 1 6.8 0"/><circle cx="12" cy="19.4" r="1.1" fill="currentColor" stroke="none"/>'),
  snow: svg('<path d="M12 3v18"/><path d="M4.2 7.5l15.6 9"/><path d="M19.8 7.5l-15.6 9"/><path d="M9.5 4.5L12 7l2.5-2.5"/><path d="M9.5 19.5L12 17l2.5 2.5"/>'),
  kitchen: svg('<path d="M5 3v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3"/><path d="M3 3h18"/><path d="M7 12v2a5 5 0 0 0 10 0v-2"/><path d="M12 19v2"/>'),
  tv: svg('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6"/><path d="M12 17v4"/>'),
  car: svg('<path d="M5.5 15.5 6.8 10a2 2 0 0 1 2-1.5h6.4a2 2 0 0 1 2 1.5l1.3 5.5"/><rect x="4" y="15" width="16" height="5" rx="1.5"/><circle cx="8" cy="17.5" r="1"/><circle cx="16" cy="17.5" r="1"/>'),
  waves: svg('<path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>'),
  grill: svg('<path d="M7 3v4"/><path d="M12 3v4"/><path d="M17 3v4"/><path d="M5 7h14l-1.2 5a4 4 0 0 1-3.9 3H10a4 4 0 0 1-3.9-3L5 7z"/><path d="M12 15v3"/><path d="M9 21c0-1.5 1.3-3 3-3s3 1.5 3 3"/>'),
  washer: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8.5 13c1-1 2-1 3.5 0s2.5 1 3.5 0"/><path d="M8 6h.01"/><path d="M11 6h5"/>'),
  paw: svg('<circle cx="6" cy="9" r="1.6"/><circle cx="10" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="19" cy="9" r="1.6"/><path d="M12.5 11c-2.5 0-5 2.2-5 4.4 0 1.5 1.1 2.6 2.6 2.6 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.5 0 2.6-1.1 2.6-2.6 0-2.2-2.5-4.4-5-4.4z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/>'),
  shield: svg('<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/><path d="M9.5 12l1.8 1.8 3.4-3.6"/>'),
  elevator: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 3v18"/><path d="M9.5 9.5 12 7l2.5 2.5"/><path d="M9.5 14.5 12 17l2.5-2.5"/>'),
  /* Vida noturna / passeios */
  mug: svg('<path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><path d="M16 9.5h1.6a2.4 2.4 0 0 1 0 4.8H16"/><path d="M8.2 4.5c0 .9-.9 1-.9 1.9"/><path d="M12 4.5c0 .9-.9 1-.9 1.9"/>'),
  music: svg('<path d="M9 18V6.5L19 4v11.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>'),
  cocktail: svg('<path d="M4 5h16l-8 9.5L4 5z"/><path d="M12 14.5V20"/><path d="M8.5 20h7"/><path d="M15.8 3.2c1.4 1 1.9 2.4 1.4 3.9"/>'),
  ticket: svg('<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4V8.5z"/><path d="M13.5 7v2"/><path d="M13.5 11v2"/><path d="M13.5 15v2"/>'),
  bag: svg('<path d="M5.5 8h13l-1.1 11.1a2 2 0 0 1-2 1.9H8.6a2 2 0 0 1-2-1.9L5.5 8z"/><path d="M9 10.5V6.8a3 3 0 0 1 6 0v3.7"/>'),
  ferris: svg('<circle cx="12" cy="10" r="7"/><path d="M12 3v14"/><path d="M5 10h14"/><path d="M7.1 5.1l9.8 9.8"/><path d="M16.9 5.1L7.1 14.9"/><path d="M12 17l-2.8 4"/><path d="M12 17l2.8 4"/><path d="M6.5 21h11"/>'),
  moon: svg('<path d="M20 13.2A8.2 8.2 0 0 1 10.8 4 8.2 8.2 0 1 0 20 13.2z"/>'),
  flame: svg('<path d="M12 3s5 4.6 5 9.1a5 5 0 0 1-10 0c0-1.9 1-3.4 2-4.9.5 1.4 1.5 2 2.5 2.1C11.3 7 11.6 5 12 3z"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11.2V16"/><path d="M12 7.8h.01"/>'),
  compass: svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5z"/>'),
  /* Categorias de pontos de interesse */
  restaurant: svg('<path d="M7 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M9 3v18"/><path d="M17 3c-1.7 0-3 1.8-3 4v4h3v10"/><path d="M17 3v8"/>'),
  cart: svg('<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.6 11.2a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.3L20.5 8H6"/>'),
  beach: svg('<path d="M12 3a8.5 8.5 0 0 0-8.5 8.5h17A8.5 8.5 0 0 0 12 3z"/><path d="M12 3c-2.2 2.3-2.2 6.2 0 8.5"/><path d="M12 3c2.2 2.3 2.2 6.2 0 8.5"/><path d="M12 11.5 13.5 18"/><path d="M6 21c2-1.6 4-1.6 6 0s4 1.6 6 0"/>'),
  waterfall: svg('<path d="M4 4c0 4 1.6 4 1.6 8S4 16 4 20"/><path d="M9.6 4c0 4 1.6 4 1.6 8s-1.6 4-1.6 8"/><path d="M15.2 4c0 4 1.6 4 1.6 8s-1.6 4-1.6 8"/><path d="M20.8 4c0 4 1.6 4 1.6 8s-1.6 4-1.6 8" transform="translate(-4.4 0)"/>'),
  pharmacy: svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/>'),
  fuel: svg('<path d="M5 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><path d="M3.5 21h13"/><path d="M15 10h2.2a1.8 1.8 0 0 1 1.8 1.8v5.4a1.6 1.6 0 0 0 3.2 0V9.6L20 7"/><path d="M7.5 8.5h5"/>'),
  camera: svg('<path d="M4 8h3l2-2.5h6L17 8h3a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19V9.5A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13.5" r="3.4"/>'),
  store: svg('<path d="M4.5 9.5 6 4h12l1.5 5.5"/><path d="M4.5 9.5h15"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-5.5h5V20"/>'),
  phone: svg('<path d="M5 4h4l1.5 4.5L8 10a12 12 0 0 0 6 6l1.5-2.5L20 15v4a1.5 1.5 0 0 1-1.6 1.5C10.5 19.9 4.1 13.5 3.5 5.6A1.5 1.5 0 0 1 5 4z"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.5 4 5.6 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.6-4-9s1.4-6.5 4-9z"/>'),
};

/**
 * Extrai o WhatsApp da empresa vinculada do final da URL.
 * Ex.: "site.com/12997353792/" -> "12997353792"; sem vínculo -> null.
 */
export function linkedWhatsApp() {
  const segment = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
  const digits = segment.replace(/\D/g, '');
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

/**
 * Mapeia o slug/ícone de uma categoria de ponto de interesse (nomes
 * do Material Symbols gravados no banco) para o ícone SVG local.
 */
export function categoryIcon(key) {
  const t = String(key || '').toLowerCase();
  if (/praia|beach/.test(t)) return ICONS.beach;
  if (/cachoeira|waterfall|queda/.test(t)) return ICONS.waterfall;
  if (/restaurante|restaurant|food|lanche|pizzaria|hamburgueria/.test(t)) return ICONS.restaurant;
  if (/mercado|shopping_cart|supermercado|compra/.test(t)) return ICONS.cart;
  if (/farmacia|farmácia|pharmacy|drugstore/.test(t)) return ICONS.pharmacy;
  if (/hospital|clinica|clínica|saude|saúde|local_hospital/.test(t)) return ICONS.pharmacy;
  if (/posto|gas|combust/.test(t)) return ICONS.fuel;
  if (/bar|local_bar|bebida|drink/.test(t)) return ICONS.cocktail;
  if (/cafe|café|cafeteria|local_cafe/.test(t)) return ICONS.mug;
  if (/loja|store|boutique/.test(t)) return ICONS.store;
  if (/passeio|tour|trilha|atracao|atração|turismo/.test(t)) return ICONS.compass;
  if (/foto|mirante|camera|photo/.test(t)) return ICONS.camera;
  if (/noite|balada|noturno|show/.test(t)) return ICONS.moon;
  if (/parque|park|divers/.test(t)) return ICONS.ferris;
  if (/evento|teatro|cultura|arte/.test(t)) return ICONS.ticket;
  return ICONS.pin;
}

/** Mapeia o nome de uma comodidade para o ícone correspondente. */
export function amenityIcon(label) {
  const t = label.toLowerCase();
  if (/wi-?fi|internet/.test(t)) return ICONS.wifi;
  if (/ar-?condicionado|climatiz/.test(t)) return ICONS.snow;
  if (/cozinha|fog|cooktop/.test(t)) return ICONS.kitchen;
  if (/\btv\b|televis/.test(t)) return ICONS.tv;
  if (/estacion|garagem|vaga|carro/.test(t)) return ICONS.car;
  if (/piscina|piscin/.test(t)) return ICONS.waves;
  if (/churras/.test(t)) return ICONS.grill;
  if (/lavar|lava|roupa/.test(t)) return ICONS.washer;
  if (/pet|cachorro|animal/.test(t)) return ICONS.paw;
  if (/varanda|sacada|vista/.test(t)) return ICONS.sun;
  if (/portaria|seguran/.test(t)) return ICONS.shield;
  if (/elevador/.test(t)) return ICONS.elevator;
  return ICONS.check;
}

/* ============================================================
 *  FORMATAÇÃO
 * ============================================================ */

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateFmtShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

export const formatDate = (d) => dateFmt.format(d).replace('.', '');
export const formatDateShort = (d) => dateFmtShort.format(d).replace('.', '');
export const formatMonth = (d) => {
  const s = monthFmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** "4 hóspedes" / "1 hóspede" */
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const formatGuests = (n) => plural(n, 'hóspede', 'hóspedes');

/** Número de noites entre duas datas (meia-noite a meia-noite). */
export function nightsBetween(a, b) {
  return Math.round((stripTime(b) - stripTime(a)) / 86400000);
}

export function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isSameDay(a, b) {
  return (
    a instanceof Date &&
    b instanceof Date &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/* ============================================================
 *  WHATSAPP
 * ============================================================ */

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (v) => brlFmt.format(v);

/**
 * Valores da reserva: diária × noites, somando a taxa de limpeza
 * quando o imóvel tem. Retorna null quando o imóvel não tem diária
 * cadastrada (não é possível estimar o total).
 */
export function bookingPrice(apartment, nights) {
  const daily = apartment.dailyPrice || null;
  if (!daily) return null;
  const cleaning = apartment.cleaningFee || 0;
  return { daily, cleaning, total: daily * nights + cleaning };
}

/** Monta o link wa.me com a mensagem codificada. */
export function buildWhatsAppLink(message) {
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Mensagem contextualizada do fluxo de reserva. */
export function buildBookingMessage(apartment, checkIn, checkOut, guests, clientName) {
  const nights = nightsBetween(checkIn, checkOut);
  const lines = [
    `Olá! Fiz a pré reserva, pelo site, do ${apartment.name}.`,
    '',
    `📅 Período: ${formatDate(checkIn)} até ${formatDate(checkOut)}`,
    `🌙 Diárias: ${plural(nights, 'diária', 'diárias')}`,
    `👥 Hóspedes: ${plural(guests, 'pessoa', 'pessoas')}`,
  ];
  if (clientName) lines.push(`🙋 Cliente: ${clientName}`);
  const price = bookingPrice(apartment, nights);
  if (price) {
    lines.push(`💵 Valor da diária: ${formatBRL(price.daily)}`);
    if (price.cleaning) lines.push(`💸 Taxa de limpeza: ${formatBRL(price.cleaning)}`);
    lines.push(`💰 Total estimado: ${formatBRL(price.total)}`);
  }
  return lines.join('\n');
}

/* ============================================================
 *  IMAGEM RESERVA (caso alguma foto falhe ao carregar)
 * ============================================================ */

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">` +
      `<rect width="1200" height="900" fill="#E8E2D6"/>` +
      `<g fill="none" stroke="#B9AE9C" stroke-width="10" stroke-linecap="round">` +
      `<path d="M430 470c45-45 90-45 135 0s90 45 135 0 90-45 135 0"/>` +
      `<path d="M430 540c45-45 90-45 135 0s90 45 135 0 90-45 135 0"/></g>` +
      `<text x="600" y="640" font-family="Georgia, serif" font-size="40" fill="#8D8172" text-anchor="middle">Foto do apartamento</text></svg>`
  );

/** Troca a imagem por um placeholder elegante se o carregamento falhar. */
export function guardImage(img) {
  img.addEventListener('error', function onError() {
    img.removeEventListener('error', onError);
    if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
  });
}

export { FALLBACK_IMG };

/* ============================================================
 *  PLACEHOLDER DE IMAGEM (aguardando fotos reais)
 * ------------------------------------------------------------
 *  Gera um SVG em data URI com a identidade visual do site.
 *  Usado nas seções de praias, pontos turísticos e vida
 *  noturna enquanto as fotos reais não são fornecidas —
 *  basta preencher o campo `images` nos arquivos de dados.
 * ============================================================ */

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Placeholder elegante (gradiente verde-petróleo + ondas douradas).
 * @param {string} label Nome exibido no centro (ex.: "Praia do Félix").
 * @param {string} [sub] Legenda pequena abaixo do nome.
 */
export function placeholderImage(label, sub = 'Foto em breve') {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="#0E4A55"/><stop offset="1" stop-color="#07262D"/></linearGradient></defs>` +
        `<rect width="1200" height="900" fill="url(#g)"/>` +
        `<circle cx="945" cy="185" r="95" fill="#C6A15B" opacity="0.15"/>` +
        `<g fill="none" stroke-linecap="round">` +
        `<path d="M240 425c60-60 120-60 180 0s120 60 180 0 120-60 180 0 120 60 180 0" stroke="#C6A15B" stroke-width="9" opacity="0.9"/>` +
        `<path d="M240 498c60-60 120-60 180 0s120 60 180 0 120-60 180 0 120 60 180 0" stroke="#FFFFFF" stroke-width="9" opacity="0.45"/>` +
        `</g>` +
        `<text x="600" y="622" font-family="Georgia, 'Times New Roman', serif" font-size="56" fill="#F7F4EE" text-anchor="middle">${escapeXml(label)}</text>` +
        `<text x="600" y="676" font-family="Verdana, sans-serif" font-size="23" letter-spacing="7" fill="#C6A15B" text-anchor="middle">${escapeXml(sub.toUpperCase())}</text>` +
        `</svg>`
    )
  );
}
