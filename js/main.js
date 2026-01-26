// ======================================================================
// DOM REFERENCES
// ======================================================================
const serviceSelect = document.querySelector("#servicio-select");
const serviceLinks = document.querySelectorAll("[data-service]");
const serviceCards = document.querySelectorAll(".service-card");
const serviceGrid = document.querySelector(".service-grid");
const aboutSection = document.querySelector(".about");
const header = document.querySelector(".header");
const navWrap = document.querySelector(".nav-wrap");
const menuToggle = document.querySelector(".menu-toggle");
const langButtons = document.querySelectorAll(".lang-btn");
const langSelect = document.querySelector(".lang-select");
// ======================================================================
// CONFIGURATION & STATE
// ======================================================================
const DEFAULT_LANG = "es";
const MENU_BREAKPOINT = 900;
const LIBRARY_MOBILE_BREAKPOINT = MENU_BREAKPOINT;
const OPEN_BOOK_CONFIG = {
  width: 370,
  height: 600,
  margin: 12,
  gap: 24,
  libraryShiftBase: 350,
  bookOffsetX: 350,
};
let translations = {};
let currentLang = DEFAULT_LANG;
let clientsData = [];
let activeBook = null;
let isTransitioning = false;
let libraryMode = null;
let isLibraryShifted = false;
let libraryShiftX = 0;
let libraryAnchorLeft = null;
let queuedAction = null;
const library = document.querySelector("#library");
const libraryShelves = document.querySelector("#library-shelves");
const bookPages = new WeakMap();
const bookClients = new WeakMap();
const bookPlaceholders = new WeakMap();
const DEBUG_LIBRARY_FLOW =
  new URLSearchParams(window.location.search).has("debugLibrary");

const getBookLabel = (book) => {
  if (!book) return "none";
  const band = book.querySelector(".book-band");
  if (band && band.textContent) return band.textContent.trim();
  if (book.dataset && book.dataset.clientName) return book.dataset.clientName;
  return "book";
};

const logLibrary = (event, details = {}) => {
  if (!DEBUG_LIBRARY_FLOW) return;
  const time = Math.round(performance.now());
  console.log(`[library] ${time}ms ${event}`, {
    activeBook: getBookLabel(activeBook),
    isTransitioning,
    isLibraryShifted,
    libraryShiftX,
    ...details,
  });
};

const setIsTransitioning = (value, reason = "") => {
  if (isTransitioning === value) return;
  isTransitioning = value;
  logLibrary("flag isTransitioning", { value, reason });
};

const setActiveBook = (book, reason = "") => {
  if (activeBook === book) return;
  activeBook = book;
  logLibrary("flag activeBook", { value: getBookLabel(book), reason });
};

const setLibraryShiftState = (shifted, shiftX, reason = "") => {
  const nextShiftX =
    typeof shiftX === "number" ? Math.round(shiftX) : libraryShiftX;
  const changed =
    isLibraryShifted !== shifted || libraryShiftX !== nextShiftX;
  isLibraryShifted = shifted;
  libraryShiftX = nextShiftX;
  if (changed) {
    logLibrary("flag isLibraryShifted", {
      value: shifted,
      shiftX: libraryShiftX,
      reason,
    });
  }
};

const hasQueuedOpen = () => queuedAction && queuedAction.type === "open";

const resetLibraryShift = (options = {}) => {
  const { onComplete } = options;
  if (!library || !isLibraryShifted) {
    setLibraryShiftState(false, 0, "reset-skip");
    libraryAnchorLeft = null;
    if (onComplete) onComplete();
    return;
  }
  logLibrary("libraryShift reset start");
  if (window.gsap) {
    window.gsap.killTweensOf(library);
    window.gsap.to(library, {
      x: 0,
      duration: 0.9,
      ease: "power3.out",
      onComplete: () => {
        window.gsap.set(library, { clearProps: "transform" });
        library.classList.remove("is-shifted");
        library.style.removeProperty("--library-shift");
        setLibraryShiftState(false, 0, "reset");
        libraryAnchorLeft = null;
        logLibrary("libraryShift reset complete");
        if (onComplete) onComplete();
      },
    });
  } else {
    library.classList.remove("is-shifted");
    library.style.transform = "";
    library.style.removeProperty("--library-shift");
    setLibraryShiftState(false, 0, "reset");
    libraryAnchorLeft = null;
    logLibrary("libraryShift reset complete");
    if (onComplete) onComplete();
  }
};

const alignDetachedBookToPlaceholder = (book) => {
  if (!book || book.dataset.detached !== "true") return;
  const payload = bookPlaceholders.get(book);
  if (!payload || !payload.placeholder) return;
  const placeholderRect = payload.placeholder.getBoundingClientRect();
  const targetLeft = Math.round(placeholderRect.left + window.scrollX);
  const targetTop = Math.round(placeholderRect.top + window.scrollY);
  const currentRect = book.getBoundingClientRect();
  const currentLeft = currentRect.left + window.scrollX;
  const currentTop = currentRect.top + window.scrollY;
  const deltaX = Math.round(currentLeft - targetLeft);
  const deltaY = Math.round(currentTop - targetTop);

  book.style.left = `${targetLeft}px`;
  book.style.top = `${targetTop}px`;
  book.dataset.detachedLeft = `${targetLeft}`;
  book.dataset.detachedTop = `${targetTop}`;

  if (window.gsap) {
    window.gsap.set(book, { x: deltaX, y: deltaY });
  } else {
    book.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
  }
  logLibrary("alignDetachedBook", { book: getBookLabel(book), deltaX, deltaY });
};

// ======================================================================
// SERVICE METADATA
// ======================================================================
const serviceIcons = {
  analisis:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="20" x2="20" y2="20"></line><rect x="5" y="11" width="3" height="7" rx="1"></rect><rect x="10.5" y="8" width="3" height="10" rx="1"></rect><rect x="16" y="5" width="3" height="13" rx="1"></rect></svg>',
  marketing:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11h4l7-4v10l-7-4H4z"></path><path d="M8 13v4a2 2 0 0 0 2 2"></path><line x1="17" y1="9" x2="20" y2="8"></line><line x1="17" y1="12" x2="20" y2="12"></line><line x1="17" y1="15" x2="20" y2="16"></line></svg>',
  automatizacion:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 4.5v2.2M12 17.3v2.2M4.7 12h2.2M17.1 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M6.1 17.9l1.6-1.6M16.3 7.7l1.6-1.6"></path></svg>',
  desarrollo:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 5 12 9 18"></polyline><polyline points="15 6 19 12 15 18"></polyline></svg>',
  default:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"></circle></svg>',
};
const serviceMatchers = [
  {
    key: "analisis",
    tokens: ["analisis", "analysis", "datos", "data", "dati", "dados"],
  },
  {
    key: "marketing",
    tokens: ["marketing", "casos", "cases", "casi", "camp"],
  },
  {
    key: "automatizacion",
    tokens: ["automat", "automation", "automa", "automazione", "automacao"],
  },
  {
    key: "desarrollo",
    tokens: [
      "producto",
      "product",
      "app",
      "desarrollo",
      "desenvolv",
      "svilupp",
      "development",
      "dev",
    ],
  },
];
const serviceLabelKeys = {
  analisis: "services.analysis.title",
  marketing: "services.marketing.title",
  desarrollo: "services.desarrollo.title",
  automatizacion: "services.automatizacion.title",
};
const serviceFallbackLabels = {
  analisis: "Análisis",
  marketing: "Marketing",
  desarrollo: "Desarrollo",
  automatizacion: "Automatización",
  default: "Servicio",
};

// ======================================================================
// TEXT & SERVICE HELPERS
// ======================================================================
const normalizeText = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getServiceKey = (title) => {
  const normalized = normalizeText(title);
  if (!normalized) return "default";
  const match = serviceMatchers.find((matcher) =>
    matcher.tokens.some((token) => normalized.includes(token))
  );
  return match ? match.key : "default";
};

const getServiceLabel = (key) => {
  const labelKey = serviceLabelKeys[key];
  if (labelKey) {
    const translated = getTranslation(labelKey);
    if (translated) return translated;
  }
  return serviceFallbackLabels[key] || serviceFallbackLabels.default;
};

// ======================================================================
// SERVICE SELECTION (CONTACT FORM)
// ======================================================================
const normalizeService = (value) => {
  if (!value) return "";
  return value.trim();
};

const setServiceValue = (value) => {
  if (!serviceSelect || !value) return;
  const normalized = normalizeService(value);
  const option = Array.from(serviceSelect.options).find(
    (opt) => opt.value === normalized
  );
  if (option) {
    serviceSelect.value = normalized;
  }
};

const scrollToContact = () => {
  const target = document.querySelector("#contacto");
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const readServiceFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const service = params.get("service");
  if (service) {
    setServiceValue(service);
  }
};

// ======================================================================
// HEADER & NAV MENU
// ======================================================================
const updateHeaderState = () => {
  if (!header) return;
  const triggerPoint = 10;
  if (window.scrollY > triggerPoint) {
    header.classList.add("is-fixed");
  } else {
    header.classList.remove("is-fixed");
  }
};

const setMenuState = (isOpen) => {
  if (!navWrap || !menuToggle || !header) return;
  navWrap.classList.toggle("is-open", isOpen);
  header.classList.toggle("is-menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menu" : "Abrir menu");
  document.body.classList.toggle("menu-open", isOpen);
};

const toggleMenu = () => {
  if (!navWrap) return;
  setMenuState(!navWrap.classList.contains("is-open"));
};

const handleResize = () => {
  updateHeaderState();
  if (window.innerWidth > MENU_BREAKPOINT) {
    setMenuState(false);
  }
  repositionActiveBook();
  updateLibraryLayout();
};

const isLibraryMobile = () =>
  window.innerWidth <= LIBRARY_MOBILE_BREAKPOINT;

// ======================================================================
// TRANSLATIONS & CLIENT LABELS
// ======================================================================
const getTranslation = (key) => {
  if (translations[currentLang] && translations[currentLang][key]) {
    return translations[currentLang][key];
  }
  if (translations[DEFAULT_LANG] && translations[DEFAULT_LANG][key]) {
    return translations[DEFAULT_LANG][key];
  }
  return "";
};

const getClientName = (client, lang) => {
  if (!client) return "Cliente";
  const name =
    (client.name && client.name[lang]) ||
    (client.name && client.name[DEFAULT_LANG]) ||
    client.name;
  return name || "Cliente";
};

// ======================================================================
// LIBRARY RENDERING (MOBILE + DESKTOP)
// ======================================================================
const resetLibraryState = () => {
  if (window.gsap) {
    window.gsap.killTweensOf([library, activeBook]);
  }
  if (activeBook) {
    logLibrary("resetLibraryState activeBook cleanup");
    const cover = activeBook.querySelector(".book-cover");
    activeBook.classList.remove("is-selected", "is-open", "is-closing");
    activeBook.style.transform = "";
    if (cover) {
      cover.style.transform = "";
      cover.style.width = "";
    }
    reattachBook(activeBook);
    setActiveBook(null, "resetLibraryState");
  }
  if (library) {
    library.classList.remove("is-shifted");
    library.style.transform = "";
    library.style.removeProperty("--library-shift");
  }
  setLibraryShiftState(false, 0, "resetLibraryState");
  libraryAnchorLeft = null;
  setIsTransitioning(false, "resetLibraryState");
  queuedAction = null;
};

const renderLibraryCards = (lang) => {
  if (!library || !libraryShelves) return;
  resetLibraryState();
  library.classList.add("is-mobile");
  libraryShelves.innerHTML = "";

  const fragment = document.createDocumentFragment();
  clientsData.forEach((client) => {
    const stack = document.createElement("div");
    stack.className = "client-stack";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "client-stack-toggle";
    toggle.setAttribute("aria-expanded", "false");

    const title = document.createElement("h3");
    title.className = "client-stack-title";
    title.textContent = getClientName(client, lang);
    toggle.appendChild(title);
    stack.appendChild(toggle);

    const body = document.createElement("div");
    body.className = "client-stack-body";
    body.style.height = "0px";

    const pages =
      (client.pages && client.pages[lang]) ||
      (client.pages && client.pages[DEFAULT_LANG]) ||
      [];

    pages.forEach((page, pageIndex) => {
      if (!page) return;
      const card = document.createElement("article");
      card.className = "client-page-card";
      if (pageIndex % 2 === 1) {
        card.classList.add("is-right");
      }

      const serviceKey = getServiceKey(page.title);
      card.classList.add(`is-${serviceKey}`);

      const header = document.createElement("div");
      header.className = "client-page-header";

      const icon = document.createElement("span");
      icon.className = "client-page-icon";
      icon.innerHTML = serviceIcons[serviceKey] || serviceIcons.default;

      const headings = document.createElement("div");
      headings.className = "client-page-headings";

      const kicker = document.createElement("span");
      kicker.className = "client-page-kicker";
      kicker.textContent = getServiceLabel(serviceKey);

      const subtitle = document.createElement("h4");
      subtitle.className = "client-page-title";
      subtitle.textContent = page.subtitle || "";

      headings.appendChild(kicker);
      headings.appendChild(subtitle);
      header.appendChild(icon);
      header.appendChild(headings);

      const text = document.createElement("p");
      text.className = "client-page-text";
      text.textContent = page.text || "";

      const list = document.createElement("ul");
      list.className = "client-page-list";
      const bullets = Array.isArray(page.bullets) ? page.bullets : [];
      bullets.forEach((bullet) => {
        const item = document.createElement("li");
        item.textContent = bullet;
        list.appendChild(item);
      });

      card.appendChild(header);
      card.appendChild(text);
      if (bullets.length) {
        card.appendChild(list);
      }

      body.appendChild(card);
    });

    stack.appendChild(body);
    fragment.appendChild(stack);
  });

  libraryShelves.appendChild(fragment);
};

const buildServicesPage = (client, pages) => {
  const fragment = document.createDocumentFragment();

  const wrapper = document.createElement("div");
  wrapper.className = "book-cv";

  const header = document.createElement("header");
  header.className = "book-cv-header";

  const kicker = document.createElement("span");
  kicker.className = "book-cv-kicker";
  kicker.textContent =
    getTranslation("clients.cv.kicker") || "Cliente";

  const name = document.createElement("h3");
  name.className = "book-cv-name";
  name.textContent = getClientName(client, currentLang);

  const firstPage = pages && pages.length ? pages[0] : null;
  const taglineText = firstPage && firstPage.subtitle ? firstPage.subtitle : "";
  const aboutText = firstPage && firstPage.text ? firstPage.text : "";

  const tagline = document.createElement("p");
  tagline.className = "book-cv-tagline";
  tagline.textContent = taglineText || "";

  header.appendChild(kicker);
  header.appendChild(name);
  if (tagline.textContent) {
    header.appendChild(tagline);
  }

  const about = document.createElement("section");
  about.className = "book-cv-section";

  const aboutTitle = document.createElement("span");
  aboutTitle.className = "book-cv-title";
  aboutTitle.textContent =
    getTranslation("clients.cv.about") || "Acerca de";

  const aboutBody = document.createElement("p");
  aboutBody.className = "book-cv-text";
  aboutBody.textContent = aboutText;

  about.appendChild(aboutTitle);
  about.appendChild(aboutBody);

  const services = document.createElement("section");
  services.className = "book-cv-section";

  const servicesTitle = document.createElement("span");
  servicesTitle.className = "book-cv-title";
  servicesTitle.textContent =
    getTranslation("clients.cv.services") || "Servicios brindados";

  const list = document.createElement("div");
  list.className = "book-services-list";

  pages.forEach((page) => {
    if (!page) return;
    const serviceKey = getServiceKey(page.title);

    const row = document.createElement("div");
    row.className = `book-service-row is-${serviceKey}`;

    const icon = document.createElement("span");
    icon.className = "book-service-icon";
    icon.innerHTML = serviceIcons[serviceKey] || serviceIcons.default;

    const content = document.createElement("div");
    content.className = "book-service-content";

    const name = document.createElement("span");
    name.className = "book-service-name";
    name.textContent = getServiceLabel(serviceKey);

    const subtitle = document.createElement("span");
    subtitle.className = "book-service-sub";
    subtitle.textContent = page.subtitle || "";

    const hint = document.createElement("span");
    hint.className = "book-service-meta";
    const firstBullet = Array.isArray(page.bullets) ? page.bullets[0] : "";
    hint.textContent = firstBullet || page.text || "";

    content.appendChild(name);
    if (subtitle.textContent) {
      content.appendChild(subtitle);
    }
    if (hint.textContent) {
      content.appendChild(hint);
    }

    row.appendChild(icon);
    row.appendChild(content);
    list.appendChild(row);
  });

  services.appendChild(servicesTitle);
  services.appendChild(list);

  const lastPage = pages && pages.length ? pages[pages.length - 1] : null;
  const conclusionText =
    (lastPage && lastPage.text) || aboutText || "";

  const conclusions = document.createElement("section");
  conclusions.className = "book-cv-section";

  const conclusionsTitle = document.createElement("span");
  conclusionsTitle.className = "book-cv-title";
  conclusionsTitle.textContent =
    getTranslation("clients.cv.conclusions") || "Conclusiones";

  const conclusionsBody = document.createElement("p");
  conclusionsBody.className = "book-cv-text";
  conclusionsBody.textContent = conclusionText;

  conclusions.appendChild(conclusionsTitle);
  conclusions.appendChild(conclusionsBody);

  const cases = document.createElement("section");
  cases.className = "book-cv-section";

  const casesTitle = document.createElement("span");
  casesTitle.className = "book-cv-title";
  casesTitle.textContent =
    getTranslation("clients.cv.cases") || "Casos de exito";

  const casesList = document.createElement("ul");
  casesList.className = "book-cv-list";

  const bulletItems = pages
    .flatMap((page) => (Array.isArray(page.bullets) ? page.bullets : []))
    .filter(Boolean);
  const caseItems = bulletItems.length
    ? bulletItems.slice(0, 4)
    : pages
        .map((page) => page.subtitle)
        .filter(Boolean)
        .slice(0, 4);

  caseItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    casesList.appendChild(li);
  });

  cases.appendChild(casesTitle);
  cases.appendChild(casesList);

  const footer = document.createElement("div");
  footer.className = "book-cv-footer";
  footer.appendChild(conclusions);
  footer.appendChild(cases);

  wrapper.appendChild(header);
  if (aboutText) {
    wrapper.appendChild(about);
  }
  wrapper.appendChild(services);
  wrapper.appendChild(footer);

  fragment.appendChild(wrapper);

  return fragment;
};

const renderServicesContent = (container, pages, client) => {
  if (!container) return;
  container.innerHTML = "";
  if (!pages || !pages.length) {
    container.classList.add("is-empty");
    return;
  }
  container.classList.remove("is-empty");
  container.appendChild(buildServicesPage(client, pages));
};

const applyServicesScale = (book, scale) => {
  if (!book) return;
  const services = book.querySelector(".book-page-services");
  if (!services) return;
  if (!scale || scale === 1) {
    services.style.transform = "";
    services.style.width = "";
    services.style.height = "";
    return;
  }
  const percent = 100 / scale;
  services.style.transform = `scale(${scale})`;
  services.style.width = `${percent}%`;
  services.style.height = `${percent}%`;
};

const renderBookPages = (book) => {
  if (!book) return;
  const pages = bookPages.get(book) || [];
  const client = bookClients.get(book);
  const coverInner = book.querySelector(".book-cover-inner");
  const right = book.querySelector(".book-page-right");
  if (coverInner) {
    coverInner.innerHTML = "";
    coverInner.classList.add("is-empty");
  }
  renderServicesContent(right, pages, client);
  applyServicesScale(book, Number(book.dataset.contentScale || 1));
};

const createBook = (client, lang) => {
  const width = 64;

  const book = document.createElement("div");
  book.className = "book";
  book.style.setProperty("--book-width", `${width}px`);
  book.dataset.baseWidth = `${width}`;

  const back = document.createElement("div");
  back.className = "book-back";

  const rightPage = document.createElement("div");
  rightPage.className = "book-page book-page-right book-page-services";
  back.appendChild(rightPage);

  const stack = document.createElement("div");
  stack.className = "book-stack";

  const cover = document.createElement("div");
  cover.className = "book-cover";

  const band = document.createElement("div");
  band.className = "book-band";
  const name = getClientName(client, lang);
  band.textContent = name;

  cover.appendChild(band);
  book.appendChild(back);
  stack.appendChild(cover);

  const pageData =
    (client.pages && client.pages[lang]) ||
    (client.pages && client.pages[DEFAULT_LANG]) ||
    [];
  bookPages.set(book, pageData);
  bookClients.set(book, client);

  const coverInner = document.createElement("div");
  coverInner.className = "book-cover-inner book-page";
  cover.appendChild(coverInner);

  book.appendChild(stack);
  renderBookPages(book);

  return book;
};

const createEmptySlot = () => {
  const width = 64;
  const book = document.createElement("div");
  book.className = "book book-empty";
  book.dataset.empty = "true";
  book.style.setProperty("--book-width", `${width}px`);

  const back = document.createElement("div");
  back.className = "book-back";

  const stack = document.createElement("div");
  stack.className = "book-stack";

  const cover = document.createElement("div");
  cover.className = "book-cover";

  const band = document.createElement("div");
  band.className = "book-band";
  band.textContent = "Vacío";

  cover.appendChild(band);
  book.appendChild(back);
  stack.appendChild(cover);
  book.appendChild(stack);

  return book;
};

const renderLibrary = (lang) => {
  if (!libraryShelves) return;
  if (!clientsData.length) return;
  const isMobile = isLibraryMobile();
  libraryMode = isMobile ? "mobile" : "desktop";
  if (isMobile) {
    renderLibraryCards(lang);
    return;
  }
  resetLibraryState();
  if (library) {
    library.classList.remove("is-mobile");
  }
  libraryShelves.innerHTML = "";

  const slotsPerShelf = 6;
  const totalSlots = Math.max(
    slotsPerShelf * 2,
    Math.ceil(clientsData.length / slotsPerShelf) * slotsPerShelf
  );
  let clientIndex = 0;

  for (let shelfIndex = 0; shelfIndex < totalSlots; shelfIndex += slotsPerShelf) {
    const shelf = document.createElement("div");
    shelf.className = "shelf";
    for (let slot = 0; slot < slotsPerShelf; slot += 1) {
      if (clientIndex < clientsData.length) {
        shelf.appendChild(createBook(clientsData[clientIndex], lang));
        clientIndex += 1;
      } else {
        shelf.appendChild(createEmptySlot());
      }
    }
    libraryShelves.appendChild(shelf);
  }
};

// ======================================================================
// ANIMATION HELPERS
// ======================================================================
const animate = (target, props) => {
  if (window.gsap) {
    return window.gsap.to(target, props);
  }
  Object.assign(target.style, props);
  return null;
};

const setupServiceCardAnimations = () => {
  if (!serviceCards.length) return;
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !window.IntersectionObserver) {
    serviceCards.forEach((card) => {
      card.style.opacity = "1";
      card.style.transform = "none";
    });
    return;
  }

  const trigger = serviceGrid || document.querySelector(".services");
  if (!trigger) return;

  const getColumns = () => {
    if (!serviceGrid) return 2;
    const template = getComputedStyle(serviceGrid).gridTemplateColumns;
    const count = template ? template.split(" ").filter(Boolean).length : 0;
    return count || 2;
  };

  const setDirections = () => {
    const columns = Math.max(1, getColumns());
    serviceCards.forEach((card, index) => {
      const columnIndex = index % columns;
      const direction =
        columns === 1 || columnIndex < columns / 2 ? "left" : "right";
      card.dataset.reveal = direction;
    });
  };

  const getOffset = (card) => (card.dataset.reveal === "left" ? -200 : 200);

  const setHidden = (card) => {
    const xOffset = getOffset(card);
    card.dataset.state = "hidden";
    if (window.gsap) {
      window.gsap.set(card, { autoAlpha: 0, x: xOffset });
    } else {
      card.style.opacity = "0";
      card.style.transform = `translateX(${xOffset}px)`;
    }
  };

  const animateIn = (card) => {
    if (window.gsap) {
      window.gsap.killTweensOf(card);
      window.gsap.to(card, {
        autoAlpha: 1,
        x: 0,
        duration: 0.8,
        ease: "power3.out",
      });
    } else {
      card.style.opacity = "1";
      card.style.transform = "translateX(0)";
    }
  };

  const showAll = () => {
    serviceCards.forEach((card) => {
      if (card.dataset.state === "visible") return;
      card.dataset.state = "visible";
      animateIn(card);
    });
  };

  setDirections();
  serviceCards.forEach(setHidden);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== trigger) return;
        if (entry.isIntersecting) {
          setDirections();
          showAll();
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -10px 0px" }
  );

  observer.observe(trigger);
};

const setupAboutReveal = () => {
  if (!aboutSection) return;
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !window.IntersectionObserver) {
    return;
  }

  aboutSection.classList.add("about-reveal", "is-hidden");

  const setVisible = () => {
    aboutSection.classList.add("is-visible");
    aboutSection.classList.remove("is-hidden");
  };

  const rect = aboutSection.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    requestAnimationFrame(() => {
      setVisible();
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== aboutSection) return;
        if (entry.isIntersecting) {
          setVisible();
          observer.unobserve(aboutSection);
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(aboutSection);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getOpenBookSize = () => {
  const { width, height, margin } = OPEN_BOOK_CONFIG;
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const availableHeight = window.innerHeight - margin * 2 - headerHeight;
  const availableWidth = window.innerWidth - margin * 2;
  const targetHeight = Math.min(height, Math.max(320, availableHeight));
  const targetWidth = Math.min(width, Math.max(280, availableWidth));
  return {
    targetWidth: Math.round(targetWidth),
    targetHeight: Math.round(targetHeight),
  };
};

const getLibraryAnchorLeft = () => {
  if (libraryAnchorLeft !== null) return libraryAnchorLeft;
  const referenceBook = libraryShelves
    ? libraryShelves.querySelector(".book:not(.book-empty)")
    : null;
  const referenceRect = referenceBook
    ? referenceBook.getBoundingClientRect()
    : library
      ? library.getBoundingClientRect()
      : null;
  const baseLeft = referenceRect ? referenceRect.left : 0;
  libraryAnchorLeft = Math.round(baseLeft);
  return libraryAnchorLeft;
};

const getLibraryShift = (targetWidth) => {
  if (!library) return 0;
  const { margin, gap, libraryShiftBase } = OPEN_BOOK_CONFIG;
  const viewportWidth = window.innerWidth;
  const libraryRect = library.getBoundingClientRect();
  let shift = -libraryShiftBase;
  const availableRight = viewportWidth - margin - (libraryRect.right + shift);
  const needed = targetWidth + gap - availableRight;
  if (needed > 0) {
    shift -= needed;
  }
  return Math.round(shift);
};

const getBookAnchor = (targetWidth, targetHeight, options = {}) => {
  const { lockLibrary = false, libraryShift = 0 } = options;
  const { margin } = OPEN_BOOK_CONFIG;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const minLeft = margin;
  const maxLeft = Math.max(minLeft, viewportWidth - margin - targetWidth);
  const minTop = margin + headerHeight;
  const maxTop = Math.max(minTop, viewportHeight - margin - targetHeight);

  let targetLeft = Math.round((viewportWidth - targetWidth) * 0.62);
  let targetTop = Math.round((viewportHeight - targetHeight) / 2);
  if (library) {
    const libraryRect = library.getBoundingClientRect();
    const effectiveLeft = lockLibrary ? libraryRect.left : libraryRect.left + libraryShift;
    targetLeft = effectiveLeft;
    targetTop = libraryRect.top + (libraryRect.height - targetHeight) / 2;
  }
  targetLeft = clamp(targetLeft, minLeft, maxLeft);
  targetTop = clamp(Math.round(targetTop), minTop, maxTop);

  return { targetLeft, targetTop };
};

const getBookOriginRect = (book) => {
  if (!book) return null;
  const storedLeft = Number(book.dataset.detachedLeft);
  const storedTop = Number(book.dataset.detachedTop);
  if (Number.isFinite(storedLeft) && Number.isFinite(storedTop)) {
    return {
      left: storedLeft - window.scrollX,
      top: storedTop - window.scrollY,
    };
  }
  return book.getBoundingClientRect();
};

// ======================================================================
// BOOK OPEN/CLOSE INTERACTIONS
// ======================================================================
const getOpenOffsets = (book, options = {}) => {
  if (!book) {
    return {
      libraryShift: 0,
      bookShift: 0,
      bookShiftY: 0,
      targetWidth: 0,
      targetHeight: 0,
    };
  }
  const {
    lockLibrary = false,
    libraryShift: forcedShift,
    targetWidth: forcedWidth,
    targetHeight: forcedHeight,
  } = options;
  const size =
    forcedWidth && forcedHeight ? { targetWidth: forcedWidth, targetHeight: forcedHeight } : getOpenBookSize();
  const targetWidth = forcedWidth || size.targetWidth;
  const targetHeight = forcedHeight || size.targetHeight;
  const libraryShift =
    typeof forcedShift === "number" ? forcedShift : getLibraryShift(targetWidth);
  const { targetTop } = getBookAnchor(targetWidth, targetHeight, {
    lockLibrary,
    libraryShift,
  });
  const referenceLeft = getLibraryAnchorLeft();
  const bookRect = getBookOriginRect(book);
  const deltaX = bookRect.left - referenceLeft;
  const bookShift = OPEN_BOOK_CONFIG.bookOffsetX - deltaX;
  const bookShiftY = targetTop - bookRect.top;
  return {
    libraryShift,
    bookShift: Math.round(bookShift),
    bookShiftY: Math.round(bookShiftY),
    targetWidth,
    targetHeight,
  };
};

const detachBook = (book) => {
  if (!book || book.dataset.detached === "true") {
    logLibrary("detachBook skip", {
      book: getBookLabel(book),
      reason: !book ? "no-book" : "already-detached",
    });
    return null;
  }
  logLibrary("detachBook start", { book: getBookLabel(book) });
  const rect = book.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.className = "book-placeholder";
  placeholder.style.width = `${rect.width}px`;
  placeholder.style.height = `${rect.height}px`;

  const parent = book.parentElement;
  const nextSibling = book.nextSibling;
  if (parent) {
    parent.insertBefore(placeholder, book);
  }

  document.body.appendChild(book);
  book.style.position = "absolute";
  const detachedLeft = rect.left + window.scrollX;
  const detachedTop = rect.top + window.scrollY;
  book.style.left = `${detachedLeft}px`;
  book.style.top = `${detachedTop}px`;
  book.style.width = `${rect.width}px`;
  book.style.height = `${rect.height}px`;
  book.style.margin = "0";
  book.style.zIndex = "30";
  book.dataset.detached = "true";
  book.dataset.detachedLeft = `${detachedLeft}`;
  book.dataset.detachedTop = `${detachedTop}`;

  const payload = { placeholder, parent, nextSibling };
  bookPlaceholders.set(book, payload);
  logLibrary("detachBook complete", { book: getBookLabel(book) });
  return payload;
};

const reattachBook = (book) => {
  const payload = bookPlaceholders.get(book);
  if (!payload) {
    logLibrary("reattachBook skip", { book: getBookLabel(book) });
    return;
  }
  logLibrary("reattachBook start", { book: getBookLabel(book) });
  const { placeholder, parent, nextSibling } = payload;
  if (parent) {
    if (nextSibling && nextSibling.parentElement === parent) {
      parent.insertBefore(book, nextSibling);
    } else {
      parent.insertBefore(book, placeholder || null);
    }
  }
  if (placeholder && placeholder.parentElement) {
    placeholder.parentElement.removeChild(placeholder);
  }
  bookPlaceholders.delete(book);
  delete book.dataset.detached;
  delete book.dataset.detachedLeft;
  delete book.dataset.detachedTop;
  book.style.position = "";
  book.style.left = "";
  book.style.top = "";
  book.style.margin = "";
  book.style.zIndex = "";
  logLibrary("reattachBook complete", { book: getBookLabel(book) });
};

const queueAction = (action) => {
  queuedAction = action;
  logLibrary("queueAction", {
    action: action ? action.type : "none",
    book: action && action.book ? getBookLabel(action.book) : undefined,
  });
};

const flushQueuedAction = () => {
  if (isTransitioning) {
    logLibrary("flushQueuedAction skip", { reason: "transitioning" });
    return;
  }
  if (!queuedAction) {
    logLibrary("flushQueuedAction skip", { reason: "empty" });
    return;
  }
  const action = queuedAction;
  queuedAction = null;
  logLibrary("flushQueuedAction run", {
    action: action.type,
    book: action.book ? getBookLabel(action.book) : undefined,
  });
  if (action.type === "open") {
    requestBookOpen(action.book);
  } else if (action.type === "close") {
    requestBookClose();
  }
};

const requestBookOpen = (book) => {
  if (!book) return;
  logLibrary("requestBookOpen start", { book: getBookLabel(book) });
  if (isTransitioning) {
    queueAction({ type: "open", book });
    return;
  }
  if (activeBook === book) {
    requestBookClose();
    return;
  }
  if (activeBook) {
    setIsTransitioning(true, "requestBookOpen switch");
    closeBook({
      onComplete: () => {
        logLibrary("requestBookOpen switch close complete", {
          nextBook: getBookLabel(book),
        });
        openBook(book);
      },
    });
    return;
  }
  setIsTransitioning(true, "requestBookOpen");
  openBook(book);
};

const requestBookClose = () => {
  logLibrary("requestBookClose start", {
    book: getBookLabel(activeBook),
  });
  if (isTransitioning) {
    queueAction({ type: "close" });
    return;
  }
  if (!activeBook) {
    logLibrary("requestBookClose skip", { reason: "no-active" });
    return;
  }
  setIsTransitioning(true, "requestBookClose");
  closeBook({
    onComplete: () => {
      logLibrary("requestBookClose close complete");
      const shouldResetLibrary = !activeBook && !hasQueuedOpen();
      if (shouldResetLibrary) {
        resetLibraryShift({
          onComplete: () => {
            setIsTransitioning(false, "requestBookClose reset complete");
            flushQueuedAction();
          },
        });
      } else {
        setIsTransitioning(false, "requestBookClose complete");
        flushQueuedAction();
      }
    },
  });
};

const openBook = (book) => {
  if (!book) return;
  const shouldShiftLibrary = !isLibraryShifted;
  logLibrary("openBook start", {
    book: getBookLabel(book),
    shouldShiftLibrary,
  });
  const cover = book.querySelector(".book-cover");
  if (window.gsap) {
    window.gsap.killTweensOf([book, cover, library]);
  }
  setActiveBook(book, "openBook");
  const baseRect = book.getBoundingClientRect();
  book.dataset.baseWidthActual = `${Math.round(baseRect.width)}`;
  book.dataset.baseHeightActual = `${Math.round(baseRect.height)}`;
  detachBook(book);

  const { targetWidth, targetHeight } = getOpenBookSize();
  const libraryShift = shouldShiftLibrary
    ? getLibraryShift(targetWidth)
    : libraryShiftX;
  const { bookShift, bookShiftY } = getOpenOffsets(book, {
    lockLibrary: !shouldShiftLibrary,
    libraryShift,
    targetWidth,
    targetHeight,
  });
  const coverWidth = Math.min(300, targetWidth);
  book.dataset.openCoverWidth = `${coverWidth}`;
  const contentScale = 1;
  book.dataset.contentScale = `${contentScale}`;
  applyServicesScale(book, contentScale);

  book.classList.add("is-selected", "is-open");
  if (shouldShiftLibrary && library) {
    setLibraryShiftState(true, libraryShift, "openBook");
    if (!window.gsap) {
      library.style.setProperty("--library-shift", `${libraryShiftX}px`);
      library.classList.add("is-shifted");
    }
  }

  const tl = window.gsap ? window.gsap.timeline() : null;
  if (tl) {
    if (library && shouldShiftLibrary) {
      tl.to(library, { x: libraryShift, duration: 0.9, ease: "power3.out" }, 0);
    }
    tl.to(
      book,
      {
        x: bookShift,
        y: bookShiftY,
        width: targetWidth,
        height: targetHeight,
        duration: 0.9,
        ease: "power3.out",
      },
      0
    )
      .to(
        cover,
        {
          rotateY: -165,
          width: coverWidth,
          duration: 1.1,
          ease: "power3.out",
        },
        0.1
      )
      .add(() => {
        logLibrary("openBook complete", { book: getBookLabel(book) });
        setIsTransitioning(false, "openBook complete");
        flushQueuedAction();
      });
  } else {
    animate(book, {
      transform: `translate3d(${bookShift}px, ${bookShiftY}px, 0)`,
      width: `${targetWidth}px`,
      height: `${targetHeight}px`,
    });
    cover.style.width = `${coverWidth}px`;
    animate(cover, { transform: "rotateY(-165deg)" });
    logLibrary("openBook complete", { book: getBookLabel(book) });
    setIsTransitioning(false, "openBook complete");
    flushQueuedAction();
  }
};

const closeBook = (options = {}) => {
  if (!activeBook) {
    if (options.onComplete) options.onComplete();
    return;
  }
  const { onComplete } = options;
  const book = activeBook;
  const cover = book.querySelector(".book-cover");
  logLibrary("closeBook start", {
    book: getBookLabel(book),
  });
  setActiveBook(null, "closeBook");
  book.classList.add("is-closing");
  const baseWidthVar = Number(book.dataset.baseWidth || 64);
  const baseWidth = Number(book.dataset.baseWidthActual || baseWidthVar);
  const baseHeight = Number(
    book.dataset.baseHeightActual || book.getBoundingClientRect().height
  );

  if (window.gsap) {
    window.gsap.killTweensOf([book, cover, library]);
  }
  alignDetachedBookToPlaceholder(book);

  const finishClose = () => {
    book.classList.remove("is-selected", "is-open", "is-closing");
    book.style.width = "";
    book.style.height = "";
    book.style.setProperty("--book-width", `${baseWidthVar}px`);
    if (window.gsap) {
      window.gsap.set(book, { clearProps: "transform" });
      if (cover) {
        window.gsap.set(cover, { clearProps: "transform" });
      }
    } else {
      book.style.transform = "";
      if (cover) {
        cover.style.transform = "";
      }
    }
    if (cover) {
      cover.style.width = "";
    }
    delete book.dataset.openCoverWidth;
    delete book.dataset.contentScale;
    applyServicesScale(book, 1);
    reattachBook(book);
    logLibrary("closeBook complete", { book: getBookLabel(book) });
    if (onComplete) onComplete();
  };

  const tl = window.gsap ? window.gsap.timeline() : null;
  if (tl) {
    tl.to(
      cover,
      { rotateY: 0, width: baseWidth, duration: 0.9, ease: "power3.out" },
      0
    )
      .to(
        book,
        {
          x: 0,
          y: 0,
          width: baseWidth,
          height: baseHeight,
          duration: 0.9,
          ease: "power3.out",
        },
        0
      );
    tl.add(() => {
      finishClose();
    });
  } else {
    book.style.width = `${baseWidth}px`;
    book.style.height = `${baseHeight}px`;
    finishClose();
  }
};

const repositionActiveBook = () => {
  if (!activeBook || isTransitioning) return;
  const book = activeBook;
  const cover = book.querySelector(".book-cover");
  const { targetWidth, targetHeight } = getOpenBookSize();
  const { bookShift, bookShiftY } = getOpenOffsets(book, {
    lockLibrary: isLibraryShifted,
    libraryShift: libraryShiftX,
    targetWidth,
    targetHeight,
  });
  const coverWidth = Math.min(300, targetWidth);

  if (window.gsap) {
    window.gsap.set(book, {
      x: bookShift,
      y: bookShiftY,
      width: targetWidth,
      height: targetHeight,
    });
    if (cover) {
      window.gsap.set(cover, { width: coverWidth });
    }
  } else {
    book.style.transform = `translate3d(${bookShift}px, ${bookShiftY}px, 0)`;
    book.style.width = `${targetWidth}px`;
    book.style.height = `${targetHeight}px`;
    if (cover) {
      cover.style.width = `${coverWidth}px`;
    }
  }
};

// ======================================================================
// EVENTS & DATA LOADING
// ======================================================================
const attachLibraryEvents = () => {
  if (!libraryShelves) return;

  libraryShelves.addEventListener("click", (event) => {
    if (isLibraryMobile()) {
      const stack = event.target.closest(".client-stack");
      if (stack) {
        if (event.target.closest(".client-stack-body")) {
          return;
        }
        const toggle = stack.querySelector(".client-stack-toggle");
        if (!toggle) return;
        const setStackOpen = (target, open) => {
          const body = target.querySelector(".client-stack-body");
          const button = target.querySelector(".client-stack-toggle");
          if (!body) return;
          const isOpen = target.classList.contains("is-open");
          if (open === isOpen) return;

          const onEnd = (event) => {
            if (event.propertyName !== "height") return;
            body.removeEventListener("transitionend", onEnd);
            if (target.classList.contains("is-open")) {
              body.style.height = "auto";
            }
          };

          body.addEventListener("transitionend", onEnd);

          if (open) {
            target.classList.add("is-open");
            if (button) {
              button.setAttribute("aria-expanded", "true");
            }
            body.style.height = "0px";
            body.offsetHeight;
            body.style.height = `${body.scrollHeight}px`;
          } else {
            body.style.height = `${body.scrollHeight}px`;
            body.offsetHeight;
            target.classList.remove("is-open");
            if (button) {
              button.setAttribute("aria-expanded", "false");
            }
            body.style.height = "0px";
          }
        };

        const isOpen = stack.classList.contains("is-open");
        libraryShelves.querySelectorAll(".client-stack").forEach((other) => {
          if (other !== stack && other.classList.contains("is-open")) {
            setStackOpen(other, false);
          }
        });
        setStackOpen(stack, !isOpen);
        return;
      }
      return;
    }

    const book = event.target.closest(".book");
    if (book) {
      if (book.dataset.empty === "true") return;
      requestBookOpen(book);
    }
  });

  document.addEventListener("click", (event) => {
    if (!activeBook) return;
    if (event.target.closest(".book")) return;
    requestBookClose();
  });
};

const loadClients = async () => {
  if (!libraryShelves) return;
  try {
    const response = await fetch("data/clients.json");
    const data = await response.json();
    clientsData = data.clients || [];
    renderLibrary(currentLang);
  } catch (error) {
    console.error("No se pudieron cargar los clientes.", error);
  }
};

const updateLibraryLayout = () => {
  if (!libraryShelves || !clientsData.length) return;
  if (activeBook || isTransitioning) return;
  const mode = isLibraryMobile() ? "mobile" : "desktop";
  if (mode === libraryMode) return;
  renderLibrary(currentLang);
};
const applyTranslations = (lang) => {
  const dictionary = translations[lang] || translations[DEFAULT_LANG];
  if (!dictionary) return;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (dictionary[key]) {
      element.setAttribute("placeholder", dictionary[key]);
    }
  });
};

const setActiveLang = (lang) => {
  langButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === lang);
  });
  if (langSelect) {
    langSelect.value = lang;
  }
};

const setLanguage = (lang) => {
  const nextLang = translations[lang] ? lang : DEFAULT_LANG;
  currentLang = nextLang;
  applyTranslations(nextLang);
  setActiveLang(nextLang);
  renderLibrary(nextLang);
  try {
    localStorage.setItem("tenova-lang", nextLang);
  } catch (error) {
    // Ignore storage errors
  }
};

const initLanguage = () => {
  const storedLang = (() => {
    try {
      return localStorage.getItem("tenova-lang");
    } catch (error) {
      return null;
    }
  })();
  const lang = storedLang && translations[storedLang] ? storedLang : DEFAULT_LANG;
  setLanguage(lang);
};

const loadTranslations = async () => {
  if (!langButtons.length) return;
  try {
    const response = await fetch("data/translations.json");
    translations = await response.json();
    initLanguage();
  } catch (error) {
    console.error("No se pudieron cargar las traducciones.", error);
  }
};

// ======================================================================
// EVENT BINDINGS
// ======================================================================
langButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.lang);
  });
});

if (langSelect) {
  langSelect.addEventListener("change", (event) => {
    setLanguage(event.target.value);
  });
}

if (menuToggle && navWrap) {
  menuToggle.addEventListener("click", toggleMenu);
  navWrap.addEventListener("click", (event) => {
    const link = event.target.closest(".nav a");
    if (link) {
      setMenuState(false);
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuState(false);
  }
});

serviceLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const service = link.dataset.service;
    if (!service) return;
    event.preventDefault();
    setServiceValue(service);
    const url = new URL(window.location.href);
    url.searchParams.set("service", service);
    url.hash = "contacto";
    window.history.replaceState({}, "", url);
    scrollToContact();
  });
});

// ======================================================================
// INITIALIZATION
// ======================================================================
readServiceFromUrl();
updateHeaderState();
loadTranslations();
loadClients();
attachLibraryEvents();
setupServiceCardAnimations();
setupAboutReveal();

window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("resize", handleResize);
