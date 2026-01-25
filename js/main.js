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
const DEFAULT_LANG = "es";
const MENU_BREAKPOINT = 900;
const LIBRARY_MOBILE_BREAKPOINT = MENU_BREAKPOINT;
let translations = {};
let currentLang = DEFAULT_LANG;
let clientsData = [];
let activeBook = null;
let isBookAnimating = false;
let libraryMode = null;
const library = document.querySelector("#library");
const libraryShelves = document.querySelector("#library-shelves");
const bookPages = new WeakMap();
const bookClients = new WeakMap();
const bookPlaceholders = new WeakMap();
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
  updateLibraryLayout();
};

const isLibraryMobile = () =>
  window.innerWidth <= LIBRARY_MOBILE_BREAKPOINT;

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

const resetLibraryState = () => {
  if (window.gsap) {
    window.gsap.killTweensOf([library, activeBook]);
  }
  if (activeBook) {
    const cover = activeBook.querySelector(".book-cover");
    activeBook.classList.remove("is-selected", "is-open", "is-closing");
    activeBook.style.transform = "";
    if (cover) {
      cover.style.transform = "";
    }
    activeBook = null;
  }
  if (library) {
    library.classList.remove("is-shifted");
    library.style.transform = "";
    library.style.removeProperty("--library-shift");
  }
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

const buildPage = (page) => {
  const fragment = document.createDocumentFragment();

  const art = document.createElement("div");
  art.className = "page-art";

  const tag = document.createElement("span");
  tag.className = "page-tag";
  tag.textContent = page.title;

  const title = document.createElement("h4");
  title.className = "page-title";
  title.textContent = page.subtitle;

  const text = document.createElement("p");
  text.className = "page-text";
  text.textContent = page.text;

  const list = document.createElement("ul");
  list.className = "page-list";
  const bullets = Array.isArray(page.bullets) ? page.bullets : [];
  bullets.forEach((bullet) => {
    const item = document.createElement("li");
    item.textContent = bullet;
    list.appendChild(item);
  });

  fragment.appendChild(art);
  fragment.appendChild(tag);
  fragment.appendChild(title);
  fragment.appendChild(text);
  fragment.appendChild(list);

  return fragment;
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

const renderPageContent = (container, page) => {
  if (!container) return;
  container.innerHTML = "";
  if (!page) {
    container.classList.add("is-empty");
    return;
  }
  container.classList.remove("is-empty");
  container.appendChild(buildPage(page));
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
  book.dataset.spreadIndex = "0";
};

const createBook = (client, lang) => {
  const width = 64;

  const book = document.createElement("div");
  book.className = "book";
  book.style.setProperty("--book-width", `${width}px`);
  book.dataset.baseWidth = `${width}`;
  book.dataset.clientId = client.id;
  book.dataset.spreadIndex = "0";

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

// Flipbook state: spreadIndex points to the left page, right is left + 1.
const renderSpread = (book, spreadIndex) => {
  if (!book) return;
  const pages = bookPages.get(book) || [];
  const client = bookClients.get(book);
  const coverInner = book.querySelector(".book-cover-inner");
  const right = book.querySelector(".book-page-right");
  const safeIndex = Math.max(0, spreadIndex);
  if (coverInner) {
    coverInner.innerHTML = "";
    coverInner.classList.add("is-empty");
  }
  renderServicesContent(right, pages, client);
  applyServicesScale(book, Number(book.dataset.contentScale || 1));
  book.dataset.spreadIndex = `${safeIndex}`;
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

  const animateOut = (card) => {
    const xOffset = getOffset(card);
    if (window.gsap) {
      window.gsap.killTweensOf(card);
      window.gsap.to(card, {
        autoAlpha: 0,
        x: xOffset,
        duration: 0.6,
        ease: "power3.in",
      });
    } else {
      card.style.opacity = "0";
      card.style.transform = `translateX(${xOffset}px)`;
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

const getOpenOffsets = (book, options = {}) => {
  if (!library || !book) {
    return {
      libraryShift: 0,
      bookShift: 0,
      bookShiftY: 0,
      targetWidth: 0,
      targetHeight: 0,
    };
  }
  const { lockLibrary = false, targetWidth: requestedWidth } = options;
  const snap = (value) => Math.round(value);
  const container = library.closest(".clients-inner") || library.parentElement;
  if (!container) {
    return {
      libraryShift: 0,
      bookShift: 0,
      bookShiftY: 0,
      targetWidth: 0,
      targetHeight: 0,
    };
  }
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bookRect = book.getBoundingClientRect();
  const aspect = bookRect.width ? bookRect.height / bookRect.width : 1.6;
  const targetWidth = requestedWidth || 370;
  const margin = 8;
  const targetHeight = 670;
  const containerRect = container.getBoundingClientRect();
  const libraryRect = library.getBoundingClientRect();
  const headerHeight = header ? header.getBoundingClientRect().height : 0;

  const minLeft = margin;
  const maxLeft = Math.max(margin, viewportWidth - margin - targetWidth);
  const gap = 24;
  let libraryShift = 0;
  if (!lockLibrary) {
    libraryShift = -350;
    const availableRight =
      viewportWidth - margin - (libraryRect.right + libraryShift);
    const needed = targetWidth + gap - availableRight;
    if (needed > 0) {
      libraryShift = -(350 + needed);
    }
  }

  const shiftedLibraryRight = libraryRect.right + libraryShift;
  const shiftedLibraryLeft = libraryRect.left + libraryShift;
  const rightCandidate = shiftedLibraryRight + gap;
  const leftCandidate = shiftedLibraryLeft - targetWidth - gap;
  let targetLeft = rightCandidate;
  if (targetLeft > maxLeft) {
    targetLeft = Math.max(minLeft, leftCandidate);
  }
  targetLeft = Math.min(Math.max(targetLeft, minLeft), maxLeft);

  const minTop = margin + headerHeight;
  const maxTop = Math.max(minTop, viewportHeight - margin - targetHeight);
  const centeredTop = libraryRect.top + (libraryRect.height - targetHeight) / 2;
  const targetTop = Math.min(Math.max(centeredTop, minTop), maxTop);

  const bookShift = targetLeft - bookRect.left;
  const bookShiftY = targetTop - bookRect.top;

  return {
    libraryShift: snap(libraryShift),
    bookShift: snap(bookShift),
    bookShiftY: snap(bookShiftY),
    targetWidth: snap(targetWidth),
    targetHeight: snap(targetHeight),
  };
};

const detachBook = (book) => {
  if (!book || book.dataset.detached === "true") return null;
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
  book.style.left = `${rect.left + window.scrollX}px`;
  book.style.top = `${rect.top + window.scrollY}px`;
  book.style.width = `${rect.width}px`;
  book.style.height = `${rect.height}px`;
  book.style.margin = "0";
  book.style.zIndex = "30";
  book.dataset.detached = "true";

  const payload = { placeholder, parent, nextSibling };
  bookPlaceholders.set(book, payload);
  return payload;
};

const reattachBook = (book) => {
  const payload = bookPlaceholders.get(book);
  if (!payload) return;
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
  book.style.position = "";
  book.style.left = "";
  book.style.top = "";
  book.style.margin = "";
  book.style.zIndex = "";
};

const openBook = (book) => {
  if (!book || isBookAnimating) return;
  if (activeBook === book) {
    closeBook();
    return;
  }
  const hasOpenBook = Boolean(activeBook);
  if (hasOpenBook) {
    closeBook({ keepLibraryShift: true });
  }
  isBookAnimating = true;
  activeBook = book;
  const cover = book.querySelector(".book-cover");
  const baseRect = book.getBoundingClientRect();
  book.dataset.baseWidthActual = `${Math.round(baseRect.width)}`;
  book.dataset.baseHeightActual = `${Math.round(baseRect.height)}`;
  detachBook(book);
  const { libraryShift, bookShift, bookShiftY, targetWidth, targetHeight } =
    getOpenOffsets(book, { lockLibrary: hasOpenBook, targetWidth: 370 });
  const coverWidth = Math.min(300, targetWidth);
  book.dataset.openCoverWidth = `${coverWidth}`;
  const contentScale = 1;
  book.dataset.contentScale = `${contentScale}`;
  applyServicesScale(book, contentScale);

  book.classList.add("is-selected", "is-open");
  if (library && !window.gsap && !hasOpenBook) {
    library.style.setProperty("--library-shift", `${libraryShift}px`);
    library.classList.add("is-shifted");
  }

  const tl = window.gsap ? window.gsap.timeline() : null;
  if (tl) {
    if (library && !hasOpenBook) {
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
          isBookAnimating = false;
        });
  } else {
    animate(book, {
      transform: `translate3d(${bookShift}px, ${bookShiftY}px, 0)`,
      width: `${targetWidth}px`,
      height: `${targetHeight}px`,
    });
    cover.style.width = `${coverWidth}px`;
    animate(cover, { transform: "rotateY(-165deg)" });
    isBookAnimating = false;
  }
};

const closeBook = (options = {}) => {
  if (!activeBook) return;
  const { keepLibraryShift = false } = options;
  const book = activeBook;
  const cover = book.querySelector(".book-cover");
  activeBook = null;
  book.classList.add("is-closing");
  const baseWidthVar = Number(book.dataset.baseWidth || 64);
  const baseWidth = Number(book.dataset.baseWidthActual || baseWidthVar);
  const baseHeight = Number(
    book.dataset.baseHeightActual || book.getBoundingClientRect().height
  );

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
    if (library && !keepLibraryShift) {
      tl.to(library, { x: 0, duration: 0.9, ease: "power3.out" }, 0);
    }
    tl.add(() => {
      book.classList.remove("is-selected", "is-open", "is-closing");
      if (library && !keepLibraryShift) {
        library.classList.remove("is-shifted");
      }
      book.style.width = "";
      book.style.height = "";
      book.style.setProperty("--book-width", `${baseWidthVar}px`);
      window.gsap.set(book, { clearProps: "transform" });
      if (cover) {
        window.gsap.set(cover, { clearProps: "transform" });
      }
      delete book.dataset.openCoverWidth;
      delete book.dataset.contentScale;
      applyServicesScale(book, 1);
      reattachBook(book);
    });
  } else {
    book.classList.remove("is-selected", "is-open", "is-closing");
    if (library && !keepLibraryShift) {
      library.classList.remove("is-shifted");
      library.style.transform = "";
      library.style.removeProperty("--library-shift");
    }
    book.style.width = `${baseWidth}px`;
    book.style.height = `${baseHeight}px`;
    book.style.setProperty("--book-width", `${baseWidthVar}px`);
    book.style.transform = "";
    cover.style.transform = "";
    cover.style.width = "";
    delete book.dataset.contentScale;
    applyServicesScale(book, 1);
    reattachBook(book);
  }
};

const turnPage = (book, direction) => {
  if (!book || isBookAnimating) return;
  const pages = bookPages.get(book) || [];
  const spreadIndex = Number(book.dataset.spreadIndex || 0);
  const nextIndex = direction === "next" ? spreadIndex + 2 : spreadIndex - 2;
  if (nextIndex < 0 || nextIndex >= pages.length) return;

  const turnLayer = book.querySelector(".page-turn-layer");
  const turnInner = book.querySelector(".page-turn-inner");
  const isNext = direction === "next";

  if (!turnLayer || !turnInner) return;

  isBookAnimating = true;

  // Prepare the turning page layer with current content.
  const turningData = isNext ? pages[spreadIndex + 1] : pages[spreadIndex];
  renderPageContent(turnInner, turningData);

  turnLayer.classList.toggle("is-right", isNext);
  turnLayer.classList.toggle("is-left", !isNext);

  const rotateTarget = isNext ? -180 : 180;
  if (window.gsap) {
    window.gsap.set(turnLayer, {
      autoAlpha: 1,
      rotateY: 0,
      transformOrigin: isNext ? "left center" : "right center",
    });
    window.gsap.to(turnLayer, {
      rotateY: rotateTarget,
      duration: 1,
      ease: "power2.inOut",
      onComplete: () => {
        renderSpread(book, nextIndex);
        window.gsap.set(turnLayer, { autoAlpha: 0, rotateY: 0 });
        isBookAnimating = false;
      },
    });
  } else {
    renderSpread(book, nextIndex);
    turnLayer.style.opacity = "0";
    isBookAnimating = false;
  }
};

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
      openBook(book);
    }
  });

  document.addEventListener("click", (event) => {
    if (!activeBook) return;
    if (event.target.closest(".book")) return;
    closeBook();
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

readServiceFromUrl();
updateHeaderState();
loadTranslations();
loadClients();
attachLibraryEvents();
setupServiceCardAnimations();
setupAboutReveal();

window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("resize", handleResize);
