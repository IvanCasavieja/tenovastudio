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
const langSwitch = document.querySelector(".lang-switch");
const langIndicator = document.querySelector(".lang-indicator");
const langSelect = document.querySelector(".lang-select");
const projectsList = document.querySelector("#projects-list");

// ======================================================================
// CONFIGURATION & STATE
// ======================================================================
const DEFAULT_LANG = "es";
const MENU_BREAKPOINT = 900;
let translations = {};
let currentLang = DEFAULT_LANG;
let projectsData = [];
let projectsRevealObserver = null;

// ======================================================================
// TRANSLATIONS
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

// ======================================================================
// SERVICE SELECTION (CONTACT FORM)
// ======================================================================
const setServiceValue = (value) => {
  if (!serviceSelect || !value) return;
  const normalized = value.trim();
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
  if (window.scrollY > 10) {
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
  requestAnimationFrame(updateLangIndicator);
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
  updateLangIndicator();
};

// ======================================================================
// LANGUAGE SWITCH INDICATOR
// ======================================================================
const updateLangIndicator = () => {
  if (!langIndicator || !langSwitch) return;
  const active = langSwitch.querySelector(".lang-btn.is-active");
  if (!active || active.offsetWidth === 0) {
    langIndicator.style.opacity = "0";
    return;
  }
  langIndicator.style.opacity = "1";
  langIndicator.style.width = `${active.offsetWidth}px`;
  langIndicator.style.transform = `translateX(${active.offsetLeft}px)`;
};

// ======================================================================
// SPOTLIGHT HOVER (cards follow the cursor)
// ======================================================================
const attachSpotlight = (elements) => {
  const fine =
    window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (!fine) return;
  elements.forEach((el) => {
    if (el.dataset.spot === "true") return;
    el.dataset.spot = "true";
    el.classList.add("spot");
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      el.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
};

// ======================================================================
// PROJECTS
// ======================================================================
const storeIcons = {
  "google-play":
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.1 2.4c-.4.2-.6.6-.6 1.1v17c0 .5.2.9.6 1.1l9.3-9.6-9.3-9.6zm10.4 8.5 2.6-2.7-11-6.3 8.4 9zm0 2.2-8.4 9 11-6.3-2.6-2.7zm4.6-3.5-2.9 1.7v2.4l2.9 1.7c.9-.5.9-1.4.9-2.9s0-2.4-.9-2.9z"/></svg>',
  "app-store":
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c-.03-2.89 2.36-4.28 2.47-4.35-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.49.96 1.39 2.1 2.94 3.6 2.89 1.44-.06 1.99-.93 3.73-.93s2.23.93 3.76.9c1.55-.03 2.53-1.41 3.48-2.8 1.09-1.61 1.54-3.17 1.57-3.25-.03-.02-3-1.15-3.02-4.59zM14.16 4.06c.8-.96 1.33-2.3 1.18-3.64-1.14.05-2.53.76-3.35 1.72-.73.85-1.38 2.21-1.21 3.52 1.28.1 2.59-.65 3.38-1.6z"/></svg>',
  web:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"></path></svg>',
};

const mockTemplates = {
  dashboard: `
    <div class="mock-browser">
      <div class="mb-top"><span></span><span></span><span></span><i></i></div>
      <div class="mb-body">
        <div class="mb-side">
          <span class="is-active"></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="mb-main">
          <div class="mb-tiles">
            <div class="mb-tile"><i></i><b></b></div>
            <div class="mb-tile"><i></i><b></b></div>
            <div class="mb-tile"><i></i><b></b></div>
          </div>
          <div class="mb-chart">
            <span style="--h: 42%; --d: 0ms"></span>
            <span style="--h: 66%; --d: 140ms"></span>
            <span style="--h: 50%; --d: 280ms"></span>
            <span style="--h: 82%; --d: 420ms"></span>
            <span style="--h: 58%; --d: 560ms"></span>
            <span style="--h: 90%; --d: 700ms"></span>
            <span style="--h: 72%; --d: 840ms"></span>
          </div>
          <div class="mb-rows"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>`,
  app: `
    <div class="mock-phone">
      <div class="mp-notch"></div>
      <div class="mp-header"><span class="mp-line" style="--w: 46%"></span><i></i></div>
      <div class="mp-card">
        <span class="mp-badge"></span>
        <span class="mp-line" style="--w: 92%"></span>
        <span class="mp-line" style="--w: 78%"></span>
        <span class="mp-line" style="--w: 52%"></span>
        <div class="mp-player">
          <i class="mp-play"></i>
          <span class="mp-progress"><b></b></span>
        </div>
      </div>
      <div class="mp-chips"><span></span><span></span><span></span></div>
      <div class="mp-nav"><span class="is-active"></span><span></span><span></span><span></span></div>
    </div>`,
  marketplace: `
    <div class="mock-phone">
      <div class="mp-notch"></div>
      <div class="mp-search"><i></i><span class="mp-line" style="--w: 55%"></span></div>
      <div class="mp-item">
        <i class="mp-avatar"></i>
        <div class="mp-item-lines">
          <span class="mp-line" style="--w: 72%"></span>
          <span class="mp-line" style="--w: 46%"></span>
        </div>
        <b class="mp-pill"></b>
      </div>
      <div class="mp-item">
        <i class="mp-avatar"></i>
        <div class="mp-item-lines">
          <span class="mp-line" style="--w: 64%"></span>
          <span class="mp-line" style="--w: 40%"></span>
        </div>
        <b class="mp-pill"></b>
      </div>
      <div class="mp-item">
        <i class="mp-avatar"></i>
        <div class="mp-item-lines">
          <span class="mp-line" style="--w: 78%"></span>
          <span class="mp-line" style="--w: 52%"></span>
        </div>
        <b class="mp-pill"></b>
      </div>
      <div class="mp-fab"></div>
      <div class="mp-nav"><span class="is-active"></span><span></span><span></span><span></span></div>
    </div>`,
};

const getProjectCopy = (project, lang) =>
  (project.i18n && (project.i18n[lang] || project.i18n[DEFAULT_LANG])) || {};

const buildProjectLinks = (project) => {
  if (!Array.isArray(project.links) || !project.links.length) return null;
  const wrap = document.createElement("div");
  wrap.className = "project-links";
  project.links.forEach((link) => {
    if (!link || !link.url) return;
    const anchor = document.createElement("a");
    anchor.className = "project-link";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.innerHTML = storeIcons[link.type] || storeIcons.web;
    const text = document.createElement("span");
    text.textContent = link.label || link.url;
    anchor.appendChild(text);
    wrap.appendChild(anchor);
  });
  return wrap;
};

const buildProjectTags = (copy) => {
  const tags = Array.isArray(copy.tags) ? copy.tags : [];
  if (!tags.length) return null;
  const wrap = document.createElement("ul");
  wrap.className = "project-tags";
  tags.forEach((tag) => {
    const item = document.createElement("li");
    item.textContent = tag;
    wrap.appendChild(item);
  });
  return wrap;
};

const buildProjectPanel = (project, lang, index) => {
  const copy = getProjectCopy(project, lang);
  const panel = document.createElement("article");
  panel.className = "project-panel";
  if (project.featured) {
    panel.classList.add("is-featured");
  }
  if (index % 2 === 1) {
    panel.classList.add("is-flipped");
  }

  const main = document.createElement("div");
  main.className = "project-main";

  // --- text column
  const content = document.createElement("div");
  content.className = "project-content";

  const head = document.createElement("div");
  head.className = "project-head";

  const indexEl = document.createElement("span");
  indexEl.className = "project-index";
  indexEl.textContent = String(index + 1).padStart(2, "0");

  const kicker = document.createElement("span");
  kicker.className = "project-kicker";
  kicker.textContent = copy.kicker || "";

  head.appendChild(indexEl);
  head.appendChild(kicker);
  content.appendChild(head);

  const name = document.createElement("h3");
  name.className = "project-name";
  name.textContent = copy.name || "";
  content.appendChild(name);

  if (copy.client) {
    const client = document.createElement("p");
    client.className = "project-client";
    client.textContent = copy.client;
    content.appendChild(client);
  }

  const description = document.createElement("p");
  description.className = "project-description";
  description.textContent = copy.description || "";
  content.appendChild(description);

  if (Array.isArray(copy.stats) && copy.stats.length) {
    const stats = document.createElement("dl");
    stats.className = "project-stats";
    copy.stats.forEach((stat) => {
      if (!stat) return;
      const cell = document.createElement("div");
      cell.className = "project-stat";
      const value = document.createElement("dt");
      value.textContent = stat.value || "";
      const label = document.createElement("dd");
      label.textContent = stat.label || "";
      cell.appendChild(value);
      cell.appendChild(label);
      stats.appendChild(cell);
    });
    content.appendChild(stats);
  }

  const footer = document.createElement("div");
  footer.className = "project-footer";
  const tags = buildProjectTags(copy);
  const links = buildProjectLinks(project);
  if (tags) footer.appendChild(tags);
  if (links) footer.appendChild(links);
  if (footer.childNodes.length) {
    content.appendChild(footer);
  }

  // --- visual column
  const visual = document.createElement("div");
  visual.className = "project-visual";
  visual.setAttribute("aria-hidden", "true");
  visual.innerHTML = mockTemplates[project.mock] || mockTemplates.dashboard;

  main.appendChild(content);
  main.appendChild(visual);
  panel.appendChild(main);

  if (Array.isArray(copy.modules) && copy.modules.length) {
    const modulesTitle = document.createElement("span");
    modulesTitle.className = "project-modules-title";
    modulesTitle.textContent = copy.modulesTitle || "";
    if (modulesTitle.textContent) {
      panel.appendChild(modulesTitle);
    }
    const modules = document.createElement("div");
    modules.className = "project-modules";
    copy.modules.forEach((module) => {
      if (!module) return;
      const item = document.createElement("div");
      item.className = "project-module";
      const moduleName = document.createElement("h4");
      moduleName.textContent = module.name || "";
      const moduleText = document.createElement("p");
      moduleText.textContent = module.text || "";
      item.appendChild(moduleName);
      item.appendChild(moduleText);
      modules.appendChild(item);
    });
    panel.appendChild(modules);
  }

  return panel;
};

const setupProjectsReveal = () => {
  if (!projectsList) return;
  const panels = projectsList.querySelectorAll(".project-panel");
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !window.IntersectionObserver) {
    panels.forEach((panel) => panel.classList.add("is-visible"));
    return;
  }
  if (projectsRevealObserver) {
    projectsRevealObserver.disconnect();
  }
  projectsRevealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          projectsRevealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -60px 0px" }
  );
  panels.forEach((panel) => projectsRevealObserver.observe(panel));
};

const renderProjects = (lang) => {
  if (!projectsList || !projectsData.length) return;
  projectsList.innerHTML = "";
  const fragment = document.createDocumentFragment();
  projectsData.forEach((project, index) => {
    fragment.appendChild(buildProjectPanel(project, lang, index));
  });
  projectsList.appendChild(fragment);
  setupProjectsReveal();
  attachSpotlight(projectsList.querySelectorAll(".project-panel"));
};

const loadProjects = async () => {
  if (!projectsList) return;
  try {
    const response = await fetch("data/projects.json");
    const data = await response.json();
    projectsData = data.projects || [];
    renderProjects(currentLang);
  } catch (error) {
    console.error("No se pudieron cargar los proyectos.", error);
  }
};

// ======================================================================
// SERVICE CARD REVEAL
// ======================================================================
const setupServiceCardAnimations = () => {
  if (!serviceCards.length) return;
  attachSpotlight(serviceCards);
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !window.IntersectionObserver) {
    serviceCards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  const trigger = serviceGrid || document.querySelector(".services");
  if (!trigger) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== trigger) return;
        if (entry.isIntersecting) {
          serviceCards.forEach((card) => card.classList.add("is-visible"));
          observer.unobserve(trigger);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
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

// ======================================================================
// LANGUAGE
// ======================================================================
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
  requestAnimationFrame(updateLangIndicator);
};

const setLanguage = (lang) => {
  const nextLang = translations[lang] ? lang : DEFAULT_LANG;
  currentLang = nextLang;
  applyTranslations(nextLang);
  setActiveLang(nextLang);
  renderProjects(nextLang);
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
loadProjects();
setupServiceCardAnimations();
setupAboutReveal();
updateLangIndicator();

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(updateLangIndicator);
}

window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("resize", handleResize);
