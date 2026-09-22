/* ==========================================================================
   Awesome Products — landing page behaviour (Vanilla JS, no dependencies)
   ========================================================================== */

/* ---------------------------------------------------------------------------
   CONFIGURATION — the only place you normally need to edit
   --------------------------------------------------------------------------- */

// International format: country code + number, no "+", spaces or hyphens.
const WHATSAPP_NUMBER = "966567025627";

// How the number is shown to visitors (FAQ, return policy, footer).
const WHATSAPP_DISPLAY = "+966 56 702 5627";

// Shown after every price. Replace with the confirmed currency, e.g. "ر.س".
const CURRENCY_LABEL = "[العملة]";

// The pre-filled WhatsApp message. The greeting MUST stay exactly as supplied.
const MESSAGE_GREETING = "السلام عليكم  أبي أطلب سلسلة مخصّصة بالاسم 🤍";
const MESSAGE_NO_OPTION = "لم أحدده بعد";
const MESSAGE_NAME_LATER = "سأرسله في المحادثة";
const MESSAGE_CLOSING = "أرغب في معرفة تفاصيل الطلب والدفع عند الاستلام.";

// Small notice shown when a WhatsApp button is pressed.
const TOAST_TEXT = "جارٍ فتح واتساب… أكمل طلبك من المحادثة.";

// Longest name the optional name field accepts.
const NAME_MAX_LENGTH = 30;

/* ---------------------------------------------------------------------------
   APP
   --------------------------------------------------------------------------- */
(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Images: local file first, remote URL as a safety net ---------- */
  function initImageFallbacks() {
    $$("img[data-fallback]").forEach((img) => {
      const useFallback = () => {
        if (img.dataset.fallbackUsed) {
          img.classList.add("is-broken"); // both sources failed: show the tinted placeholder
          return;
        }
        img.dataset.fallbackUsed = "1";
        img.src = img.dataset.fallback;
      };
      img.addEventListener("error", useFallback);
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) useFallback();
    });
  }

  /* ---------- Header: sticky state + mobile menu ---------- */
  function initHeader() {
    const header = $(".site-header");
    const toggle = $(".nav-toggle");
    const nav = $("#site-nav");
    if (!header || !toggle || !nav) return;

    const setOpen = (open, returnFocus = false) => {
      nav.classList.toggle("is-open", open);
      header.classList.toggle("is-menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
      if (!open && returnFocus) toggle.focus();
    };
    const isOpen = () => nav.classList.contains("is-open");

    toggle.addEventListener("click", () => setOpen(!isOpen()));
    nav.addEventListener("click", (event) => { if (event.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) setOpen(false, true);
    });
    document.addEventListener("click", (event) => {
      if (isOpen() && !header.contains(event.target)) setOpen(false);
    });
    window.matchMedia("(min-width: 900px)").addEventListener("change", () => setOpen(false));

    // Sticky header gets a blurred background once the page scrolls.
    let ticking = false;
    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- WhatsApp ordering ---------- */
  let toastTimer = 0;
  function showToast(text) {
    const toast = $(".toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function buildMessage(plan, customerName) {
    const lines = [MESSAGE_GREETING, ""];
    lines.push(`الخيار: ${plan ? plan.name : MESSAGE_NO_OPTION}`);
    if (plan) lines.push(`السعر: ${plan.price}`);
    lines.push(`الاسم المطلوب كتابته على السلسلة: ${customerName || MESSAGE_NAME_LATER}`);
    lines.push("", MESSAGE_CLOSING);
    return lines.join("\n");
  }

  const orderUrl = (plan, customerName) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage(plan, customerName))}`;
  const chatUrl = () => `https://wa.me/${WHATSAPP_NUMBER}`;

  function initOrdering() {
    const cards = $$("[data-plan]");
    const nameInput = $("#customer-name");
    const barLabel = $("[data-bar-label]");
    const barPrice = $("[data-bar-price]");
    const defaults = {
      label: barLabel ? barLabel.textContent.trim() : "",
      price: barPrice ? barPrice.textContent.trim() : "",
    };
    const state = { plan: null, name: "" };

    // Fill values that come from the config block.
    $$("[data-currency]").forEach((el) => { el.textContent = CURRENCY_LABEL; });
    $$("[data-phone-display]").forEach((el) => { el.textContent = WHATSAPP_DISPLAY; });
    $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

    // Every link that opens WhatsApp does so in a new tab and says so to screen readers.
    $$("[data-whatsapp], [data-whatsapp-chat]").forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (!link.hasAttribute("aria-label")) {
        const hint = document.createElement("span");
        hint.className = "sr-only";
        hint.textContent = " (يفتح واتساب في نافذة جديدة)";
        link.appendChild(hint);
      }
    });

    const readPlan = (card) => {
      const name = ($("[data-plan-name]", card) || {}).textContent || "";
      const price = ($("[data-plan-price]", card) || {}).textContent || "";
      return { id: card.dataset.plan, name: name.trim(), price: `${price.trim()} ${CURRENCY_LABEL}`.trim() };
    };

    const refreshLinks = () => {
      $$("[data-whatsapp]").forEach((link) => {
        const card = link.closest("[data-plan]");
        link.href = orderUrl(card ? readPlan(card) : state.plan, state.name);
      });
      $$("[data-whatsapp-chat]").forEach((link) => { link.href = chatUrl(); });
    };

    const refreshBar = () => {
      if (barLabel) barLabel.textContent = state.plan ? state.plan.name : defaults.label;
      if (barPrice) barPrice.textContent = state.plan ? state.plan.price : defaults.price;
    };

    const select = (card) => {
      state.plan = card ? readPlan(card) : null;
      cards.forEach((c) => {
        const selected = c === card;
        c.classList.toggle("is-selected", selected);
        const radio = $("input[type=radio]", c);
        if (radio) radio.checked = selected;
      });
      refreshBar();
      refreshLinks();
    };

    cards.forEach((card) => {
      const radio = $("input[type=radio]", card);
      if (radio) radio.addEventListener("change", () => select(card));
    });

    if (nameInput) {
      nameInput.addEventListener("input", () => {
        state.name = nameInput.value.replace(/\s+/g, " ").trim().slice(0, NAME_MAX_LENGTH);
        refreshLinks();
      });
    }

    // Last-moment refresh so the link always matches the latest choices.
    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-whatsapp], [data-whatsapp-chat]");
      if (!link) return;
      const card = link.closest("[data-plan]");
      if (card && link.hasAttribute("data-whatsapp")) select(card);
      else refreshLinks();
      showToast(TOAST_TEXT);
    });

    refreshBar();
    refreshLinks();
  }

  /* ---------- FAQ accordion (one open at a time) ---------- */
  function initFaq() {
    const items = $$(".faq__item");
    const buttons = items.map((item) => $(".faq__q", item));

    const setOpen = (item, open) => {
      item.classList.toggle("is-open", open);
      $(".faq__q", item).setAttribute("aria-expanded", String(open));
    };

    items.forEach((item) => {
      $(".faq__q", item).addEventListener("click", () => {
        const willOpen = !item.classList.contains("is-open");
        items.forEach((other) => setOpen(other, other === item && willOpen));
      });
    });

    // Arrow keys / Home / End move between questions.
    buttons.forEach((button, index) => {
      button.addEventListener("keydown", (event) => {
        const last = buttons.length - 1;
        const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: last }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        buttons[(target + buttons.length) % buttons.length].focus();
      });
    });
  }

  /* ---------- Gallery lightbox ---------- */
  function initLightbox() {
    const dialog = $("#lightbox");
    const tiles = $$("[data-lightbox-item]");
    if (!dialog || typeof dialog.showModal !== "function" || !tiles.length) return;

    const image = $(".lightbox__img", dialog);
    const counter = $("[data-lb-count]", dialog);
    const digits = new Intl.NumberFormat("ar-EG");
    let index = 0;

    const show = (next) => {
      index = (next + tiles.length) % tiles.length;
      const source = $("img", tiles[index]);
      image.src = source.currentSrc || source.src;
      image.alt = source.alt;
      counter.textContent = `${digits.format(index + 1)} / ${digits.format(tiles.length)}`;
    };

    tiles.forEach((tile, i) => {
      tile.addEventListener("click", () => {
        show(i);
        document.documentElement.classList.add("is-locked");
        dialog.showModal();
      });
    });

    $("[data-lb-close]", dialog).addEventListener("click", () => dialog.close());
    $("[data-lb-prev]", dialog).addEventListener("click", () => show(index - 1));
    $("[data-lb-next]", dialog).addEventListener("click", () => show(index + 1));
    dialog.addEventListener("close", () => document.documentElement.classList.remove("is-locked"));

    // Click on the dark area closes the viewer.
    dialog.addEventListener("click", (event) => {
      if (!event.target.closest("img, button")) dialog.close();
    });

    // Page is right-to-left: the left arrow goes forward.
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") show(index + 1);
      if (event.key === "ArrowRight") show(index - 1);
    });
  }

  /* ---------- Vertical video: friendly placeholder if the file is missing ---------- */
  function initVideo() {
    const frame = $("[data-video-frame]");
    const video = frame && $("video", frame);
    if (!video) return;

    const markMissing = () => frame.classList.add("is-missing");
    const source = $("source", video);
    if (source) source.addEventListener("error", markMissing);
    video.addEventListener("error", markMissing);
    window.addEventListener("load", () => {
      if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) markMissing();
    });
  }

  /* ---------- Canvas background: drifting gold particles + slow jewellery chains ---------- */
  function initBackground() {
    const canvas = $("#bg-canvas");
    const ctx = canvas && canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;

    const TAU = Math.PI * 2;
    const GOLD = "217,145,43";
    const LIGHT = "244,209,138";
    const FRAME_MS = 1000 / 30; // 30 fps is plenty for slow ambient motion

    const chainDefs = [
      { y: 0.17, amp: 0.045, span: 1.1, speed: 0.10, alpha: 0.17, phase: 0.0 },
      { y: 0.54, amp: 0.070, span: 1.4, speed: -0.07, alpha: 0.13, phase: 2.0 },
      { y: 0.87, amp: 0.050, span: 0.9, speed: 0.085, alpha: 0.15, phase: 4.0 },
    ];

    let width = 0;
    let height = 0;
    let particles = [];
    let running = false;
    let rafId = 0;
    let lastFrame = 0;
    let clock = 0;

    const rand = (min, max) => min + Math.random() * (max - min);

    function seedParticles() {
      const count = Math.max(16, Math.min(48, Math.round((width * height) / 28000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random(), y: Math.random(),            // normalised 0..1, so resizing never re-seeds
        r: rand(0.7, 2.4),
        rise: rand(0.004, 0.014),                      // screen-heights per second
        sway: rand(0.004, 0.012), swaySpeed: rand(0.2, 0.6),
        phase: rand(0, TAU), twinkle: rand(0.6, 1.6),
        alpha: rand(0.2, 0.52),
        tone: Math.random() < 0.35 ? LIGHT : GOLD,
      }));
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      canvas.width = Math.round(nextWidth * dpr);
      canvas.height = Math.round(nextHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const first = !particles.length;
      width = nextWidth;
      height = nextHeight;
      if (first) seedParticles();
      if (!running) draw(0);
    }

    const chainY = (def, x, t) => {
      const u = (x / (width * def.span)) * TAU;
      return def.y * height
        + def.amp * height * (Math.sin(u + t * def.speed * TAU + def.phase)
        + 0.35 * Math.sin(u * 2.1 - t * def.speed * 1.7 * TAU + def.phase * 1.3));
    };

    function drawGlow(t) {
      const spots = [
        { x: 0.2 + 0.05 * Math.sin(t * 0.05), y: 0.25, r: 0.55, a: 0.20 },
        { x: 0.85 + 0.05 * Math.cos(t * 0.04), y: 0.7, r: 0.6, a: 0.16 },
      ];
      spots.forEach((s) => {
        const cx = s.x * width;
        const cy = s.y * height;
        const radius = s.r * Math.max(width, height);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, `rgba(${LIGHT},${s.a})`);
        g.addColorStop(1, `rgba(${LIGHT},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      });
    }

    function drawChain(def, t) {
      const step = 9;
      ctx.beginPath();
      let i = 0;
      for (let x = -step; x <= width + step; x += step, i++) {
        const y = chainY(def, x, t);
        const angle = Math.atan2(chainY(def, x + 2, t) - y, 2);
        const long = i % 2 === 0;
        const rx = long ? 6.5 : 3.6;
        const ry = long ? 2.8 : 1.7;
        ctx.moveTo(x + rx * Math.cos(angle), y + rx * Math.sin(angle));
        ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
      }
      ctx.strokeStyle = `rgba(${GOLD},${def.alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function drawParticles(t) {
      particles.forEach((p) => {
        const x = (p.x + Math.sin(t * p.swaySpeed + p.phase) * p.sway) * width;
        const y = (((p.y - t * p.rise) % 1) + 1) % 1 * height;
        const alpha = p.alpha * (0.65 + 0.35 * Math.sin(t * p.twinkle + p.phase));

        ctx.fillStyle = `rgba(${p.tone},${alpha * 0.18})`;
        ctx.beginPath(); ctx.arc(x, y, p.r * 4, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(${p.tone},${alpha})`;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.fill();

        if (p.r > 1.9) { // a tiny glint on the larger sparks
          const len = p.r * 4;
          ctx.strokeStyle = `rgba(${LIGHT},${alpha * 0.7})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
          ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
          ctx.stroke();
        }
      });
    }

    function draw(t) {
      ctx.clearRect(0, 0, width, height);
      drawGlow(t);
      chainDefs.forEach((def) => drawChain(def, t));
      drawParticles(t);
    }

    function frame(timestamp) {
      if (!running) return;
      rafId = requestAnimationFrame(frame);
      const elapsed = timestamp - lastFrame;
      if (elapsed < FRAME_MS) return;
      clock += Math.min(elapsed, 100) / 1000;
      lastFrame = timestamp;
      draw(clock);
    }

    function start() {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    // Animate only when motion is allowed and the tab is visible; otherwise show one still frame.
    function applyMotionPreference() {
      if (prefersReducedMotion.matches || document.hidden) {
        stop();
        draw(clock);
      } else {
        start();
      }
    }

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    });
    document.addEventListener("visibilitychange", applyMotionPreference);
    prefersReducedMotion.addEventListener("change", applyMotionPreference);

    resize();
    applyMotionPreference();
  }

  /* ---------- Boot ---------- */
  initImageFallbacks();
  initHeader();
  initOrdering();
  initFaq();
  initLightbox();
  initVideo();
  initBackground();
})();
