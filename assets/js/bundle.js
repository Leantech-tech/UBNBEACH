(() => {
  // assets/js/config.js
  var SITE_CONFIG = {
    /** Nome exibido no topo do site e no rodapé. */
    brandName: "UB N' BEACH",
    /**
     * Número do WhatsApp com código do país (55) + DDD, somente dígitos.
     * Ex.: (12) 99735-3793  ->  '5512997353793'
     */
    whatsappNumber: "5512997353793",
    /** Número formatado para exibição. */
    whatsappDisplay: "(12) 99735-3793",
    /** Mensagem padrão para os botões gerais de WhatsApp. */
    whatsappDefaultMessage: "Ol\xE1! Vim pelo site e gostaria de saber mais sobre os apartamentos para temporada em Ubatuba.",
    /** Endereço dos apartamentos. ⚠️ PLACEHOLDER — substitua pelo endereço real. */
    address: {
      line1: "Orla da Praia Grande, s/n",
      line2: "Centro \xB7 Ubatuba",
      city: "Ubatuba \u2014 SP"
    },
    /** Link para abrir a localização no app/site do Google Maps. */
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Praia Grande, Ubatuba - SP"),
    /** URL de incorporação do mapa (iframe). */
    mapsEmbed: "https://www.google.com/maps?q=" + encodeURIComponent("Praia Grande, Ubatuba - SP") + "&output=embed"
  };

  // assets/js/apartments.js
  var IMG = "/assets/imagens/aptos";
  var APARTMENTS = [
    {
      id: "apto-01",
      name: "Apartamento 01",
      location: "Ubatuba \u2014 SP",
      capacity: 4,
      bedrooms: 2,
      beds: 3,
      bathrooms: 1,
      sizeM2: null,
      price: null,
      available: true,
      description: "Exemplo de descri\xE7\xE3o: apartamento amplo e bem iluminado, ideal para fam\xEDlias que querem aproveitar as praias de Ubatuba com conforto. Ambientes integrados, cozinha completa e varanda para relaxar ap\xF3s um dia de mar.",
      amenities: ["Wi-Fi", "Ar-condicionado", "Cozinha completa", "TV", "Estacionamento", "Varanda"],
      images: [
        `${IMG}/apto 1/262cc91f-2d53-43fb-a615-413ab5d84b0c.jpg`,
        `${IMG}/apto 1/2ad0bb16-6133-409c-a8ed-ef80cd08ab76.jpg`,
        `${IMG}/apto 1/9dd81584-4b33-4e5f-88e4-18f4c73bae6a.jpg`,
        `${IMG}/apto 1/caa6f09f-4c8e-4fb9-a231-4969487567a0.jpg`,
        `${IMG}/apto 1/e5f1d91e-aac8-4a2e-aa82-6aa4723f9138.jpg`,
        `${IMG}/apto 1/fc977143-3b84-466c-a213-ac9afe8c9c1b.jpg`
      ],
      featured: false
    },
    {
      id: "apto-02",
      name: "Apartamento 02",
      location: "Ubatuba \u2014 SP",
      capacity: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2,
      sizeM2: null,
      price: null,
      available: true,
      description: "Exemplo de descri\xE7\xE3o: espa\xE7oso e confort\xE1vel, perfeito para grupos e fam\xEDlias maiores. Distribui\xE7\xE3o inteligente dos quartos e \xE1reas sociais amplas para todo mundo aproveitar.",
      amenities: ["Wi-Fi", "Ar-condicionado", "Cozinha completa", "TV", "Estacionamento", "Churrasqueira"],
      images: [
        `${IMG}/apto 2/4abbb369-3f5f-423e-851e-c7ee651a4e19.jpg`,
        `${IMG}/apto 2/74067728-77c8-49b5-b56f-bc5a938faf16.jpg`,
        `${IMG}/apto 2/a9512c65-02a2-462f-95ac-a3ddb958063f.jpg`,
        `${IMG}/apto 2/c584adec-9735-48eb-89d3-bac3aa5b358c.jpg`,
        `${IMG}/apto 2/d7535fe1-f799-4a88-9234-a470141df1d9.jpg`,
        `${IMG}/apto 2/e456890d-51d0-44d4-82ce-ac02a34fc261.jpg`
      ],
      featured: true
    },
    {
      id: "apto-03",
      name: "Apartamento 03",
      location: "Ubatuba \u2014 SP",
      capacity: 2,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      sizeM2: null,
      price: null,
      available: true,
      description: "Exemplo de descri\xE7\xE3o: charmoso e aconchegante, ideal para casais. Decora\xE7\xE3o cuidadosa, clima agrad\xE1vel e tudo o que voc\xEA precisa para uma escapada rom\xE2ntica \xE0 beira-mar.",
      amenities: ["Wi-Fi", "Ar-condicionado", "Cozinha completa", "TV"],
      images: [
        `${IMG}/apto 3/05eba255-2034-4f54-a1ee-1db872423528.jpg`,
        `${IMG}/apto 3/092857ad-3067-498a-9cd3-f05d5b729e04.jpg`,
        `${IMG}/apto 3/4fef326b-cfb1-44ec-aad6-2c5aec059d7e.jpg`,
        `${IMG}/apto 3/5bd9edf7-aa5e-4394-993b-13ed0d6d7d5f.jpg`,
        `${IMG}/apto 3/9cfed2a2-aca8-45c2-a988-f85f33694670.jpg`,
        `${IMG}/apto 3/d68b57ff-5b6e-4c89-aef2-f9701ebb5090.jpg`
      ],
      featured: false
    },
    {
      id: "apto-04",
      name: "Apartamento 04",
      location: "Ubatuba \u2014 SP",
      capacity: 5,
      bedrooms: 2,
      beds: 3,
      bathrooms: 2,
      sizeM2: null,
      price: null,
      available: true,
      description: "Exemplo de descri\xE7\xE3o: moderno e funcional, com ambientes claros e ventilados. Uma op\xE7\xE3o equilibrada para fam\xEDlias que valorizam conforto e praticidade perto da praia.",
      amenities: ["Wi-Fi", "Ar-condicionado", "Cozinha completa", "TV", "Estacionamento"],
      images: [
        `${IMG}/apto 4/2aee38af-22df-4eee-93f7-b19cf5dd8b41.jpg`,
        `${IMG}/apto 4/3899448b-4737-4ec7-a85f-4c15c1de27cb.jpg`,
        `${IMG}/apto 4/4687b66a-dbd1-401c-8509-16da44fc25cc.jpg`,
        `${IMG}/apto 4/49772dc2-1258-4516-a1a2-b4d632c58cde.jpg`,
        `${IMG}/apto 4/4b012f13-b625-47a8-b526-1eaf0e70f564.jpg`,
        `${IMG}/apto 4/a745bb1d-6a2d-4bdc-bacd-66bdab198b05.jpg`,
        `${IMG}/apto 4/a8192a1d-2bf6-4b57-8228-b8989fcda0e2.jpg`,
        `${IMG}/apto 4/b5297660-2549-4c05-a825-d152aa9a8221.jpg`,
        `${IMG}/apto 4/b9d650fb-1b66-4132-85d8-7ee5712d9d65.jpg`,
        `${IMG}/apto 4/be3609b0-0770-4d4f-a71d-b0dc6aff5019.jpg`,
        `${IMG}/apto 4/d4a52d2e-dd04-49ef-a2c6-c606fe02f8fe.jpg`,
        `${IMG}/apto 4/def79a40-786f-4b80-8274-4867b19b1e05.jpg`
      ],
      featured: false
    }
  ];

  // assets/js/modal.js
  function openModal(html, { variant = "", onClose } = {}) {
    const root = document.getElementById("modal-root");
    if (!root) throw new Error("#modal-root n\xE3o encontrado no HTML.");
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="modal-sheet ${variant}" role="dialog" aria-modal="true">
      <button type="button" class="modal-close" aria-label="Fechar janela">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>
      </button>
      <div class="modal-body"></div>
    </div>`;
    const sheet = overlay.querySelector(".modal-sheet");
    const body = overlay.querySelector(".modal-body");
    body.innerHTML = html;
    root.appendChild(overlay);
    document.body.classList.add("no-scroll");
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      overlay.classList.remove("is-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(() => {
        overlay.remove();
        if (!document.querySelector(".modal-overlay")) {
          document.body.classList.remove("no-scroll");
        }
        onClose?.();
      }, 280);
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector(".modal-close").addEventListener("click", close);
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      const focusable = body.querySelector("button:not(:disabled), [href], [tabindex]");
      if (focusable) focusable.focus({ preventScroll: true });
    });
    return { sheet, body, close };
  }

  // assets/js/utils.js
  var svg = (paths, viewBox = "0 0 24 24") => `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  var ICONS = {
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
    whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
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
    globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.5 4 5.6 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.6-4-9s1.4-6.5 4-9z"/>')
  };
  function linkedWhatsApp() {
    const segment = window.location.pathname.split("/").filter(Boolean).pop() ?? "";
    const digits = segment.replace(/\D/g, "");
    return /^\d{10,15}$/.test(digits) ? digits : null;
  }
  function categoryIcon(key) {
    const t = String(key || "").toLowerCase();
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
  function amenityIcon(label) {
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
  var dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  var dateFmtShort = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  var monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  var formatDate = (d) => dateFmt.format(d).replace(".", "");
  var formatMonth = (d) => {
    const s = monthFmt.format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  var plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  var formatGuests = (n) => plural(n, "h\xF3spede", "h\xF3spedes");
  function nightsBetween(a, b) {
    return Math.round((stripTime(b) - stripTime(a)) / 864e5);
  }
  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function isSameDay(a, b) {
    return a instanceof Date && b instanceof Date && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function addMonths(date, n) {
    return new Date(date.getFullYear(), date.getMonth() + n, 1);
  }
  var brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var formatBRL = (v) => brlFmt.format(v);
  function bookingPrice(apartment, nights) {
    const daily = apartment.dailyPrice || null;
    if (!daily) return null;
    const cleaning = apartment.cleaningFee || 0;
    return { daily, cleaning, total: daily * nights + cleaning };
  }
  function buildWhatsAppLink(message) {
    return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }
  function buildBookingMessage(apartment, checkIn, checkOut, guests) {
    const nights = nightsBetween(checkIn, checkOut);
    const lines = [
      `Ol\xE1! Fiz a pr\xE9 reserva, pelo site, do ${apartment.name}.`,
      "",
      `\u{1F4C5} Per\xEDodo: ${formatDate(checkIn)} at\xE9 ${formatDate(checkOut)}`,
      `\u{1F319} Di\xE1rias: ${plural(nights, "di\xE1ria", "di\xE1rias")}`,
      `\u{1F465} H\xF3spedes: ${plural(guests, "pessoa", "pessoas")}`
    ];
    const price = bookingPrice(apartment, nights);
    if (price) {
      lines.push(`\u{1F4B5} Valor da di\xE1ria: ${formatBRL(price.daily)}`);
      if (price.cleaning) lines.push(`\u{1F4B8} Taxa de limpeza: ${formatBRL(price.cleaning)}`);
      lines.push(`\u{1F4B0} Total estimado: ${formatBRL(price.total)}`);
    }
    return lines.join("\n");
  }
  var FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#E8E2D6"/><g fill="none" stroke="#B9AE9C" stroke-width="10" stroke-linecap="round"><path d="M430 470c45-45 90-45 135 0s90 45 135 0 90-45 135 0"/><path d="M430 540c45-45 90-45 135 0s90 45 135 0 90-45 135 0"/></g><text x="600" y="640" font-family="Georgia, serif" font-size="40" fill="#8D8172" text-anchor="middle">Foto do apartamento</text></svg>`
  );
  function guardImage(img) {
    img.addEventListener("error", function onError() {
      img.removeEventListener("error", onError);
      if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
    });
  }
  var escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function placeholderImage(label, sub = "Foto em breve") {
    return "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E4A55"/><stop offset="1" stop-color="#07262D"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="945" cy="185" r="95" fill="#C6A15B" opacity="0.15"/><g fill="none" stroke-linecap="round"><path d="M240 425c60-60 120-60 180 0s120 60 180 0 120-60 180 0 120 60 180 0" stroke="#C6A15B" stroke-width="9" opacity="0.9"/><path d="M240 498c60-60 120-60 180 0s120 60 180 0 120-60 180 0 120 60 180 0" stroke="#FFFFFF" stroke-width="9" opacity="0.45"/></g><text x="600" y="622" font-family="Georgia, 'Times New Roman', serif" font-size="56" fill="#F7F4EE" text-anchor="middle">${escapeXml(label)}</text><text x="600" y="676" font-family="Verdana, sans-serif" font-size="23" letter-spacing="7" fill="#C6A15B" text-anchor="middle">${escapeXml(sub.toUpperCase())}</text></svg>`
    );
  }

  // assets/js/calendar.js
  var WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "S\xC1B"];
  var DateRangePicker = class {
    /**
     * @param {HTMLElement} mount
     * @param {{ onChange?: (start: Date|null, end: Date|null) => void }} opts
     */
    constructor(mount, { onChange } = {}) {
      this.mount = mount;
      this.onChange = onChange;
      this.start = null;
      this.end = null;
      const today = stripTime(/* @__PURE__ */ new Date());
      this.today = today;
      this.view = new Date(today.getFullYear(), today.getMonth(), 1);
      this.render();
    }
    destroy() {
    }
    get nights() {
      if (!this.start || !this.end) return 0;
      return Math.round((this.end - this.start) / 864e5);
    }
    _canGoPrev() {
      return this.view > new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    }
    render() {
      const options = [];
      const baseMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
      for (let i = 0; i < 24; i++) {
        const mDate = addMonths(baseMonth, i);
        const val = `${mDate.getFullYear()}-${mDate.getMonth()}`;
        const isSel = mDate.getFullYear() === this.view.getFullYear() && mDate.getMonth() === this.view.getMonth();
        options.push(
          `<option value="${val}" ${isSel ? "selected" : ""}>${formatMonth(mDate)}</option>`
        );
      }
      this.mount.innerHTML = `
      <div class="cal">
        <div class="cal-header">
          <div class="cal-select-wrap">
            <select class="cal-select" data-cal="month-select" aria-label="Escolher m\xEAs e ano">
              ${options.join("")}
            </select>
            <svg class="cal-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <div class="cal-nav">
            <button type="button" class="cal-nav-btn" data-cal="prev" aria-label="M\xEAs anterior"
              ${this._canGoPrev() ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <button type="button" class="cal-nav-btn" data-cal="next" aria-label="Pr\xF3ximo m\xEAs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
        <div class="cal-months">
          ${this._renderMonth(this.view)}
        </div>
      </div>`;
      this.mount.querySelector('[data-cal="month-select"]')?.addEventListener("change", (e) => {
        const [y, m] = e.target.value.split("-").map(Number);
        this.view = new Date(y, m, 1);
        this.render();
      });
      this.mount.querySelector('[data-cal="prev"]')?.addEventListener("click", () => {
        this.view = addMonths(this.view, -1);
        this.render();
      });
      this.mount.querySelector('[data-cal="next"]')?.addEventListener("click", () => {
        this.view = addMonths(this.view, 1);
        this.render();
      });
      this.mount.querySelectorAll("button.cal-day:not(:disabled)").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [y, m, d] = btn.dataset.date.split("-").map(Number);
          this._select(new Date(y, m - 1, d));
        });
      });
    }
    _renderMonth(date) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let cells = "";
      for (let i = 0; i < firstWeekday; i++) cells += '<span class="cal-day is-empty" aria-hidden="true"></span>';
      for (let d = 1; d <= daysInMonth; d++) {
        const current = new Date(year, month, d);
        const isPast = current < this.today;
        const cls = ["cal-day"];
        if (isPast) cls.push("is-past");
        if (isSameDay(current, this.today)) cls.push("is-today");
        if (this.start && isSameDay(current, this.start)) cls.push("is-start");
        if (this.end && isSameDay(current, this.end)) cls.push("is-end");
        if (this.start && this.end && current > this.start && current < this.end) cls.push("is-range");
        const label = (this.start && isSameDay(current, this.start) ? "Entrada: " : "") + (this.end && isSameDay(current, this.end) ? "Sa\xEDda: " : "") + current.toLocaleDateString("pt-BR");
        cells += `
        <button type="button"
          class="${cls.join(" ")}"
          data-date="${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}"
          ${isPast ? "disabled" : ""}
          aria-label="${label}">
          <span>${d}</span>
        </button>`;
      }
      return `
      <div class="cal-month">
        <div class="cal-week" aria-hidden="true">
          ${WEEKDAYS.map((w) => `<span>${w}</span>`).join("")}
        </div>
        <div class="cal-grid">${cells}</div>
      </div>`;
    }
    _select(date) {
      if (!this.start || this.start && this.end) {
        this.start = date;
        this.end = null;
      } else if (date < this.start) {
        this.start = date;
      } else if (!isSameDay(date, this.start)) {
        this.end = date;
      }
      this.render();
      this.onChange?.(this.start, this.end);
    }
  };

  // assets/js/booking.js
  function openBooking(apartment) {
    const state = {
      step: 1,
      checkIn: null,
      checkOut: null,
      guests: Math.min(2, apartment.capacity)
    };
    const html = `
    <div class="booking">
      <header class="bk-head">
        <p class="bk-eyebrow">Reserva \xB7 ${apartment.name}</p>
        <ol class="bk-steps">
          <li class="bk-step is-active" data-step-dot="1"><i>1</i><span>Per\xEDodo</span></li>
          <li class="bk-step" data-step-dot="2"><i>2</i><span>Pessoas</span></li>
          <li class="bk-step" data-step-dot="3"><i>3</i><span>Resumo</span></li>
        </ol>
      </header>
      <div class="bk-body" data-role="body"></div>
      <footer class="bk-foot" data-role="foot"></footer>
    </div>`;
    const modal = openModal(html, { variant: "modal-booking" });
    const body = modal.body.querySelector('[data-role="body"]');
    const foot = modal.body.querySelector('[data-role="foot"]');
    let picker = null;
    function renderStep1() {
      body.innerHTML = `
      <div class="bk-step-body">
        <h3 class="bk-title">Quando voc\xEA pretende ficar?</h3>
        <p class="bk-hint">Toque na <strong>data de entrada</strong> e depois na <strong>data de sa\xEDda</strong>.</p>
        <div data-role="calendar"></div>
        <p class="bk-selection" data-role="selection" aria-live="polite"></p>
      </div>`;
      picker = new DateRangePicker(body.querySelector('[data-role="calendar"]'), {
        onChange: (start2, end) => {
          state.checkIn = start2;
          state.checkOut = end;
          updateSelection();
          renderFoot();
        }
      });
      updateSelection();
      renderFoot();
    }
    function updateSelection() {
      const el = body.querySelector('[data-role="selection"]');
      if (!el) return;
      if (state.checkIn && state.checkOut) {
        const n = nightsBetween(state.checkIn, state.checkOut);
        el.innerHTML = `<strong>Entrada:</strong> ${formatDate(state.checkIn)} &nbsp;\xB7&nbsp; <strong>Sa\xEDda:</strong> ${formatDate(state.checkOut)} &nbsp;\xB7&nbsp; <strong>${plural(n, "noite", "noites")}</strong>`;
        el.classList.add("has-value");
      } else if (state.checkIn) {
        el.innerHTML = `<strong>Entrada:</strong> ${formatDate(state.checkIn)} \u2014 agora escolha a sa\xEDda`;
        el.classList.add("has-value");
      } else {
        el.textContent = "";
        el.classList.remove("has-value");
      }
    }
    function renderStep2() {
      body.innerHTML = `
      <div class="bk-step-body">
        <h3 class="bk-title">Quantas pessoas v\xE3o se hospedar?</h3>
        <p class="bk-hint">O ${apartment.name} acomoda at\xE9 <strong>${formatGuests(apartment.capacity)}</strong>.</p>
        <div class="stepper" data-role="stepper">
          <button type="button" data-step="minus" aria-label="Diminuir quantidade de pessoas">${ICONS.minus}</button>
          <output data-role="guests" aria-live="polite">${state.guests}</output>
          <button type="button" data-step="plus" aria-label="Aumentar quantidade de pessoas">${ICONS.plus}</button>
        </div>
        <p class="bk-hint bk-hint-small">Inclua adultos e crian\xE7as.</p>
      </div>`;
      const output = body.querySelector('[data-role="guests"]');
      body.querySelector('[data-step="minus"]').addEventListener("click", () => {
        state.guests = Math.max(1, state.guests - 1);
        output.textContent = state.guests;
        renderFoot();
      });
      body.querySelector('[data-step="plus"]').addEventListener("click", () => {
        state.guests = Math.min(apartment.capacity, state.guests + 1);
        output.textContent = state.guests;
        renderFoot();
      });
      renderFoot();
    }
    function renderStep3() {
      const nights = nightsBetween(state.checkIn, state.checkOut);
      const waLink = buildWhatsAppLink(buildBookingMessage(apartment, state.checkIn, state.checkOut, state.guests));
      const price = bookingPrice(apartment, nights);
      const priceRows = price ? `
          <div><dt>Valor da di\xE1ria</dt><dd>${formatBRL(price.daily)}</dd></div>
          ${price.cleaning ? `<div><dt>Taxa de limpeza</dt><dd>${formatBRL(price.cleaning)}</dd></div>` : ""}
          <div class="bk-total"><dt>Total estimado</dt><dd>${formatBRL(price.total)}</dd></div>` : `
          <div><dt>Valor da di\xE1ria</dt><dd>Sob consulta</dd></div>
          <div class="bk-total"><dt>Total estimado</dt><dd>Sob consulta</dd></div>`;
      body.innerHTML = `
      <div class="bk-step-body">
        <h3 class="bk-title">Confira as informa\xE7\xF5es</h3>
        <dl class="bk-summary">
          <div><dt>Apartamento</dt><dd>${apartment.name}</dd></div>
          <div><dt>Entrada</dt><dd>${formatDate(state.checkIn)}</dd></div>
          <div><dt>Sa\xEDda</dt><dd>${formatDate(state.checkOut)}</dd></div>
          <div><dt>Perman\xEAncia</dt><dd>${plural(nights, "di\xE1ria", "di\xE1rias")}</dd></div>
          ${priceRows}
          <div><dt>Pessoas</dt><dd>${formatGuests(state.guests)}</dd></div>
        </dl>
        <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-lg bk-wa">
          ${ICONS.whatsapp} Continuar pelo WhatsApp
        </a>
        <p class="bk-hint bk-hint-small bk-wa-note">
          Voc\xEA ser\xE1 direcionado ao WhatsApp com a mensagem j\xE1 pronta \u2014 \xE9 s\xF3 enviar.
        </p>
      </div>`;
      renderFoot();
    }
    function renderFoot() {
      const canContinue = state.step === 1 ? !!(state.checkIn && state.checkOut) : true;
      if (state.step === 3) {
        foot.innerHTML = `
        <button type="button" class="btn btn-text" data-role="back">${ICONS.arrowLeft} Voltar</button>
        <span></span>`;
        foot.querySelector('[data-role="back"]').addEventListener("click", goBack);
        return;
      }
      foot.innerHTML = `
      <button type="button" class="btn btn-text" data-role="back" ${state.step === 1 ? "disabled" : ""}>
        ${ICONS.arrowLeft} Voltar
      </button>
      <button type="button" class="btn btn-primary" data-role="next" ${canContinue ? "" : "disabled"}>
        Continuar ${ICONS.arrowRight}
      </button>`;
      foot.querySelector('[data-role="back"]').addEventListener("click", goBack);
      foot.querySelector('[data-role="next"]').addEventListener("click", goNext);
    }
    function updateDots() {
      modal.body.querySelectorAll("[data-step-dot]").forEach((dot) => {
        const n = Number(dot.dataset.stepDot);
        dot.classList.toggle("is-active", n === state.step);
        dot.classList.toggle("is-done", n < state.step);
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

  // assets/js/gallery.js
  function createGallery(mount, images, { alt = "Foto", ratio } = {}) {
    const list = images.length ? images : [""];
    const multiple = list.length > 1;
    if (multiple) {
      list.forEach((src) => {
        if (src) {
          const img = new Image();
          img.src = src;
        }
      });
    }
    mount.innerHTML = `
    <figure class="gallery-main${multiple ? "" : " is-single"}">
      <img data-gallery-main alt="${alt}" decoding="async" />
      ${multiple ? `<figcaption class="gallery-counter"><span data-gallery-counter>1</span> / ${list.length}</figcaption>
             <button type="button" class="gallery-arrow prev" data-gallery="prev" aria-label="Foto anterior">${ICONS.arrowLeft}</button>
             <button type="button" class="gallery-arrow next" data-gallery="next" aria-label="Pr\xF3xima foto">${ICONS.arrowRight}</button>` : ""}
    </figure>
    ${multiple ? `<div class="gallery-thumbs" role="tablist" aria-label="Miniaturas das fotos">
            ${list.map(
      (src, i) => `
              <button type="button" role="tab" data-thumb="${i}" aria-label="Ver foto ${i + 1}" class="${i === 0 ? "is-active" : ""}">
                <img src="${src}" alt="" loading="lazy" decoding="async" />
              </button>`
    ).join("")}
          </div>` : ""}`;
    const mainImg = mount.querySelector("[data-gallery-main]");
    const counter = mount.querySelector("[data-gallery-counter]");
    const thumbs = [...mount.querySelectorAll("[data-thumb]")];
    guardImage(mainImg);
    mount.querySelectorAll(".gallery-thumbs img").forEach(guardImage);
    if (ratio) mount.querySelector(".gallery-main").style.aspectRatio = String(ratio);
    let index = 0;
    let switching = false;
    const apply = (i) => {
      index = (i + list.length) % list.length;
      mainImg.src = list[index];
      if (counter) counter.textContent = String(index + 1);
      thumbs.forEach((t, ti) => t.classList.toggle("is-active", ti === index));
    };
    const show = (i) => {
      if (!multiple || switching) return;
      const targetIndex = (i + list.length) % list.length;
      if (targetIndex === index) return;
      switching = true;
      const targetSrc = list[targetIndex];
      const preload = new Image();
      const done = () => {
        apply(targetIndex);
        switching = false;
      };
      preload.onload = done;
      preload.onerror = done;
      preload.src = targetSrc;
      if (preload.complete) {
        done();
      }
    };
    mainImg.src = list[0];
    mount.querySelector('[data-gallery="prev"]')?.addEventListener("click", () => show(index - 1));
    mount.querySelector('[data-gallery="next"]')?.addEventListener("click", () => show(index + 1));
    thumbs.forEach((t) => t.addEventListener("click", () => show(Number(t.dataset.thumb))));
    const onKey = (e) => {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    };
    if (multiple) document.addEventListener("keydown", onKey);
    let touchX = null;
    mainImg.addEventListener("touchstart", (e) => touchX = e.touches[0].clientX, { passive: true });
    mainImg.addEventListener(
      "touchend",
      (e) => {
        if (touchX === null) return;
        const delta = e.changedTouches[0].clientX - touchX;
        if (Math.abs(delta) > 40) show(index + (delta < 0 ? 1 : -1));
        touchX = null;
      },
      { passive: true }
    );
    return {
      show,
      destroy() {
        document.removeEventListener("keydown", onKey);
      }
    };
  }

  // assets/js/point-modal.js
  function formatPhoneDisplay(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return phone;
  }
  function mapsQuery(point2) {
    const hasCoords2 = typeof point2.latitude === "number" && typeof point2.longitude === "number" && (point2.latitude !== 0 || point2.longitude !== 0);
    if (hasCoords2) return `${point2.latitude},${point2.longitude}`;
    return [point2.address || [point2.name, point2.city, point2.state].filter(Boolean).join(", ")].filter(Boolean).join(", ");
  }
  function openPointModal(point2, category) {
    const image = point2.image || placeholderImage(point2.name);
    const query = mapsQuery(point2);
    const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    const location = [point2.neighborhood, point2.city].filter(Boolean).join(" \xB7 ");
    const html = `
    <article class="detail poi-detail">
      <div class="detail-col-left">
        <figure class="poi-cover">
          <img src="${image}" alt="${point2.name}" decoding="async" />
        </figure>
        ${point2.tags?.length ? `<ul class="poi-tags">${point2.tags.map((t) => `<li>${t}</li>`).join("")}</ul>` : ""}
      </div>

      <div class="detail-info">
        <div class="detail-head">
          <span class="badge badge-gold">${category ? categoryIcon(category.icon || category.slug) : ""}${category?.name ?? "Ponto de interesse"}</span>
          <h3>${point2.name}</h3>
          ${point2.context ? `<p class="detail-context">${point2.context}</p>` : ""}
          ${location ? `<p class="detail-location">${ICONS.pin}<span>${location}</span></p>` : ""}
        </div>

        ${point2.description ? `<div class="detail-block"><h4>Sobre</h4><p>${point2.description}</p></div>` : ""}

        <div class="detail-block">
          <h4>Localiza\xE7\xE3o</h4>
          ${point2.address ? `<p class="detail-address">${point2.address}</p>` : ""}
          <div class="poi-map">
            <iframe
              src="${embedUrl}"
              title="Localiza\xE7\xE3o de ${point2.name} no Google Maps"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen></iframe>
          </div>
          <div class="poi-map-actions">
            <a class="btn btn-primary btn-sm" href="${directionsUrl}" target="_blank" rel="noopener">
              ${ICONS.compass} Como chegar
            </a>
            <a class="btn btn-outline btn-sm" href="${searchUrl}" target="_blank" rel="noopener">
              ${ICONS.pin} Abrir no Google Maps
            </a>
          </div>
        </div>

        ${point2.phone || point2.site ? `<div class="detail-block">
          <h4>Contato</h4>
          <ul class="poi-contact">
            ${point2.phone ? `<li><a href="tel:+55${String(point2.phone).replace(/\D/g, "")}">${ICONS.phone}<span>${formatPhoneDisplay(point2.phone)}</span></a></li>` : ""}
            ${point2.site ? `<li><a href="${point2.site}" target="_blank" rel="noopener">${ICONS.globe}<span>Visitar site</span></a></li>` : ""}
          </ul>
        </div>` : ""}
      </div>
    </article>`;
    const modal = openModal(html, { variant: "modal-detail" });
    modal.body.querySelectorAll("img").forEach(guardImage);
  }

  // assets/js/points-fallback.js
  var IMG_PRAIAS = "/assets/imagens/nossas praias";
  var IMG_CACHOEIRAS = "/assets/imagens/nossas cachoeiras";
  var IMG_PONTOS = "/assets/imagens/pontos tur\xEDsticos";
  var IMG_NOITE = "/assets/imagens/o que fazer a noite";
  var FALLBACK_CATEGORIES = [
    { id: "praia", name: "Praias", slug: "praia", icon: "beach_access", order: 10 },
    { id: "cachoeira", name: "Cachoeiras", slug: "cachoeira", icon: "waterfall", order: 20 },
    { id: "passeio", name: "Passeios", slug: "passeio", icon: "tour", order: 30 },
    { id: "vida-noturna", name: "Vida noturna", slug: "vida-noturna", icon: "nightlife", order: 40 }
  ];
  var point = (category, id, name, context, description, image, tags = [], address = "") => ({
    id,
    name,
    context,
    description,
    address,
    neighborhood: "",
    city: "Ubatuba",
    state: "SP",
    latitude: null,
    longitude: null,
    phone: "",
    site: "",
    image,
    featured: false,
    categoryId: category,
    tags
  });
  var FALLBACK_POINTS = [
    /* ---------- Praias ---------- */
    point(
      "praia",
      "enseada",
      "Praia da Enseada",
      "A praia dos nossos apartamentos",
      "Mar geralmente calmo e uma longa faixa de areia \u2014 perfeita para caminhadas no fim de tarde e banho tranquilo com as crian\xE7as. \xC9 aqui que ficam nossos apartamentos: d\xE1 para ir e voltar a p\xE9 quantas vezes quiser.",
      `${IMG_PRAIAS}/Enseada.png`,
      ["\xC1guas calmas", "Ao lado dos apartamentos"],
      "Praia da Enseada, Ubatuba \u2014 SP"
    ),
    point(
      "praia",
      "itamambuca",
      "Praia de Itamambuca",
      "Point de surf cercado de mata",
      "Uma das praias mais famosas do litoral norte: ondas constantes que recebem campeonatos de surf, areia clara e o Rio Itamambuca desaguando no cantinho. Mesmo sem prancha, vale pela paisagem.",
      `${IMG_PRAIAS}/Itamambuca.png`,
      ["Surf", "Natureza preservada"]
    ),
    point(
      "praia",
      "ubatumirim",
      "Ubatumirim",
      "Sossego no encontro do rio com o mar",
      "Mar calmo, areia clara e pouco movimento: Ubatumirim \xE9 ref\xFAgio para quem quer sil\xEAncio. Em uma das pontas, o rio encontra o mar formando piscinas rasas \u2014 um charme a mais para as crian\xE7as.",
      `${IMG_PRAIAS}/Ubatumirim.png`,
      ["\xC1guas calmas", "Pouco movimento"]
    ),
    point(
      "praia",
      "praia-grande",
      "Praia Grande",
      "Movimento, quiosques e passeios",
      "Uma das praias mais animadas da cidade: orla com quiosques, sa\xEDda de passeios de barco e mar bom para banho. Ideal para quem gosta de estrutura completa p\xE9 na areia.",
      `${IMG_PRAIAS}/Praia Grande.png`,
      ["Quiosques", "Passeios de barco"]
    ),
    point(
      "praia",
      "toninhas",
      "Praia das Toninhas",
      "Enseada protegida, ideal para fam\xEDlias",
      "O formato de enseada protege o banho de mar em boa parte dos dias. Os cantinhos s\xE3o ainda mais tranquilos, e o trecho central atrai quem pratica caiaque e stand-up paddle.",
      `${IMG_PRAIAS}/Toninhas.png`,
      ["Fam\xEDlias", "Caiaque e SUP"]
    ),
    point(
      "praia",
      "praia-do-portugues",
      "Praia do Portugu\xEAs",
      "Cantinho de \xE1guas claras",
      "Pequena, charmosa e encostada na mata, tem mar calmo e \xE1gua transparente na maior parte do ano. Uma parada perfeita para relaxar longe do movimento.",
      `${IMG_PRAIAS}/Praia do Portugu\xEAs.png`,
      ["\xC1guas claras", "Sossego"]
    ),
    /* ---------- Cachoeiras ---------- */
    point(
      "cachoeira",
      "dos-macacos",
      "Cachoeira dos Macacos",
      "Po\xE7o amplo em meio \xE0 mata",
      "A queda desce por degraus de rocha at\xE9 um po\xE7o grande e profundo, cercado por Mata Atl\xE2ntica preservada. O nome \xE9 uma homenagem aos macacos-prego que costumam aparecer na copa das \xE1rvores ao redor.",
      `${IMG_CACHOEIRAS}/Dos Macacos.webp`,
      ["Piscina natural", "Mata preservada"]
    ),
    point(
      "cachoeira",
      "agua-branca",
      "Cachoeira da \xC1gua Branca",
      "Sequ\xEAncia de quedas e po\xE7os",
      "Uma sequ\xEAncia de pequenas quedas que descem pela pedra formando po\xE7os de \xE1gua cristalina. D\xE1 para escolher entre banho de queda, piscinas rasas para as crian\xE7as e a sombra generosa da mata.",
      `${IMG_CACHOEIRAS}/\xC1gua Branca.webp`,
      ["Po\xE7os rasos", "Ideal para fam\xEDlias"]
    ),
    point(
      "cachoeira",
      "escada",
      "Cachoeira da Escada",
      "Degraus naturais e escorregadores",
      "Como o nome sugere, a \xE1gua desce por degraus sucessivos, formando escorregadores naturais e piscinas entre um n\xEDvel e outro. Divers\xE3o garantida \u2014 com a dose certa de frescor.",
      `${IMG_CACHOEIRAS}/Escada.webp`,
      ["Escorregador natural", "Banho de queda"]
    ),
    point(
      "cachoeira",
      "prumirim",
      "Cachoeira do Prumirim",
      "Pertinho da Praia do Prumirim",
      "A poucos minutos da Praia do Prumirim, combina trilha curta na mata com po\xE7os esverdeados de \xE1gua doce. O programa perfeito \xE9 unir os dois: manh\xE3 de cachoeira, tarde de praia.",
      `${IMG_CACHOEIRAS}/Prumirim.webp`,
      ["Trilha curta", "Combina com a praia"]
    ),
    point(
      "cachoeira",
      "renata",
      "Cachoeira da Renata",
      "Um dos po\xE7os mais bonitos da regi\xE3o",
      "Po\xE7o amplo de \xE1guas esverdeadas com faixa de areia na borda \u2014 cen\xE1rio de piscina natural de revista. Nos dias de sol, a \xE1gua ganha tons que v\xE3o do verde ao azul-turquesa.",
      `${IMG_CACHOEIRAS}/Renata.webp`,
      ["Piscina natural", "\xC1guas esverdeadas"]
    ),
    point(
      "cachoeira",
      "tombador",
      "Cachoeira do Tombador",
      "Queda imponente, po\xE7o profundo",
      "Queda alta e volumosa que despenca sobre um po\xE7o profundo \u2014 o cl\xE1ssico cart\xE3o-postal de cachoeira. O banho de queda aqui \xE9 dos mais revigorantes.",
      `${IMG_CACHOEIRAS}/Tombador.webp`,
      ["Banho de queda", "Po\xE7o profundo"]
    ),
    point(
      "cachoeira",
      "veu-da-noiva",
      "Cachoeira V\xE9u da Noiva",
      "Cortina d\u2019\xE1gua fotog\xEAnica",
      "A \xE1gua desce em l\xE2mina ampla sobre a rocha, formando uma cortina branca que lembra um v\xE9u \u2014 da\xED o nome. Uma das paisagens mais fotog\xEAnicas entre as cachoeiras da regi\xE3o.",
      `${IMG_CACHOEIRAS}/V\xE9u da Noiva.webp`,
      ["Fotog\xEAnica", "Cortina d\u2019\xE1gua"]
    ),
    /* ---------- Passeios ---------- */
    point(
      "passeio",
      "ubatuba-mall",
      "Ubatuba Mall",
      "Compras e alimenta\xE7\xE3o na cidade",
      "Centro de compras no cora\xE7\xE3o de Ubatuba, com lojas e pra\xE7a de alimenta\xE7\xE3o. Uma boa pedida para os dias de chuva ou para relaxar entre um passeio e outro.",
      `${IMG_PONTOS}/Ubatuba-Mall-Aeroporto.webp`,
      ["Compras", "Gastronomia"]
    ),
    point(
      "passeio",
      "aquario",
      "Aqu\xE1rio de Ubatuba",
      "Fauna marinha do litoral norte",
      "Aqu\xE1rio municipal dedicado \xE0 fauna marinha da regi\xE3o. Um passeio educativo e divertido, perfeito para crian\xE7as e adultos conhecerem de perto as esp\xE9cies que vivem no litoral.",
      `${IMG_PONTOS}/Aquario-de-Ubatuba-2-2.webp`,
      ["Fam\xEDlias", "Fauna marinha"]
    ),
    point(
      "passeio",
      "projeto-tamar",
      "Projeto Tamar",
      "Conserva\xE7\xE3o de tartarugas marinhas",
      "Base do Projeto Tamar em Ubatuba, dedicada \xE0 prote\xE7\xE3o das tartarugas marinhas. Vale a visita para conhecer o trabalho de conserva\xE7\xE3o \u2014 e, em \xE9pocas adequadas, acompanhar atividades como a soltura de filhotes.",
      `${IMG_PONTOS}/fundacao_projeto_tamar_ubatuba07.webp`,
      ["Conserva\xE7\xE3o", "Ao ar livre"]
    ),
    point(
      "passeio",
      "sobradao-do-porto",
      "Sobrad\xE3o do Porto",
      "Hist\xF3ria e cultura \xE0 beira-mar",
      "Casar\xE3o hist\xF3rico na orla do bairro do Porto, um dos cart\xF5es-postais da cidade. O im\xF3vel abriga atividades culturais e \xE9 parada obrigat\xF3ria para quem gosta de hist\xF3ria \u2014 e de uma boa foto.",
      `${IMG_PONTOS}/Casarao-de-Ubatuba-2.webp`,
      ["Patrim\xF4nio", "Cultura"]
    ),
    point(
      "passeio",
      "ilhas",
      "Ilhas Paradis\xEDacas",
      "Passeios de barco pelo litoral",
      "Passeios de escuna e barcos menores levam a ilhas e praias de acesso apenas pelo mar, como a regi\xE3o da Ilha Anchieta e do Prumirim \u2014 \xE1guas claras, paisagens preservadas e paradas para banho.",
      `${IMG_PONTOS}/Ilhas.png`,
      ["Passeio de barco", "Natureza"]
    ),
    point(
      "passeio",
      "trilha-7-praias",
      "Trilha das 7 Praias",
      "Natureza e praias selvagens",
      "Uma das trilhas costeiras mais famosas do litoral paulista: cerca de 7 km ligando a Praia da Lagoinha ao Saco da Ribeira, passando por praias desertas, morros e mirantes naturais.",
      `${IMG_PONTOS}/Trilha 7 praias.webp`,
      ["Trilha", "Praias selvagens"]
    ),
    /* ---------- Vida noturna ---------- */
    point(
      "vida-noturna",
      "rua-guarani",
      "Rua Guarani",
      "O point da noite ubatubense",
      "O principal ponto de encontro da noite ubatubense: bares, restaurantes e food trucks concentrados em uma \xFAnica rua \u2014 d\xE1 para percorrer tudo a p\xE9.",
      `${IMG_NOITE}/Rua Guarani.webp`,
      ["Bares", "Food trucks"],
      "Rua Guarani, Centro \u2014 Ubatuba/SP"
    ),
    point(
      "vida-noturna",
      "baladas-shows",
      "Baladas e Shows",
      "M\xFAsica e dan\xE7a na temporada",
      "Para quem busca m\xFAsica e dan\xE7a, Ubatuba tem op\xE7\xF5es de casa noturna a beach club \u2014 com atra\xE7\xF5es variadas conforme a programa\xE7\xE3o da temporada.",
      `${IMG_NOITE}/Baladas e shows.webp`,
      ["Casas noturnas", "Beach clubs"]
    ),
    point(
      "vida-noturna",
      "teatro-artes",
      "Teatro e Artes",
      "Cultura para uma noite tranquila",
      "Op\xE7\xF5es culturais para uma noite mais tranquila \u2014 entre pe\xE7as, apresenta\xE7\xF5es e o artesanato local.",
      `${IMG_NOITE}/Teatro e Artes.webp`,
      ["Pe\xE7as", "Artesanato"],
      "Pra\xE7a Exalta\xE7\xE3o \xE0 Santa Cruz, 22 - Centro, Ubatuba - SP"
    ),
    point(
      "vida-noturna",
      "shopping",
      "Shopping",
      "Compras e lazer \xE0 noite",
      "Para um programa tranquilo, a cidade tem shoppings e galerias com lojas, alimenta\xE7\xE3o e \xE1reas de lazer \u2014 perfeito para a noite ou para dias de chuva.",
      `${IMG_NOITE}/Shopping.webp`,
      ["Shoppings", "Galerias"],
      "Rua Guarani, 374 - Itagu\xE1, Ubatuba - SP"
    ),
    point(
      "vida-noturna",
      "parque-diversao",
      "Parque de Divers\xE3o",
      "Divers\xE3o para toda a fam\xEDlia",
      "Divers\xE3o para toda a fam\xEDlia at\xE9 a noite cair: atra\xE7\xF5es e espa\xE7os de lazer que garantem o programa das crian\xE7as \u2014 e de quem \xE9 crian\xE7a por dentro.",
      `${IMG_NOITE}/Parque de divers\xE3o.webp`,
      ["Fam\xEDlia", "Crian\xE7as"],
      "Av. Iperoig - Centro, Ubatuba - SP"
    )
  ];

  // assets/js/points.js
  var API_PONTOS_URL = "/api/pontos-interesse";
  var categories = FALLBACK_CATEGORIES;
  var points = FALLBACK_POINTS;
  async function loadPoints() {
    const whatsapp = linkedWhatsApp();
    if (!whatsapp || typeof fetch === "undefined") return;
    try {
      const response = await fetch(`${API_PONTOS_URL}?whatsapp=${whatsapp}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || !Array.isArray(data.categories) || !Array.isArray(data.points)) {
        throw new Error("formato inesperado");
      }
      categories = data.categories;
      points = data.points;
    } catch {
    }
  }
  var getPoints = () => points;
  var getCategories = () => categories;
  var categoryOf = (point2) => categories.find((c) => c.id === point2.categoryId) ?? null;
  function pointCard(point2) {
    const category = categoryOf(point2);
    const location = point2.address || [point2.neighborhood, point2.city].filter(Boolean).join(" \xB7 ");
    return `
    <article class="poi-card" data-point="${point2.id}">
      <button type="button" class="poi-media" data-action="open" aria-label="Ver detalhes: ${point2.name}">
        <img
          src="${point2.image || placeholderImage(point2.name)}"
          alt="${point2.name}"
          loading="lazy"
          decoding="async"
        />
        ${category ? `<span class="poi-badge">${categoryIcon(category.icon || category.slug)}<span>${category.name}</span></span>` : ""}
        ${point2.featured ? '<span class="poi-featured">Destaque</span>' : ""}
      </button>
      <div class="poi-body">
        <h3>${point2.name}</h3>
        ${point2.context ? `<p class="poi-context">${point2.context}</p>` : ""}
        ${location ? `<p class="poi-location">${ICONS.pin}<span>${location}</span></p>` : ""}
        <button type="button" class="poi-more" data-action="open">
          Ver detalhes ${ICONS.arrowRight}
        </button>
      </div>
    </article>`;
  }
  function renderPoints() {
    const mount = document.getElementById("pointsMount");
    if (!mount) return;
    if (!linkedWhatsApp()) {
      mount.innerHTML = '<p class="section-sub">Este site ainda n\xE3o est\xE1 vinculado a uma empresa. Acesse o endere\xE7o com o n\xFAmero de WhatsApp da empresa no final (ex.: site.com/12997353792).</p>';
      return;
    }
    if (points.length === 0) {
      mount.innerHTML = '<p class="section-sub">Nenhum ponto de interesse cadastrado no momento.</p>';
      return;
    }
    const visibleCategories = categories.filter((c) => points.some((p) => p.categoryId === c.id));
    mount.innerHTML = `
    <div class="poi-filters" role="group" aria-label="Filtrar pontos de interesse por categoria">
      <button type="button" class="poi-filter is-active" data-category="all" aria-pressed="true">
        ${ICONS.compass}<span>Todos</span>
        <span class="poi-count">${points.length}</span>
      </button>
      ${visibleCategories.map((c) => {
      const count = points.filter((p) => p.categoryId === c.id).length;
      return `
      <button type="button" class="poi-filter" data-category="${c.id}" aria-pressed="false">
        ${categoryIcon(c.icon || c.slug)}<span>${c.name}</span>
        <span class="poi-count">${count}</span>
      </button>`;
    }).join("")}
    </div>
    <div class="poi-grid" data-points-grid></div>
    <p class="poi-empty" hidden>Nenhum ponto de interesse nesta categoria.</p>`;
    const grid = mount.querySelector("[data-points-grid]");
    const empty = mount.querySelector(".poi-empty");
    const filters = [...mount.querySelectorAll(".poi-filter")];
    const openPoint = (el) => {
      const point2 = points.find((p) => p.id === el.closest("[data-point]").dataset.point);
      if (point2) openPointModal(point2, categoryOf(point2));
    };
    const show = (categoryId) => {
      const list = categoryId === "all" ? points : points.filter((p) => p.categoryId === categoryId);
      empty.hidden = list.length > 0;
      grid.innerHTML = list.map(pointCard).join("");
      grid.querySelectorAll("img").forEach(guardImage);
      grid.querySelectorAll('[data-action="open"]').forEach((el) => {
        el.addEventListener("click", () => openPoint(el));
      });
    };
    filters.forEach((btn) => {
      btn.addEventListener("click", () => {
        filters.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        grid.classList.add("is-switching");
        setTimeout(() => {
          show(btn.dataset.category);
          grid.classList.remove("is-switching");
        }, 180);
      });
    });
    show("all");
  }

  // assets/js/nearby.js
  var NEARBY_LIMIT = 8;
  var esc = (text) => String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  var hasCoords = (lat, lng) => typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0);
  function haversineKm(latA, lngA, latB, lngB) {
    const R = 6371;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(latB - latA);
    const dLng = toRad(lngB - lngA);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  var formatDistance = (km) => km < 1 ? `${Math.round(km * 1e3)} m` : `${km.toFixed(1).replace(".", ",")} km`;
  var geocodeCache = /* @__PURE__ */ new Map();
  function geocode(query) {
    if (geocodeCache.has(query)) return geocodeCache.get(query);
    const promise = (async () => {
      try {
        const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt-BR&q=" + encodeURIComponent(query);
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const hit = Array.isArray(data) && data[0];
        const lat = Number(hit?.lat);
        const lng = Number(hit?.lon);
        return hasCoords(lat, lng) ? { latitude: lat, longitude: lng } : null;
      } catch {
        return null;
      }
    })();
    geocodeCache.set(query, promise);
    return promise;
  }
  async function resolveOrigin(apartment) {
    if (hasCoords(apartment.latitude, apartment.longitude)) {
      return { latitude: apartment.latitude, longitude: apartment.longitude };
    }
    const query = apartment.address || apartment.location;
    if (!query) return null;
    return geocode(query);
  }
  function nearbyItem(point2, category, distanceKm, originQuery) {
    const location = point2.address || [point2.neighborhood, point2.city].filter(Boolean).join(" \xB7 ");
    const destination = hasCoords(point2.latitude, point2.longitude) ? `${point2.latitude},${point2.longitude}` : point2.address || [point2.name, point2.city, point2.state].filter(Boolean).join(", ");
    const directionsUrl = "https://www.google.com/maps/dir/?api=1" + (originQuery ? `&origin=${encodeURIComponent(originQuery)}` : "") + `&destination=${encodeURIComponent(destination)}`;
    return `
    <li class="nearby-item">
      <span class="nearby-dist ${distanceKm == null ? "nearby-dist-unknown" : ""}">
        ${distanceKm == null ? "\u2014" : formatDistance(distanceKm)}
      </span>
      <div class="nearby-info">
        <span class="nearby-cat">
          ${categoryIcon(category?.icon || category?.slug || "")}<span>${esc(category?.name ?? "Ponto de interesse")}</span>
        </span>
        <h4>${esc(point2.name)}</h4>
        ${location ? `<p class="nearby-address">${ICONS.pin}<span>${esc(location)}</span></p>` : ""}
      </div>
      <a class="btn btn-outline btn-sm nearby-route" href="${directionsUrl}" target="_blank" rel="noopener">
        ${ICONS.compass}<span>Como chegar</span>
      </a>
    </li>`;
  }
  function nearbyHtml(apartment, origin, ranked) {
    const categories2 = getCategories();
    const categoryOf2 = (point2) => categories2.find((c) => c.id === point2.categoryId) ?? null;
    const originQuery = origin ? `${origin.latitude},${origin.longitude}` : apartment.address || apartment.location || "";
    const withDistance = ranked.filter((r) => r.distanceKm != null).length;
    const note = !origin ? "N\xE3o foi poss\xEDvel localizar o im\xF3vel automaticamente \u2014 exibindo todos os pontos cadastrados, sem dist\xE2ncias." : withDistance === 0 ? "As dist\xE2ncias aparecem quando os pontos t\xEAm localiza\xE7\xE3o cadastrada no sistema." : "Dist\xE2ncias em linha reta a partir do im\xF3vel.";
    return `
    <article class="nearby">
      <header class="nearby-head">
        <span class="badge badge-gold">${ICONS.compass}<span>Interesses pr\xF3ximos</span></span>
        <h3>Perto de ${esc(apartment.name)}</h3>
        <p class="nearby-sub">${esc(apartment.location)}</p>
      </header>

      ${ranked.length ? `<ol class="nearby-list">
              ${ranked.map(({ point: point2, distanceKm }) => nearbyItem(point2, categoryOf2(point2), distanceKm, originQuery)).join("")}
            </ol>` : '<p class="nearby-empty">Nenhum ponto de interesse cadastrado no momento.</p>'}

      <p class="nearby-note">${note}</p>
    </article>`;
  }
  async function openNearbyModal(apartment, onClose) {
    const modal = openModal(
      `<div class="nearby nearby-loading">${ICONS.compass}<p>Buscando os pontos mais pr\xF3ximos\u2026</p></div>`,
      { onClose }
    );
    const origin = await resolveOrigin(apartment);
    if (!modal.sheet.isConnected) return;
    const ranked = getPoints().map((point2) => ({
      point: point2,
      distanceKm: origin && hasCoords(point2.latitude, point2.longitude) ? haversineKm(origin.latitude, origin.longitude, point2.latitude, point2.longitude) : null
    })).sort((a, b) => a.distanceKm == null ? 1 : b.distanceKm == null ? -1 : a.distanceKm - b.distanceKm).slice(0, NEARBY_LIMIT);
    modal.body.innerHTML = nearbyHtml(apartment, origin, ranked);
  }

  // assets/js/reviews.js
  var starFilled = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  var starEmpty = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  function starsHTML(nota, max = 5, interactive = false, name = "rating") {
    const arr = [];
    for (let i = 1; i <= max; i++) {
      const filled = i <= nota;
      arr.push(`
      <button type="button" class="star-btn ${filled ? "filled" : ""}" data-value="${i}" ${interactive ? "" : "disabled"} aria-label="${i} estrela${i > 1 ? "s" : ""}">
        ${filled ? starFilled : starEmpty}
      </button>
    `);
    }
    return `<div class="stars${interactive ? " interactive" : ""}" data-stars="${name}">${arr.join("")}</div>`;
  }
  function formatDateBR(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return iso;
    }
  }
  function avaliacaoItemHTML(av) {
    return `
    <article class="review-item">
      <header class="review-header">
        <strong>${av.nome}</strong>
        <time>${formatDateBR(av.data)}</time>
      </header>
      <div class="review-stars">${starsHTML(av.nota)}</div>
      ${av.comentario ? `<p class="review-text">${av.comentario}</p>` : ""}
    </article>
  `;
  }
  function distribuicaoHTML(dist, total) {
    const bars = [5, 4, 3, 2, 1].map((n) => {
      const count = dist[n] || 0;
      const pct = total ? count / total * 100 : 0;
      return `
      <div class="dist-row">
        <span class="dist-label">${n} <span class="star-icon">${starFilled}</span></span>
        <div class="dist-bar"><span style="width:${pct}%"></span></div>
        <span class="dist-count">${count}</span>
      </div>
    `;
    }).join("");
    return `<div class="review-distribuicao">${bars}</div>`;
  }
  function openReviewsModal(imovelId, imovelName, onClose) {
    let currentData = null;
    async function loadReviews() {
      try {
        const res = await fetch(`/api/imoveis/${imovelId}/avaliacoes`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        currentData = await res.json();
        render();
      } catch (e) {
        console.error("Erro ao carregar avalia\xE7\xF5es:", e);
        document.getElementById("reviewsList").innerHTML = '<p class="review-error">Erro ao carregar avalia\xE7\xF5es.</p>';
      }
    }
    function render() {
      const { media, total, distribuicao, avaliacoes } = currentData || { media: 0, total: 0, distribuicao: {}, avaliacoes: [] };
      document.getElementById("reviewsSummary").innerHTML = `
      <div class="review-summary">
        <div class="review-score">
          <span class="score-value">${media.toFixed(1)}</span>
          <div class="score-stars">${starsHTML(Math.round(media))}</div>
          <span class="score-total">${total} avalia\xE7\xE3o${total !== 1 ? "\xF5es" : ""}</span>
        </div>
        ${distribuicaoHTML(distribuicao, total)}
      </div>
    `;
      const list = document.getElementById("reviewsList");
      if (avaliacoes && avaliacoes.length) {
        list.innerHTML = avaliacoes.map(avaliacaoItemHTML).join("");
      } else {
        list.innerHTML = '<p class="review-empty">Nenhuma avalia\xE7\xE3o ainda. Seja o primeiro a avaliar!</p>';
      }
    }
    let selectedRating = 0;
    const html = `
    <div class="reviews-modal">
      <header class="reviews-header">
        <h3>Avalia\xE7\xF5es <span class="reviews-property">${imovelName}</span></h3>
      </header>
      <div class="reviews-body">
        <section id="reviewsSummary" class="reviews-summary-section"></section>
        <section class="reviews-form-section">
          <h4>Deixe sua avalia\xE7\xE3o</h4>
          <form id="reviewForm" class="review-form">
            <div class="form-group">
              <label>Sua nota</label>
              <div class="stars interactive" data-stars="new" id="newRatingStars">
                ${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="star-btn" data-value="${i}" aria-label="${i} estrela${i > 1 ? "s" : ""}">${starEmpty}</button>`).join("")}
              </div>
              <input type="hidden" name="nota" id="notaInput" required>
            </div>
            <div class="form-group">
              <label for="nomeInput">Seu nome <span class="required">*</span></label>
              <input type="text" id="nomeInput" name="nome" required maxlength="100" placeholder="Como voc\xEA quer ser identificado">
            </div>
            <div class="form-group">
              <label for="comentarioInput">Seu coment\xE1rio (opcional)</label>
              <textarea id="comentarioInput" name="comentario" rows="3" maxlength="500" placeholder="Conte sua experi\xEAncia..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Enviar avalia\xE7\xE3o</button>
          </form>
        </section>
        <section class="reviews-list-section">
          <h4>O que dizem os h\xF3spedes</h4>
          <div id="reviewsList" class="reviews-list"></div>
        </section>
      </div>
    </div>
  `;
    const modal = openModal(html, { variant: "modal-reviews", size: "large" });
    const originalClose = modal.close;
    const customClose = () => {
      if (onClose) onClose();
      originalClose();
    };
    modal.close = customClose;
    const closeBtn = modal.sheet.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      modal.sheet.querySelector(".modal-close").addEventListener("click", customClose);
    }
    const starsContainer = modal.body.querySelector("#newRatingStars");
    starsContainer.querySelectorAll(".star-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedRating = parseInt(btn.dataset.value, 10);
        modal.body.querySelector("#notaInput").value = selectedRating;
        starsContainer.querySelectorAll(".star-btn").forEach((b, i) => {
          b.classList.toggle("filled", i < selectedRating);
          b.innerHTML = i < selectedRating ? starFilled : starEmpty;
        });
      });
      btn.addEventListener("mouseenter", () => {
        const val = parseInt(btn.dataset.value, 10);
        starsContainer.querySelectorAll(".star-btn").forEach((b, i) => {
          b.innerHTML = i < val ? starFilled : starEmpty;
        });
      });
    });
    starsContainer.addEventListener("mouseleave", () => {
      starsContainer.querySelectorAll(".star-btn").forEach((b, i) => {
        b.classList.toggle("filled", i < selectedRating);
        b.innerHTML = i < selectedRating ? starFilled : starEmpty;
      });
    });
    modal.body.querySelector("#reviewForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const nome = form.nome.value.trim();
      const nota = parseInt(form.nota.value, 10);
      const comentario = form.comentario.value.trim();
      if (!nome || !nota) return;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Enviando...";
      try {
        const res = await fetch(`/api/imoveis/${imovelId}/avaliacoes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, nota, comentario })
        });
        if (!res.ok) throw new Error("Erro ao enviar");
        form.reset();
        selectedRating = 0;
        starsContainer.querySelectorAll(".star-btn").forEach((b, i) => {
          b.classList.remove("filled");
          b.innerHTML = starEmpty;
        });
        modal.body.querySelector("#notaInput").value = "";
        await loadReviews();
      } catch (err) {
        alert("Erro ao enviar avalia\xE7\xE3o: " + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Enviar avalia\xE7\xE3o";
      }
    });
    loadReviews();
  }

  // assets/js/detail.js
  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function esc2(text) {
    return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }
  function bedsBreakdown(a) {
    const parts = [];
    if (a.doubleBeds > 0) parts.push(plural(a.doubleBeds, "cama de casal", "camas de casal"));
    if (a.singleBeds > 0) parts.push(plural(a.singleBeds, "cama de solteiro", "camas de solteiro"));
    if (a.bunkBeds > 0) parts.push(plural(a.bunkBeds, "beliche", "beliches"));
    if (a.sofaBeds > 0) parts.push(plural(a.sofaBeds, "sof\xE1-cama", "sof\xE1s-cama"));
    return parts.join(" \xB7 ");
  }
  function openApartmentDetail(apartment) {
    const images = apartment.images.length ? apartment.images : [""];
    const meta = [
      { icon: ICONS.users, label: formatGuests(apartment.capacity) },
      { icon: ICONS.bedroom, label: plural(apartment.bedrooms, "quarto", "quartos") },
      ...apartment.suites > 0 ? [{ icon: ICONS.bedroom, label: plural(apartment.suites, "su\xEDte", "su\xEDtes") }] : [],
      ...apartment.beds > 0 ? [{ icon: ICONS.bed, label: `${plural(apartment.beds, "cama", "camas")} (${bedsBreakdown(apartment)})` }] : [],
      { icon: ICONS.bath, label: plural(apartment.bathrooms, "banheiro", "banheiros") },
      ...apartment.parkingSpaces > 0 ? [{ icon: ICONS.pin, label: plural(apartment.parkingSpaces, "vaga de garagem", "vagas de garagem") }] : [],
      ...apartment.sizeM2 ? [{ icon: ICONS.area, label: `${apartment.sizeM2} m\xB2` }] : []
    ];
    const rules = [
      apartment.checkin && { label: "Check-in", value: `a partir das ${apartment.checkin}` },
      apartment.checkout && { label: "Check-out", value: `at\xE9 as ${apartment.checkout}` },
      apartment.minStay > 0 && { label: "Estadia m\xEDnima", value: plural(apartment.minStay, "noite", "noites") },
      { label: "Aceita animais", value: apartment.petsAllowed ? "Sim" : "N\xE3o" },
      { label: "Permite eventos", value: apartment.eventsAllowed ? "Sim" : "N\xE3o" },
      { label: "Permite fumar", value: apartment.smokingAllowed ? "Sim" : "N\xE3o" }
    ].filter(Boolean);
    const costs = [
      apartment.dailyPrice && { label: "Di\xE1ria (semana)", value: brl.format(apartment.dailyPrice) },
      apartment.weekendPrice && { label: "Di\xE1ria (fim de semana)", value: brl.format(apartment.weekendPrice) },
      apartment.cleaningFee && { label: "Taxa de limpeza", value: brl.format(apartment.cleaningFee) },
      apartment.securityDeposit && { label: "Cau\xE7\xE3o", value: brl.format(apartment.securityDeposit) }
    ].filter(Boolean);
    const html = `
    <article class="detail">
      <div class="detail-col-left">
        <div class="detail-gallery" data-gallery-mount></div>

        <div class="detail-blocks">
          ${apartment.amenities.length ? `<div class="detail-block">
                   <h4>Comodidades</h4>
                   <ul class="detail-amenities">
                     ${apartment.amenities.map((a) => `<li>${amenityIcon(a)}<span>${esc2(a)}</span></li>`).join("")}
                   </ul>
                 </div>` : ""}

          <div class="detail-block">
            <h4>Regras da estadia</h4>
            <ul class="detail-facts">
              ${rules.map((r) => `<li><span>${esc2(r.label)}</span><strong>${esc2(r.value)}</strong></li>`).join("")}
            </ul>
            ${apartment.houseRules ? `<p class="detail-notes">${esc2(apartment.houseRules)}</p>` : ""}
            ${apartment.guestInstructions ? `<p class="detail-notes">${esc2(apartment.guestInstructions)}</p>` : ""}
            ${!apartment.houseRules && !apartment.guestInstructions ? `<p class="detail-notes">\u{1F511}Para entrar na casa:
O port\xE3o fica encostado, na porta da sala tem o cofre com a chave dentro (senha 4995). Coloque a senha e abra a tampa, a chave da casa e do port\xE3o estar\xE1 l\xE1 dentro
\u27A1\uFE0FPorta cadeado: *4995*

\u27A1\uFE0FWi-Fi
Rede: Recanto Uba
Senha: recantouba23

\u267B\uFE0FCOLETA DE LIXO (manh\xE3)
ter\xE7a, quinta e s\xE1bado

\u{1F6AB}PROIBIDO SOM AUTOMOTIVO

\u{1F3A6} Existe uma c\xE2mera de seguran\xE7a voltada para o port\xE3o de entrada.

\u{1F3CA}\u2640\uFE0F A PISCINA PODE ser usada ap\xF3s as 23:00hs, apenas pedimos pra controlar o barulho e n\xE3o pular, pra respeitarmos os vizinhos.


Ol\xE1, boa noite , do lado de fora da casa de m\xE1quina tem 2 interruptor, lado esquerdo \xE9 o Led dentro da piscina , da direita liga os jatos de hidromassagem, com essa da hidromassagem ligado , abre a porta da casa de m\xE1quina e abre aos poucos o registro que esta escrito cascata nele ,,, quando quiser press\xE3o mais forte na hidromassagem tem que fechar a cascata , pois se utiliza apenas um motor , quando encerrar o uso , s\xF3 desligar o interruptor do lado de fora da direita

Lembrando que amanh\xE3 cedo ir\xE1 ligar automaticamente, para filtrar a \xE1gua, deixe que vai desligar automaticamente no timer</p>` : ""}
          </div>
        </div>
      </div>

      <div class="detail-info">
        <div class="detail-head">
          <div>
            ${apartment.featured ? '<span class="badge badge-gold">Destaque</span>' : ""}
            <h3>${esc2(apartment.name)}</h3>
            <p class="detail-location">${ICONS.pin}<span>${esc2(apartment.location)}</span></p>
            ${apartment.address ? `<p class="detail-address">${esc2(apartment.address)}</p>` : ""}
            ${apartment.referencePoint ? `<p class="detail-address">${esc2(apartment.referencePoint)}</p>` : ""}
          </div>
        </div>

        <ul class="detail-meta">
          ${meta.map((m) => `<li>${m.icon}<span>${esc2(m.label)}</span></li>`).join("")}
        </ul>

        ${apartment.description ? `<div class="detail-block">
                 <h4>Sobre o im\xF3vel</h4>
                 <p>${esc2(apartment.description)}</p>
               </div>` : ""}

        ${costs.length ? `<div class="detail-block">
                 <h4>Valores</h4>
                 <ul class="detail-facts">
                   ${costs.map((c) => `<li><span>${esc2(c.label)}</span><strong>${esc2(c.value)}</strong></li>`).join("")}
                 </ul>
               </div>` : ""}

        ${apartment.priceNotes ? `<div class="detail-block">
                 <h4>Observa\xE7\xF5es sobre os valores</h4>
                 <p>${esc2(apartment.priceNotes)}</p>
               </div>` : ""}

        <div class="detail-block">
          <button type="button" class="btn btn-secondary" data-action="nearby">${ICONS.compass} Interesses pr\xF3ximos</button>
        </div>
      </div>

      <div class="detail-cta">
        <div class="detail-price">
          <span class="detail-price-label">Investimento</span>
          <strong>${apartment.price ? esc2(apartment.price) : "Sob consulta"}</strong>
        </div>
        <div class="detail-actions">
          ${apartment.available ? `<button type="button" class="btn btn-primary btn-lg" data-action="rent">Alugar ${ICONS.arrowRight}</button>` : '<p class="detail-unavailable">Este im\xF3vel n\xE3o est\xE1 dispon\xEDvel no momento. Fale conosco para conhecer outras op\xE7\xF5es.</p>'}
          <button type="button" class="btn btn-secondary" data-action="reviews">Avaliar ${ICONS.star || ""}</button>
        </div>
      </div>
    </article>`;
    const modal = openModal(html, { variant: "modal-detail" });
    const gallery = createGallery(modal.body.querySelector("[data-gallery-mount]"), images, {
      alt: `Foto do ${apartment.name}`
    });
    modal.body.querySelector('[data-action="rent"]')?.addEventListener("click", () => {
      modal.close();
      setTimeout(() => openBooking(apartment), 240);
    });
    const detailOverlay = modal.sheet.closest(".modal-overlay");
    modal.body.querySelector('[data-action="reviews"]')?.addEventListener("click", () => {
      if (detailOverlay) detailOverlay.style.display = "none";
      openReviewsModal(apartment.id, apartment.name, () => {
        if (detailOverlay) detailOverlay.style.display = "flex";
      });
    });
    modal.body.querySelector('[data-action="nearby"]')?.addEventListener("click", () => {
      if (detailOverlay) detailOverlay.style.display = "none";
      openNearbyModal(apartment, () => {
        if (detailOverlay) detailOverlay.style.display = "flex";
      });
    });
    const originalClose = modal.close;
    modal.close = () => {
      gallery.destroy();
      originalClose();
    };
  }

  // assets/js/main.js
  function bindConfig() {
    document.querySelectorAll('[data-bind="brandName"]').forEach((el) => el.textContent = SITE_CONFIG.brandName);
    document.querySelectorAll('[data-bind="whatsappDisplay"]').forEach((el) => el.textContent = SITE_CONFIG.whatsappDisplay);
    const generalLink = buildWhatsAppLink(SITE_CONFIG.whatsappDefaultMessage);
    document.querySelectorAll("[data-whatsapp-general]").forEach((a) => a.href = generalLink);
  }
  function injectIcons() {
    document.querySelectorAll("[data-icon]").forEach((el) => {
      const icon = ICONS[el.dataset.icon];
      if (icon) el.innerHTML = icon;
    });
  }
  var API_IMOVEIS_URL = "/api/imoveis";
  var API_EMPRESA_URL = "/api/empresa";
  var APARTMENTS2 = APARTMENTS;
  async function loadApartments() {
    const whatsapp = linkedWhatsApp();
    if (!whatsapp) {
      APARTMENTS2 = [];
      return;
    }
    if (typeof fetch === "undefined") return;
    try {
      const response = await fetch(`${API_IMOVEIS_URL}?whatsapp=${whatsapp}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const valid = Array.isArray(data) && data.every((a) => a && a.id && a.name);
      if (valid) APARTMENTS2 = data;
    } catch {
    }
  }
  function formatWhatsAppDisplay(digits) {
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return digits;
  }
  async function loadCompany() {
    const whatsapp = linkedWhatsApp();
    if (!whatsapp || typeof fetch === "undefined") return;
    try {
      const response = await fetch(`${API_EMPRESA_URL}?whatsapp=${whatsapp}`);
      if (!response.ok) return;
      const empresa = await response.json();
      if (!empresa || !empresa.id) return;
      const digits = String(empresa.whatsapp ?? "").replace(/\D/g, "");
      if (digits) {
        const local = digits.slice(-11);
        SITE_CONFIG.whatsappNumber = "55" + local;
        SITE_CONFIG.whatsappDisplay = formatWhatsAppDisplay(local);
      }
    } catch {
    }
  }
  function apartmentCard(apartment, index) {
    const amenitiesPreview = apartment.amenities.slice(0, 3);
    const extra = apartment.amenities.length - amenitiesPreview.length;
    return `
    <article class="apt-card reveal" data-delay="${index % 3 * 100}" data-apartment="${apartment.id}">
      <button type="button" class="apt-media" data-action="details" aria-label="Ver detalhes do ${apartment.name}">
        <img src="${apartment.images[0] ?? ""}" alt="Foto do ${apartment.name}" loading="lazy" decoding="async" />
      </button>

      <div class="apt-body">
        <h3>${apartment.name}</h3>
        <p class="apt-location">${ICONS.pin}<span>${apartment.location}</span></p>

        <ul class="apt-meta">
          <li>${ICONS.users}<span>${apartment.capacity}</span></li>
          <li>${ICONS.bedroom}<span>${plural(apartment.bedrooms, "quarto", "quartos")}</span></li>
          <li>${ICONS.bed}<span>${plural(apartment.beds, "cama", "camas")}</span></li>
        </ul>

        <ul class="apt-amenities">
          ${amenitiesPreview.map((a) => `<li>${amenityIcon(a)}<span>${a}</span></li>`).join("")}
          ${extra > 0 ? `<li class="apt-more">+${extra}</li>` : ""}
        </ul>

        <div class="apt-foot">
          <div class="apt-price">
            <span>${apartment.price ? "a partir de" : "Investimento"}</span>
            <strong>${apartment.price ?? "Sob consulta"}</strong>
          </div>
          ${apartment.available ? `<button type="button" class="btn btn-primary" data-action="details">Ver detalhes</button>` : `<button type="button" class="btn btn-outline" data-action="details">Ver detalhes</button>`}
        </div>
      </div>
    </article>`;
  }
  function renderApartments() {
    const grid = document.getElementById("apartmentsGrid");
    if (!grid) return;
    if (!linkedWhatsApp()) {
      grid.innerHTML = '<p class="section-sub">Este site ainda n\xE3o est\xE1 vinculado a uma empresa. Acesse o endere\xE7o com o n\xFAmero de WhatsApp da empresa no final (ex.: site.com/12997353792).</p>';
      return;
    }
    if (APARTMENTS2.length === 0) {
      grid.innerHTML = '<p class="section-sub">Nenhum im\xF3vel dispon\xEDvel no momento.</p>';
      return;
    }
    grid.innerHTML = APARTMENTS2.map(apartmentCard).join("");
    grid.querySelectorAll("img").forEach(guardImage);
    grid.querySelectorAll('[data-action="details"]').forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.closest("[data-apartment]").dataset.apartment;
        const apartment = APARTMENTS2.find((a) => a.id === id);
        if (apartment) openApartmentDetail(apartment);
      });
    });
  }
  function initNavigation() {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("mobileMenu");
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const closeMenu = () => {
      menu.classList.remove("is-open");
      toggle.classList.remove("is-active");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
      header.classList.remove("menu-open");
      document.body.classList.remove("no-scroll");
    };
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.classList.toggle("is-active", open);
      toggle.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-hidden", String(!open));
      header.classList.toggle("menu-open", open);
      document.body.classList.toggle("no-scroll", open);
    });
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    const closeBtn = document.getElementById("mobileMenuClose");
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  }
  function initReveals() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => {
      if (el.dataset.delay) el.style.transitionDelay = `${el.dataset.delay}ms`;
      io.observe(el);
    });
  }
  function initHeroTitle() {
    const h1 = document.querySelector(".hero h1");
    if (!h1) return;
    const LETTER_STEP = 70;
    const WORD_PAUSE = 160;
    let delay = 0;
    const wrapChars = (node, parent) => {
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          delay += WORD_PAUSE;
          parent.appendChild(document.createTextNode(" "));
        } else {
          for (const char of part) {
            const span = document.createElement("span");
            span.className = "letter";
            span.style.setProperty("--d", `${delay}ms`);
            span.textContent = char;
            parent.appendChild(span);
            delay += LETTER_STEP;
          }
        }
      });
    };
    Array.from(h1.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        wrapChars(node, fragment);
        h1.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "BR") {
          delay += WORD_PAUSE;
          return;
        }
        const original = Array.from(node.childNodes);
        node.textContent = "";
        original.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) wrapChars(child, node);
          else node.appendChild(child);
        });
      }
    });
    if (!("IntersectionObserver" in window)) {
      h1.classList.add("play");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            h1.classList.add("play");
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(h1);
  }
  function setupPromoMode() {
    if (linkedWhatsApp()) return;
    document.getElementById("apartamentos")?.setAttribute("hidden", "");
    document.getElementById("pontos-interesse")?.setAttribute("hidden", "");
    document.getElementById("como-funciona")?.setAttribute("hidden", "");
    document.getElementById("leantechPromo")?.removeAttribute("hidden");
    document.querySelectorAll('a[href="#apartamentos"], a[href="#pontos-interesse"], a[href="#como-funciona"]').forEach((a) => a.setAttribute("hidden", ""));
    document.querySelectorAll("[data-whatsapp-general]").forEach((el) => el.setAttribute("hidden", ""));
    document.querySelector(".wa-float")?.setAttribute("hidden", "");
    document.querySelector(".cta-banner")?.setAttribute("hidden", "");
    document.querySelector(".site-footer")?.setAttribute("hidden", "");
  }
  function init() {
    bindConfig();
    injectIcons();
    setupPromoMode();
    renderApartments();
    renderPoints();
    initNavigation();
    initReveals();
    initHeroTitle();
    const year = document.getElementById("currentYear");
    if (year) year.textContent = String((/* @__PURE__ */ new Date()).getFullYear());
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
  async function start() {
    await Promise.all([loadApartments(), loadCompany(), loadPoints()]);
    init();
  }
})();
