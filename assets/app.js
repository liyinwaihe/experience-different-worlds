/* 体验不同世界 · 前端逻辑（无任何依赖） */
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const grid = $("#grid");
  const chips = $("#chips");
  const empty = $("#empty");
  const modal = $("#modal");
  const toast = $("#toast");

  const DATA = window.__PROMPTS__ || null;
  const state = { cat: "全部", q: "" };
  const catMap = {};
  let toastTimer = null;
  let currentId = null;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const fmtChars = (n) =>
    n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, "") + " 万字" : n + " 字";

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
  }

  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.cssText = "position:fixed;top:-999px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
      return ok;
    }
  }

  /* ── 数据加载：优先内嵌 JS 数据，失败则 fetch JSON ── */
  async function loadData() {
    if (DATA) return DATA;
    const res = await fetch("data/prompts.json");
    if (!res.ok) throw new Error("http " + res.status);
    return res.json();
  }

  /* 文本获取：一律由校验后的 ID 确定性构造路径，script 按需加载，代码中无任何网络请求 */
  const PROMPT_ID_RE = /^p\d{3}$/;
  let textDb = window.__TEXTS__ || null;
  function loadScriptOnce(src) {
    return new Promise((ok, bad) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = bad;
      document.head.appendChild(s);
    });
  }
  async function loadPromptText(p) {
    if (!PROMPT_ID_RE.test(p.id)) throw new Error("非法提示词 ID");
    if (textDb && textDb[p.id]) return textDb[p.id];
    await loadScriptOnce("prompts/" + p.id + ".js");
    textDb = window.__TEXTS__;
    return (textDb && textDb[p.id]) || "";
  }

  /* ── 渲染 ── */
  function renderStats() {
    $("#heroCount").textContent = `${DATA.total} 个平行世界`;
    $("#heroSub").textContent =
      `从斗罗大陆到霍格沃茨，从三国乱世到无间道。复制提示词发给 DeepSeek，` +
      `遵循你的选择、推动你的命运——第二人生，现在开局。`;
    $("#heroStats").innerHTML = [
      [DATA.total, "平行世界"],
      [DATA.categories.length, "大题材分类"],
      [fmtChars(DATA.totalChars), "完整设定"],
    ]
      .map(([b, s]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(s)}</span></div>`)
      .join("");
    $("#footMeta").textContent =
      `共收录 ${DATA.total} 个世界 · ${fmtChars(DATA.totalChars)} 设定文本 · 数据更新于 ${DATA.generatedAt}`;
  }

  function renderChips() {
    const cats = [{ key: "全部", count: DATA.total }].concat(DATA.categories);
    chips.innerHTML = cats
      .map((c) => {
        const color = c.key === "全部" ? "var(--vio)" : catMap[c.key].color;
        return `<button class="chip${c.key === state.cat ? " active" : ""}" type="button"
          data-cat="${esc(c.key)}" style="--c:${color}">${c.key === "全部" ? "✨ " : catMap[c.key].emoji + " "}${esc(c.key)}<span class="n">${c.count}</span></button>`;
      })
      .join("");
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return DATA.prompts.filter((p) => {
      if (state.cat !== "全部" && p.category !== state.cat) return false;
      if (!q) return true;
      return (p.title + " " + p.category + " " + (p.excerpt || "")).toLowerCase().includes(q);
    });
  }

  function cardHTML(p, i) {
    const c = catMap[p.category] || { emoji: "✨", color: "#8b5cf6" };
    return `<article class="card" style="--c:${c.color};animation-delay:${Math.min(i * 22, 400)}ms"
      data-id="${p.id}" title="${esc(p.title)}">
      <div class="card-top"><span class="cat-tag">${c.emoji} ${esc(p.category)}</span>${p.version ? `<span class="ver">${esc(p.version)}</span>` : ""}</div>
      <h3 class="card-title">${esc(p.title)}</h3>
      ${p.excerpt ? `<p class="card-excerpt">${esc(p.excerpt)}</p>` : ""}
      <div class="card-foot"><span class="card-size">📜 ${fmtChars(p.chars)}</span><span class="card-go">进入世界 →</span></div>
    </article>`;
  }

  function renderGrid() {
    const list = filtered();
    grid.innerHTML = list.map(cardHTML).join("");
    empty.hidden = list.length > 0;
  }

  /* ── 弹窗 ── */
  function openModal(p) {
    currentId = p.id;
    const c = catMap[p.category] || { emoji: "✨", color: "#8b5cf6" };
    $("#mTags").innerHTML =
      `<span class="m-tag" style="--c:${c.color}">${c.emoji} ${esc(p.category)}</span>` +
      (p.version ? `<span class="m-tag plain">${esc(p.version)}</span>` : "") +
      `<span class="m-tag plain">${fmtChars(p.chars)}</span>`;
    $("#mTitle").textContent = p.title;
    $("#mExcerpt").textContent = p.excerpt || "";
    const dlName = `${p.title}${p.version ? "-" + p.version : ""}-提示词.txt`;
    const dl = $("#mDownload");
    if (!PROMPT_ID_RE.test(p.id)) throw new Error("非法提示词 ID");
    dl.href = "prompts/" + p.id + ".txt";
    dl.setAttribute("download", dlName);
    const pre = $("#mText");
    pre.textContent = "加载中…";
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    loadPromptText(p)
      .then((t) => {
        if (currentId !== p.id) return;
        pre.textContent = t || "（该文件内容为空）";
        pre.scrollTop = 0;
      })
      .catch((e) => {
        if (currentId !== p.id) return;
        pre.textContent = "加载失败：" + e.message + "\n如果直接双击打开了本页，请改用本地服务器或线上地址访问。";
      });
    history.replaceState(null, "", "#p=" + p.id);
  }

  function closeModal() {
    modal.hidden = true;
    currentId = null;
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
  }

  /* ── 事件 ── */
  function bind() {
    chips.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      state.cat = b.dataset.cat;
      chips.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === b));
      renderGrid();
    });

    let deb;
    $("#search").addEventListener("input", (e) => {
      clearTimeout(deb);
      deb = setTimeout(() => {
        state.q = e.target.value;
        renderGrid();
      }, 120);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) {
        e.preventDefault();
        $("#search").focus();
      }
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const p = DATA.prompts.find((x) => x.id === card.dataset.id);
      if (p) openModal(p);
    });

    $("#mClose").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    $("#mCopy").addEventListener("click", async () => {
      const btn = $("#mCopy");
      const pre = $("#mText");
      const t = pre.textContent;
      if (!t || t === "加载中…") return;
      const ok = await copyText(t);
      btn.textContent = ok ? "✅ 已复制，去 DeepSeek 粘贴" : "❌ 复制失败，请手动选择复制";
      showToast(ok ? "已复制全部提示词" : "复制失败");
      setTimeout(() => (btn.textContent = "📋 复制提示词"), 2400);
    });

    $("#randomBtn").addEventListener("click", () => {
      const list = filtered();
      const p = list[Math.floor(Math.random() * list.length)] || DATA.prompts[Math.floor(Math.random() * DATA.total)];
      openModal(p);
      showToast("🎲 命中：「" + p.title + "」");
    });

    $("#resetBtn").addEventListener("click", () => {
      state.cat = "全部";
      state.q = "";
      $("#search").value = "";
      renderChips();
      renderGrid();
    });

    const toTop = $("#toTop");
    window.addEventListener(
      "scroll",
      () => (toTop.hidden = window.scrollY < 600),
      { passive: true }
    );
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    window.addEventListener("hashchange", handleHash);
  }

  function handleHash() {
    const m = location.hash.match(/^#p=(p\d{3})$/);
    if (m && DATA) {
      const p = DATA.prompts.find((x) => x.id === m[1]);
      if (p) openModal(p);
    }
  }

  /* ── 启动 ── */
  loadData()
    .then((data) => {
      window.__PROMPTS__ = data;
      data.categories.forEach((c) => (catMap[c.key] = c));
      renderStats();
      renderChips();
      renderGrid();
      bind();
      handleHash();
    })
    .catch(() => {
      grid.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:var(--txt-2);padding:60px 0">数据加载失败：请通过 HTTP 访问本站（线上地址或本地服务器）。</p>';
    });
})();
