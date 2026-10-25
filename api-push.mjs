/**
 * 通过 GitHub REST API 推送整棵工作树（用于 github.com:443 被阻断、
 * 但 api.github.com 可用的网络环境）。
 *
 * 用法：GH_TOKEN=<token> node api-push.mjs <owner> <repo> <branch>
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [owner, repo, branch = "main"] = process.argv.slice(2);
const token = process.env.GH_TOKEN;
if (!owner || !repo || !token) {
  console.error("用法：GH_TOKEN=<token> node api-push.mjs <owner> <repo> <branch>");
  process.exit(1);
}
const API = "https://api.github.com";
const ROOT = path.dirname(fileURLToPathCompat(import.meta.url));
function fileURLToPathCompat(u) {
  return decodeURIComponent(new URL(u).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
}

const SKIP = new Set([".git", ".mimosa", "node_modules", ".zcode"]);

async function gh(method, url, body, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(API + url, {
        method,
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json; charset=utf-8",
          "User-Agent": "api-push",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      if (res.status === 409 || res.status >= 500 || res.status === 429) {
        throw new Error(`retryable ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 300)}`);
      return text ? JSON.parse(text) : {};
    } catch (e) {
      if (i === tries) throw e;
      console.log(`  ↻ 重试 ${i}/${tries - 1}（${String(e.message).slice(0, 80)}）`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

// ── 收集文件 ──
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(path.relative(ROOT, full).replaceAll("\\", "/"));
  }
  return out;
}
const files = walk(ROOT).filter((f) => !f.endsWith(".gitignore") || true);
console.log(`共 ${files.length} 个文件待上传`);

// ── 1) 创建 blobs（并发 6）──
const shaByPath = {};
let done = 0;
async function upload(f) {
  const content = fs.readFileSync(path.join(ROOT, f));
  const r = await gh("POST", `/repos/${owner}/${repo}/git/blobs`, {
    content: content.toString("base64"),
    encoding: "base64",
  });
  shaByPath[f] = r.sha;
  done++;
  if (done % 20 === 0 || done === files.length) console.log(`  blobs ${done}/${files.length}`);
}
const queue = [...files];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) await upload(queue.shift());
  })
);

// ── 2) 建 tree ──
const tree = files.map((f) => ({
  path: f,
  mode: "100644",
  type: "blob",
  sha: shaByPath[f],
}));
const t = await gh("POST", `/repos/${owner}/${repo}/git/trees`, { tree });
console.log(`tree: ${t.sha}`);

// ── 3) 建 commit ──
const c = await gh("POST", `/repos/${owner}/${repo}/git/commits`, {
  message: "初始版本：体验不同世界 · AI 人生模拟器提示词库（104 个世界 / 13 分类）",
  tree: t.sha,
  parents: [],
});
console.log(`commit: ${c.sha}`);

// ── 4) 更新分支引用 ──
await gh("PATCH", `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
  sha: c.sha,
  force: true,
});
console.log(`✅ 已推送 ${files.length} 个文件到 ${owner}/${repo}@${branch}`);
