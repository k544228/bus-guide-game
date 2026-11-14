import "./style.css";
import { story, bgs } from "./story";
import { startGame } from "./game";
import { music, initMusic } from "./audio";

const app = document.getElementById("app")!;
const SPEEDS = [["慢", 90], ["中", 45], ["快", 18], ["即時", 0]] as const;
const cfg = { speed: 1, auto: false };
let cleanup: () => void = () => {};
let touched = false;

function bgHtml(key: string): string {
  const b = bgs[key];
  const grad = `linear-gradient(135deg, ${b.from}, ${b.to})`;
  const fill = b.src ? `url(${b.src}) center/cover, ${grad}` : grad;
  return `<div class="bg" style="background:${fill}"><span class="ph">${b.src ? "" : b.label}</span></div>`;
}

function go(html: string): void {
  cleanup();
  cleanup = () => {};
  app.innerHTML = html;
}

function showStart(): void {
  music("start");
  go(`${bgHtml("start")}
    <div class="center">
      <h1>大巴導遊之旅</h1>
      <p class="sub">帶著乘客，認識台灣</p>
      <button class="big" id="go">遊戲開始</button>
    </div>`);
  document.getElementById("go")!.onclick = showStory;
  if (!touched) {
    // 瀏覽器規定要先點一下才能出聲，所以先請玩家點一下，首頁音樂才聽得到
    const tap = document.createElement("div");
    tap.className = "tap";
    tap.textContent = "點一下畫面開始";
    tap.onclick = () => {
      touched = true;
      tap.remove();
    };
    app.appendChild(tap);
  }
}

function showStory(): void {
  music("story");
  go(`<div id="scene"></div>
    <div class="tools">
      <button id="auto"></button><button id="spd"></button><button id="skip">跳過</button>
    </div>
    <div class="box" id="box"><div class="who" id="who"></div><div class="txt" id="txt"></div><div class="next">▼</div></div>`);
  const $ = (id: string) => document.getElementById(id)!;
  let i = -1;
  let typing = false;
  let t = 0;
  let a = 0;
  let full = "";
  let curBg = "";
  let audio: HTMLAudioElement | null = null;

  const stop = () => {
    clearInterval(t);
    clearTimeout(a);
    audio?.pause();
  };
  cleanup = stop;

  const label = () => {
    $("auto").textContent = `自動：${cfg.auto ? "開" : "關"}`;
    $("spd").textContent = `文字速度：${SPEEDS[cfg.speed][0]}`;
  };

  const finish = () => {
    clearInterval(t);
    typing = false;
    $("txt").textContent = full;
    if (cfg.auto) a = window.setTimeout(next, 1500 + full.length * 80);
  };

  const next = () => {
    stop();
    i++;
    if (i >= story.length) return showModes();
    const l = story[i];
    if (l.bg !== curBg) {
      curBg = l.bg;
      $("scene").innerHTML = bgHtml(l.bg);
    }
    $("who").textContent = l.who ?? "";
    full = l.text;
    $("txt").textContent = "";
    if (l.voice) {
      audio = new Audio(l.voice);
      audio.play().catch(() => {});
    }
    const ms = SPEEDS[cfg.speed][1];
    if (ms === 0) return finish();
    let n = 0;
    typing = true;
    t = window.setInterval(() => {
      n++;
      $("txt").textContent = full.slice(0, n);
      if (n >= full.length) finish();
    }, ms);
  };

  const advance = () => {
    if (typing) finish();
    else {
      clearTimeout(a);
      next();
    }
  };

  $("box").onclick = advance;
  $("scene").onclick = advance;
  $("auto").onclick = () => {
    cfg.auto = !cfg.auto;
    label();
    clearTimeout(a);
    if (cfg.auto && !typing) a = window.setTimeout(next, 800);
  };
  $("spd").onclick = () => {
    cfg.speed = (cfg.speed + 1) % SPEEDS.length;
    label();
  };
  $("skip").onclick = () => {
    stop();
    showModes();
  };
  label();
  next();
}

function showModes(): void {
  music("play");
  go(`${bgHtml("bus")}
    <div class="center">
      <p class="voice">廣播：「請選擇您的旅程。」</p>
      <button class="big" data-m="escape">盡速逃離模式<small>介紹一個地方，完成即可返回現實</small></button>
      <button class="big" data-m="loop">環台模式<small>逆時針繞行台灣一圈</small></button>
    </div>`);
  app.querySelectorAll<HTMLButtonElement>("button[data-m]").forEach((b) => {
    b.onclick = () => showNext(b.dataset.m!);
  });
}

function showNext(mode: string): void {
  startGame(mode === "escape" ? "escape" : "loop", { go, bgHtml, home: showModes });
}

initMusic();
showStart();
