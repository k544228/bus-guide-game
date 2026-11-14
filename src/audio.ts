import tracks from "./data/music.json";

// 背景音樂：循環播放，右上角有開關。瀏覽器規定要使用者點擊過畫面後才能出聲。
const el = new Audio();
el.loop = true;
el.volume = 0.5;
let muted = false;
try {
  muted = localStorage.getItem("muted") === "1";
} catch {
  // 讀不到就預設為開啟
}
let want = "";
let unlocked = false;
const pick = (k: string): string => (tracks as Record<string, string>)[k] || tracks.main;

function apply(): void {
  if (!unlocked || !want) return;
  if (el.src !== new URL(want, location.href).href) el.src = want;
  el.muted = muted;
  if (el.paused) Promise.resolve(el.play()).catch(() => {});
}

// key：start（首頁）、story（開場）、play（遊戲中）、fail（失敗）；music.json 沒填的就用 main
export function music(key: string): void {
  want = pick(key);
  apply();
}

export function initMusic(): void {
  const b = document.createElement("button");
  b.id = "mute";
  const label = () => {
    b.textContent = muted ? "🔇" : "🔊";
    b.setAttribute("aria-label", muted ? "開啟音樂" : "關閉音樂");
  };
  b.onclick = () => {
    muted = !muted;
    try {
      localStorage.setItem("muted", muted ? "1" : "0");
    } catch {
      // 無法儲存也沒關係
    }
    label();
    apply();
  };
  label();
  document.body.appendChild(b);
  document.addEventListener("pointerdown", () => {
    unlocked = true;
    apply();
  }, { once: true });
}
