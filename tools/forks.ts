#!/usr/bin/env bun
// Audits forks.toml against live aphrody-labs repositories and creates/hardens missing forks (--ensure).
import { resolve } from "node:path";
import { ghCli } from "./lib/gh.ts";
import { loadManifest } from "./lib/manifest.ts";

const argv = Bun.argv.slice(2);
const manifestPath = resolve(argv.find((_, i) => argv[i - 1] === "--manifest") ?? "forks.toml");
const ensure = argv.includes("--ensure");
const checkOnly = argv.includes("--check");
const m = await loadManifest(manifestPath);

const tokenProc = Bun.spawnSync(["gh", "auth", "token"], { stdout: "pipe", stderr: "pipe" });
if (tokenProc.exitCode !== 0 && !checkOnly) {
  console.error("gh auth token unavailable");
  process.exit(1);
}

if (checkOnly) {
  console.log(`forks.toml valid: ${m.forks.length} forks across ${Object.keys(m.groups).length} groups`);
  process.exit(0);
}

const gh = ghCli();
const missing = [];
for (const f of m.forks) {
  const r = await gh.request("GET", `repos/${m.org}/${f.name}`);
  if (r.status === 404) missing.push(f);
  else if (r.status !== 200) {
    console.error(`unexpected HTTP ${r.status} for ${m.org}/${f.name}`);
    process.exit(1);
  }
}

console.log(`${m.forks.length} forks in manifest, ${m.forks.length - missing.length} present, ${missing.length} missing`);
if (!ensure) process.exit(missing.length ? 1 : 0);

let failed = 0;
for (const f of missing) {
  let ok = false;
  let lastErr = "";
  for (let attempt = 0; attempt < 5 && !ok; attempt++) {
    const p = Bun.spawnSync(
      ["gh", "repo", "fork", f.upstream, "--org", m.org, "--fork-name", f.name, "--clone=false"],
      { stdout: "pipe", stderr: "pipe" },
    );
    if (p.exitCode === 0) {
      ok = true;
      break;
    }
    const check = await gh.request("GET", `repos/${m.org}/${f.name}`);
    if (check.status === 200) {
      ok = true;
      break;
    }
    lastErr = p.stderr.toString().trim().slice(0, 120);
    if (/too quickly|being forked|rate limit/i.test(lastErr)) {
      await Bun.sleep(25_000 * (attempt + 1));
    } else {
      break;
    }
  }
  if (!ok) {
    failed++;
    console.error(`FAILED ${f.upstream} -> ${m.org}/${f.name}: ${lastErr}`);
    continue;
  }
  // Standard §1 & §9.9: disable issues, wikis, projects, and inherited upstream workflows on forks
  await gh.request("PATCH", `repos/${m.org}/${f.name}`, {
    has_issues: false,
    has_wiki: false,
    has_projects: false,
  });
  await gh.request("PUT", `repos/${m.org}/${f.name}/actions/permissions`, {
    enabled: false,
  });
  console.log(`forked & hardened ${f.upstream} -> ${m.org}/${f.name}`);
  await Bun.sleep(4000);
}

process.exit(failed ? 1 : 0);
