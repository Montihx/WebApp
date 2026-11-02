/* ================================================================
   KV FX — скрипты анимаций и визуальных эффектов.
   Подключается ПОСЛЕ app.js с атрибутом defer.
   Не меняет структуру, не меняет поведение существующего кода.
   ================================================================ */

(() => {
  "use strict";

  /* ================================================================
     УТИЛИТЫ
     ================================================================ */

  const prefersReduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hasHover = () =>
    window.matchMedia("(hover: hover)").matches;

  /* ================================================================
     1. АВТОДОБАВЛЕНИЕ КЛАССОВ .kv-reveal
     Добавляет класс на секции, но НЕ на первый экран.
     ================================================================ */

  function addRevealClasses() {
    // Определяем какой контент НЕ нужно скрывать (первый экран)
    const skipSelectors = [
      ".site-header",
      ".mobile-drawer",
      ".mobile-bottom-nav",
      ".pf-hero",          // герой профиля — первый экран
      ".title-hero",       // герой тайтла — первый экран
      ".auth-main",        // форма авторизации — первый экран
      ".skip-link",
    ];

    // Секции на всех страницах
    const targets = document.querySelectorAll(
      ".content-section, .pf-sec"
    );

    targets.forEach(section => {
      // Пропускаем если секция в списке исключений
      if (skipSelectors.some(sel => section.matches(sel) || section.closest(sel))) return;
      // Пропускаем если уже есть класс
      if (section.classList.contains("kv-reveal")) return;
      // Пропускаем еслиv-fx.js`
2. Вставь код выше целиком
3. Сохрани секция в первом экране (видна без скролла)
      if (section.getBoundingClientRect().top < window.innerHeight * 0.5 && window.scrollY < 100) return;

      section.classList.add("kv-reveal");
    });
  }

  /* ================================================================
     2. REVEAL ON SCROLL
     ================================================================ */

  function initReveal() {
    const els = document.querySelectorAll(".kv-reveal:not(.is-visible)");
    if (!els.length) return;

    // Если пользователь предпочитает без анимаций — показать всё сразу
    if (prefersReduced()) {
      els.forEach(el => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px

**Что этот скрипт делает:** -30px 0px",
      }
    );

    els.forEach(el => observer.observe(el));
  }

  /* ================================================================
     3. SPOTLIGHT НА КАРТОЧКАХ
     Свечение следует за курсором. Только для устройств с курсором.
    
- Автоматически на ================================================================ */

  function initSpotlight() {
    if (!hasHover()) return;
    if (prefersReduced()) return;

    let rafId = null;

    document.addEventListener("mousemove", event => {
      const card = event.target.closest(".anime-card");
      if (!card) return;

      // Отменяем предыдущий запрос для производительности
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--kv-mx", x.toFixed(1) + "%");
        card.style.setProperty("--kv-my", y.toFixed(1) + "%");
        rafId = null;
      });
    }, { passive: true });
  }

  /* ================================================================
     4. ПАРАЛЛАКС НА СТРАНИЦЕ ТАЙТЛА
     ================================================================ */

  function initTitleParallax() {
    // Только на странице тайтла
    if (document.body.dataset.page !== "anime") return;

    const bg = document.querySelector(".title-backdrop img");
    if (!bg) return;
    if (prefersReduced()) return;

    let ticking = false;

    function update() {
      const scrollY = window.scrollY || window.pageYOffset;
      // Не двигаем слишком далеко — максимум 120px
      const maxShift = 120;
      const shift = Math.min(scrollY * 0.18, maxShift);
      bg.style.transform = "translateY(" + shift.toFixed(1) + "px)";
      ticking = false;
    }

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    // Первичный вызов
    update();
  }

  /* ================================================================
     5. ПРОГРЕСС-БАРЫ — анимация заполнения
     ================================================================ */

  function initProgressBars() {
    if (prefersReduced()) return;

    const bars = document.querySelectorAll(".continue-bar__fill");
    if (!bars.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const bar = entry.target;
            const target = bar.dataset.kvTarget || bar.style.width;
            if (target && target !== "0%") {
              bar.style.width = "0%";
              // Два rAF чтобы браузер отрисовал 0% перед анимацией
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  bar.style.width = target;
                });
              });
            }
            observer.unobserve(bar);
          }
        });
      },
      { threshold: 0.3 }
    );

    bars.forEach(bar => {
      bar.dataset.kvTarget = bar.style.width || "0%";
      observer.observe(bar);
    });
  }

  /* ================================================================
     6. АДМИНКА — каскад виджетов
     ================================================================ */

  function initAdminWidgets() {
    // Только в админке (проверяем по наличию специфичных элементов)
    const widgets = document.querySelectorAll(
      ".admin-card, .stat-card, .dash-card, .kv-admin-target"
    );
    if (!widgets.length) return;
    if (prefersReduced()) {
      widgets.forEach(w => w.style.opacity = "1");
      return;
    }

    widgets.forEach((widget, i) => {
      if (widget.classList.contains("kv-admin-widget")) return;
      widget.classList.add("kv-admin-widget");
      widget.style.animationDelay = (i * 40) + "ms";
    });
  }

  /* ================================================================
     7. ГЛАВНАЯ — каскад для слайдера при первой загрузкеходит секции и добавляет
     ================================================================ */

  function initHeroEntrance() {
    if (document.body.dataset.page !== "home") return;
    if (prefersReduced()) return;

    const hero = document.querySelector(".pf-hero, [data-hero-slider]");
    if (!hero) return;

    // Плавное появление героя при загрузке
    hero.style.opacity = "0";
    hero.style.transform = "translateY(12px)";
    hero.style.transition = "opacity 600ms cubic-bezier(.16,1,.3,1), transform 600ms cubic-bezier(.16,1,.3,1)";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hero.style.opacity = "1";
        hero.style.transform = "translateY(0)";
      });
    });
  }

  /* ================================================================
     8. ОБЩИЙ ВХОД
     ================================================================ */

  function init() {
    addRevealClasses();
    initReveal();
    initSpotlight();
    initTitleParallax();
    initProgressBars();
    initAdminWidgets();
    initHeroEntrance();
  }

  /* ================================================================
     ЗАПУСК
     ================================================================ */

  // Запуск после загрузки всех скриптов (после app.js)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Для админки: пересканировать при смене хеш-маршрута
  им класс `.kv-reveal window.addEventListener("hashchange", () => {
    // Отложенный запуск чтобы новый экран успел отрисоваться
    setTimeout(() => {
      addRevealClasses();
      initReveal();
      initAdminWidgets();
    }, 50);
  });

})();
