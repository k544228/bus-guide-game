// 用法：在專案根目錄（D:\taiwan-guild-game）執行  npm run photos
// 只讀取 public/images/<城市>/{attractions,food,other}/ 的照片，產生 src/data/photos.json。不會刪除或搬動任何檔案。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const IMAGES = path.join(root, "public", "images");
const DATA = path.join(root, "src", "data");
const IMG = /\.(jpe?g|png|webp)$/i;

// 城市資料夾名稱 → 地名題選項文字。新增城市時在這裡加一行。
const LABELS = { taipei: "台北市", changhua: "彰化縣", tainan: "台南市", kaohsiung: "高雄市", hualien: "花蓮縣" };
// 子資料夾名稱 → 照片類型
const TYPES = { attractions: "spot", food: "food", other: "other" };

if (!fs.existsSync(IMAGES)) {
  console.error("找不到 " + IMAGES + "，請在專案根目錄執行。");
  process.exit(1);
}

// 還原中文名稱：public 裡若是英文代號檔名（例如 taipei-5f126d87.jpg），
// 就用「環台旅遊照片」裡的原始中文檔名對照；對照不到就直接用檔名當名稱。
const SRC = path.join(root, "環台旅遊照片");
const FOLDER_IDS = { "台北": "taipei", "彰化（鹿港）": "changhua", "台南": "tainan", "高雄": "kaohsiung", "花蓮": "hualien" };
const normP = (s) => s.replace(/\(/g, "（").replace(/\)/g, "）");
const sha = (city, name) => city + "-" + crypto.createHash("sha1").update(city + name).digest("hex").slice(0, 8);
const nameById = {};
const scan = (d, cityId) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) scan(path.join(d, e.name), cityId);
    else if (IMG.test(e.name)) {
      const n = e.name.replace(IMG, "");
      nameById[sha(cityId, n)] = n;
    }
  }
};
if (fs.existsSync(SRC)) {
  for (const e of fs.readdirSync(SRC, { withFileTypes: true })) {
    const cid = e.isDirectory() && FOLDER_IDS[normP(e.name)];
    if (cid) scan(path.join(SRC, e.name), cid);
  }
}

const enc = (...parts) => "/" + parts.map(encodeURIComponent).join("/");
const photos = [];
const cities = [];
const warn = [];

for (const cityDir of fs.readdirSync(IMAGES, { withFileTypes: true })) {
  if (!cityDir.isDirectory() || cityDir.name === "bg") continue;
  const city = cityDir.name;
  if (!LABELS[city]) {
    warn.push("不認識的城市資料夾（請加到腳本的 LABELS）：" + city);
    continue;
  }
  const before = photos.length;
  for (const e of fs.readdirSync(path.join(IMAGES, city), { withFileTypes: true })) {
    const full = path.join(IMAGES, city, e.name);
    if (e.isFile() && IMG.test(e.name)) {
      warn.push("沒放進子資料夾，已略過：" + city + "/" + e.name);
      continue;
    }
    if (!e.isDirectory()) continue;
    const type = TYPES[e.name.toLowerCase()];
    if (!type) {
      warn.push("不認識的子資料夾（只認 attractions / food / other）：" + city + "/" + e.name);
      continue;
    }
    for (const f of fs.readdirSync(full, { withFileTypes: true })) {
      if (!f.isFile() || !IMG.test(f.name)) continue;
      const stem = f.name.replace(IMG, "");
      let name = nameById[stem] ?? stem;
      // 同一地點多張照片：檔名加 _1、_2（例如 陽明山_1.jpg、陽明山_2.jpg），會合併成同一個地點
      if (!nameById[stem] && !/^[a-z]+-[0-9a-f]{8}$/.test(stem)) {
        const m = stem.match(/^(.+?)[_-]\d+$/);
        if (m) name = m[1];
      }
      const id = nameById[stem] ? stem : sha(city, stem);
      if (!nameById[stem] && /^[a-z]+-[0-9a-f]{8}$/.test(stem)) warn.push("找不到中文名稱（環台旅遊照片 裡沒有對應原檔）：" + city + "/" + e.name + "/" + f.name);
      if (photos.some((p) => p.id === id)) {
        warn.push("重複的照片名稱，已略過：" + city + "/" + e.name + "/" + f.name);
        continue;
      }
      const kb = Math.round(fs.statSync(path.join(full, f.name)).size / 1024);
      if (kb > 1500) warn.push("檔案偏大（" + kb + " KB），手機載入會慢：" + city + "/" + e.name + "/" + f.name);
      photos.push({ id, city, type, name, src: enc("images", city, e.name, f.name) });
    }
  }
  if (photos.length > before) cities.push({ id: city, label: LABELS[city] });
}

fs.mkdirSync(DATA, { recursive: true });
fs.writeFileSync(path.join(DATA, "photos.json"), JSON.stringify({ cities, photos }, null, 2), "utf8");

console.log("\n照片資料已更新（src/data/photos.json）：");
for (const c of cities) {
  const list = photos.filter((p) => p.city === c.id);
  const n = (t) => list.filter((p) => p.type === t).length;
  console.log("  " + c.label + "：景點 " + n("spot") + "、美食 " + n("food") + "、其他 " + n("other"));
  if (n("spot") < 3) warn.push(c.label + "景點不足 3 張，城市辨識畫面（至少 3 張景點）無法成立");
  if (n("spot") + n("food") < 5) warn.push(c.label + "景點加美食不足 5 張，抽 3～5 個停靠點會不夠");
}
if (photos.length) console.log("\n連結測試：npm run dev 後，瀏覽器開 http://localhost:5173" + photos[0].src);
if (warn.length) console.log("\n注意：\n  " + warn.join("\n  "));
