/* Rachith Gattu — portfolio interactions. No dependencies. */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const small = window.matchMedia("(max-width: 760px)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ------------------------------------------------------------------
     Nav: shadow on scroll, active section, mobile menu
     ------------------------------------------------------------------ */
  const nav = $("#nav");
  const menuBtn = $("#nav-menu");
  const links = $("#nav-links");

  const onScrollNav = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  menuBtn.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "Close" : "Menu";
  });
  $$("a", links).forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.textContent = "Menu";
    })
  );

  const navMap = new Map($$("a", links).map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navMap.forEach((a, id) => a.classList.toggle("is-active", id === entry.target.id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  ["top", ...navMap.keys()].forEach((id) => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------
     Turnable: a physical object you can drag, flick, and flip.
     Used by the business card and the VCU seal coin.
     ------------------------------------------------------------------ */
  function buildEdge(container, count, depth) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const z = -depth / 2 + (depth * i) / (count - 1);
      s.style.transform = `translateZ(${z.toFixed(2)}px)`;
      frag.appendChild(s);
    }
    container.appendChild(frag);
  }

  class Turnable {
    constructor(el, stage, { restX, restY, hoverAmp = 8, shadow }) {
      this.el = el;
      this.stage = stage;
      this.shadow = shadow;
      this.rest = { x: restX, y: restY };
      this.rx = restX;
      this.ry = restY;
      this.targetY = restY;
      this.vy = 0;
      this.hx = 0;
      this.hy = 0;
      this.hxT = 0;
      this.hyT = 0;
      this.hoverAmp = hoverAmp;
      this.dragging = false;
      this.running = false;
      this.bind();
      this.render();
    }

    snap(angle) {
      return this.rest.y + Math.round((angle - this.rest.y) / 180) * 180;
    }

    flip(dir = 1) {
      this.vy = 0;
      this.targetY = this.snap(this.ry) + 180 * dir;
      if (reduceMotion.matches) this.ry = this.targetY;
      this.kick();
    }

    bind() {
      const el = this.el;
      let lastX = 0;
      let lastY = 0;
      let moved = 0;

      el.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        this.dragging = true;
        moved = 0;
        lastX = e.clientX;
        lastY = e.clientY;
        this.vy = 0;
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-dragging");
        this.kick();
      });

      el.addEventListener("pointermove", (e) => {
        if (!this.dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        this.ry += dx * 0.5;
        this.rx = clamp(this.rx - dy * 0.3, -40, 40);
        this.vy = this.vy * 0.55 + dx * 0.5 * 0.45;
        this.kick();
      });

      const release = (allowTap) => {
        if (!this.dragging) return;
        this.dragging = false;
        el.classList.remove("is-dragging");
        if (allowTap && moved < 6) {
          this.flip();
          return;
        }
        if (reduceMotion.matches || Math.abs(this.vy) < 1.2) {
          this.vy = 0;
          this.targetY = this.snap(this.ry);
          if (reduceMotion.matches) this.ry = this.targetY;
        }
        this.kick();
      };
      el.addEventListener("pointerup", () => release(true));
      el.addEventListener("pointercancel", () => release(false));

      // gentle "look at the cursor" tilt while hovering the stage
      this.stage.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse" || this.dragging || reduceMotion.matches) return;
        const r = this.stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        this.hyT = px * this.hoverAmp * 2;
        this.hxT = -py * this.hoverAmp;
        this.kick();
      });
      this.stage.addEventListener("pointerleave", () => {
        this.hxT = 0;
        this.hyT = 0;
        this.kick();
      });
    }

    kick() {
      if (this.running) return;
      this.running = true;
      requestAnimationFrame(() => this.step());
    }

    step() {
      if (!this.dragging) {
        if (this.vy !== 0) {
          this.ry += this.vy;
          this.vy *= 0.94;
          if (Math.abs(this.vy) < 0.9) {
            this.targetY = this.snap(this.ry + this.vy * 12);
            this.vy = 0;
          }
        } else {
          this.ry += (this.targetY - this.ry) * 0.085;
        }
        this.rx += (this.rest.x - this.rx) * 0.08;
      }
      this.hx += (this.hxT - this.hx) * 0.1;
      this.hy += (this.hyT - this.hy) * 0.1;
      this.render();

      const settled =
        !this.dragging &&
        this.vy === 0 &&
        Math.abs(this.targetY - this.ry) < 0.05 &&
        Math.abs(this.rest.x - this.rx) < 0.05 &&
        Math.abs(this.hxT - this.hx) < 0.05 &&
        Math.abs(this.hyT - this.hy) < 0.05;

      if (settled) {
        this.running = false;
        return;
      }
      requestAnimationFrame(() => this.step());
    }

    render() {
      const x = this.rx + this.hx;
      const y = this.ry + this.hy;
      const rad = (y * Math.PI) / 180;
      const s = this.el.style;
      s.setProperty("--rx", `${x.toFixed(2)}deg`);
      s.setProperty("--ry", `${y.toFixed(2)}deg`);
      s.setProperty("--lx", `${(50 - Math.sin(rad) * 70).toFixed(1)}%`);
      s.setProperty("--ly", `${(28 - x * 1.4).toFixed(1)}%`);
      if (this.shadow) {
        this.shadow.style.setProperty("--sx", (0.28 + 0.72 * Math.abs(Math.cos(rad))).toFixed(3));
      }
    }
  }

  const card = $("#card");
  if (card) {
    buildEdge($(".bc-edge", card), 11, 5);
    const turn = new Turnable(card, $("#card-stage"), {
      restX: 6,
      restY: -16,
      hoverAmp: 7,
      shadow: $(".bc-shadow"),
    });
    $("#card-flip").addEventListener("click", () => turn.flip());
  }

  const coin = $("#coin");
  if (coin) {
    buildEdge($(".coin-edge", coin), 24, 15);
    const turn = new Turnable(coin, $("#coin-stage"), {
      restX: 4,
      restY: -24,
      hoverAmp: 9,
      shadow: $(".coin-shadow"),
    });
    $("#coin-flip").addEventListener("click", () => turn.flip());
  }

  /* ------------------------------------------------------------------
     Experience timeline (Gantt) + linking with the job list
     ------------------------------------------------------------------ */
  const tl = $("#timeline");
  if (tl) {
    const now = new Date();
    const firstYear = 2022;
    const lastYear = now.getFullYear();
    const t0 = Date.UTC(firstYear, 0, 1);
    const t1 = Date.UTC(lastYear + 1, 0, 1);
    const pct = (t) => clamp(((t - t0) / (t1 - t0)) * 100, 0, 100);
    const parse = (v, isEnd) => {
      if (v === "now") return now.getTime();
      const [y, m] = v.split("-").map(Number);
      return isEnd ? Date.UTC(y, m, 1) : Date.UTC(y, m - 1, 1);
    };

    const rowsWrap = $(".tl-rows", tl);
    const grid = document.createElement("div");
    grid.className = "tl-grid";
    grid.setAttribute("aria-hidden", "true");
    const axis = $("#tl-axis");

    for (let y = firstYear; y <= lastYear; y++) {
      const x = pct(Date.UTC(y, 0, 1));
      const line = document.createElement("i");
      line.style.left = `${x}%`;
      grid.appendChild(line);
      const label = document.createElement("span");
      label.style.left = `${x}%`;
      label.textContent = String(y);
      axis.appendChild(label);
    }
    const nowLine = document.createElement("i");
    nowLine.className = "tl-now";
    nowLine.style.left = `${pct(now.getTime())}%`;
    grid.appendChild(nowLine);
    rowsWrap.prepend(grid);

    const nowLabel = document.createElement("span");
    nowLabel.className = "tl-axis-now";
    nowLabel.style.left = `${pct(now.getTime())}%`;
    nowLabel.textContent = "Today";
    axis.appendChild(nowLabel);

    const rows = $$(".tl-row", tl);
    rows.forEach((row, i) => {
      const s = pct(parse(row.dataset.start, false));
      const e = pct(parse(row.dataset.end, true));
      row.style.setProperty("--s", `${s}%`);
      row.style.setProperty("--e", `${e}%`);
      row.style.setProperty("--i", String(i));
      if (row.dataset.end === "now") row.classList.add("is-current");
      const name = $(".tl-name", row).textContent;
      const when = row.dataset.end === "now" ? "to present" : "to " + row.dataset.end;
      row.setAttribute("aria-label", `${name}, ${row.dataset.start} ${when}. Jump to role.`);
    });

    new IntersectionObserver(
      (entries, obs) => {
        if (entries[0].isIntersecting) {
          tl.classList.add("is-in");
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    ).observe(tl);

    const jobs = new Map($$(".job").map((j) => [j.dataset.job, j]));
    const rowFor = new Map(rows.map((r) => [r.dataset.job, r]));
    const link = (key, on) => {
      jobs.get(key)?.classList.toggle("is-linked", on);
      rowFor.get(key)?.classList.toggle("is-linked", on);
    };

    rows.forEach((row) => {
      const key = row.dataset.job;
      row.addEventListener("pointerenter", () => link(key, true));
      row.addEventListener("pointerleave", () => link(key, false));
      row.addEventListener("focus", () => link(key, true));
      row.addEventListener("blur", () => link(key, false));
      row.addEventListener("click", () => {
        const job = jobs.get(key);
        if (!job) return;
        const top = job.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - 12;
        window.scrollTo({ top, behavior: reduceMotion.matches ? "auto" : "smooth" });
      });
    });

    jobs.forEach((job, key) => {
      const tile = $(".logo-tile", job);
      job.addEventListener("pointerenter", () => link(key, true));
      job.addEventListener("pointerleave", () => {
        link(key, false);
        tile.style.setProperty("--tx", "0deg");
        tile.style.setProperty("--ty", "0deg");
      });
      // the logo tile turns to follow the cursor across the row
      job.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse" || reduceMotion.matches) return;
        const r = job.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tile.style.setProperty("--ty", `${(px * 44).toFixed(1)}deg`);
        tile.style.setProperty("--tx", `${(-py * 26).toFixed(1)}deg`);
      });
    });
  }

  /* ------------------------------------------------------------------
     Shopify section: the sales curve, traced from the dashboard
     screenshot (pixel coordinates in a 1048 × 406 frame), lifted off
     the print in stacked layers so it reads as a 3D ribbon.
     ------------------------------------------------------------------ */
  const plane = $("#scale-plane");
  const scaleStage = $("#scale-stage");
  if (plane && scaleStage) {
    const W = 1048;
    const H = 406;
    const PERSPECTIVE = 1600;
    const SOLID = [
      [249, 239], [264, 238], [276, 235], [288, 229], [300, 227], [312, 226], [324, 227],
      [336, 233], [348, 247.5], [360, 260], [372, 265], [384, 266], [396, 268], [408, 274.5],
      [420, 285], [432, 290.5], [444, 292], [456, 290.5], [468, 285], [480, 271.5], [492, 262],
      [504, 259], [516, 258], [528, 256], [540, 250.5], [552, 243], [564, 240], [576, 239],
      [588, 240], [600, 244], [612, 251], [624, 257], [636, 259], [648, 259], [660, 260],
      [672, 262], [684, 264], [696, 265], [708, 265.5], [720, 262], [732, 250.5], [744, 226.5],
      [756, 211], [768, 206], [776, 206],
    ];
    // Aug 10 is a partial day; Shopify draws it dotted, so we do too.
    const TAIL = [[776, 206], [794, 212], [808, 240], [821, 262], [836, 270]];
    const DAY0_X = 249;
    const DAY_W = (836 - 249) / 9;
    const LAYERS = 7;
    const Z_STEP = 7;

    const toPath = (pts) => {
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
      }
      return d;
    };
    const solidD = toPath(SOLID);
    const tailD = toPath(TAIL);
    const NS = "http://www.w3.org/2000/svg";
    const make = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
      return n;
    };

    const pins = [];
    let topDot = null;
    let basePin = null;
    let samplePath = null;

    for (let i = 0; i < LAYERS; i++) {
      const z = i * Z_STEP;
      const svg = make("svg", { class: "trace", viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" });
      svg.style.transform = `translateZ(${z}px) scale(${((PERSPECTIVE - z) / PERSPECTIVE).toFixed(4)})`;
      const isBase = i === 0;
      const isTop = i === LAYERS - 1;

      if (isBase) {
        // soft shadow the lifted line casts on the print
        const defs = make("defs", {});
        const f = make("filter", { id: "trace-blur", x: "-10%", y: "-30%", width: "120%", height: "160%" });
        f.appendChild(make("feGaussianBlur", { stdDeviation: 4 }));
        defs.appendChild(f);
        svg.appendChild(defs);
        const sh = make("path", {
          d: solidD, pathLength: 1, class: "trace-draw",
          stroke: "#0F1533", "stroke-opacity": 0.32, "stroke-width": 7, filter: "url(#trace-blur)",
        });
        svg.appendChild(sh);
        basePin = make("circle", { class: "trace-base-pin", r: 5, fill: "none", stroke: "#0F1533", "stroke-width": 2 });
        svg.appendChild(basePin);
      } else if (!isTop) {
        const p = make("path", {
          d: solidD, pathLength: 1, class: "trace-draw",
          stroke: "#FEBE10", "stroke-opacity": (0.16 + i * 0.07).toFixed(2), "stroke-width": 2.5,
        });
        p.style.setProperty("--d", `${i * 80}ms`);
        svg.appendChild(p);
      } else {
        const casing = make("path", {
          d: solidD, pathLength: 1, class: "trace-draw", stroke: "#0F1533", "stroke-width": 8,
        });
        const line = make("path", {
          d: solidD, pathLength: 1, class: "trace-draw", stroke: "#FEBE10", "stroke-width": 4,
        });
        casing.style.setProperty("--d", `${i * 80}ms`);
        line.style.setProperty("--d", `${i * 80}ms`);
        const tail = make("path", {
          d: tailD, class: "trace-tail", stroke: "#FEBE10", "stroke-width": 3.5, "stroke-dasharray": "1 8",
        });
        topDot = make("circle", {
          class: "trace-dot", cx: 776, cy: 206, r: 8, fill: "#FEBE10", stroke: "#0F1533", "stroke-width": 3,
        });
        svg.append(casing, line, tail, topDot);
        samplePath = line;
      }

      if (!isBase) {
        const pin = make("circle", { class: "trace-pin", r: isTop ? 0 : 2.6, fill: "#FEBE10" });
        svg.appendChild(pin);
        pins.push(pin);
      }
      plane.appendChild(svg);
    }

    // x → y lookup along the traced curve (solid + dotted tail)
    const lookup = [];
    const sampleD = (d) => {
      const p = make("path", { d });
      samplePath.parentNode.appendChild(p);
      const len = p.getTotalLength();
      for (let i = 0; i <= 600; i++) {
        const pt = p.getPointAtLength((len * i) / 600);
        lookup.push([pt.x, pt.y]);
      }
      p.remove();
    };
    sampleD(solidD);
    sampleD(tailD);
    lookup.sort((a, b) => a[0] - b[0]);
    const yAt = (x) => {
      let lo = 0;
      let hi = lookup.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (lookup[mid][0] < x) lo = mid;
        else hi = mid;
      }
      const a = lookup[lo];
      const b = lookup[hi];
      const t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    };

    const tip = $("#scale-tip");
    const placeMarkers = (x, y) => {
      topDot.setAttribute("cx", x);
      topDot.setAttribute("cy", y);
      basePin.setAttribute("cx", x);
      basePin.setAttribute("cy", y);
      pins.forEach((p) => {
        p.setAttribute("cx", x);
        p.setAttribute("cy", y);
      });
    };

    const scrub = (clientX) => {
      const r = plane.getBoundingClientRect();
      const x = clamp(((clientX - r.left) / r.width) * W, DAY0_X, 836);
      const y = yAt(x);
      placeMarkers(x, y);
      const day = clamp(Math.round((x - DAY0_X) / DAY_W) + 1, 1, 10);
      tip.textContent = day === 10 ? "Aug 10, 2026 (partial day)" : `Aug ${day}, 2026`;
      const dr = topDot.getBoundingClientRect();
      const sr = scaleStage.getBoundingClientRect();
      tip.style.left = `${dr.left + dr.width / 2 - sr.left}px`;
      tip.style.top = `${dr.top - sr.top}px`;
      scaleStage.classList.add("is-scrubbing");
    };
    const endScrub = () => {
      scaleStage.classList.remove("is-scrubbing");
      placeMarkers(776, 206);
    };

    plane.addEventListener("pointermove", (e) => {
      if (!scaleStage.classList.contains("is-in")) return;
      scrub(e.clientX);
    });
    plane.addEventListener("pointerleave", endScrub);
    plane.addEventListener("pointercancel", endScrub);

    // draw the line in once the stage is on screen
    new IntersectionObserver(
      (entries, obs) => {
        if (entries[0].isIntersecting) {
          scaleStage.classList.add("is-in");
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    ).observe(scaleStage);

    // tilt: scroll lays the print down as it arrives; the cursor turns it
    const tilt = { rx: 22, ry: 0, trx: 22, try: 0, px: 0, py: 0, active: false, raf: 0 };
    const scrollRx = () => {
      const r = scaleStage.getBoundingClientRect();
      const vh = window.innerHeight;
      const n = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2), -1, 1);
      return 12 + n * 16;
    };
    const tiltLoop = () => {
      if (small.matches || reduceMotion.matches) {
        plane.style.removeProperty("--rx");
        plane.style.removeProperty("--ry");
        tilt.raf = 0;
        return;
      }
      tilt.trx = scrollRx() - tilt.py * 12;
      tilt.try = tilt.px * 18;
      tilt.rx += (tilt.trx - tilt.rx) * 0.08;
      tilt.ry += (tilt.try - tilt.ry) * 0.08;
      plane.style.setProperty("--rx", `${tilt.rx.toFixed(2)}deg`);
      plane.style.setProperty("--ry", `${tilt.ry.toFixed(2)}deg`);
      tilt.raf = tilt.active ? requestAnimationFrame(tiltLoop) : 0;
    };
    const startTilt = () => {
      if (!tilt.raf) tilt.raf = requestAnimationFrame(tiltLoop);
    };
    new IntersectionObserver((entries) => {
      tilt.active = entries[0].isIntersecting;
      if (tilt.active) {
        tilt.rx = scrollRx();
        startTilt();
      }
    }).observe(scaleStage);

    scaleStage.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = scaleStage.getBoundingClientRect();
      tilt.px = (e.clientX - r.left) / r.width - 0.5;
      tilt.py = (e.clientY - r.top) / r.height - 0.5;
    });
    scaleStage.addEventListener("pointerleave", () => {
      tilt.px = 0;
      tilt.py = 0;
    });
  }

  /* ------------------------------------------------------------------
     Screenshot dialog
     ------------------------------------------------------------------ */
  const dialog = $("#shot-dialog");
  const openShot = () => {
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
  };
  $("#shot-open")?.addEventListener("click", openShot);
  plane?.addEventListener("click", openShot);
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  /* ------------------------------------------------------------------
     Toolkit board: tilts toward the cursor, filters raise a group
     ------------------------------------------------------------------ */
  const board = $("#board");
  const boardStage = $("#board-stage");
  if (board && boardStage) {
    const groups = $$(".group", board);
    const buttons = $$(".tk-filter button");
    buttons.forEach((btn) =>
      btn.addEventListener("click", () => {
        const f = btn.dataset.filter;
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        board.classList.toggle("is-filtered", f !== "all");
        groups.forEach((g) => g.classList.toggle("is-up", g.dataset.group === f));
      })
    );

    const bt = { rx: 16, ry: 0, trx: 16, try: 0, raf: 0 };
    const loop = () => {
      if (small.matches || reduceMotion.matches) {
        board.style.removeProperty("--rx");
        board.style.removeProperty("--ry");
        bt.raf = 0;
        return;
      }
      bt.rx += (bt.trx - bt.rx) * 0.08;
      bt.ry += (bt.try - bt.ry) * 0.08;
      board.style.setProperty("--rx", `${bt.rx.toFixed(2)}deg`);
      board.style.setProperty("--ry", `${bt.ry.toFixed(2)}deg`);
      if (Math.abs(bt.trx - bt.rx) > 0.02 || Math.abs(bt.try - bt.ry) > 0.02) {
        bt.raf = requestAnimationFrame(loop);
      } else {
        bt.raf = 0;
      }
    };
    const go = () => {
      if (!bt.raf) bt.raf = requestAnimationFrame(loop);
    };
    boardStage.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || !finePointer.matches) return;
      const r = boardStage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      bt.try = px * 7;
      bt.trx = 16 - py * 8;
      go();
    });
    boardStage.addEventListener("pointerleave", () => {
      bt.trx = 16;
      bt.try = 0;
      go();
    });
  }
  /* ------------------------------------------------------------------
     Email button: copy the address and show it in a popover
     ------------------------------------------------------------------ */
  const emailBtn = $("#email-btn");
  const emailPop = $("#email-pop");
  if (emailBtn && emailPop) {
    const address = $("#email-addr").textContent.trim();
    const status = $("#email-status");
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(address);
        status.textContent = "Copied!";
      } catch {
        const range = document.createRange();
        range.selectNodeContents($("#email-addr"));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        status.textContent = document.execCommand("copy") ? "Copied!" : "Press Ctrl+C to copy";
      }
    };
    const setOpen = (open) => {
      emailPop.hidden = !open;
      emailBtn.setAttribute("aria-expanded", String(open));
    };
    emailBtn.addEventListener("click", () => {
      setOpen(true);
      copy();
    });
    $("#email-copy").addEventListener("click", copy);
    document.addEventListener("click", (e) => {
      if (!emailPop.hidden && !e.target.closest(".email-wrap")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !emailPop.hidden) {
        setOpen(false);
        emailBtn.focus();
      }
    });
  }
})();
