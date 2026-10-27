// 生成《回声·1970》各封印答案的加盐 SHA-256 哈希
// 用法: node tools/compute_hashes.mjs
// 注意: SALT 与归一化规则必须与 index.html 中的实现保持一致
import { createHash } from "node:crypto";

const SALT = "echo1970::";
const norm = (s) => String(s || "").toLowerCase().replace(/[\s，,、．\.。!！?？]/g, "");

const groups = {
  c1: ["红专并进", "红专并进理实交融", "红專並進", "红專並進理實交融"],
  c2: ["光", "guang", "guāng"],
  c3: ["314", "3.14"],
  c4: ["合", "合肥", "hefei"],
  c5: ["沈临", "沈臨", "shenlin", "shen lin"],
  c6: ["1970", "一九七零", "一九七〇"],
  c8: ["回声", "回聲", "echo"],
};

const out = {};
for (const [k, arr] of Object.entries(groups)) {
  const set = [...new Set(arr.map((a) => createHash("sha256").update(SALT + norm(a), "utf8").digest("hex")))];
  out[k] = set;
}
console.log(JSON.stringify(out, null, 2));
