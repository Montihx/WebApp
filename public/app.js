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
    playbackSeconds: 0,
  };
  const PLAYER_DURATION = 24 * 60;

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
    $$('[data-card-bookmark-menu]').forEach((menu) => {
      if (menu === except) return;
      closeMenu($(`[data-card-bookmark-trigger]`, menu.parentElement), menu);
    });
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
    let visible = 0;
    $$('[data-search-item]', dialog).forEach((item) => {
      const matches = !query || item.dataset.searchItem.toLocaleLowerCase("ru").includes(query);
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    $("#search-empty", dialog).hidden = visible > 0;
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
      if (!event.target.closest(".nav-menu-wrap, .popover-wrap, .list-control, .title-inline-actions, .card-bookmark")) closeAllMenus();
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

    const cardListLabels = {
      watching: "Смотрю",
      completed: "Просмотрено",
      planned: "Запланировано",
      on_hold: "Отложено",
      dropped: "Брошено",
    };

    $$('[data-card-bookmark]').forEach((wrap, index) => {
      const trigger = $("[data-card-bookmark-trigger]", wrap);
      const menu = $("[data-card-bookmark-menu]", wrap);
      if (!trigger || !menu) return;
      const key = `kitsu-demo-card-list-${body.dataset.page}-${index}`;
      let status = storage.get(key, "none");

      const applyStatus = () => {
        const active = status !== "none";
        trigger.classList.toggle("is-active", active);
        if (active) trigger.dataset.status = status;
        else delete trigger.dataset.status;
        trigger.setAttribute("aria-pressed", String(active));
        trigger.setAttribute("aria-label", active ? `${cardListLabels[status]} · нажмите, чтобы изменить статус` : "Добавить в список");
        $$('[data-card-list-status]', menu).forEach((item) => item.classList.toggle("is-active", item.dataset.cardListStatus === status));
      };
      applyStatus();

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleMenu(trigger, menu);
      });

      $$('[data-card-list-status]', menu).forEach((item) => {
        item.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const clicked = item.dataset.cardListStatus;
          status = status === clicked ? "none" : clicked;
          storage.set(key, status);
          applyStatus();
          closeMenu(trigger, menu);
          showToast(status === "none" ? "Удалено из списка" : "Список обновлён", cardListLabels[status] || "");
        });
      });
    });
  }

  function initHeroSlider() {
    const root = $("#hero-slider");
    if (!root) return;
    const slides = $$("[data-hero-slide]", root);
    const dotsWrap = $("[data-hero-dots]", root);
    const timerSpan = $("[data-hero-timer]", root);
    const prevButton = $("[data-hero-prev]", root);
    const nextButton = $("[data-hero-next]", root);
    if (slides.length < 2 || !dotsWrap) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const AUTO_PLAY_MS = 7000;
    let index = Math.max(0, slides.findIndex((slide) => slide.classList.contains("is-active")));
    let timer = null;

    slides.forEach((slide, slideIndex) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Слайд ${slideIndex + 1} из ${slides.length}`);
      dot.innerHTML = "<span></span>";
      dot.addEventListener("click", () => goTo(slideIndex, true));
      dotsWrap.appendChild(dot);
    });
    const dots = $$("button", dotsWrap);

    function restartTimer() {
      if (!timerSpan) return;
      timerSpan.classList.remove("is-running");
      // eslint-disable-next-line no-unused-expressions
      timerSpan.offsetWidth; // force reflow so the animation restarts from 0%
      if (!reduceMotion) timerSpan.classList.add("is-running");
    }

    function render() {
      slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === index));
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === index);
        dot.setAttribute("aria-selected", String(dotIndex === index));
      });
    }

    function goTo(nextIndex, manual = false) {
      index = (nextIndex + slides.length) % slides.length;
      render();
      restartTimer();
      if (manual) resetAutoPlay();
    }

    function resetAutoPlay() {
      if (timer) window.clearInterval(timer);
      if (reduceMotion) return;
      timer = window.setInterval(() => goTo(index + 1), AUTO_PLAY_MS);
    }

    prevButton?.addEventListener("click", () => goTo(index - 1, true));
    nextButton?.addEventListener("click", () => goTo(index + 1, true));

    render();
    restartTimer();
    resetAutoPlay();
  }

  function initHome() {
    initHeroSlider();
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
    const inList = state.listStatus !== "none";
    const label = $("#list-label");
    if (label) label.textContent = listLabels[state.listStatus] || listLabels.none;
    $$('[data-list-status]').forEach((item) => item.classList.toggle("is-active", item.dataset.listStatus === state.listStatus));
    const trigger = $("#list-trigger");
    if (trigger) trigger.classList.toggle("is-active", inList);
    setIcon($("#list-trigger-icon"), inList ? "bookmark-check" : "bookmark-plus");
    const counter = $('[data-count-label="favorites"]');
    if (counter) counter.textContent = inList ? "В вашем списке" : "В списки";
  }

  function syncSubscriptionState() {
    $$('[data-subscribe]').forEach((item) => item.classList.toggle("is-active", item.dataset.subscribe === state.subscription));
    const trigger = $("#subscribe-trigger");
    if (!trigger) return;
    const text = $("span", trigger);
    if (text) text.textContent = subscriptionLabels[state.subscription] || subscriptionLabels.none;
  }

  function formatPlayerTime(totalSeconds) {
    const clamped = Math.max(0, Math.min(PLAYER_DURATION, Math.round(totalSeconds)));
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function renderTimeline() {
    const fill = $("[data-timeline-fill]");
    const thumb = $("[data-timeline-thumb]");
    const timeEl = $("#player-time");
    const track = $("#player-timeline");
    const percent = (state.playbackSeconds / PLAYER_DURATION) * 100;
    if (fill) fill.style.width = `${percent}%`;
    if (thumb) thumb.style.left = `${percent}%`;
    if (timeEl) timeEl.textContent = `${formatPlayerTime(state.playbackSeconds)} / ${formatPlayerTime(PLAYER_DURATION)}`;
    if (track) track.setAttribute("aria-valuenow", String(Math.round(percent)));
  }

  let playbackTimer = null;
  let idleTimer = null;

  function stopPlaybackTicker() {
    if (playbackTimer) window.clearInterval(playbackTimer);
    playbackTimer = null;
  }

  function startPlaybackTicker() {
    stopPlaybackTicker();
    playbackTimer = window.setInterval(() => {
      state.playbackSeconds = Math.min(PLAYER_DURATION, state.playbackSeconds + 1);
      renderTimeline();
      if (state.playbackSeconds >= PLAYER_DURATION) {
        state.playing = false;
        syncPlayer();
      }
    }, 1000);
  }

  function armIdleHide() {
    const stage = $("#player-stage");
    if (!stage) return;
    stage.classList.remove("is-idle");
    if (idleTimer) window.clearTimeout(idleTimer);
    if (!state.playing) return;
    idleTimer = window.setTimeout(() => stage.classList.add("is-idle"), 2600);
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
    if (state.playing) {
      startPlaybackTicker();
      armIdleHide();
    } else {
      stopPlaybackTicker();
      stage.classList.remove("is-idle");
      if (idleTimer) window.clearTimeout(idleTimer);
    }
  }

  function initPlayerTimeline() {
    const track = $("#player-timeline");
    const stage = $("#player-stage");
    const tooltip = $("[data-timeline-tooltip]");
    if (!track || !stage) return;

    const secondsFromEvent = (event) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      return ratio * PLAYER_DURATION;
    };

    const showTooltip = (event) => {
      if (!tooltip) return;
      const seconds = secondsFromEvent(event);
      const rect = track.getBoundingClientRect();
      const percent = ((event.clientX - rect.left) / rect.width) * 100;
      tooltip.style.left = `${Math.max(0, Math.min(100, percent))}%`;
      tooltip.textContent = formatPlayerTime(seconds);
      tooltip.classList.add("is-visible");
    };
    const hideTooltip = () => tooltip?.classList.remove("is-visible");

    let scrubbing = false;

    track.addEventListener("mousemove", (event) => {
      showTooltip(event);
      if (scrubbing) {
        state.playbackSeconds = secondsFromEvent(event);
        renderTimeline();
      }
    });
    track.addEventListener("mouseleave", () => { if (!scrubbing) hideTooltip(); });

    track.addEventListener("pointerdown", (event) => {
      scrubbing = true;
      track.classList.add("is-scrubbing");
      track.setPointerCapture(event.pointerId);
      state.playbackSeconds = secondsFromEvent(event);
      renderTimeline();
      showTooltip(event);
    });
    track.addEventListener("pointermove", (event) => {
      if (!scrubbing) return;
      state.playbackSeconds = secondsFromEvent(event);
      renderTimeline();
      showTooltip(event);
    });
    const endScrub = (event) => {
      if (!scrubbing) return;
      scrubbing = false;
      track.classList.remove("is-scrubbing");
      hideTooltip();
      if (event?.pointerId !== undefined && track.hasPointerCapture?.(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
    };
    track.addEventListener("pointerup", endScrub);
    track.addEventListener("pointercancel", endScrub);

    track.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 30 : 5;
      if (event.key === "ArrowRight") {
        state.playbackSeconds = Math.min(PLAYER_DURATION, state.playbackSeconds + step);
      } else if (event.key === "ArrowLeft") {
        state.playbackSeconds = Math.max(0, state.playbackSeconds - step);
      } else {
        return;
      }
      event.preventDefault();
      renderTimeline();
    });

    ["mousemove", "click", "keydown"].forEach((type) => stage.addEventListener(type, armIdleHide));
    renderTimeline();
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
    state.playbackSeconds = 0;
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
    renderTimeline();
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
    initPlayerTimeline();

    $("#list-trigger")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu(event.currentTarget, $("#list-menu"));
    });
    $$('[data-list-status]').forEach((control) => {
      control.addEventListener("click", () => {
        const clicked = control.dataset.listStatus;
        state.listStatus = state.listStatus === clicked ? "none" : clicked;
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
