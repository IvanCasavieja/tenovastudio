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
let translations = {};
let currentLang = DEFAULT_LANG;
let clientsData = [];
let activeBook = null;
let isBookAnimating = false;
const library = document.querySelector("#library");
const libraryShelves = document.querySelector("#library-shelves");
const bookPages = new WeakMap();
const serviceCardTimers = new WeakMap();

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
};

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

const createBook = (client, lang) => {
  const width = 64;

  const book = document.createElement("div");
  book.className = "book";
  book.style.setProperty("--book-width", `${width}px`);
  book.dataset.clientId = client.id;
  book.dataset.spreadIndex = "0";

  const back = document.createElement("div");
  back.className = "book-back";

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

  const coverInner = document.createElement("div");
  coverInner.className = "book-cover-inner book-page";
  cover.appendChild(coverInner);

  book.appendChild(stack);

  return book;
};

// Flipbook state: spreadIndex points to the left page, right is left + 1.
const renderSpread = (book, spreadIndex) => {
  if (!book) return;
  const pages = bookPages.get(book) || [];
  const left = book.querySelector(".spread-left");
  const right = book.querySelector(".spread-right");
  const safeIndex = Math.max(0, spreadIndex);
  renderPageContent(left, pages[safeIndex]);
  renderPageContent(right, pages[safeIndex + 1]);
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
  if (window.gsap) {
    window.gsap.killTweensOf([library, activeBook]);
  }
  if (activeBook) {
    activeBook.classList.remove("is-selected", "is-open");
    activeBook = null;
  }
  if (library) {
    library.style.transform = "";
    library.classList.remove("is-shifted");
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

  const getColumns = () => {
    if (!serviceGrid) return 2;
    const template = getComputedStyle(serviceGrid).gridTemplateColumns;
    const count = template ? template.split(" ").filter(Boolean).length : 0;
    return count || 2;
  };

  const columns = getColumns();
  const midpoint = Math.max(1, Math.floor(columns / 2));
  const rowDelays = new Map();

  const readDelay = (card) => {
    const raw = getComputedStyle(card).getPropertyValue("--delay");
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed / 1000 : 0;
  };

  serviceCards.forEach((card, index) => {
    const rowIndex = Math.floor(index / columns);
    const colIndex = index % columns;
    const direction = colIndex < midpoint ? "left" : "right";
    const delay = readDelay(card);
    const current = rowDelays.get(rowIndex);

    card.dataset.reveal = direction;
    card.dataset.row = `${rowIndex}`;
    if (current === undefined || delay < current) {
      rowDelays.set(rowIndex, delay);
    }
  });

  const appearDelay = 0;
  const enterThreshold = 0;
  const exitThreshold = 0.2;

  const getOffset = (card) => (card.dataset.reveal === "left" ? -200 : 200);

  const getDelay = (card) => {
    const rowIndex = Number(card.dataset.row || 0);
    return rowDelays.get(rowIndex) ?? 0;
  };

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

  const clearPending = (card) => {
    const timer = serviceCardTimers.get(card);
    if (timer) {
      clearTimeout(timer);
      serviceCardTimers.delete(card);
    }
  };

  const animateIn = (card) => {
    const delay = getDelay(card);
    if (window.gsap) {
      window.gsap.killTweensOf(card);
      window.gsap.to(card, {
        autoAlpha: 1,
        x: 0,
        duration: 0.8,
        ease: "power3.out",
        delay,
      });
    } else {
      card.style.opacity = "1";
      card.style.transform = "translateX(0)";
    }
  };

  const animateOut = (card) => {
    const xOffset = getOffset(card);
    const delay = getDelay(card) * 0.15;
    if (window.gsap) {
      window.gsap.killTweensOf(card);
      window.gsap.to(card, {
        autoAlpha: 0,
        x: xOffset,
        duration: 0.6,
        ease: "power3.in",
        delay,
      });
    } else {
      card.style.opacity = "0";
      card.style.transform = `translateX(${xOffset}px)`;
    }
  };

  const scheduleReveal = (card) => {
    clearPending(card);
    if (appearDelay === 0) {
      card.dataset.state = "visible";
      animateIn(card);
      return;
    }
    card.dataset.state = "pending";
    const timer = setTimeout(() => {
      serviceCardTimers.delete(card);
      if (card.dataset.state === "pending") {
        card.dataset.state = "visible";
        animateIn(card);
      }
    }, appearDelay);
    serviceCardTimers.set(card, timer);
  };

  const hideCard = (card) => {
    clearPending(card);
    if (card.dataset.state === "hidden") return;
    card.dataset.state = "hidden";
    animateOut(card);
  };

  serviceCards.forEach(setHidden);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const card = entry.target;
        const ratio = entry.intersectionRatio;
        const state = card.dataset.state || "hidden";
        if (entry.isIntersecting && ratio >= enterThreshold) {
          if (state === "hidden") {
            scheduleReveal(card);
          }
        } else if (ratio <= exitThreshold) {
          if (state !== "hidden") {
            hideCard(card);
          }
        }
      });
    },
    { threshold: [0, exitThreshold, 1], rootMargin: "0px 0px -10% 0px" }
  );

  serviceCards.forEach((card) => observer.observe(card));
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

  const setVisible = (visible) => {
    aboutSection.classList.toggle("is-visible", visible);
    aboutSection.classList.toggle("is-hidden", !visible);
  };

  const rect = aboutSection.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    requestAnimationFrame(() => {
      setVisible(true);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== aboutSection) return;
        setVisible(entry.isIntersecting);
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(aboutSection);
};

const getOpenOffsets = (book, options = {}) => {
  if (!library || !book) {
    return { libraryShift: 0, bookShift: 0, bookShiftY: 0, scaleX: 1, scaleY: 1 };
  }
  const { lockLibrary = false } = options;
  const snap = (value) => Math.round(value);
  const snapScale = (value) => Math.round(value * 1000) / 1000;
  const container = library.closest(".clients-inner") || library.parentElement;
  if (!container) {
    return { libraryShift: 0, bookShift: 0, bookShiftY: 0, scaleX: 1, scaleY: 1 };
  }
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const targetWidth = Math.min(viewportWidth * 0.8, 420);
  const targetHeight = Math.min(viewportHeight * 0.85, 700);
  const containerRect = container.getBoundingClientRect();
  const libraryRect = library.getBoundingClientRect();
  const bookRect = book.getBoundingClientRect();
  const margin = 8;

  const libraryShift = lockLibrary
    ? 0
    : containerRect.left - libraryRect.left - 80;
  const maxRight = Math.min(containerRect.right, viewportWidth - margin);
  const scaleX = targetWidth / bookRect.width;
  const scaleY = targetHeight / bookRect.height;
  const openWidth = bookRect.width * scaleX;
  const targetBookCenter = maxRight - openWidth / 2;
  const currentBookCenter = bookRect.left + bookRect.width / 2;
  const baseShift = targetBookCenter - (currentBookCenter + libraryShift);
  const extraRight = Math.min(viewportWidth * 0.12, 140);
  const bookShift = baseShift + extraRight;
  const targetCenterY = libraryRect.top + libraryRect.height / 2;
  const currentCenterY = bookRect.top + bookRect.height / 2;
  const bookShiftY = targetCenterY - currentCenterY - 6;

  return {
    libraryShift: snap(libraryShift),
    bookShift: snap(bookShift),
    bookShiftY: snap(bookShiftY),
    scaleX: snapScale(scaleX),
    scaleY: snapScale(scaleY),
  };
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
  const { libraryShift, bookShift, bookShiftY, scaleX, scaleY } =
    getOpenOffsets(book, { lockLibrary: hasOpenBook });

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
        scaleX,
        scaleY,
        duration: 0.9,
        ease: "power3.out",
      },
      0
    )
      .to(cover, { rotateY: -165, duration: 1.1, ease: "power3.out" }, 0.1)
      .add(() => {
        isBookAnimating = false;
      });
  } else {
    animate(book, {
      transform: `translate3d(${bookShift}px, ${bookShiftY}px, 0) scale3d(${scaleX}, ${scaleY}, 1)`,
    });
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

  const tl = window.gsap ? window.gsap.timeline() : null;
  if (tl) {
    tl.to(cover, { rotateY: 0, duration: 0.9, ease: "power3.out" }, 0)
      .to(
        book,
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.9, ease: "power3.out" },
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
    });
  } else {
    book.classList.remove("is-selected", "is-open", "is-closing");
    if (library && !keepLibraryShift) {
      library.classList.remove("is-shifted");
      library.style.transform = "";
      library.style.removeProperty("--library-shift");
    }
    book.style.transform = "";
    cover.style.transform = "";
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
