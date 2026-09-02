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
        return true;
      } catch (_) {
        showToast("Не удалось сохранить", "Проверьте, разрешено ли сохранение данных сайта, и повторите действие.", "danger");
        return false;
      }
    },
  };

  const state = {
    searchIndex: 0,
    searchRecentCleared: false,
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
  const bookmarkSheetQuery = window.matchMedia("(max-width: 720px)");
  const titleSubscriptionSheetQuery = window.matchMedia("(max-width: 720px)");
  let bookmarkScrim = null;

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

  function bookmarkMenuCard(menu) {
    return menu?._bookmarkCard || menu?.closest('[data-bookmark-card]') || null;
  }

  function bookmarkMenuTrigger(menu) {
    return menu?._bookmarkTrigger || $('[data-bookmark-trigger]', bookmarkMenuCard(menu));
  }

  function ensureBookmarkScrim() {
    if (bookmarkScrim) return bookmarkScrim;
    bookmarkScrim = document.createElement("div");
    bookmarkScrim.className = "bookmark-menu-scrim";
    bookmarkScrim.dataset.bookmarkScrim = "";
    bookmarkScrim.setAttribute("aria-hidden", "true");
    bookmarkScrim.hidden = true;
    bookmarkScrim.addEventListener("click", () => closeBookmarkMenus(null, { restoreFocus: true }));
    body.append(bookmarkScrim);
    return bookmarkScrim;
  }

  function setBookmarkMenuSemantics(menu, isSheet) {
    const trigger = bookmarkMenuTrigger(menu);
    const options = $(".bookmark-menu__options", menu);
    const close = $('[data-bookmark-close]', menu);
    const remove = $('[data-bookmark-remove]', menu);
    const title = bookmarkMenuCard(menu)?.dataset.bookmarkTitle || "аниме";
    const hasStatus = Boolean(BOOKMARK_STATUS_BY_KEY[bookmarkMenuCard(menu)?.dataset.bookmarkStatus]);

    trigger?.setAttribute("aria-haspopup", isSheet ? "dialog" : "menu");
    menu.setAttribute("role", isSheet ? "dialog" : "menu");
    if (isSheet) {
      menu.setAttribute("aria-modal", "true");
      menu.setAttribute("aria-labelledby", menu._bookmarkHeadingId);
      menu.removeAttribute("aria-label");
      options?.setAttribute("role", "menu");
      options?.setAttribute("aria-label", "Выберите статус просмотра");
      if (close) close.hidden = false;
      if (remove) remove.hidden = !hasStatus;
      remove?.setAttribute("role", "button");
    } else {
      menu.removeAttribute("aria-modal");
      menu.removeAttribute("aria-labelledby");
      menu.setAttribute("aria-label", `Статус закладки: ${title}`);
      options?.setAttribute("role", "group");
      options?.removeAttribute("aria-label");
      if (close) close.hidden = false;
      if (remove) remove.hidden = true;
      remove?.removeAttribute("role");
    }
  }

  function restoreBookmarkMenu(menu) {
    const trigger = bookmarkMenuTrigger(menu);
    menu.classList.remove("bookmark-menu--sheet");
    if (trigger && menu.parentElement === body) trigger.insertAdjacentElement("afterend", menu);
  }

  function openBookmarkMenu(menu) {
    const trigger = bookmarkMenuTrigger(menu);
    const card = bookmarkMenuCard(menu);
    const isSheet = bookmarkSheetQuery.matches;
    setBookmarkMenuSemantics(menu, isSheet);

    if (isSheet) {
      const toastRegion = $("#toast-region");
      if (toastRegion) $$(".toast", toastRegion).forEach((toast) => toast.remove());
      const scrim = ensureBookmarkScrim();
      scrim.hidden = false;
      menu.classList.add("bookmark-menu--sheet");
      body.append(menu);
      body.classList.add("is-bookmark-sheet-open");
    } else {
      restoreBookmarkMenu(menu);
    }

    menu.hidden = false;
    card?.classList.add("is-bookmark-menu-open");
    trigger?.setAttribute("aria-expanded", "true");
    const selected = $('[aria-checked="true"]', menu) || $('[data-bookmark-option]', menu);
    requestAnimationFrame(() => selected?.focus({ preventScroll: true }));
  }

  function closeBookmarkMenu(menu, { restoreFocus = false } = {}) {
    if (!menu || menu.hidden) return;
    const trigger = bookmarkMenuTrigger(menu);
    const card = bookmarkMenuCard(menu);
    const wasSheet = menu.classList.contains("bookmark-menu--sheet");
    menu.hidden = true;
    card?.classList.remove("is-bookmark-menu-open");
    trigger?.setAttribute("aria-expanded", "false");

    if (wasSheet) {
      if (bookmarkScrim) bookmarkScrim.hidden = true;
      body.classList.remove("is-bookmark-sheet-open");
      restoreBookmarkMenu(menu);
      setBookmarkMenuSemantics(menu, bookmarkSheetQuery.matches);
    }

    if (restoreFocus) trigger?.focus({ preventScroll: true });
  }

  function closeBookmarkMenus(except = null, options = {}) {
    $$('[data-bookmark-menu]').forEach((menu) => {
      if (menu === except || menu.hidden) return;
      closeBookmarkMenu(menu, options);
    });
  }

  function bookmarkCardId(card, index) {
    const source = $(".poster-frame img", card)?.getAttribute("src") || "";
    const shikimoriId = source.match(/\/original\/(\d+)\.(?:jpe?g|png|webp)(?:[?#]|$)/i)?.[1];
    if (shikimoriId) return shikimoriId;
    const title = $("h3", card)?.textContent.trim() || `card-${index + 1}`;
    return encodeURIComponent(title.toLowerCase());
  }

  function createBookmarkMenu(title, index) {
    const menu = document.createElement("div");
    menu.className = "bookmark-menu";
    menu.dataset.bookmarkMenu = "";
    menu.hidden = true;

    const heading = document.createElement("div");
    heading.className = "bookmark-menu__heading";
    const headingCopy = document.createElement("div");
    headingCopy.className = "bookmark-menu__heading-copy";
    const headingTitle = document.createElement("strong");
    headingTitle.id = `bookmark-menu-title-${index + 1}`;
    headingTitle.textContent = "В мой список";
    const headingMeta = document.createElement("span");
    headingMeta.textContent = title;
    headingCopy.append(headingTitle, headingMeta);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "bookmark-menu__close";
    close.dataset.bookmarkClose = "";
    close.setAttribute("aria-label", "Закрыть выбор статуса");
    close.innerHTML = '<i data-lucide="x"></i>';
    close.hidden = true;
    heading.append(headingCopy, close);

    const options = document.createElement("div");
    options.className = "bookmark-menu__options";

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
      options.append(option);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "bookmark-menu__remove";
    remove.dataset.bookmarkRemove = "";
    remove.hidden = true;
    remove.innerHTML = '<i data-lucide="bookmark-minus"></i><span>Убрать из списка</span>';

    menu._bookmarkHeadingId = headingTitle.id;
    menu.append(heading, options, remove);

    return menu;
  }

  function syncBookmarkCard(card, statusKey) {
    const status = BOOKMARK_STATUS_BY_KEY[statusKey] || null;
    const trigger = $('[data-bookmark-trigger]', card);
    const bar = $('[data-bookmark-status-bar]', card);
    const menu = card._bookmarkMenu || $('[data-bookmark-menu]', card);
    const remove = $('[data-bookmark-remove]', menu);
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

    $$('[data-bookmark-option]', menu).forEach((option) => {
      const selected = option.dataset.bookmarkOption === status?.key;
      option.setAttribute("aria-checked", String(selected));
      option.setAttribute(
        "aria-label",
        selected ? `${BOOKMARK_STATUS_BY_KEY[option.dataset.bookmarkOption].label}, выбрано` : BOOKMARK_STATUS_BY_KEY[option.dataset.bookmarkOption].label,
      );
    });

    if (remove) {
      remove.hidden = !status || !bookmarkSheetQuery.matches;
      remove.setAttribute("aria-label", `Убрать «${title}» из списка`);
    }
  }

  function setBookmarkStatus(cardId, statusKey) {
    if (!storage.set(`kitsu-demo-bookmark-status-${cardId}`, statusKey)) return false;
    $$('[data-bookmark-card]').forEach((card) => {
      if (card.dataset.bookmarkId === cardId) syncBookmarkCard(card, statusKey);
    });
    return true;
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
      const menu = createBookmarkMenu(title, index);

      card.dataset.bookmarkCard = "";
      card.dataset.bookmarkId = cardId;
      card.dataset.bookmarkTitle = title;
      card.classList.add("has-bookmark-control");
      card._bookmarkMenu = menu;
      menu._bookmarkCard = card;
      menu._bookmarkTrigger = trigger;
      menu.id = `bookmark-menu-${body.dataset.page || "page"}-${index + 1}`;

      statusBar.className = "bookmark-status-bar";
      statusBar.dataset.bookmarkStatusBar = "";
      statusBar.hidden = true;
      poster.append(statusBar);

      trigger.classList.add("poster-bookmark-button");
      trigger.dataset.bookmarkTrigger = "";
      trigger.setAttribute("aria-controls", menu.id);
      trigger.setAttribute("aria-expanded", "false");
      poster.append(trigger, menu);
      setBookmarkMenuSemantics(menu, bookmarkSheetQuery.matches);

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
        if (willOpen) openBookmarkMenu(menu);
        else closeBookmarkMenu(menu, { restoreFocus: true });
      });

      menu.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.target.closest('[data-bookmark-close]')) {
          closeBookmarkMenu(menu, { restoreFocus: true });
          return;
        }
        if (event.target.closest('[data-bookmark-remove]')) {
          if (!setBookmarkStatus(cardId, "none")) return;
          closeBookmarkMenu(menu, { restoreFocus: true });
          showToast("Удалено из списка", "Состояние сохранено на этом устройстве.");
          return;
        }
        const option = event.target.closest('[data-bookmark-option]');
        if (!option) return;
        const selectedKey = option.dataset.bookmarkOption;
        if (card.dataset.bookmarkStatus === selectedKey) {
          closeBookmarkMenu(menu, { restoreFocus: true });
          return;
        }
        if (!setBookmarkStatus(cardId, selectedKey)) return;
        closeBookmarkMenu(menu, { restoreFocus: true });
        showToast(`${BOOKMARK_STATUS_BY_KEY[selectedKey].label} — сохранено`, "Статус обновлён на этом устройстве.");
      });

      menu.addEventListener("keydown", (event) => {
        const options = $$('[data-bookmark-option]', menu);
        const remove = $('[data-bookmark-remove]', menu);
        const items = remove && !remove.hidden ? [...options, remove] : options;
        const currentIndex = items.indexOf(document.activeElement);
        let nextIndex = currentIndex;
        if (event.key === "ArrowDown") nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        else if (event.key === "ArrowUp") nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = items.length - 1;
        else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeBookmarkMenu(menu, { restoreFocus: true });
          return;
        } else if (event.key === "Tab" && !menu.classList.contains("bookmark-menu--sheet")) {
          window.setTimeout(() => closeBookmarkMenu(menu), 0);
          return;
        } else return;
        event.preventDefault();
        items[nextIndex]?.focus({ preventScroll: true });
      });
    });

    bookmarkSheetQuery.addEventListener?.("change", () => {
      closeBookmarkMenus();
      $$('[data-bookmark-menu]').forEach((menu) => setBookmarkMenuSemantics(menu, bookmarkSheetQuery.matches));
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
    dialog._returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    body.classList.add("is-locked");
    requestAnimationFrame(() => visibleFocusable(dialog)[0]?.focus({ preventScroll: true }));
  }

  function closeDialog(dialog) {
    if (!dialog?.open) return;
    dialog.close();
    body.classList.remove("is-locked");
  }

  function positionSearch(dialog, trigger) {
    if (!dialog) return;
    if (window.matchMedia("(max-width: 920px)").matches) {
      dialog.style.removeProperty("--search-top");
      dialog.style.removeProperty("--search-left");
      dialog.style.removeProperty("--search-width");
      return;
    }
    const source = trigger || $$('.site-header [data-open-search]').find((control) => control.offsetParent !== null);
    if (!source) return;
    const rect = source.getBoundingClientRect();
    dialog.style.setProperty("--search-top", `${Math.round(rect.top)}px`);
    dialog.style.setProperty("--search-left", `${Math.round(rect.left)}px`);
    dialog.style.setProperty("--search-width", `${Math.round(rect.width)}px`);
  }

  function openSearch(event) {
    const dialog = $("#search-dialog");
    if (!dialog) return;
    closeAllMenus();
    closeDrawer({ restoreFocus: false });
    const trigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    dialog._returnFocus = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    positionSearch(dialog, trigger);
    if (!dialog.open) dialog.show();
    $$('[data-open-search]').forEach((control) => control.setAttribute("aria-expanded", "true"));
    const input = $("#global-search", dialog);
    if (input) {
      filterSearch(input.value);
      input.focus();
    }
  }

  function closeSearch({ restoreFocus = false } = {}) {
    const dialog = $("#search-dialog");
    if (!dialog?.open) return;
    const returnFocus = dialog._returnFocus;
    dialog.close();
    $$('[data-open-search]').forEach((control) => control.setAttribute("aria-expanded", "false"));
    if (restoreFocus && returnFocus instanceof HTMLElement && returnFocus.isConnected) {
      returnFocus.focus({ preventScroll: true });
    }
    dialog._returnFocus = null;
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
    const recent = $("#search-recent", dialog);
    const results = $("#search-results", dialog);
    const more = $("#search-more", dialog);
    const count = $("#search-count", dialog);
    const clear = $("[data-search-clear]", dialog);
    const reset = $("[data-search-reset]", dialog);
    const filters = $$('[data-search-filter]', dialog);
    const activeFilters = filters.filter((filter) => filter.value);
    const items = $$('[data-search-item]', dialog);
    const hasCriteria = Boolean(query || activeFilters.length);

    if (clear) clear.hidden = !query;
    if (reset) reset.hidden = activeFilters.length === 0;

    if (!hasCriteria) {
      items.forEach((item) => { item.hidden = true; });
      $("#search-empty", dialog).hidden = true;
      if (recent) recent.hidden = state.searchRecentCleared;
      if (results) results.hidden = true;
      if (more) more.hidden = true;
      if (count) count.textContent = "Введите запрос";
      state.searchIndex = 0;
      paintSearchIndex();
      return;
    }
    if (recent) recent.hidden = true;
    if (results) results.hidden = false;
    let visible = 0;
    items.forEach((item) => {
      const matchesQuery = !query || item.dataset.searchItem.toLocaleLowerCase("ru").includes(query);
      const matchesFilters = activeFilters.every((filter) => {
        const key = `search${filter.dataset.searchFilter[0].toUpperCase()}${filter.dataset.searchFilter.slice(1)}`;
        if (filter.dataset.searchFilter === "rating") {
          return Number(item.dataset[key] || 0) >= Number(filter.value);
        }
        return (item.dataset[key] || "").split(" ").includes(filter.value);
      });
      const matches = matchesQuery && matchesFilters;
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    $("#search-empty", dialog).hidden = visible > 0;
    if (more) more.hidden = visible === 0;
    const moreLabel = $("span", more);
    if (moreLabel) moreLabel.textContent = query ? `Найти «${value.trim()}»` : "Показать в каталоге";
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
    $$('[data-close-search]').forEach((control) => control.addEventListener("click", () => closeSearch({ restoreFocus: true })));

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
    $("[data-search-clear]")?.addEventListener("click", () => {
      if (!searchInput) return;
      searchInput.value = "";
      filterSearch("");
      searchInput.focus();
    });
    $("[data-search-filter-toggle]")?.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const panel = $("#search-filters");
      if (!panel) return;
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
    });
    $$('[data-search-filter]').forEach((filter) => {
      const label = filter.closest(".search-filter")?.querySelector("span");
      if (label) label.dataset.defaultLabel = label.textContent;
      filter.addEventListener("change", () => {
        if (label) label.textContent = filter.value ? filter.selectedOptions[0].textContent : label.dataset.defaultLabel;
        filterSearch(searchInput?.value || "");
      });
    });
    $("[data-search-reset]")?.addEventListener("click", () => {
      $$('[data-search-filter]').forEach((filter) => {
        filter.value = "";
        const label = filter.closest(".search-filter")?.querySelector("span");
        if (label?.dataset.defaultLabel) label.textContent = label.dataset.defaultLabel;
      });
      filterSearch(searchInput?.value || "");
      searchInput?.focus();
    });
    $("[data-search-clear-recent]")?.addEventListener("click", () => {
      state.searchRecentCleared = true;
      const recent = $("#search-recent");
      if (recent) recent.hidden = true;
      searchInput?.focus();
    });
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
      dialog.addEventListener("close", () => {
        body.classList.remove("is-locked");
        if (dialog._returnFocus instanceof HTMLElement && dialog._returnFocus.isConnected) {
          dialog._returnFocus.focus({ preventScroll: true });
        }
        dialog._returnFocus = null;
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav-menu-wrap, .popover-wrap, .list-control, .bookmark-menu")) closeAllMenus();
      if (!event.target.closest("#search-dialog, [data-open-search]")) closeSearch();
      if (!event.target.closest("#mobile-subscribe-menu, [data-open-title-notifications]")) closeTitleSubscription();
    });

    document.addEventListener("keydown", (event) => {
      const openDialogNode = $("dialog[open]:not(#search-dialog):not(.title-subscription-popover)");
      const openDrawerNode = $("#mobile-drawer.is-open");
      const openBookmarkSheet = $$('.bookmark-menu--sheet').find((menu) => !menu.hidden);
      trapFocus(event, openDialogNode || openDrawerNode || openBookmarkSheet);

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.target.matches("input, textarea, select")) {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") {
        const openBookmarkNode = $$('[data-bookmark-menu]').find((menu) => !menu.hidden);
        closeAllMenus();
        if (openBookmarkNode) bookmarkMenuTrigger(openBookmarkNode)?.focus({ preventScroll: true });
        closeDrawer();
        closeSearch({ restoreFocus: true });
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

  function initHeroSlider() {
    const slider = $('[data-hero-slider]');
    if (!slider) return;
    const slides = $$('[data-hero-slide]', slider);
    const dots = $$('[data-hero-dot]', slider);
    const current = $('[data-hero-current]', slider);
    const live = $('[data-hero-live]', slider);
    const progress = $('[data-hero-progress]', slider);
    const pauseButton = $('[data-hero-pause]', slider);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
    let timer = 0;
    let manuallyPaused = false;
    let interactionPaused = false;
    let pointerStart = null;

    slider.tabIndex = 0;

    const restart = () => {
      window.clearTimeout(timer);
      slider.classList.remove('is-running');
      if (progress) void progress.offsetWidth;
      if (manuallyPaused || interactionPaused || document.hidden || reducedMotion.matches) return;
      requestAnimationFrame(() => slider.classList.add('is-running'));
      timer = window.setTimeout(() => show(index + 1, { announce: false }), 7000);
    };

    const paintPause = () => {
      if (!pauseButton) return;
      pauseButton.setAttribute('aria-pressed', String(manuallyPaused));
      pauseButton.setAttribute('aria-label', manuallyPaused ? 'Возобновить автопрокрутку' : 'Приостановить автопрокрутку');
      setIcon(pauseButton, manuallyPaused ? 'play' : 'pause');
    };

    const show = (nextIndex, { announce = true } = {}) => {
      index = (nextIndex + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        $$('a, button, input, select, textarea, [tabindex]', slide).forEach((item) => {
          if (active) item.removeAttribute('tabindex');
          else item.tabIndex = -1;
        });
      });
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle('is-active', active);
        if (active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (current) current.textContent = String(index + 1).padStart(2, '0');
      const title = $('h2', slides[index])?.textContent?.trim() || `Слайд ${index + 1}`;
      const accent = getComputedStyle(slides[index]).getPropertyValue('--hero-accent').trim();
      if (accent) slider.style.setProperty('--hero-active-accent', accent);
      if (live && announce) live.textContent = `Слайд ${index + 1} из ${slides.length}: ${title}`;
      restart();
    };

    $('[data-hero-prev]', slider)?.addEventListener('click', () => show(index - 1));
    $('[data-hero-next]', slider)?.addEventListener('click', () => show(index + 1));
    dots.forEach((dot) => dot.addEventListener('click', () => show(Number(dot.dataset.heroDot))));
    pauseButton?.addEventListener('click', () => {
      manuallyPaused = !manuallyPaused;
      paintPause();
      restart();
    });

    slider.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    });
    slider.addEventListener('mouseenter', () => { interactionPaused = true; restart(); });
    slider.addEventListener('mouseleave', () => { interactionPaused = false; restart(); });
    slider.addEventListener('focusin', () => { interactionPaused = true; restart(); });
    slider.addEventListener('focusout', (event) => {
      if (event.relatedTarget && slider.contains(event.relatedTarget)) return;
      interactionPaused = false;
      restart();
    });
    slider.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' || event.button !== 0) return;
      pointerStart = { x: event.clientX, y: event.clientY };
    });
    slider.addEventListener('pointerup', (event) => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) < 54 || Math.abs(dx) <= Math.abs(dy)) return;
      show(index + (dx < 0 ? 1 : -1));
    });
    slider.addEventListener('pointercancel', () => { pointerStart = null; });
    document.addEventListener('visibilitychange', restart);
    reducedMotion.addEventListener?.('change', restart);

    paintPause();
    show(index, { announce: false });
  }

  function initContinueRail() {
    const rail = $('[data-continue-rail]');
    if (!rail) return;
    const previous = $('[data-continue-prev]');
    const next = $('[data-continue-next]');

    const update = () => {
      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      if (previous) previous.disabled = rail.scrollLeft <= 4;
      if (next) next.disabled = rail.scrollLeft >= maxScroll - 4 || maxScroll <= 4;
    };

    const move = (direction) => {
      const card = $('.continue-card:not([hidden])', rail);
      const cardWidth = card?.getBoundingClientRect().width || 280;
      const gap = Number.parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 12;
      const visibleStep = Math.max(cardWidth + gap, rail.clientWidth * 0.78);
      rail.scrollBy({ left: direction * visibleStep, behavior: 'smooth' });
    };

    previous?.addEventListener('click', () => move(-1));
    next?.addEventListener('click', () => move(1));
    rail.addEventListener('scroll', update, { passive: true });
    rail.addEventListener('keydown', (event) => {
      if (event.target !== rail || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    });
    rail.addEventListener('continuechange', () => requestAnimationFrame(update));
    window.addEventListener('resize', update, { passive: true });
    requestAnimationFrame(update);
  }

  function initHome() {
    initHeroSlider();
    initContinueRail();
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
        card.closest('[data-continue-rail]')?.dispatchEvent(new CustomEvent('continuechange'));
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
    none: "Не смотрю",
  };

  const subscriptionLabels = {
    episode: "Новые серии",
    dubbing: "Новые озвучки",
    all: "Все обновления",
    none: "Уведомления",
  };

  function syncListState() {
    const nextLabel = listLabels[state.listStatus] || listLabels.none;
    [$("#list-label"), $("#mobile-list-label")].forEach((label) => {
      if (label) label.textContent = nextLabel;
    });
    $$('[data-list-status]').forEach((item) => item.classList.toggle("is-active", item.dataset.listStatus === state.listStatus));
    $$('[data-open-mobile-list]').forEach((control) => {
      control.classList.toggle("is-active", state.listStatus !== "none");
      control.setAttribute("aria-label", state.listStatus === "none" ? "Добавить в список" : `${nextLabel}. Изменить статус`);
    });
  }

  function syncSubscriptionState() {
    $$('[data-subscribe]').forEach((item) => {
      const active = item.dataset.subscribe === state.subscription;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-checked", String(active));
    });
    $$('[data-open-title-notifications]').forEach((mobileTrigger) => {
      const active = state.subscription !== "none";
      mobileTrigger.classList.toggle("is-active", active);
      mobileTrigger.setAttribute("aria-label", active
        ? `${subscriptionLabels[state.subscription]}. Изменить уведомления`
        : "Настроить уведомления о тайтле");
      const icon = $(".title-subscription-icon", mobileTrigger);
      if (icon) setIcon(icon, active ? "bell-ring" : "bell");
    });
  }

  function placeTitleSubscriptionDialog() {
    const dialog = $("#mobile-subscribe-menu");
    const desktopTrigger = $(".title-community-action--notify[data-open-title-notifications]");
    if (!dialog) return;
    if (titleSubscriptionSheetQuery.matches || !desktopTrigger) {
      dialog.classList.remove("title-subscription-popover");
      dialog.setAttribute("aria-modal", "true");
      if (dialog.parentElement !== body) body.append(dialog);
      return;
    }
    dialog.classList.add("title-subscription-popover");
    dialog.removeAttribute("aria-modal");
    if (dialog.previousElementSibling !== desktopTrigger) desktopTrigger.insertAdjacentElement("afterend", dialog);
  }

  function closeTitleSubscription({ restoreFocus = false } = {}) {
    const dialog = $("#mobile-subscribe-menu");
    if (!dialog?.open) return;
    const returnFocus = dialog._returnFocus;
    dialog.close();
    $$('[data-open-title-notifications]').forEach((control) => control.setAttribute("aria-expanded", "false"));
    if (restoreFocus && returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
    dialog._returnFocus = null;
  }

  function openTitleSubscription(control) {
    const dialog = $("#mobile-subscribe-menu");
    if (!dialog) return;
    placeTitleSubscriptionDialog();
    dialog._returnFocus = control;
    if (titleSubscriptionSheetQuery.matches) openDialog(dialog);
    else if (!dialog.open) dialog.show();
    control.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => ($('[data-subscribe].is-active', dialog) || $('[data-subscribe]', dialog))?.focus({ preventScroll: true }));
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

  const TRANSLATION_VIEWS = {
    "AniLibria.TV": "18 200",
    "AniDub Online": "6 040",
    "Субтитры": "2 310",
  };

  function syncReleaseSummary() {
    const source = $("#source-select")?.value || "Kodik";
    const translation = $("#translation-select")?.value || "AniLibria.TV";
    const type = translation === "Субтитры" ? "Субтитры" : "Озвучка";
    const language = translation === "Субтитры" ? "Русские" : "Русский";
    const quality = $("#release-quality")?.textContent || "1080p";
    if ($("#release-type")) $("#release-type").textContent = type;
    if ($("#release-language")) $("#release-language").textContent = language;
    if ($("#release-views")) $("#release-views").textContent = TRANSLATION_VIEWS[translation] || "—";
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
    const savedPlayerSettings = storage.get("kitsu-demo-player-settings");
    if (savedPlayerSettings) {
      try {
        const parsed = JSON.parse(savedPlayerSettings);
        if (parsed.mode && $("#player-mode")) $("#player-mode").value = parsed.mode;
        if (parsed.speed && $("#player-speed")) $("#player-speed").value = parsed.speed;
        if (parsed.quality && $("#player-quality")) {
          $("#player-quality").value = parsed.quality;
          if ($("#release-quality")) $("#release-quality").textContent = parsed.quality;
        }
      } catch (_) {}
    }
    syncListState();
    syncSubscriptionState();
    syncPlayer();
    syncReleaseSummary();

    $("#list-trigger")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu(event.currentTarget, $("#list-menu"));
    });
    $$('[data-open-mobile-list]').forEach((control) => {
      control.addEventListener("click", () => openDialog($("#mobile-list-menu")));
    });
    $('[data-close-mobile-list]')?.addEventListener("click", () => closeDialog($("#mobile-list-menu")));
    $$('[data-list-status]').forEach((control) => {
      control.addEventListener("click", () => {
        if (!storage.set("kitsu-demo-list-status", control.dataset.listStatus)) return;
        state.listStatus = control.dataset.listStatus;
        syncListState();
        closeMenu($("#list-trigger"), $("#list-menu"));
        closeDialog($("#mobile-list-menu"));
        showToast(state.listStatus === "none" ? "Удалено из списка" : "Список обновлён", listLabels[state.listStatus]);
      });
    });

    $$('[data-open-title-notifications]').forEach((control) => {
      control.addEventListener("click", (event) => {
        event.stopPropagation();
        const dialog = $("#mobile-subscribe-menu");
        if (dialog?.open && dialog._returnFocus === control) closeTitleSubscription({ restoreFocus: true });
        else openTitleSubscription(control);
      });
    });
    $('[data-close-mobile-notifications]')?.addEventListener("click", () => closeTitleSubscription({ restoreFocus: true }));
    $("#mobile-subscribe-menu")?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTitleSubscription({ restoreFocus: true });
        return;
      }
      if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      const items = $$('[data-subscribe]', event.currentTarget);
      const currentIndex = items.indexOf(document.activeElement);
      let nextIndex = currentIndex < 0 ? 0 : currentIndex;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (nextIndex + 1) % items.length;
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (nextIndex - 1 + items.length) % items.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = items.length - 1;
      event.preventDefault();
      items[nextIndex]?.focus({ preventScroll: true });
    });
    $$('[data-subscribe]').forEach((control) => {
      control.addEventListener("click", () => {
        if (!storage.set("kitsu-demo-subscription", control.dataset.subscribe)) return;
        state.subscription = control.dataset.subscribe;
        syncSubscriptionState();
        const mobileDialog = $("#mobile-subscribe-menu");
        if (mobileDialog?.open) closeTitleSubscription({ restoreFocus: true });
        showToast(state.subscription === "none" ? "Уведомления выключены" : "Настройка сохранена", subscriptionLabels[state.subscription]);
      });
    });

    titleSubscriptionSheetQuery.addEventListener?.("change", () => {
      closeTitleSubscription();
      placeTitleSubscriptionDialog();
    });
    placeTitleSubscriptionDialog();

    $('[data-open-titles]')?.addEventListener("click", () => openDialog($("#titles-dialog")));
    $('[data-open-player-settings]')?.addEventListener("click", () => openDialog($("#player-settings-dialog")));
    $$('[data-close-dialog]').forEach((control) => control.addEventListener("click", () => closeDialog(control.closest("dialog"))));

    $('[data-save-player-settings]')?.addEventListener("click", () => {
      const settings = {
        mode: $("#player-mode")?.value,
        speed: $("#player-speed")?.value,
        quality: $("#player-quality")?.value,
      };
      if (!storage.set("kitsu-demo-player-settings", JSON.stringify(settings))) return;
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
    $$('[data-scroll-comments]').forEach((control) => control.addEventListener("click", () => scrollToTarget("#comments")));

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

    const playerOptionGroups = new Map();
    $$('[data-player-option]').forEach((input) => {
      const option = input.dataset.playerOption;
      if (!playerOptionGroups.has(option)) playerOptionGroups.set(option, []);
      playerOptionGroups.get(option).push(input);
    });
    playerOptionGroups.forEach((inputs, option) => {
      const key = `kitsu-demo-player-${option}`;
      const saved = storage.get(key);
      const checked = saved === null ? inputs[0].checked : saved === "1";
      inputs.forEach((input) => {
        input.checked = checked;
        input.addEventListener("change", () => {
          inputs.forEach((peer) => { peer.checked = input.checked; });
          storage.set(key, input.checked ? "1" : "0");
        });
      });
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
