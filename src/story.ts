// 開場故事腳本。之後配音：在該行加上 voice: "/audio/story/01.mp3"（檔案放 public/audio/story/）
// 背景圖放在 public/images/bg/，這裡的 src 指向它們。想換圖只要改 src 的檔名。
export type Line = { who?: string; text: string; bg: string; voice?: string };

export const bgs: Record<string, { label: string; from: string; to: string; src?: string }> = {
  start: { label: "首頁", from: "#0f2a33", to: "#f2b134", src: "/images/bg/start.webp" },
  s1: { label: "便利商店", from: "#1b2a30", to: "#6b8e94", src: "/images/bg/1.webp" },
  s3: { label: "牆上的光", from: "#12062b", to: "#7b3fe4", src: "/images/bg/3.webp" },
  s4: { label: "大巴車內", from: "#0f2a33", to: "#c8892b", src: "/images/bg/4.webp" },
  s5: { label: "大巴車內（主角驚訝）", from: "#0f2a33", to: "#c8892b", src: "/images/bg/5.webp" },
  // 模式選擇、城市辨識、答題提示等所有「大巴」畫面共用這一張
  bus: { label: "大巴車內", from: "#0f2a33", to: "#c8892b", src: "/images/bg/4.webp" },
};

export const story: Line[] = [
  // 圖1：便利商店
  { text: "加班到很晚的夜晚。平凡的上班族走進了常去的便利商店。", bg: "s1" },
  { who: "主角", text: "唉，今天又只能吃微波便當了……", bg: "s1" },
  // 圖3：牆上的光
  { text: "就在他伸手拿飯糰的時候，牆壁上忽然透出一道奇異的光。", bg: "s3" },
  { who: "主角", text: "嗯？那是什麼……牆上，有個洞？", bg: "s3" },
  { text: "他像著了魔似的，一步一步靠近。", bg: "s3" },
  { who: "主角", text: "這光……好像在叫我？等一下，我的身體——", bg: "s3" },
  // 圖4：大巴車內
  { who: "主角", text: "這、這裡是……遊覽車？我什麼時候上車的？", bg: "s4" },
  { who: "廣播", text: "歡迎來到——「大巴導遊之旅」。", bg: "s4" },
  { who: "主角", text: "誰？誰在說話？", bg: "s4" },
  // 圖5：主角驚訝
  { who: "廣播", text: "您必須盡快了解所處的地點，並完美介紹這裡的特色給車上的旅客們。唯有完成任務，才能返回現實世界。", bg: "s5" },
  { who: "主角", text: "開什麼玩笑……", bg: "s5" },
];
