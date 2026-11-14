import "./game.css";
import data from "./data/photos.json";
import bank from "./data/questions.json";
import scenesData from "./data/scenes.json";
import { music } from "./audio";

type Ctx = { go: (html: string) => void; bgHtml: (key: string) => string; home: () => void };
type Photo = { id: string; city: string; type: string; name: string; src: string };
type Q = { q: string; options: string[]; answer: number };
type Stop = { city: string; name: string; guide: string; trivia: string; questions: Q[] };
type Item = { name: string; ps: Photo[]; s?: Stop };
type QItem = { name: string; ps: Photo[]; s: Stop };
type Mode = "escape" | "loop";

const photos = data.photos as Photo[];
const labels: Record<string, string> = Object.fromEntries(data.cities.map((c) => [c.id, c.label]));
const stops = bank as unknown as Stop[];
const ORDER = ["taipei", "changhua", "tainan", "kaohsiung", "hualien"]; // 逆時針
const FAKES = ["新北市", "台中市", "台南市", "高雄市", "花蓮縣", "桃園市", "宜蘭縣", "南投縣"];
const st = { correct: 0, asked: 0, bonus: 0, bonusTotal: 0 };
let timer = 0;
let stageBg = "";
const scenes = scenesData as Record<string, { map: string; street: string; spots: Record<string, number[]>; merge?: Record<string, string[]> }>;
const bgImg = (src: string) => `<div class="bg" style="background:url('${src}') center/cover, #000"></div>`;

const shuffle = <T>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const $ = (id: string) => document.getElementById(id)!;
const photoHtml = (srcs: string[]) =>
  `<div class="photo${srcs.length > 1 ? " multi" : ""}"><div class="pbg" style="background-image:url('${srcs[0]}')"></div>${srcs.map((x) => `<img src="${x}" alt="">`).join("")}</div>`;
const hud = (label: string) => {
  const r = st.asked ? Math.round((st.correct / st.asked) * 100) : 100;
  return `<div class="hud"><span>${label}</span><div class="bar"><i class="${r < 50 ? "low" : ""}" style="width:${r}%"></i></div><span>旅客滿意度 ${r}%</span></div>`;
};

// 可抽的停靠點：地圖上有位置、且有景點照片的地點；有題庫就出題，沒有就只顯示照片
function pool(city: string): Item[] {
  const out: Item[] = [];
  for (const name of Object.keys(scenes[city]?.spots ?? {})) {
    const names = [name, ...(scenes[city].merge?.[name] ?? [])];
    const ps = names.flatMap((n) => photos.filter((x) => x.city === city && x.name === n && x.type !== "other"));
    if (ps.length) out.push({ name, ps, s: stops.find((x) => x.city === city && x.name === name) });
  }
  return out;
}

function notice(ctx: Ctx, title: string, text: string, btn: string, cb: () => void, bgSrc?: string): void {
  ctx.go(`${bgSrc ? bgImg(bgSrc) : ctx.bgHtml("bus")}<div class="center"><h2>${title}</h2><p class="sub">${text}</p><button class="big" id="nb">${btn}</button></div>`);
  $("nb").onclick = cb;
}

function playVideo(ctx: Ctx, src: string, next: () => void): void {
  music("bus");
  let fin = false;
  const end = () => {
    if (!fin) {
      fin = true;
      next();
    }
  };
  ctx.go(`<video class="vid" src="${src}" autoplay muted playsinline></video><div class="tools"><button id="vs">跳過</button></div>`);
  const v = document.querySelector("video")!;
  v.onended = end;
  v.onerror = end;
  $("vs").onclick = end;
  Promise.resolve(v.play?.()).catch(end);
}

export function startGame(mode: Mode, ctx: Ctx): void {
  const avail = ORDER.filter((c) => labels[c] && pool(c).length > 0);
  if (!avail.length) return notice(ctx, "題庫尚未建立", "找不到可用的題目，請檢查 src/data/questions.json。", "返回選擇", ctx.home);
  const k = Math.floor(Math.random() * avail.length);
  const route = mode === "escape" ? [avail[k]] : avail.slice(k).concat(avail.slice(0, k));
  st.bonus = 0;
  st.bonusTotal = 0;
  identify(ctx, route, 0);
}

// 階段一：5 張照片同時顯示 20 秒（至少 3 張景點），再問這是哪個城市
function identify(ctx: Ctx, route: string[], i: number): void {
  music("play");
  const city = route[i];
  st.correct = 0;
  st.asked = 0;
  const mine = photos.filter((p) => p.city === city);
  const spots = shuffle(mine.filter((p) => p.type === "spot"));
  const first = spots.slice(0, 3);
  const rest = shuffle([...spots.slice(3), ...mine.filter((p) => p.type !== "spot")]);
  const five = shuffle([...first, ...rest.slice(0, 5 - first.length)]);
  let left = 20;
  ctx.go(`${ctx.bgHtml("bus")}<div class="grid5">${five.map((p) => photoHtml([p.src])).join("")}</div>
    <div class="count"><div class="sub">觀察這些照片，判斷車子停在哪個城市（<b id="t">${left}</b> 秒）</div><button class="big" id="ans">直接作答</button></div>`);
  const ask = () => {
    clearInterval(timer);
    const opts = shuffle([labels[city], ...shuffle(FAKES.filter((f) => f !== labels[city])).slice(0, 3)]);
    ctx.go(`${ctx.bgHtml("bus")}<div class="center"><h2>這裡是哪個城市？</h2>${opts.map((o) => `<button class="big opt2">${o}</button>`).join("")}</div>`);
    document.querySelectorAll<HTMLButtonElement>(".opt2").forEach((b) => {
      b.onclick = () => {
        const ok = b.textContent === labels[city];
        if (i > 0) {
          st.bonusTotal++;
          if (ok) st.bonus++;
          return notice(ctx, ok ? "答對了！" : "答錯了", `這裡是${labels[city]}（加分題，不影響通關）。`, "帶大家逛逛", () => playVideo(ctx, "/images/bg/exit.mp4", () => runStops(ctx, route, i)), "/images/bg/bus-parked.jpg");
        }
        if (!ok) return ending(ctx, `你搞錯了地點，大巴在${labels[city]}迷了路……`, "遊戲失敗：城市名稱答錯。");
        notice(ctx, "答對了！", `這裡是${labels[city]}。現在帶旅客去逛逛吧！`, "出發", () => playVideo(ctx, "/images/bg/exit.mp4", () => runStops(ctx, route, i)), "/images/bg/bus-parked.jpg");
      };
    });
  };
  $("ans").onclick = ask;
  timer = window.setInterval(() => {
    left--;
    const t = document.getElementById("t");
    if (t) t.textContent = String(left);
    if (left <= 0) ask();
  }, 1000);
}

// 階段二：下車後在地圖上自由點選標記，每個景點的標記位置固定；每個城市隨機抽 3～5 個
function runStops(ctx: Ctx, route: string[], i: number): void {
  music("play");
  const city = route[i];
  const all = pool(city);
  const list = shuffle(all).slice(0, Math.min(all.length, 3 + Math.floor(Math.random() * 3)));
  const label = labels[city];
  const sc = scenes[city];
  const done = new Set<number>();
  stageBg = sc.street ? bgImg(sc.street) : "";

  const showMap = (): void => {
    if (done.size >= list.length) return endCity(ctx, route, i);
    const marks = list.map((it, k) => {
      const [x, y] = sc.spots[it.name];
      return done.has(k)
        ? `<div class="mk done" style="left:${x}%;top:${y}%"><b>✔</b><span>${it.name}</span></div>`
        : `<button class="mk" data-k="${k}" style="left:${x}%;top:${y}%"><b>🏛️</b><span>？</span></button>`;
    });
    ctx.go(`<div class="pbg" style="background-image:url('${sc.map}')"></div>${hud(label)}<div class="map"><div class="stage" id="stage"><img src="${sc.map}" alt="">${marks.join("")}</div></div>
      <div class="hint">點選地圖上的標記，帶旅客前往（${done.size}／${list.length}）</div>`);
    document.querySelectorAll<HTMLButtonElement>(".mk[data-k]").forEach((b) => {
      b.onclick = () => visit(Number(b.dataset.k));
    });
    if (location.search.includes("debug")) {
      $("stage").onclick = (e) => {
        const r = $("stage").getBoundingClientRect();
        const x = Math.round(((e.clientX - r.left) / r.width) * 100);
        const y = Math.round(((e.clientY - r.top) / r.height) * 100);
        $("stage").querySelector(".dbg")?.remove();
        $("stage").insertAdjacentHTML("beforeend", `<div class="dbg" style="left:${x}%;top:${y}%">[${x}, ${y}]</div>`);
      };
    }
  };

  const visit = (k: number): void => {
    const it = list[k];
    const srcs = it.ps.map((p) => p.src);
    const back = () => {
      done.add(k);
      showMap();
    };
    const s = it.s;
    if (!s) {
      ctx.go(`${stageBg}${hud(label)}${photoHtml(srcs)}<div class="qbox"><p class="qn">${it.name}</p><p class="txt">這個地點的題目還在準備中。</p><button class="big" id="nx">回到地圖</button></div>`);
      $("nx").onclick = back;
      return;
    }
    askQ(ctx, { name: it.name, ps: it.ps, s: { ...s, questions: shuffle(s.questions).slice(0, 5) } }, 0, 0, label, (got) => {
      if (got >= 3) {
        ctx.go(`${stageBg}${hud(label)}${photoHtml(srcs)}<div class="qbox"><p class="qn">${it.name}・導覽</p><p class="txt">${s.guide}</p><p class="txt">冷知識：${s.trivia}</p><button class="big" id="nx">回到地圖</button></div>`);
        $("nx").onclick = back;
      } else notice(ctx, "介紹得不夠完整", `「${it.name}」只答對 ${got} 題，旅客有點失望。`, "回到地圖", back);
    });
  };
  showMap();
}

function askQ(ctx: Ctx, it: QItem, qi: number, got: number, label: string, done: (got: number) => void): void {
  const qs = it.s.questions;
  if (qi >= qs.length) return done(got);
  const q = qs[qi];
  const opts = shuffle(q.options.map((t, idx) => ({ t, ok: idx === q.answer })));
  ctx.go(`${stageBg}${hud(label)}${photoHtml(it.ps.map((p) => p.src))}<div class="qbox"><p class="qn">第 ${qi + 1}／${qs.length} 題</p><h3>${q.q}</h3>
    <div class="opts">${opts.map((o, n) => `<button class="opt" data-n="${n}">${o.t}</button>`).join("")}</div></div>`);
  const btns = Array.from(document.querySelectorAll<HTMLButtonElement>(".opt"));
  btns.forEach((b) => {
    b.onclick = () => {
      const o = opts[Number(b.dataset.n)];
      btns.forEach((x, n) => {
        x.disabled = true;
        if (opts[n].ok) x.classList.add("ok");
      });
      if (!o.ok) b.classList.add("no");
      st.asked++;
      if (o.ok) st.correct++;
      const nx = document.createElement("button");
      nx.className = "big";
      nx.textContent = qi + 1 >= qs.length ? "完成" : "下一題";
      nx.onclick = () => askQ(ctx, it, qi + 1, got + (o.ok ? 1 : 0), label, done);
      b.closest(".qbox")!.appendChild(nx);
    };
  });
}

function endCity(ctx: Ctx, route: string[], i: number): void {
  const rate = st.asked ? Math.round((st.correct / st.asked) * 100) : 100;
  const label = labels[route[i]];
  if (rate < 50) return ending(ctx, `旅客暴動！${label}之旅以失敗收場。`, `整個城市答對率 ${rate}%，低於 50%。（失敗動畫之後製作）`);
  if (i + 1 < route.length) return notice(ctx, `${label}圓滿結束`, `旅客滿意度 ${rate}%。巴士啟動，前往下一站……`, "出發", () => playVideo(ctx, "/images/bg/board.mp4", () => identify(ctx, route, i + 1)));
  const b = st.bonusTotal ? `地名加分題 ${st.bonus}／${st.bonusTotal}。` : "";
  notice(ctx, "遊戲勝利！", `旅客滿意度 ${rate}%。${b}主角平安返回便利商店。（勝利動畫之後製作）`, "回到首頁", ctx.home);
}

function ending(ctx: Ctx, title: string, text: string): void {
  music("fail");
  notice(ctx, title, text, "返回選擇", ctx.home, "/images/bg/fail.jpg");
}
