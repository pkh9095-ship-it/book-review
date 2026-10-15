(() => {
  "use strict";

  const QUOTE_COUNT = 3;
  const DRAFT_KEY = "chaek-hanjang:draft";

  const form = document.getElementById("form");
  const quotesBox = document.getElementById("quotes");
  const quoteTemplate = document.getElementById("quoteTemplate");
  const formError = document.getElementById("formError");
  const resultSection = document.getElementById("result");
  const emptyResult = document.getElementById("emptyResult");
  const output = document.getElementById("output");
  const captionEl = document.getElementById("caption");
  const statusEl = document.getElementById("status");

  let made = false; // 한 번 "서평 만들기"를 누른 뒤에는 고칠 때마다 미리보기가 바로 바뀐다

  /* ---------- 브라우저 저장 (실패해도 화면은 동작) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* 무시 */ }
    },
  };

  /* ---------- 밑줄 문장 칸 ---------- */
  for (let i = 0; i < QUOTE_COUNT; i++) {
    const node = quoteTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector("input[type=radio]").value = String(i);
    node.querySelector("textarea").name = `quote${i}`;
    node.querySelector(".quote__page input").name = `page${i}`;
    if (i === 0) node.querySelector("input[type=radio]").checked = true;
    quotesBox.appendChild(node);
  }

  /* ---------- 입력값 읽기·채우기 ---------- */
  function readForm() {
    const f = form.elements;
    const quotes = [];
    for (let i = 0; i < QUOTE_COUNT; i++) {
      quotes.push({ text: f[`quote${i}`].value.trim(), page: f[`page${i}`].value.trim() });
    }
    const picked = form.querySelector("input[name=cardQuote]:checked");
    return {
      title: f.title.value.trim(),
      author: f.author.value.trim(),
      publisher: f.publisher.value.trim(),
      quotes,
      cardQuote: picked ? Number(picked.value) : 0,
      thoughts: f.thoughts.value.trim(),
      recommend: f.recommend.value.trim(),
      tags: f.tags.value.trim(),
    };
  }

  function fillForm(data) {
    const f = form.elements;
    f.title.value = data.title || "";
    f.author.value = data.author || "";
    f.publisher.value = data.publisher || "";
    for (let i = 0; i < QUOTE_COUNT; i++) {
      const q = (data.quotes && data.quotes[i]) || {};
      f[`quote${i}`].value = q.text || "";
      f[`page${i}`].value = q.page || "";
    }
    const radios = form.querySelectorAll("input[name=cardQuote]");
    const idx = Number.isInteger(data.cardQuote) ? data.cardQuote : 0;
    radios.forEach((r) => { r.checked = Number(r.value) === idx; });
    f.thoughts.value = data.thoughts || "";
    f.recommend.value = data.recommend || "";
    f.tags.value = data.tags || "";
    f.title.removeAttribute("aria-invalid");
    formError.textContent = "";
  }

  /* ---------- 인스타 본문 글 자동 정리 ---------- */
  function formatPage(page) {
    if (!page) return "";
    return /^\d+$/.test(page) ? `p.${page}` : page;
  }

  function formatTags(raw) {
    return raw
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#+/, ""))
      .filter(Boolean)
      .map((t) => `#${t}`)
      .join(" ");
  }

  function buildCaption(d) {
    const blocks = [];
    const head = [`📖 『${d.title}』`];
    const meta = [d.author, d.publisher].filter(Boolean).join(" / ");
    if (meta) head.push(meta);
    blocks.push(head.join("\n"));

    const quotes = d.quotes
      .filter((q) => q.text)
      .map((q) => {
        const page = formatPage(q.page);
        return `“${q.text}”${page ? ` (${page})` : ""}`;
      });
    if (quotes.length) blocks.push(quotes.join("\n\n"));

    if (d.thoughts) blocks.push(d.thoughts);
    if (d.recommend) blocks.push(`이런 분께 추천: ${d.recommend}`);

    const tags = formatTags(d.tags);
    if (tags) blocks.push(tags);

    return blocks.join("\n\n");
  }

  /* ---------- 미리보기 ---------- */
  function render() {
    const d = readForm();
    if (!d.title) return false;
    captionEl.textContent = buildCaption(d);
    if (typeof window.drawCard === "function") window.drawCard(d);
    emptyResult.hidden = true;
    output.hidden = false;
    return true;
  }

  function setStatus(msg) {
    statusEl.textContent = "";
    // 같은 문장이 반복돼도 화면 읽기 프로그램이 다시 읽도록 잠깐 비웠다가 넣는다
    requestAnimationFrame(() => { statusEl.textContent = msg; });
  }

  function showTitleError() {
    const input = form.elements.title;
    input.setAttribute("aria-invalid", "true");
    formError.textContent = "책 제목을 적어 주세요. 제목이 있어야 서평을 만들 수 있어요.";
    input.focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!render()) { showTitleError(); return; }
    made = true;
    output.classList.remove("is-new");
    void output.offsetWidth;
    output.classList.add("is-new");
    if (window.matchMedia("(max-width: 860px)").matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultSection.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  });

  form.addEventListener("input", (e) => {
    if (e.target.name === "title" && e.target.value.trim()) {
      e.target.removeAttribute("aria-invalid");
      formError.textContent = "";
    }
    store.set(DRAFT_KEY, readForm());
    if (made) render();
  });

  form.addEventListener("change", () => { if (made) render(); });

  /* ---------- 글 복사 ---------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  document.getElementById("copyText").addEventListener("click", async () => {
    const ok = await copyText(captionEl.textContent);
    setStatus(ok
      ? "글을 복사했어요. 인스타 본문 칸에 붙여 넣으세요."
      : "복사하지 못했어요. 위 글을 길게 눌러 직접 복사해 주세요.");
  });

  /* ---------- 새로 쓰기 ---------- */
  function resetAll() {
    form.reset();
    form.querySelector("input[name=cardQuote]").checked = true;
    form.elements.title.removeAttribute("aria-invalid");
    formError.textContent = "";
    store.remove(DRAFT_KEY);
    made = false;
    output.hidden = true;
    emptyResult.hidden = false;
    statusEl.textContent = "";
    document.dispatchEvent(new CustomEvent("review:reset"));
  }

  document.getElementById("newReview").addEventListener("click", () => {
    const d = readForm();
    const hasText = d.title || d.thoughts || d.quotes.some((q) => q.text);
    if (hasText && !window.confirm("적어 둔 내용을 지우고 새로 쓸까요?")) return;
    resetAll();
    form.elements.title.focus();
  });

  /* ---------- 쓰던 글 이어 쓰기 ---------- */
  const draft = store.get(DRAFT_KEY, null);
  if (draft) fillForm(draft);

  // 다른 기능(카드·목록)에서 함께 쓰도록 열어 둔다
  window.reviewApp = { readForm, fillForm, render, setStatus, store, resetAll,
    isMade: () => made, setMade: (v) => { made = v; } };
})();
