/**
 * 构建脚本：扫描「体验不同世界-提示词分享9.30」，
 * 提取元数据 → 生成 data/prompts.json，并把提示词与教程视频复制为 ASCII 文件名，
 * 保证在任何静态托管平台上 URL 都安全。
 *
 * 用法：node build.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = "F:/设定/体验不同世界-提示词分享9.30";
const OUT = path.dirname(fileURLToPath(import.meta.url));

const PROMPTS_SRC = path.join(SRC, "成品提示词");
const DATA_DIR = path.join(OUT, "data");
const PROMPTS_OUT = path.join(OUT, "prompts");
const ASSETS_OUT = path.join(OUT, "assets");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PROMPTS_OUT, { recursive: true });
fs.mkdirSync(ASSETS_OUT, { recursive: true });

/** 分类展示顺序与配色 */
const CATEGORY_META = {
  玄幻修仙: { emoji: "⚔️", color: "#a78bfa", desc: "修仙问道，逆天改命" },
  国漫国动: { emoji: "🐉", color: "#f97316", desc: "斗罗、斗破、凡人……国漫大世界" },
  日漫: { emoji: "🌸", color: "#f472b6", desc: "火影、海贼、咒术……二次元冒险" },
  历史背景: { emoji: "🏯", color: "#fbbf24", desc: "穿越回真实历史的关键时刻" },
  中文影视: { emoji: "🎬", color: "#60a5fa", desc: "经典剧集，亲身入局" },
  西方影视: { emoji: "🎭", color: "#34d399", desc: "霍格沃茨、浣熊市、超级英雄世界" },
  恐怖无限流: { emoji: "👻", color: "#f87171", desc: "规则怪谈、无限轮回，活下来" },
  都市人生: { emoji: "🏙️", color: "#38bdf8", desc: "重生、逆袭、模拟真实人生" },
  游戏和体育: { emoji: "🎮", color: "#4ade80", desc: "电竞、球场上 Sicssor 拼出荣耀" },
  黑道文: { emoji: "🕶️", color: "#94a3b8", desc: "江湖恩怨，兄弟情义" },
  特殊设定: { emoji: "🧬", color: "#c084fc", desc: "废土、末日、史莱姆等脑洞设定" },
  角色纯爱攻略: { emoji: "💞", color: "#fb7185", desc: "与心仪角色展开专属剧情" },
  龙族: { emoji: "🐲", color: "#22d3ee", desc: "卡塞尔学院，屠龙者的青春" },
};
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

/** 个别文件名手动纠正标题 */
const TITLE_OVERRIDES = {
  "re0从零开始的...txt": "Re:0 从零开始的异世界生活",
  "沧源图-提示词.txt": "沧元图",
  "民国-动荡时代.txt": "民国·动荡时代",
};

/** 标题清洗：去版本号、「人生模拟器」后缀、包裹括号等 */
function cleanTitle(t) {
  let s = String(t).trim();
  s = s.replace(/^【+/, "").replace(/】+$/, "");
  s = s.replace(/（版本号[:：]?V[\d.]+）/g, "");
  s = s.replace(/[Vv]\d+(\.\d+){0,2}/g, "");
  s = s.replace(/^[\s\-–—·:：、|]+|[\s\-–—·:：、|]+$/g, "");
  const stripped = s.replace(/[：:·\s\-—]*人生模拟器/, "");
  const alpha = stripped.replace(/[（）()《》\s：:·，,。\-—【】]/g, "");
  if (alpha.length >= 3) s = stripped;
  return s.replace(/^[\s\-–—·:：、|]+|[\s\-–—·:：、|]+$/g, "").trim();
}

function cleanFilename(name) {
  return name
    .replace(/\.txt$/i, "")
    .replace(/[-_]?提示词/g, "")
    .replace(/[-_]?V\d+(\.\d+)*$/gi, "")
    .replace(/[-_]+$/g, "")
    .replace(/^[-_]+/g, "")
    .trim();
}

function extractTitle(text, filename) {
  if (TITLE_OVERRIDES[filename]) return TITLE_OVERRIDES[filename];
  const head = text.slice(0, 600);
  const m = head.match(/《([^》]{1,40})》/);
  if (m) {
    let title = cleanTitle(m[1]);
    const paren = filename.match(/（([^）]{1,14})）/);
    if (paren && !title.includes(paren[1])) title += `（${paren[1]}）`;
    return title;
  }
  // 退而求其次：首个非空、非引用、非章节标题的短行
  for (const raw of text.split(/\r?\n/).slice(0, 8)) {
    const l = raw.trim().replace(/^[#>*\-\s]+/, "").replace(/\*\*/g, "").trim();
    if (!l) continue;
    if (/^(复制|粘贴|玩法|模板|对话|建议|为了避免|发送)/.test(l)) continue;
    if (/^【?[一二三四五六七八九十百]+[、.．]/.test(l)) continue;
    if (l.length >= 2 && l.length <= 30) {
      let title = cleanTitle(l);
      const paren = filename.match(/（([^）]{1,14})）/);
      if (paren && !title.includes(paren[1])) title += `（${paren[1]}）`;
      return title;
    }
    break;
  }
  return cleanFilename(filename);
}

function extractVersion(text, filename) {
  const head = text.slice(0, 600);
  let m = head.match(/V\s?(\d+(?:\.\d+){0,2})\b/);
  if (m) return "V" + m[1];
  m = filename.match(/V(\d+(?:\.\d+){0,2})/i);
  return m ? "V" + m[1] : "";
}

function extractExcerpt(text) {
  const lines = text.split(/\r?\n/);
  for (const raw of lines.slice(0, 60)) {
    let l = raw.trim();
    if (!l) continue;
    if (/^[#>`~\-*|]/.test(l)) continue;
    if (/^\*\*《.*》.*\*\*$/.test(l)) continue;
    if (/^(复制|粘贴|玩法|模板|对话|建议|为了避免|发送|下载完)/.test(l)) continue;
    if (/^【?[〇零一二三四五六七八九十百]+[、.．（]/.test(l)) continue;
    // 跳过符号为主的装饰行（═══、---、===）
    if (l.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").length < 6) continue;
    l = l.replace(/^【[^】]*】\s*/, "");
    l = l.replace(/^\*\*《[^》]*》[^，。]*[，。]?\*\*/, "");
    l = l.replace(/\*\*/g, "").replace(/^《[^》]*》[^，。]*[，。]?/, "");
    l = l.replace(/^\d+[、.．]\s*/u, "").trim();
    if (l.length < 12) continue;
    return l.slice(0, 84);
  }
  return "";
}

// ---- 扫描 ----
const prompts = [];
const catCount = {};
let id = 0;

for (const cat of fs.readdirSync(PROMPTS_SRC, { withFileTypes: true })) {
  if (!cat.isDirectory()) continue;
  const dir = path.join(PROMPTS_SRC, cat.name);
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".txt"));
  files.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  for (const file of files) {
    const full = path.join(dir, file);
    const text = fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "").trim();
    if (!text) continue;
    id += 1;
    const pid = "p" + String(id).padStart(3, "0");
    let title = extractTitle(text, file);
    if (/backup/i.test(file) && !title.includes("备份")) title += "（备份）";
    fs.writeFileSync(path.join(PROMPTS_OUT, pid + ".txt"), text, "utf8");
    catCount[cat.name] = (catCount[cat.name] || 0) + 1;
    prompts.push({
      id: pid,
      title,
      version: extractVersion(text, file),
      category: cat.name,
      file: `prompts/${pid}.txt`,
      chars: text.length,
      excerpt: extractExcerpt(text),
    });
  }
}

// 分类按预定顺序，未知的排后面，并补默认配色
const categories = [];
const seen = new Set();
for (const c of CATEGORY_ORDER) {
  if (catCount[c]) {
    categories.push({ key: c, emoji: CATEGORY_META[c].emoji, color: CATEGORY_META[c].color, desc: CATEGORY_META[c].desc, count: catCount[c] });
    seen.add(c);
  }
}
const EXTRA_COLORS = ["#818cf8", "#e879f9", "#2dd4bf", "#facc15"];
let ci = 0;
for (const [c, n] of Object.entries(catCount)) {
  if (!seen.has(c)) {
    categories.push({ key: c, emoji: "✨", color: EXTRA_COLORS[ci++ % EXTRA_COLORS.length], desc: "", count: n });
  }
}

const totalChars = prompts.reduce((s, p) => s + p.chars, 0);
const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  total: prompts.length,
  totalChars,
  categories,
  prompts,
};
fs.writeFileSync(path.join(DATA_DIR, "prompts.json"), JSON.stringify(data, null, 1), "utf8");

// 同时输出 JS 版数据：提示词全文按 prompt 拆分为独立 .js，
// 前端用 script 标签按需加载（HTTP 与 file:// 通用，前端代码零网络请求）。
const jsEscape = (s) => JSON.stringify(s).replace(/</g, "\\u003c");
fs.writeFileSync(
  path.join(DATA_DIR, "prompts.js"),
  "window.__PROMPTS__=" + jsEscape(data) + ";",
  "utf8"
);
for (const p of prompts) {
  const text = fs.readFileSync(path.join(PROMPTS_OUT, p.id + ".txt"), "utf8");
  fs.writeFileSync(
    path.join(PROMPTS_OUT, p.id + ".js"),
    'window.__TEXTS__=window.__TEXTS__||{};window.__TEXTS__["' + p.id + '"]=' + jsEscape(text) + ";",
    "utf8"
  );
}

// 教程视频
const videoSrc = path.join(SRC, "01使用教学.mp4");
if (fs.existsSync(videoSrc)) {
  fs.copyFileSync(videoSrc, path.join(ASSETS_OUT, "tutorial.mp4"));
}

console.log(`✅ 完成：${prompts.length} 个提示词，${categories.length} 个分类，共 ${(totalChars / 10000).toFixed(1)} 万字`);
for (const c of categories) console.log(`   ${c.emoji} ${c.key}: ${c.count}`);
