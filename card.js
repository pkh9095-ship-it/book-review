(() => {
  "use strict";

  const SIZE = 1080;
  const PAD = 110;
  const COLORS = {
    paper: "#F2E6CC",
    ink: "#33261D",
    muted: "#7A6656",
    lamp: "#2E5A46",
    honey: "rgba(245, 196, 81, 0.62)",
    rule: "#D9C6A3",
  };
  const SERIF = '"Gowun Batang", "Noto Serif KR", serif';
  const SANS = '"Gowun Dodum", "Malgun Gothic", sans-serif';

  const canvas = document.getElementById("card");
  const ctx = canvas.getContext("2d");
  let last = null;

  /* 한 단어가 너무 길면 글자 단위로 자른다 */
  function wrap(text, maxWidth) {
    const lines = [];
    for (const para of text.split(/\n+/)) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const tryLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(tryLine).width <= maxWidth) { line = tryLine; continue; }
        if (line) lines.push(line);
        if (ctx.measureText(word).width <= maxWidth) { line = word; continue; }
        line = "";
        for (const ch of word) {
          if (ctx.measureText(line + ch).width > maxWidth) { lines.push(line); line = ch; }
          else line += ch;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  function fitEllipsis(text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
    return `${s}…`;
  }

  /* 문장 칸에 들어가도록 글자 크기를 줄여 가며 맞춘다 */
  function layoutQuote(text, maxWidth, maxHeight) {
    for (let size = 66; size >= 34; size -= 2) {
      ctx.font = `400 ${size}px ${SERIF}`;
      const lines = wrap(text, maxWidth);
      const lh = Math.round(size * 1.66);
      if (lines.length * lh <= maxHeight) return { size, lh, lines };
    }
    const size = 34;
    const lh = Math.round(size * 1.66);
    ctx.font = `400 ${size}px ${SERIF}`;
    const lines = wrap(text, maxWidth);
    const max = Math.floor(maxHeight / lh);
    const cut = lines.slice(0, max);
    cut[max - 1] = fitEllipsis(`${cut[max - 1]}…`, maxWidth);
    return { size, lh, lines: cut };
  }

  function draw(d) {
    last = d;
    const quote = d.quotes[d.cardQuote] && d.quotes[d.cardQuote].text
      ? d.quotes[d.cardQuote]
      : d.quotes.find((q) => q.text) || null;
    const textW = SIZE - PAD * 2;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // 책등처럼 왼쪽에 가는 초록 띠
    ctx.fillStyle = COLORS.lamp;
    ctx.fillRect(0, 0, 18, SIZE);

    ctx.textBaseline = "alphabetic";

    // 여는 따옴표와 쪽수
    ctx.fillStyle = COLORS.lamp;
    ctx.font = `700 150px ${SERIF}`;
    ctx.fillText("“", PAD - 8, 250);
    if (quote && quote.page) {
      const page = /^\d+$/.test(quote.page) ? `p.${quote.page}` : quote.page;
      ctx.font = `400 30px ${SANS}`;
      ctx.fillStyle = COLORS.muted;
      ctx.textAlign = "right";
      ctx.fillText(fitEllipsis(page, 300), SIZE - PAD, 170);
      ctx.textAlign = "left";
    }

    // 본문: 밑줄 문장 (없으면 책 제목)
    const body = quote ? quote.text : d.title;
    const top = 290;
    const bottom = 820;
    const { size, lh, lines } = layoutQuote(body, textW, bottom - top);
    const blockH = lines.length * lh;
    let y = top + Math.max(0, (bottom - top - blockH) / 2) + size;

    ctx.font = `400 ${size}px ${SERIF}`;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      ctx.fillStyle = COLORS.honey;
      ctx.fillRect(PAD - 6, y - size * 0.34, w + 12, size * 0.46);
      ctx.fillStyle = COLORS.ink;
      ctx.fillText(line, PAD, y);
      y += lh;
    }

    // 아래: 책 제목과 저자
    ctx.fillStyle = COLORS.rule;
    ctx.fillRect(PAD, 862, 64, 3);

    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 40px ${SERIF}`;
    ctx.fillText(fitEllipsis(`『${d.title}』`, textW), PAD, 930);

    const meta = [d.author, d.publisher].filter(Boolean).join(" / ");
    if (meta) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = `400 30px ${SANS}`;
      ctx.fillText(fitEllipsis(meta, textW), PAD, 982);
    }
  }

  /* 웹 글꼴이 늦게 도착하면 다시 그린다 */
  const fontsReady = Promise.all([
    document.fonts.load(`400 40px ${SERIF}`, "가"),
    document.fonts.load(`700 40px ${SERIF}`, "가"),
    document.fonts.load(`400 30px ${SANS}`, "가"),
  ]).catch(() => {});
  fontsReady.then(() => { if (last) draw(last); });

  window.drawCard = draw;

  /* ---------- 이미지 저장·공유 ---------- */
  const app = window.reviewApp;
  const shareBtn = document.getElementById("shareImage");

  function fileName() {
    const title = (last && last.title) || "서평";
    return `서평_${title.replace(/[\\/:*?"<>|]/g, "").slice(0, 40)}.png`;
  }

  function toBlob() {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  document.getElementById("saveImage").addEventListener("click", async () => {
    await fontsReady;
    if (last) draw(last);
    const blob = await toBlob();
    if (!blob) { app.setStatus("이미지를 만들지 못했어요. 다시 눌러 주세요."); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    app.setStatus("이미지를 저장했어요. 다운로드 폴더(휴대폰은 파일 앱)에서 찾을 수 있어요.");
  });

  // 휴대폰에서는 공유 창으로 사진 앱 저장이나 인스타로 바로 보낼 수 있다
  const probe = typeof File === "function" && navigator.canShare
    && navigator.canShare({ files: [new File([""], "a.png", { type: "image/png" })] });
  if (probe) {
    shareBtn.hidden = false;
    shareBtn.addEventListener("click", async () => {
      await fontsReady;
      if (last) draw(last);
      const blob = await toBlob();
      if (!blob) return;
      try {
        await navigator.share({ files: [new File([blob], fileName(), { type: "image/png" })] });
      } catch (err) {
        if (err && err.name !== "AbortError") app.setStatus("공유하지 못했어요. 이미지 저장을 눌러 주세요.");
      }
    });
  }
})();
