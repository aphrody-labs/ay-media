#!/usr/bin/env bun
// Privacy & secret gate for tracked files in ay-cf (STANDARD.md section 2 & 14).
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export interface Leak {
  file: string;
  line: number;
  why: string;
}

const SKIP =
  /(^|\/)(bun\.lock|Cargo\.lock|uv\.lock|node_modules|target)(\/|$)|\/(test|fixtures)\/|workers\/[^/]+\/worker-configuration\.d\.ts$|\.(test\.ts|svg|png|jpg|woff2?|wasm|lock)$/;
const IPV4 =
  /\b(?!127\.|0\.0\.0\.0|1\.1\.1\.1|1\.0\.0\.1|8\.8\.8\.8|8\.8\.4\.4|255\.|10\.0\.0\.|10\.200\.77\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/;

const DEFAULT_PATTERNS: [string, RegExp][] = [
  ["Windows user profile path", /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+/],
  ["POSIX home directory path", /(^|[\s"'`(=])\/home\/[a-z][a-z0-9_-]{1,}\//],
  ["Private API token / secret prefix", /\b(?:ghp_|gho_|github_pat_|cfut_|cftk_|sk-[A-Za-z0-9]{20,})\S*/],
  [
    "Non-placeholder email address",
    /\b(?!contact@aphrody\.com\b)[\w.+-]+@(?!users\.noreply\.github\.com|github\.com:|cloudflare\.com|example\.com|example\.org|yourdomain\.com|that-domain\.com|company\.com|app\.com|nonexistent\.com|recipient\.com|gmail\.com)[\w-]+\.(com|net|org|fr|io|dev)\b/i,
  ],
];

export function scanFiles(files: Map<string, string>, extraLiterals: string[] = []): Leak[] {
  const leaks: Leak[] = [];
  const literalRes = extraLiterals
    .filter((s) => s.length >= 6 && !s.startsWith("<"))
    .map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

  for (const [file, text] of files) {
    if (SKIP.test(file) || file === "tools/private-gate.ts") continue;
    text.split(/\r?\n/).forEach((line, idx) => {
      for (const [why, re] of DEFAULT_PATTERNS) {
        if (re.test(line)) leaks.push({ file, line: idx + 1, why });
      }
      for (const re of literalRes) {
        if (re.test(line)) leaks.push({ file, line: idx + 1, why: "ay-cf.local.toml private value" });
      }
      const ip = IPV4.exec(line);
      if (
        ip &&
        !/version|v\d|\d+\.\d+\.\d+\.\d+[-.]\d|rustc|clang|llvm|Chrome/i.test(line) &&
        ip.slice(1).every((n) => Number(n) <= 255)
      ) {
        leaks.push({ file, line: idx + 1, why: "Non-reserved IPv4 address" });
      }
    });
  }
  return leaks;
}

export function loadLocalLiterals(root: string): string[] {
  const localFile = join(root, "ay-cf.local.toml");
  if (!existsSync(localFile)) return [];
  try {
    const parsed = Bun.TOML.parse(require("node:fs").readFileSync(localFile, "utf8")) as Record<string, any>;
    const vals: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") vals.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(parsed.cloudflare);
    for (const h of Object.values((parsed.hosts ?? {}) as Record<string, { public_ipv4?: string }>)) {
      if (typeof h?.public_ipv4 === "string" && h.public_ipv4) vals.push(h.public_ipv4);
    }
    return vals;
  } catch {
    return [];
  }
}

export async function readWorkingTreeFiles(root: string): Promise<Map<string, string>> {
  const proc = Bun.spawn(["git", "-C", root, "ls-files", "-co", "--exclude-standard", "-z"], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const names = (await new Response(proc.stdout).text()).split("\0").filter(Boolean);
  const files = new Map<string, string>();
  for (const name of names) {
    const full = join(root, name);
    if (SKIP.test(name) || !existsSync(full)) continue;
    const text = await Bun.file(full).text().catch(() => "");
    if (!text.includes("\0")) files.set(name, text);
  }
  return files;
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  const files = await readWorkingTreeFiles(root);
  const extra = loadLocalLiterals(root);
  const leaks = scanFiles(files, extra);
  for (const l of leaks.slice(0, 60)) console.error(`${l.file}:${l.line}: ${l.why}`);
  console.log(leaks.length ? `${leaks.length} private leak(s) detected` : `private-gate OK (${files.size} tracked/unignored files scanned, 0 leaks)`);
  process.exit(leaks.length ? 1 : 0);
}
