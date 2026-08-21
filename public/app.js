(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const storage = {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (_) {}
    },
  };

  const state = {
    searchIndex: 0,
    lastDrawerFocus: null,
    listStatus: storage.get("kitsu-demo-list-status", "none"),
    subscription: storage.get("kitsu-demo-subscription", "none"),
    selectedEpisode: 1,
    loadedEpisodes: 6,
    playing: false,
    muted: false,
  };

  const BOOKMARK_STATUSES = [
    { key: "watching", label: "Смотрю", icon: "play" },
    { key: "planned", label: "Запланировано", icon: "clock" },
    { key: "completed", label: "Просмотрено", icon: "check-circle-2" },
    { key: "dropped", label: "Брошено", icon: "x-circle" },
    { key: "on_hold", label: "Отложено", icon: "pause-circle" },
  ];

  const BOOKMARK_STATUS_BY_KEY = Object.fromEntries(BOOKMARK_STATUSES.map((status) => [status.key, status]));
  const DEFAULT_BOOKMARK_STATUSES = {
    19: "watching",
    52991: "planned",
  };

  function refreshIcons() {
    if (!window.lucide) return;
    window.lucide.createIcons({
      attrs: {
        "aria-hidden": "true",
        "stroke-width": 1.8,
      },
    });
  }

  function setIcon(target, name) {
    if (!target) return;
    target.innerHTML = `<i data-lucide="${name}"></i>`;
    refreshIcons();
  }

  function setTheme(theme, persist = true) {
    const next = theme === "light" ? "light" : "dark";
    root.dataset.theme = next;
    if (persist) storage.set("kitsu-theme", next);

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = next === "light" ? "#f5f4f2" : "#0d0d0f";

    $$('[data-theme-toggle]').forEach((control) => {
      const target = next === "light" ? "тёмную" : "светлую";
      control.setAttribute("aria-label", `Включить ${target} тему`);
      control.setAttribute("aria-pressed", String(next === "light"));
    });
  }

  function closeToast(toast) {
    if (!toast || toast.classList.contains("is-leaving")) return;
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 190);
  }

  function showToast(title, message, tone = "success") {
    const region = $("#toast-region");
    if (!region) return;

    while (region.children.length >= 3) closeToast(region.firstElementChild);

    const toast = document.createElement("div");
    toast.className = `toast toast--${tone}`;
    toast.setAttribute("role", tone === "danger" ? "alert" : "status");
    const icon = tone === "danger" ? "circle-alert" : tone === "info" ? "info" : "check";
    toast.innerHTML = `
      <span class="toast-icon"><i data-lucide="${icon}"></i></span>
      <span><strong>${title}</strong><small>${message}</small></span>
      <button type="button" aria-label="Закрыть уведомление"><i data-lucide="x"></i></button>
    `;
    $("button", toast).addEventListener("click", () => closeToast(toast));
    region.append(toast);
    refreshIcons();
    window.setTimeout(() => closeToast(toast), 4200);
  }

  function visibleFocusable(container) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter((item) => item.getClientRects().length > 0);
  }

  function trapFocus(event, container) {
    if (event.key !== "Tab" || !container) return;
    const items = visibleFocusable(container);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function closeMenu(trigger, menu) {
    if (!trigger || !menu || menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function closeAllMenus(except = null) {
    [
      [$("#category-trigger"), $("#category-menu")],
      [$("#notification-trigger"), $("#notification-popover")],
      [$("#list-trigger"), $("#list-menu")],
      [$("#subscribe-trigger"), $("#subscribe-menu")],
    ].forEach(([trigger, menu]) => {
      if (menu && menu !== except) closeMenu(trigger, menu);
    });
    closeBookmarkMenus(except);
  }

  function toggleMenu(trigger, menu) {
    if (!trigger || !menu) return;
    const willOpen = menu.hidden;
    closeAllMenus(willOpen ? menu : null);
    menu.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) {
      const first = visibleFocusable(menu)[0];
      if (first && trigger.matches(":focus-visible")) first.focus();
    }
  }

  function closeBookmarkMenus(except = null) {
    $$('[data-bookmark-menu]').forEach((menu) => {
      if (menu === except || menu.hidden) return;
      menu.hidden = true;
      $('[data-bookmark-trigger]', menu.closest('[data-bookmark-card]'))?.setAttribute("aria-expanded", "false");
    });
  }

  function bookmarkCardId(card, index) {
    const source = $(".poster-frame img", card)?.getAttribute("src") || "";
    const shikimoriId = source.match(/\/original\/(\d+)\.(?:jpe?g|png|webp)(?:[?#]|$)/i)?.[1];
    if (shikimoriId) return shikimoriId;
    const title = $("h3", card)?.textContent.trim() || `card-${index + 1}`;
    return encodeURIComponent(title.toLowerCase());
  }

  function createBookmarkMenu(title) {
    const menu = document.createElement("div");
    menu.className = "bookmark-menu";
    menu.dataset.bookmarkMenu = "";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", `Статус закладки: ${title}`);

    const heading = document.createElement("div");
    heading.className = "bookmark-menu__heading";
    heading.innerHTML = "<strong>Мой список</strong><span>Выберите статус</span>";
    menu.append(heading);

    BOOKMARK_STATUSES.forEach((status) => {
      const option = document.createElement("button");
      option.type = "button";
      option.dataset.bookmarkOption = status.key;
      option.dataset.bookmarkTone = status.key;
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", "false");
      option.innerHTML = `
        <span class="bookmark-menu__icon"><i data-lucide="${status.icon}"></i></span>
        <span class="bookmark-menu__label">${status.label}</span>
        <i class="bookmark-menu__check" data-lucide="check"></i>
      `;
      menu.append(option);
    });

    return menu;
  }

  function syncBookmarkCard(card, statusKey) {
    const status = BOOKMARK_STATUS_BY_KEY[statusKey] || null;
    const trigger = $('[data-bookmark-trigger]', card);
    const bar = $('[data-bookmark-status-bar]', card);
    const title = card.dataset.bookmarkTitle || "аниме";

    card.dataset.bookmarkStatus = status?.key || "none";
    card.classList.toggle("has-bookmark-status", Boolean(status));
    if (status) card.dataset.bookmarkTone = status.key;
    else delete card.dataset.bookmarkTone;

    if (trigger) {
      trigger.classList.toggle("is-active", Boolean(status));
      trigger.setAttribute(
        "aria-label",
        status ? `Изменить статус «${title}»: ${status.label}` : `Добавить «${title}» в список`,
      );
    }

    if (bar) {
      bar.hidden = !status;
      bar.textContent = status?.label || "";
    }

    $$('[data-bookmark-option]', card).forEach((option) => {
      const selected = option.dataset.bookmarkOption === status?.key;
      option.setAttribute("aria-checked", String(selected));
      option.setAttribute(
        "aria-label",
        selected
          ? `${BOOKMARK_STATUS_BY_KEY[option.dataset.bookmarkOption].label}, выбрано. Нажмите, чтобы убрать из списка`
          : BOOKMARK_STATUS_BY_KEY[option.dataset.bookmarkOption].label,
      );
    });
  }

  function setBookmarkStatus(cardId, statusKey) {
    storage.set(`kitsu-demo-bookmark-status-${cardId}`, statusKey);
    $$('[data-bookmark-card]').forEach((card) => {
      if (card.dataset.bookmarkId === cardId) syncBookmarkCard(card, statusKey);
    });
  }

  function initBookmarks() {
    const cards = $$('.anime-card').filter((card) => $('[data-bookmark]', card));

    cards.forEach((card, index) => {
      const trigger = $('[data-bookmark]', card);
      const poster = $(".poster-frame", card);
      const title = $("h3", card)?.textContent.trim() || "Аниме";
      if (!trigger || !poster) return;

      const cardId = bookmarkCardId(card, index);
      const statusBar = document.createElement("span");
      const menu = createBookmarkMenu(title);

      card.dataset.bookmarkCard = "";
      card.dataset.bookmarkId = cardId;
      card.dataset.bookmarkTitle = title;
      card.classList.add("has-bookmark-control");

      statusBar.className = "bookmark-status-bar";
      statusBar.dataset.bookmarkStatusBar = "";
      statusBar.hidden = true;
      poster.append(statusBar);

      trigger.classList.add("poster-bookmark-button");
      trigger.dataset.bookmarkTrigger = "";
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");
      poster.insertAdjacentElement("afterend", trigger);
      trigger.insertAdjacentElement("afterend", menu);

      const storageKey = `kitsu-demo-bookmark-status-${cardId}`;
      const storedStatus = storage.get(storageKey);
      const initialStatus = storedStatus === "none" || BOOKMARK_STATUS_BY_KEY[storedStatus]
        ? storedStatus
        : DEFAULT_BOOKMARK_STATUSES[cardId] || "none";
      syncBookmarkCard(card, initialStatus);

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = menu.hidden;
        closeAllMenus(willOpen ? menu : null);
        menu.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", String(willOpen));
        if (willOpen) {
          const selected = $('[aria-checked="true"]', menu) || $('[data-bookmark-option]', menu);
          requestAnimationFrame(() => selected?.focus({ preventScroll: true }));
        }
      });

      menu.addEventListener("click", (event) => {
        event.stopPropagation();
        const option = event.target.closest('[data-bookmark-option]');
        if (!option) return;
        const selectedKey = option.dataset.bookmarkOption;
        const nextStatus = card.dataset.bookmarkStatus === selectedKey ? "none" : selectedKey;
        setBookmarkStatus(cardId, nextStatus);
        closeBookmarkMenus();
        trigger.focus({ preventScroll: true });
        showToast(
          nextStatus === "none" ? "Удалено из закладок" : `${BOOKMARK_STATUS_BY_KEY[nextStatus].label} — добавлено`,
          "Состояние сохранено на этом устройстве.",
        );
      });

      menu.addEventListener("keydown", (event) => {
        const options = $$('[data-bookmark-option]', menu);
        const currentIndex = options.indexOf(document.activeElement);
        let nextIndex = currentIndex;
        if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % options.length;
        else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + options.length) % options.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = options.length - 1;
        else if (event.key === "Escape") {
          event.preventDefault();
          closeBookmarkMenus();
          trigger.focus({ preventScroll: true });
          return;
        } else return;
        event.preventDefault();
        options[nextIndex]?.focus({ preventScroll: true });
      });
    });

    refreshIcons();
  }

  function openDrawer() {
    const drawer = $("#mobile-drawer");
    const scrim = $("#drawer-scrim");
    if (!drawer || !scrim) return;
    state.lastDrawerFocus = document.activeElement;
    scrim.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add("is-open");
      scrim.classList.add("is-visible");
    });
    drawer.setAttribute("aria-hidden", "false");
    body.classList.add("is-locked");
    $("#mobile-menu-close")?.focus({ preventScroll: true });
  }

  function closeDrawer({ restoreFocus = true } = {}) {
    const drawer = $("#mobile-drawer");
    const scrim = $("#drawer-scrim");
    if (!drawer || !scrim || !drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    scrim.classList.remove("is-visible");
    drawer.setAttribute("aria-hidden", "true");
    body.classList.remove("is-locked");
    window.setTimeout(() => { scrim.hidden = true; }, 190);
    if (restoreFocus && state.lastDrawerFocus instanceof HTMLElement) {
      state.lastDrawerFocus.focus({ preventScroll: true });
    }
  }

  function openDialog(dialog) {
    if (!dialog || typeof dialog.showModal !== "function") return;
    closeAllMenus();
    closeDrawer({ restoreFocus: false });
    if (!dialog.open) dialog.showModal();
    body.classList.add("is-locked");
    requestAnimationFrame(() => visibleFocusable(dialog)[0]?.focus({ preventScroll: true }));
  }

  function closeDialog(dialog) {
    if (!dialog?.open) return;
    dialog.close();
    body.classList.remove("is-locked");
  }

  function openSearch() {
    const dialog = $("#search-dialog");
    openDialog(dialog);
    const input = $("#global-search", dialog);
    if (input) {
      input.value = "";
      filterSearch("");
      input.focus();
    }
  }

  function searchItems() {
    const dialog = $("#search-dialog");
    return dialog ? $$('[data-search-item]:not([hidden])', dialog) : [];
  }

  function paintSearchIndex() {
    const items = searchItems();
    if (!items.length) return;
    state.searchIndex = Math.max(0, Math.min(state.searchIndex, items.length - 1));
    items.forEach((item, index) => item.classList.toggle("is-keyboard-active", index === state.searchIndex));
    items[state.searchIndex]?.scrollIntoView({ block: "nearest" });
  }

  function filterSearch(value) {
    const dialog = $("#search-dialog");
    if (!dialog) return;
    const query = value.trim().toLocaleLowerCase("ru");
    const trending = $("#search-trending", dialog);
    const results = $("#search-results", dialog);
    const more = $("#search-more", dialog);
    const count = $("#search-count", dialog);
    const items = $$('[data-search-item]', dialog);
    if (!query) {
      items.forEach((item) => { item.hidden = true; });
      $("#search-empty", dialog).hidden = true;
      if (trending) trending.hidden = false;
      if (results) results.hidden = true;
      if (more) more.hidden = true;
      if (count) count.textContent = "Введите запрос";
      state.searchIndex = 0;
      paintSearchIndex();
      return;
    }
    if (trending) trending.hidden = true;
    if (results) results.hidden = false;
    let visible = 0;
    items.forEach((item) => {
      const matches = item.dataset.searchItem.toLocaleLowerCase("ru").includes(query);
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    $("#search-empty", dialog).hidden = visible > 0;
    if (more) more.hidden = visible === 0;
    if (count) {
      count.textContent =
        visible > 0
          ? `${visible} ${visible === 1 ? "результат" : visible < 5 ? "результата" : "результатов"}`
          : "Совпадений нет";
    }
    state.searchIndex = 0;
    paintSearchIndex();
  }

  function scrollToTarget(selector) {
    const target = $(selector);
    if (!target) return;
    closeDrawer({ restoreFocus: false });
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initRovingTabs() {
    $$('[role="tablist"]').forEach((tablist) => {
      const tabs = $$('[role="tab"]', tablist);
      tabs.forEach((tab, index) => {
        tab.addEventListener("keydown", (event) => {
          let nextIndex = index;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
          else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
          else if (event.key === "Home") nextIndex = 0;
          else if (event.key === "End") nextIndex = tabs.length - 1;
          else return;
          event.preventDefault();
          tabs[nextIndex].focus();
          tabs[nextIndex].click();
        });
      });
    });
  }

  function initShared() {
    setTheme(root.dataset.theme || storage.get("kitsu-theme", "dark"), false);
    refreshIcons();
    initRovingTabs();
    initTabIndicators();
    initScrollReveal();

    $$('img').forEach((image) => {
      image.addEventListener("error", () => image.classList.add("is-image-error"), { once: true });
      if (image.complete && image.naturalWidth === 0) image.classList.add("is-image-error");
    });

    $$('[data-theme-toggle]').forEach((control) => {
      control.addEventListener("click", () => {
        setTheme(root.dataset.theme === "light" ? "dark" : "light");
      });
    });

    $("#category-trigger")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu(event.currentTarget, $("#category-menu"));
    });

    $("#notification-trigger")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu(event.currentTarget, $("#notification-popover"));
    });

    $('[data-mark-read]')?.addEventListener("click", () => {
      $(".notification-dot")?.remove();
      closeMenu($("#notification-trigger"), $("#notification-popover"));
      showToast("Уведомления прочитаны", "Непрочитанных уведомлений больше нет.", "info");
    });

    $("#mobile-menu-trigger")?.addEventListener("click", openDrawer);
    $("#mobile-menu-close")?.addEventListener("click", () => closeDrawer());
    $("#drawer-scrim")?.addEventListener("click", () => closeDrawer());
    $$(".mobile-drawer a").forEach((link) => link.addEventListener("click", () => closeDrawer({ restoreFocus: false })));

    $$('[data-open-search]').forEach((control) => control.addEventListener("click", openSearch));
    $$('[data-close-search]').forEach((control) => control.addEventListener("click", () => closeDialog($("#search-dialog"))));

    $$('[data-search-suggest]').forEach((control) => {
      control.addEventListener("click", () => {
        const input = $("#global-search");
        if (!input) return;
        input.value = control.dataset.searchSuggest;
        filterSearch(input.value);
        input.focus();
      });
    });

    const searchInput = $("#global-search");
    searchInput?.addEventListener("input", (event) => filterSearch(event.currentTarget.value));
    searchInput?.addEventListener("keydown", (event) => {
      const items = searchItems();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        state.searchIndex = Math.min(state.searchIndex + 1, Math.max(0, items.length - 1));
        paintSearchIndex();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        state.searchIndex = Math.max(state.searchIndex - 1, 0);
        paintSearchIndex();
      } else if (event.key === "Enter" && items[state.searchIndex]) {
        event.preventDefault();
        items[state.searchIndex].click();
      }
    });

    $$("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
      dialog.addEventListener("close", () => body.classList.remove("is-locked"));
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav-menu-wrap, .popover-wrap, .list-control, .title-inline-actions")) closeAllMenus();
    });

    document.addEventListener("keydown", (event) => {
      const openDialogNode = $("dialog[open]");
      const openDrawerNode = $("#mobile-drawer.is-open");
      trapFocus(event, openDialogNode || openDrawerNode);

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.target.matches("input, textarea, select")) {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") {
        closeAllMenus();
        closeDrawer();
      }
    });

    $$('[data-prototype-action]').forEach((control) => {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        showToast("Сценарий предусмотрен", control.dataset.prototypeAction, "info");
      });
    });

    initBookmarks();
  }

  const seasonMeta = {
    winter: { icon: "snowflake", label: "Аниме зимнего сезона" },
    spring: { icon: "flower-2", label: "Аниме весеннего сезона" },
    summer: { icon: "sun", label: "Аниме летнего сезона" },
    fall: { icon: "leaf", label: "Аниме осеннего сезона" },
  };

  function currentSeasonKey(date = new Date()) {
    const month = date.getMonth() + 1;
    if (month === 12 || month <= 2) return "winter";
    if (month <= 5) return "spring";
    if (month <= 8) return "summer";
    return "fall";
  }

  function initSeasonLabel() {
    const kicker = $("#season-kicker");
    const title = $("#season-title");
    if (!kicker || !title) return;
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const meta = seasonMeta[currentSeasonKey(now)];
    kicker.innerHTML = `<i data-lucide="${meta.icon}"></i>Сезон`;
    title.textContent = `${meta.label} ${year}`;
    refreshIcons();
  }

  function initScrollReveal() {
    const groups = $$("[data-reveal-group]");
    if (!groups.length) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = (group) => {
      $$(":scope > *", group).forEach((item, index) => {
        item.classList.add("reveal-item");
        if (reduceMotion) {
          item.classList.add("is-revealed");
          return;
        }
        item.style.transitionDelay = `${Math.min(index, 7) * 45}ms`;
      });
    };
    groups.forEach(reveal);
    if (reduceMotion || !("IntersectionObserver" in window)) {
      $$(".reveal-item").forEach((item) => item.classList.add("is-revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $$(":scope > .reveal-item", entry.target).forEach((item) => item.classList.add("is-revealed"));
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -60px 0px" },
    );
    groups.forEach((group) => observer.observe(group));
  }

  function initTabIndicators() {
    $$('[data-tabs]').forEach((tablist) => {
      const indicator = document.createElement("span");
      indicator.className = "tab-indicator";
      indicator.setAttribute("aria-hidden", "true");
      tablist.prepend(indicator);

      const place = () => {
        const active = $('[aria-selected="true"]', tablist);
        if (!active) {
          indicator.style.opacity = "0";
          return;
        }
        indicator.style.opacity = "1";
        indicator.style.width = `${active.offsetWidth}px`;
        indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      };

      place();
      window.addEventListener("resize", place);
      tablist.addEventListener("click", (event) => {
        if (event.target.closest('[role="tab"]')) requestAnimationFrame(place);
      });
    });
  }

  function initHome() {
    initSeasonLabel();
    const filters = $$('[data-filter]');
    const cards = $$('.anime-card[data-status]');
    filters.forEach((control) => {
      control.addEventListener("click", () => {
        const filter = control.dataset.filter;
        filters.forEach((item) => {
          const active = item === control;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
          item.tabIndex = active ? 0 : -1;
        });
        cards.forEach((card) => {
          const values = (card.dataset.status || "").split(/\s+/);
          card.classList.toggle("is-filtered-out", filter !== "all" && !values.includes(filter));
        });
      });
    });

    $$('[data-filter-link]').forEach((link) => {
      link.addEventListener("click", () => {
        closeAllMenus();
        scrollToTarget("#catalog");
        showToast("Фильтр каталога", `Выбрано: ${link.textContent.trim()}. Полная выборка откроется в каталоге.`, "info");
      });
    });

    $$('[data-day]').forEach((control) => {
      control.addEventListener("click", () => {
        const day = control.dataset.day;
        $$('[data-day]').forEach((item) => {
          const active = item === control;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
          item.tabIndex = active ? 0 : -1;
        });
        $$('[data-day-panel]').forEach((panel) => { panel.hidden = panel.dataset.dayPanel !== day; });
      });
    });

    $$('[data-remove-card]').forEach((control) => {
      control.addEventListener("click", () => {
        const card = control.closest(".continue-card");
        if (!card) return;
        card.hidden = true;
        showToast("Удалено из истории", "Запись скрыта до обновления страницы.");
      });
    });
  }

  const listLabels = {
    watching: "Смотрю",
    completed: "Просмотрено",
    planned: "Запланировано",
    on_hold: "Отложено",
    dropped: "Брошено",
    none: "В мой список",
  };

  const subscriptionLabels = {
    episode: "Новые серии",
    dubbing: "Новые озвучки",
    all: "Все обновления",
    none: "Уведомления",
  };

  function syncListState() {
    const label = $("#list-label");
    if (label) label.textContent = listLabels[state.listStatus] || listLabels.none;
    $$('[data-list-status]').forEach((item) => item.classList.toggle("is-active", item.dataset.listStatus === state.listStatus));
    const counter = $('[data-count-label="favorites"]');
    if (counter) counter.textContent = state.listStatus === "none" ? "В списки" : "В вашем списке";
  }

  function syncSubscriptionState() {
    $$('[data-subscribe]').forEach((item) => item.classList.toggle("is-active", item.dataset.subscribe === state.subscription));
    const trigger = $("#subscribe-trigger");
    if (!trigger) return;
    const text = $("span", trigger);
    if (text) text.textContent = subscriptionLabels[state.subscription] || subscriptionLabels.none;
  }

  function syncPlayer() {
    const stage = $("#player-stage");
    const toggle = $("#player-toggle");
    if (!stage || !toggle) return;
    stage.classList.toggle("is-playing", state.playing);
    toggle.setAttribute("aria-label", state.playing ? "Поставить на паузу" : "Запустить воспроизведение");
    setIcon(toggle, state.playing ? "pause" : "play");
    if (!state.playing) toggle.insertAdjacentHTML("beforeend", "<span>Воспроизвести</span>");
    const compactToggle = $('[data-player-play]');
    if (compactToggle) {
      compactToggle.setAttribute("aria-label", state.playing ? "Поставить на паузу" : "Запустить воспроизведение");
      setIcon(compactToggle, state.playing ? "pause" : "play");
    }
  }

  function syncReleaseSummary() {
    const source = $("#source-select")?.value || "Kodik";
    const translation = $("#translation-select")?.value || "AniLibria.TV";
    const type = translation === "Субтитры" ? "Субтитры" : "Озвучка";
    const language = translation === "Субтитры" ? "Русские" : "Русский";
    const quality = $("#release-quality")?.textContent || "1080p";
    if ($("#release-type")) $("#release-type").textContent = type;
    if ($("#release-language")) $("#release-language").textContent = language;
    if ($("#release-summary")) $("#release-summary").textContent = source;
    if ($("#release-summary-detail")) $("#release-summary-detail").textContent = `${translation} · ${quality}`;
    if ($("#release-status")) $("#release-status").innerHTML = `<i data-lucide="radio"></i>${source} · ${translation} · ${quality}`;
    if ($("#stage-translation")) $("#stage-translation").textContent = `${translation} · источник ${source}`;
    if ($("#player-subtitle")) $("#player-subtitle").textContent = `Сезон 1 · ${translation}`;
    refreshIcons();
  }

  function selectEpisode(number) {
    state.selectedEpisode = number;
    state.playing = false;
    $$('[data-episode]').forEach((item) => {
      const selected = Number(item.dataset.episode) === number;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
      const stateIcon = $(".episode-state", item);
      if (stateIcon) setIcon(stateIcon, selected ? "check-circle-2" : "circle");
    });
    $("#player-title").textContent = `Серия ${number}`;
    $("#stage-episode-title").textContent = `Серия ${number}`;
    syncReleaseSummary();
    syncPlayer();
    scrollToTarget("#player");
  }

  function buildEpisodeCard(number) {
    const card = document.createElement("button");
    card.className = "episode-card";
    card.type = "button";
    card.dataset.episode = String(number);
    card.setAttribute("aria-pressed", "false");
    card.innerHTML = `
      <span class="episode-thumb"><img src="https://shikimori.one/system/animes/original/19.jpg" alt="" referrerpolicy="no-referrer" /><span><i data-lucide="play"></i></span></span>
      <span class="episode-copy"><strong>Серия ${number}</strong><small>Сезон 1</small></span>
      <span class="episode-state"><i data-lucide="circle"></i></span>
    `;
    card.addEventListener("click", () => selectEpisode(number));
    $("img", card)?.addEventListener("error", (event) => event.currentTarget.classList.add("is-image-error"), { once: true });
    return card;
  }

  function loadMoreEpisodes() {
    const grid = $("#episode-grid");
    const button = $('[data-load-episodes]');
    if (!grid || !button) return;
    const start = state.loadedEpisodes + 1;
    const end = Math.min(74, state.loadedEpisodes + 12);
    const fragment = document.createDocumentFragment();
    for (let number = start; number <= end; number += 1) fragment.append(buildEpisodeCard(number));
    grid.append(fragment);
    state.loadedEpisodes = end;
    refreshIcons();
    if (end >= 74) {
      button.hidden = true;
      showToast("Все серии показаны", "Список содержит 74 эпизода.", "info");
      return;
    }
    $("small", button).textContent = `${end + 1}–${Math.min(74, end + 12)} из 74`;
  }

  function initAnime() {
    syncListState();
    syncSubscriptionState();
    syncPlayer();
    syncReleaseSummary();

    $("#list-trigger")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu(event.currentTarget, $("#list-menu"));
    });
    $$('[data-list-status]').forEach((control) => {
      control.addEventListener("click", () => {
        state.listStatus = control.dataset.listStatus;
        storage.set("kitsu-demo-list-status", state.listStatus);
        syncListState();
        closeMenu($("#list-trigger"), $("#list-menu"));
        showToast(state.listStatus === "none" ? "Удалено из списка" : "Список обновлён", listLabels[state.listStatus]);
      });
    });

    $("#subscribe-trigger")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu(event.currentTarget, $("#subscribe-menu"));
    });
    $$('[data-subscribe]').forEach((control) => {
      control.addEventListener("click", () => {
        state.subscription = control.dataset.subscribe;
        storage.set("kitsu-demo-subscription", state.subscription);
        syncSubscriptionState();
        closeMenu($("#subscribe-trigger"), $("#subscribe-menu"));
        showToast(state.subscription === "none" ? "Уведомления выключены" : "Настройка сохранена", subscriptionLabels[state.subscription]);
      });
    });

    $('[data-open-titles]')?.addEventListener("click", () => openDialog($("#titles-dialog")));
    $('[data-open-player-settings]')?.addEventListener("click", () => openDialog($("#player-settings-dialog")));
    $$('[data-close-dialog]').forEach((control) => control.addEventListener("click", () => closeDialog(control.closest("dialog"))));

    $('[data-save-player-settings]')?.addEventListener("click", () => {
      const settings = {
        mode: $("#player-mode")?.value,
        speed: $("#player-speed")?.value,
        quality: $("#player-quality")?.value,
      };
      storage.set("kitsu-demo-player-settings", JSON.stringify(settings));
      if ($("#release-quality")) $("#release-quality").textContent = settings.quality;
      syncReleaseSummary();
      closeDialog($("#player-settings-dialog"));
      showToast("Настройки сохранены", `${settings.quality} · ${settings.speed}`);
    });

    $('[data-expand-description]')?.addEventListener("click", (event) => {
      const control = event.currentTarget;
      const extra = $(".title-description-more");
      const expanded = control.getAttribute("aria-expanded") !== "true";
      control.setAttribute("aria-expanded", String(expanded));
      if (extra) extra.hidden = !expanded;
      control.firstChild.textContent = expanded ? "Свернуть " : "Подробнее ";
    });

    $$('[data-scroll-player]').forEach((control) => control.addEventListener("click", () => scrollToTarget("#player")));
    $('[data-scroll-comments]')?.addEventListener("click", () => scrollToTarget("#comments"));

    $('[data-share]')?.addEventListener("click", async () => {
      const url = window.location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: document.title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        showToast("Ссылка скопирована", "Её можно отправить в сообщении.");
      } catch (error) {
        if (error?.name !== "AbortError") showToast("Не удалось скопировать", "Скопируйте адрес из строки браузера.", "danger");
      }
    });

    $("#player-toggle")?.addEventListener("click", () => {
      state.playing = !state.playing;
      syncPlayer();
      if (state.playing) showToast("Демонстрация плеера", "Видеопоток не включён в статический шаблон.", "info");
    });

    $('[data-player-play]')?.addEventListener("click", () => {
      state.playing = !state.playing;
      syncPlayer();
    });

    $('[data-player-mute]')?.addEventListener("click", (event) => {
      state.muted = !state.muted;
      event.currentTarget.setAttribute("aria-label", state.muted ? "Включить звук" : "Выключить звук");
      setIcon(event.currentTarget, state.muted ? "volume-x" : "volume-2");
    });

    $('[data-player-fullscreen]')?.addEventListener("click", async () => {
      const stage = $("#player-stage");
      try {
        if (!document.fullscreenElement) await stage?.requestFullscreen?.();
        else await document.exitFullscreen?.();
      } catch (_) {
        showToast("Полноэкранный режим недоступен", "Браузер не разрешил переключение в этом окружении.", "info");
      }
    });

    $("#translation-select")?.addEventListener("change", (event) => {
      const translation = event.currentTarget.value;
      syncReleaseSummary();
      showToast("Перевод выбран", translation, "info");
    });

    $("#source-select")?.addEventListener("change", (event) => {
      syncReleaseSummary();
      showToast("Источник выбран", event.currentTarget.value, "info");
    });

    $$('[data-player-option]').forEach((input) => {
      const key = `kitsu-demo-player-${input.dataset.playerOption}`;
      const saved = storage.get(key);
      if (saved !== null) input.checked = saved === "1";
      input.addEventListener("change", () => storage.set(key, input.checked ? "1" : "0"));
    });

    $$('[data-episode]').forEach((control) => {
      control.setAttribute("aria-pressed", String(control.classList.contains("is-selected")));
      control.addEventListener("click", () => selectEpisode(Number(control.dataset.episode)));
    });

    $$('[data-episode-view]').forEach((control) => {
      control.addEventListener("click", () => {
        const list = control.dataset.episodeView === "list";
        $("#episode-grid")?.classList.toggle("is-list", list);
        $$('[data-episode-view]').forEach((item) => {
          const active = item === control;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
      });
    });

    $('[data-load-episodes]')?.addEventListener("click", loadMoreEpisodes);
  }

  initShared();
  if (body.dataset.page === "home") initHome();
  if (body.dataset.page === "anime") initAnime();
})();
