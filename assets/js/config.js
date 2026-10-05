/**
 * ============================================================
 *  CONFIGURAÇÃO GERAL DO SITE
 * ------------------------------------------------------------
 *  Ajuste aqui as informações do negócio. Todas as demais
 *  partes do site leem deste arquivo — não é preciso editar
 *  HTML ou outros scripts para trocar endereço, WhatsApp etc.
 * ============================================================
 */

export const SITE_CONFIG = {
  /** Nome exibido no topo do site e no rodapé. */
  brandName: "UB N' BEACH",

  /**
   * Número do WhatsApp com código do país (55) + DDD, somente dígitos.
   * Ex.: (12) 99735-3793  ->  '5512997353793'
   */
  whatsappNumber: '5512997353793',

  /** Número formatado para exibição. */
  whatsappDisplay: '(12) 99735-3793',

  /** Mensagem padrão para os botões gerais de WhatsApp. */
  whatsappDefaultMessage:
    'Olá! Vim pelo site e gostaria de saber mais sobre os apartamentos para temporada em Ubatuba.',

  /** Endereço dos apartamentos. ⚠️ PLACEHOLDER — substitua pelo endereço real. */
  address: {
    line1: 'Orla da Praia Grande, s/n',
    line2: 'Centro · Ubatuba',
    city: 'Ubatuba — SP',
  },

  /** Link para abrir a localização no app/site do Google Maps. */
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Praia Grande, Ubatuba - SP'),

  /** URL de incorporação do mapa (iframe). */
  mapsEmbed:
    'https://www.google.com/maps?q=' +
    encodeURIComponent('Praia Grande, Ubatuba - SP') +
    '&output=embed',
};
