// 《回声·1970》自动化验证：直接从 index.html 提取交付代码来测
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", ROOT), "utf8");

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  PASS  " + msg); }
  else { fail++; console.error("  FAIL  " + msg); }
}

// ── 1) 提取并验证 SHA-256 实现 ─────────────────────────────
const start = html.indexOf("/*SHA-START*/");
const end = html.indexOf("/*SHA-END*/");
ok(start >= 0 && end > start, "SHA 标记存在");
const code = html.slice(start + "/*SHA-START*/".length, end);
const { sha256Hex } = new Function(code + "\nreturn {sha256Hex};")();
const ref = (s) => createHash("sha256").update(s, "utf8").digest("hex");
for (const s of ["", "abc", "红专并进", "echo1970::红专并进", "echo1970::回声",
  "The quick brown fox jumps over the lazy dog", "x".repeat(1000), "回声·1970"]) {
  ok(sha256Hex(s) === ref(s), "sha256(¥'" + (s.length > 24 ? s.slice(0, 24) + "…" : s) + "¥') 与 node:crypto 一致");
}

// ── 2) 内嵌哈希与预期答案匹配（含归一化） ───────────────────
const SALT = "echo1970::";
const norm = (s) => String(s || "").toLowerCase().replace(/[\s，,、．\.。!！?？]/g, "");
const expect = {
  c1: ["红专并进", "红专并进，理实交融", "红專並進", "红專並進理實交融", "红专并进 理实交融"],
  c2: ["光", "guang", "Guang", "GUANG", "guāng"],
  c3: ["314", "3.14"],
  c4: ["合", "合肥", "hefei", "HE FEI"],
  c5: ["沈临", "沈臨", "shenlin", "SHEN LIN"],
  c6: ["1970", "一九七零", "一九七〇"],
  c8: ["回声", "回聲", "echo", "ECHO"],
};
const hm = html.match(/const HASHES=\{([\s\S]*?)\n\};/);
ok(!!hm, "HASHES 块可提取");
const HASHES = new Function("return {" + hm[1] + "};")();
for (const [k, answers] of Object.entries(expect)) {
  for (const a of answers) {
    ok(HASHES[k] && HASHES[k].includes(ref(SALT + norm(a))), k + " 接受答案: " + a);
  }
}
// 明文答案不应出现在 index.html（防直接抄近路）
for (const plain of ["红专并进", "一九七〇", "shenlin"]) {
  ok(!html.includes(plain), "源码不含明文答案: " + plain);
}

// ── 3) 四类谜题编码可解 ─────────────────────────────────────
const bin = "00111 10101 00001 01110 00111".split(" ").map((b) => parseInt(b, 2));
const word = bin.map((n) => String.fromCharCode(64 + n)).join("");
ok(word === "GUANG", "二进制墨点 → " + word);
ok(html.includes("■ ■ □ □ □　□ ■ □ ■ □　□ □ □ □ ■　□ ■ ■ ■ □　■ ■ □ □ □"), "墨点图案与解码一致");

const dec = (s) => s.replace(/[A-Z]/g, (c) => String.fromCharCode((c.charCodeAt(0) - 65 - 3 + 26) % 26 + 65));
const ct = "PB QDPH LV VKHQ OLQ. L ZULWH WR BRX IURP WKH WUDLQ.";
ok(dec(ct) === "MY NAME IS SHEN LIN. I WRITE TO YOU FROM THE TRAIN.", "凯撒 -3 → 明文正确");
ok(html.includes("PB QDPH LV VKHQ OLQ.") && html.includes("L ZULWH WR BRX IURP WKH WUDLQ."), "凯撒密文与文档一致");

const M = { ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E", "..-.": "F", "--.": "G", "....": "H", "..": "I", ".---": "J", "-.-": "K", ".-..": "L", "--": "M", "-.": "N", "---": "O", ".--.": "P", "--.-": "Q", ".-.": "R", "...": "S", "-": "T", "..-": "U", "...-": "V", ".--": "W", "-..-": "X", "-.--": "Y", "--..": "Z", "-----": "0", ".----": "1", "..---": "2", "...--": "3", "....-": "4", ".....": "5", "-....": "6", "--...": "7", "---..": "8", "----.": "9" };
const morse = "·−−−− −−−−· −−··· −−−−−".split(" ")
  .map((x) => M[x.replace(/·/g, ".").replace(/−/g, "-")]).join("");
ok(morse === "1970", "摩尔斯 → " + morse);
ok(html.includes("· − − − −　　− − − − ·　　− − · · ·　　− − − − −"), "摩尔斯图案与解码一致");

ok(Buffer.from("5Zue5aOw", "base64").toString("utf8") === "回声", "base64 5Zue5aOw → 回声");
ok(html.includes("5Zue5aOw"), "源码注释含隐藏之门");

// ── 4) 基本卫生检查 ─────────────────────────────────────────
ok(!/<script src=|<link[^>]+href="http|url\(http|@import/.test(html), "零外部资源（无外部脚本/字体/图片引用）");
ok((html.match(/<script/g) || []).length === 1 && (html.match(/<\/script>/g) || []).length === 1, "script 标签成对");
ok(html.includes("与中国科学技术大学无任何隶属或授权关系"), "免责声明存在");
ok(html.includes("CC BY-NC-SA 4.0") && html.includes("MIT"), "双许可声明存在");

// ── 5) 端到端：模拟浏览器判定路径（回归：HASHES 必须挂载到 CHAPTERS）──
const chapM = html.match(/const CHAPTERS=(\[[\s\S]*?\n\]);/);
ok(!!chapM, "CHAPTERS 块可提取");
const CHAPTERS = new Function("return " + chapM[1] + ";")();
const keyFull = (s) => ref(SALT + norm(s));
// 复刻 index.html 中的挂载行：数据与校验在此汇合
CHAPTERS.forEach(function (c) { if (HASHES[c.id]) { c.hashes = HASHES[c.id]; } });
const sim = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));
for (const c of CHAPTERS) {
  if (c.type === "input" || c.type === "hidden") ok(Array.isArray(c.hashes) && c.hashes.length > 0, c.id + "(" + c.type + ") 已挂载 hashes");
}
// 模拟 trySolve 全路径：预期答案必须判过，错误答案必须判不过
for (const [k, answers] of Object.entries(expect)) {
  const hit = answers.some((a) => sim[k].hashes.includes(keyFull(a)));
  ok(hit, k + " 模拟 trySolve 判定通过: " + answers[0]);
}
ok(!sim.c1.hashes.includes(keyFull("理实交融")), "c1 错误答案判不过");
ok(!sim.c3.hashes.includes(keyFull("271")), "c3 错误答案(e)判不过");
ok(html.includes("c.hashes=HASHES[c.id]"), "挂载行存在于源码");

console.log("\n结果: " + pass + " 通过, " + fail + " 失败");
process.exit(fail ? 1 : 0);
