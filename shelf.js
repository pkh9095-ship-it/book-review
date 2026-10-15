(() => {
  "use strict";

  const KEY = "chaek-hanjang:reviews";
  const app = window.reviewApp;
  const list = document.getElementById("shelfList");
  const empty = document.getElementById("shelfEmpty");
  const saveBtn = document.getElementById("saveReview");

  let openId = null; // 목록에서 연 서평이면 저장할 때 새로 만들지 않고 고친다

  const load = () => app.store.get(KEY, []);
  const save = (items) => app.store.set(KEY, items);

  const dateFmt = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  function render() {
    const items = load().sort((a, b) => b.updatedAt - a.updatedAt);
    list.textContent = "";
    empty.hidden = items.length > 0;

    for (const item of items) {
      const li = document.createElement("li");
      li.className = "shelf__item" + (item.id === openId ? " is-open" : "");

      const text = document.createElement("div");
      const title = document.createElement("p");
      title.className = "shelf__title";
      title.textContent = `『${item.data.title}』`;
      const meta = document.createElement("p");
      meta.className = "shelf__meta";
      const who = [item.data.author, item.data.publisher].filter(Boolean).join(" / ");
      const time = document.createElement("time");
      time.dateTime = new Date(item.updatedAt).toISOString();
      time.textContent = dateFmt.format(item.updatedAt);
      if (who) meta.append(`${who}, `);
      meta.append(time);
      text.append(title, meta);

      const buttons = document.createElement("div");
      buttons.className = "shelf__buttons";
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "btn";
      openBtn.textContent = "다시 열기";
      openBtn.setAttribute("aria-label", `『${item.data.title}』 다시 열기`);
      openBtn.addEventListener("click", () => openReview(item.id));
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn--danger";
      delBtn.textContent = "지우기";
      delBtn.setAttribute("aria-label", `『${item.data.title}』 지우기`);
      delBtn.addEventListener("click", () => removeReview(item.id));
      buttons.append(openBtn, delBtn);

      li.append(text, buttons);
      list.appendChild(li);
    }
    saveBtn.textContent = openId ? "목록의 서평 고쳐 저장" : "내 서평 목록에 저장";
  }

  saveBtn.addEventListener("click", () => {
    const data = app.readForm();
    if (!data.title) return;
    const items = load();
    const now = Date.now();
    const existing = openId && items.find((i) => i.id === openId);
    if (existing) {
      existing.data = data;
      existing.updatedAt = now;
    } else {
      openId = `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      items.push({ id: openId, createdAt: now, updatedAt: now, data });
    }
    if (!save(items)) {
      app.setStatus("이 브라우저에서는 저장할 수 없어요. 글 복사와 이미지 저장으로 보관해 주세요.");
      openId = existing ? openId : null;
      return;
    }
    render();
    app.setStatus(existing ? "목록의 서평을 고쳐 저장했어요." : "내 서평 목록에 저장했어요.");
  });

  function openReview(id) {
    const item = load().find((i) => i.id === id);
    if (!item) return;
    openId = id;
    app.fillForm(item.data);
    app.store.set("chaek-hanjang:draft", item.data);
    app.setMade(true);
    app.render();
    render();
    app.setStatus(`『${item.data.title}』 서평을 열었어요. 고친 뒤 저장하면 목록에 반영돼요.`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(".desk").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function removeReview(id) {
    const items = load();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (!window.confirm(`『${item.data.title}』 서평을 목록에서 지울까요? 되돌릴 수 없어요.`)) return;
    save(items.filter((i) => i.id !== id));
    if (openId === id) openId = null;
    render();
  }

  document.addEventListener("review:reset", () => { openId = null; render(); });

  render();
})();
