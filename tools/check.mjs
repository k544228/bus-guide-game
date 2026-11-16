// 用法：在專案根目錄（D:\taiwan-guild-game）執行  node tools\check.mjs
// 體檢：檢查檔案位置、套件、型別錯誤、照片資料夾；並自動補上 package.json 的 photos 指令。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const has = (p) => fs.existsSync(path.join(root, p));
const head = (t) => console.log("\n" + t);
const ok = (m) => console.log("  ✔ " + m);
let problems = 0;
const bad = (m) => {
  problems++;
  console.log("  ✘ " + m);
};

head("1. Node 版本");
Number(process.versions.node.split(".")[0]) >= 18 ? ok("Node " + process.versions.node) : bad("Node 太舊，請升級到 18 以上");

head("2. 必要檔案");
for (const f of ["index.html", "package.json", "tsconfig.json", "src/main.ts", "src/story.ts", "src/style.css", "tools/build-photo-data.mjs", "src/game.ts", "src/game.css", "src/data/questions.json"]) {
  if (has(f)) ok(f);
  else {
    const name = path.basename(f);
    const misplaced = f !== name && has(name) ? "（專案根目錄有 " + name + "，請搬到 " + path.dirname(f) + "\\ 資料夾）" : "";
    bad(f + " 不存在" + misplaced);
  }
}
if (has("tools/import-photos.mjs") && fs.readFileSync(path.join(root, "tools/import-photos.mjs"), "utf8").includes("rmSync")) {
  bad("tools\\import-photos.mjs 是會刪照片的舊版，請刪除：del tools\\import-photos.mjs");
}

head("3. package.json 指令");
try {
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts ??= {};
  let changed = false;
  const want = { dev: "vite", build: "tsc && vite build", preview: "vite preview", photos: "node tools/build-photo-data.mjs" };
  for (const [k, v] of Object.entries(want)) {
    if (!pkg.scripts[k]) {
      pkg.scripts[k] = v;
      changed = true;
      console.log("  + 已補上 scripts." + k);
    }
  }
  if (pkg.scripts["import-photos"]) {
    delete pkg.scripts["import-photos"];
    changed = true;
    console.log("  - 已移除舊的 import-photos 指令");
  }
  if (changed) fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  ok("scripts 正常（可使用 npm run photos）");
} catch (e) {
  bad("package.json 讀取失敗：" + e.message);
}

head("4. 套件");
const installed = has("node_modules/vite") && has("node_modules/typescript");
installed ? ok("vite、typescript 已安裝") : bad("尚未安裝套件，請先執行：npm install");

head("5. 型別檢查（程式有沒有寫錯）");
if (installed && has("src/main.ts")) {
  const r = spawnSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit"], { cwd: root, encoding: "utf8" });
  r.status === 0 ? ok("沒有型別錯誤") : bad("有錯誤：\n" + (r.stdout || r.stderr));
} else console.log("  （略過，缺少前置檔案）");

head("6. 照片資料");
if (has("tools/build-photo-data.mjs") && !fs.readFileSync(path.join(root, "tools/build-photo-data.mjs"), "utf8").includes("nameById")) {
  bad("tools\\build-photo-data.mjs 是舊版（照片名稱會變成英文代號），請用最新版覆蓋");
}
if (has("tools/build-photo-data.mjs")) {
  const r = spawnSync(process.execPath, [path.join(root, "tools", "build-photo-data.mjs")], { cwd: root, encoding: "utf8" });
  console.log((r.stdout || "") + (r.stderr || ""));
  if (r.status !== 0) bad("照片資料產生失敗");
} else console.log("  （略過，缺少 tools\\build-photo-data.mjs）");
has("public/images/bg/start.webp") ? ok("首頁背景 public\\images\\bg\\start.webp 存在") : bad("找不到首頁背景 public\\images\\bg\\start.webp（首頁會顯示假圖）");

head("7. 程式版本與題庫邏輯");
const read = (p) => (has(p) ? fs.readFileSync(path.join(root, p), "utf8") : "");
const main = read("src/main.ts");
if (main) main.includes("startGame") && !main.includes("尚未開發") ? ok("main.ts 是新版（已接上遊戲流程）") : bad("main.ts 還是舊版（會顯示「尚未開發」），請用新的 main.ts 覆蓋 src\\main.ts");
const g = read("src/game.ts");
if (g) g.includes("export function startGame") ? ok("game.ts 內容正確") : bad("src\\game.ts 內容不對（可能和 game.css 弄混），請重新下載");
const css = read("src/game.css");
if (css) css.includes(".hud") ? ok("game.css 內容正確") : bad("src\\game.css 內容不對，請重新下載");
read("tsconfig.json").includes("resolveJsonModule") ? ok("tsconfig 已啟用 JSON 匯入") : bad("tsconfig.json 缺少 resolveJsonModule，請用新的覆蓋");
try {
  const bank = JSON.parse(read("src/data/questions.json"));
  const photos = JSON.parse(read("src/data/photos.json")).photos;
  const perCity = {};
  const hashed = photos.filter((x) => /^[a-z]+-[0-9a-f]{8}$/.test(x.name));
  if (hashed.length) bad("photos.json 裡有 " + hashed.length + " 張照片名稱是英文代號（例如 " + hashed[0].name + "），需要用最新版 build-photo-data.mjs 重跑");
  for (const s of bank) {
    const tag = s.city + "/" + s.name;
    const p = photos.find((x) => x.city === s.city && x.name === s.name);
    if (!p) bad(tag + "：photos.json 裡找不到同名照片（名稱要和照片檔名一致）");
    else if (p.type === "other") bad(tag + "：這張照片是「其他」類型，不會被抽成停靠點");
    else perCity[s.city] = (perCity[s.city] || 0) + 1;
    if (!s.guide || !s.trivia) bad(tag + "：缺導覽文字或冷知識");
    if (s.questions.length < 5) bad(tag + "：題庫只有 " + s.questions.length + " 題，至少要 5 題（建議 8 題以上，每次隨機抽 5 題）");
    s.questions.forEach((q, n) => {
      if (q.options.length !== 4 || !(q.answer >= 0 && q.answer < q.options.length) || new Set(q.options).size !== q.options.length) bad(tag + " 第 " + (n + 1) + " 題：選項或答案格式有誤");
    });
  }
  for (const [c, n] of Object.entries(perCity)) ok(c + "：可抽停靠點 " + n + " 個" + (n < 3 ? "（少於 3 個，會全部都玩）" : ""));
} catch (e) {
  bad("題庫檢查失敗：" + e.message);
}

head("8. 圖片與影片檔案是否都在");
{
  const refs = new Set(["/images/bg/exit.mp4", "/images/bg/board.mp4", "/images/bg/bus-parked.webp", "/images/bg/fail.webp"]);
  for (const x of read("src/story.ts").matchAll(/\/images\/bg\/[\w.-]+\.(?:jpe?g|png|webp|mp4)/g)) refs.add(x[0]);
  try {
    for (const c of Object.values(JSON.parse(read("src/data/scenes.json")))) {
      refs.add(c.map);
      refs.add(c.street);
    }
  } catch {}
  try {
    for (const v of Object.values(JSON.parse(read("src/data/music.json")))) if (v) refs.add(v);
  } catch {}
  for (const r of refs) has("public" + r) ? ok(r) : bad(r + " 找不到（請把檔案改成這個名稱，放在 public\\images\\bg）");
}

head("9. 地圖位置與照片是否對得上");
try {
  const scenes = JSON.parse(read("src/data/scenes.json"));
  const photos2 = JSON.parse(read("src/data/photos.json")).photos;
  const bank2 = JSON.parse(read("src/data/questions.json"));
  const count = (city, n) => photos2.filter((x) => x.city === city && x.name === n && x.type !== "other").length;
  for (const [city, sc] of Object.entries(scenes)) {
    const merged = new Set(Object.values(sc.merge || {}).flat());
    for (const name of Object.keys(sc.spots)) {
      const subs = sc.merge?.[name] || [];
      const n = count(city, name) + subs.reduce((a, m) => a + count(city, m), 0);
      n ? ok(city + "／" + name + "（照片 " + n + " 張" + (subs.length ? "，合併 " + subs.join("、") : "") + (bank2.some((q) => q.city === city && q.name === name) ? "，有題目" : "，題目準備中") + "）") : bad(city + "／" + name + "：找不到同名的景點照片（陽明山這類新景點請放 陽明山_1.jpg、陽明山_2.jpg）");
      for (const m of subs) if (!count(city, m)) bad(city + "／" + name + " 要合併的「" + m + "」找不到照片");
    }
    for (const p of photos2.filter((x) => x.city === city && x.type === "spot" && !(x.name in sc.spots) && !merged.has(x.name))) {
      console.log("  ℹ " + city + "／" + p.name + "：還沒有地圖位置，目前不會出現在遊戲裡");
    }
    for (const q of bank2.filter((x) => x.city === city && !(x.name in sc.spots))) console.log("  ℹ " + city + "／" + q.name + "：有題庫但地圖沒有位置，不會被抽到");
  }
} catch (e) {
  bad("地圖位置檢查失敗：" + e.message);
}

console.log("\n" + (problems ? "共發現 " + problems + " 個問題，請依 ✘ 處理後重跑。" : "全部正常，可以執行 npm run dev。"));
