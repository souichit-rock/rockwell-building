// Rockwell Building gate (spec §9). Node built-ins only.
//   1. tsc -b                          types
//   2. vite build                      production bundle (dist/)
//   3. vite build --mode gate          seed integrity bundle (dist-gate/check.js), then node dist-gate/check.js
//   4. static checks over the source   vocabulary, tokens-only features, feature isolation, storage access, footer, bundle size, SPA rewrite, smoke coverage
// Every step runs even when an earlier one fails; the full list of failures is printed at the end and the exit code is 1 if there is any.
// `node scripts/gate.mjs --static` skips steps 1-3 and the bundle budget (no builds, about a second) for quick checks while editing.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const FEATURES = join(SRC, "features");
const BUNDLE_LIMIT = 350 * 1000; // bytes, the same "kB" Vite prints

const STATIC_ONLY = process.argv.includes("--static");
const failures = [];
const fail = (message) => failures.push(message);
const rel = (file) => relative(ROOT, file).split(sep).join("/");
const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;
const heading = (text) => console.log(`\n== ${text}`);

// ---------------------------------------------------------------- build steps

function run(label, script, args) {
  heading(label);
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    fail(`${label}: failed (${result.error ? result.error.message : `exit ${result.status ?? result.signal}`})`);
    return false;
  }
  return true;
}

const tsc = join(ROOT, "node_modules", "typescript", "bin", "tsc");
const vite = join(ROOT, "node_modules", "vite", "bin", "vite.js");

let builtApp = false;
if (STATIC_ONLY) {
  heading("builds skipped (--static)");
} else {
  run("tsc -b", tsc, ["-b"]);
  builtApp = run("vite build", vite, ["build"]);
  if (run("vite build --mode gate", vite, ["build", "--mode", "gate"])) {
    run("node dist-gate/check.js (verifySeed + row counts)", join(ROOT, "dist-gate", "check.js"), []);
  }
}

// ---------------------------------------------------------------- source scanning helpers

const SKIP_DIRS = new Set(["node_modules", "dist", "dist-gate", ".git"]);
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const read = (file) => readFileSync(file, "utf8");
const isCode = (file) => /\.(?:tsx?|css)$/.test(file);
const isText = (file) => /\.(?:tsx?|css|html|json|svg|md|mjs|js)$/.test(file);

// One failure line per hit: "<label> <file>:<line>  <trimmed text>".
function scan(files, pattern, label, { skipLine } = {}) {
  for (const file of files) {
    read(file).split(/\r?\n/).forEach((text, i) => {
      if (skipLine?.test(text)) return;
      pattern.lastIndex = 0;
      if (pattern.test(text)) fail(`${label}: ${rel(file)}:${i + 1}  ${text.trim().slice(0, 120)}`);
    });
  }
}

const srcFiles = walk(SRC).filter(isText);
const featureFiles = walk(FEATURES).filter(isCode);

// ---------------------------------------------------------------- 4a vocabulary

heading("vocabulary: no banned words under src/ and README.md");
// Built from parts so this script and the seed's own check never trip the grep they implement.
const readme = join(ROOT, "README.md");
const vocabFiles = [...srcFiles, ...(existsSync(readme) ? [readme] : [])];
scan(vocabFiles, new RegExp("depart" + "ment", "i"), "banned word");
scan(vocabFiles, new RegExp("IT " + "Manager", "i"), "banned byline");

// ---------------------------------------------------------------- 4b features use tokens only

heading("features: tokens only (no hex, rgb(), dark:, bg-white, text-black)");
const swatchLine = /finish\.swatch/; // the one data-driven inline colour (spec §5.1)
scan(featureFiles, /#[0-9a-fA-F]{3,8}\b/, "hex colour", { skipLine: swatchLine });
scan(featureFiles, /rgb\(/, "rgb()", { skipLine: swatchLine });
scan(featureFiles, /dark:/, "dark: variant", { skipLine: swatchLine });
scan(featureFiles, /bg-white/, "bg-white", { skipLine: swatchLine });
scan(featureFiles, /text-black/, "text-black", { skipLine: swatchLine });

// ---------------------------------------------------------------- 4c features never import each other

heading("features: no imports of another feature");
const IMPORT_SPEC = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["'`]([^"'`]+)["'`]/g;
for (const file of featureFiles) {
  const key = relative(FEATURES, file).split(sep)[0];
  read(file).split(/\r?\n/).forEach((text, i) => {
    for (const match of text.matchAll(IMPORT_SPEC)) {
      const spec = match[1];
      let other = null;
      const alias = spec.match(/^@\/features\/([^/]+)/);
      if (alias) other = alias[1];
      else if (spec.startsWith(".")) {
        const target = relative(FEATURES, resolve(dirname(file), spec)).split(sep);
        if (target[0] !== ".." && target[0] !== "") other = target[0];
        else if (target[0] === ".." && /(?:\.\.\/)+features(?:\/|$)/.test(spec)) other = "(features root)";
      }
      if (other !== null && other !== key) fail(`cross-feature import: ${rel(file)}:${i + 1}  ${spec} (from feature "${key}")`);
    }
  });
}

// ---------------------------------------------------------------- 4d browser storage

heading("storage: only store.ts and useTheme.ts touch localStorage");
const STORAGE_OWNERS = new Set(["src/data/store.ts", "src/app/useTheme.ts"]);
scan(srcFiles.filter((file) => !STORAGE_OWNERS.has(rel(file))), /localStorage/, "localStorage");

// ---------------------------------------------------------------- 4e shell footer

heading("shell: footer text and credit");
const shellFile = join(SRC, "app", "Shell.tsx");
if (!existsSync(shellFile)) fail("shell: src/app/Shell.tsx is missing");
else {
  const shell = read(shellFile);
  if (!shell.includes("Sample data for demonstration · Rockwell Building · Souichi Takahama, Innovation Engineer")) {
    fail("shell: Shell.tsx does not contain the exact footer text");
  }
  if (!shell.includes("Innovation Engineer")) fail('shell: Shell.tsx does not contain "Innovation Engineer"');
}

// ---------------------------------------------------------------- 4f bundle budget

heading(`bundle: dist/assets/index-*.js <= ${kb(BUNDLE_LIMIT)}`);
const assetsDir = join(ROOT, "dist", "assets");
const entries = existsSync(assetsDir) ? readdirSync(assetsDir).filter((name) => /^index-.*\.js$/.test(name)) : [];
if (STATIC_ONLY) {
  console.log("skipped (--static)");
} else if (!builtApp || entries.length === 0) {
  fail("bundle: no dist/assets/index-*.js to measure (vite build did not produce one)");
} else {
  for (const name of entries) {
    const bytes = readFileSync(join(assetsDir, name));
    const line = `${name}  ${kb(bytes.length)} raw, ${kb(gzipSync(bytes).length)} gzip`;
    console.log(line);
    if (bytes.length > BUNDLE_LIMIT) fail(`bundle: ${line} exceeds ${kb(BUNDLE_LIMIT)}`);
  }
}

// ---------------------------------------------------------------- 4g SPA rewrite

heading("deploy: vercel.json SPA rewrite");
try {
  const vercel = JSON.parse(read(join(ROOT, "vercel.json")));
  const ok = Array.isArray(vercel.rewrites) && vercel.rewrites.some((r) => r.source === "/(.*)" && r.destination === "/index.html");
  if (!ok) fail('deploy: vercel.json has no rewrite from "/(.*)" to "/index.html"');
} catch (error) {
  fail(`deploy: vercel.json unreadable (${error.message})`);
}

// ---------------------------------------------------------------- 4h smoke coverage

heading("smoke: SMOKE_URLS covers every feature route");
const smokeFile = join(SRC, "app", "smoke.ts");
if (!existsSync(smokeFile)) fail("smoke: src/app/smoke.ts is missing");
else {
  // Route patterns as written in each feature's routes.tsx; URLs as the quoted "/..." literals in smoke.ts.
  const patterns = [];
  for (const file of walk(FEATURES).filter((f) => /routes\.tsx$/.test(f))) {
    for (const m of read(file).matchAll(/\bpath:\s*["'`]([^"'`]+)["'`]/g)) patterns.push(m[1]);
  }
  // The deliberate bad-id URLs (SMOKE_NOT_FOUND) do not count as coverage: a route needs at least one URL that actually renders it.
  const found = read(smokeFile).replace(/SMOKE_NOT_FOUND\s*=\s*\[[\s\S]*?\];/, "");
  const urls = [...found.matchAll(/["'`](\/[^"'`]*)["'`]/g)].map((m) => m[1].split(/[?#]/)[0]);
  const toRegExp = (pattern) => new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`);
  const statics = (pattern) => pattern.split("/").filter((seg) => seg && !seg.startsWith(":")).length;
  const covered = new Set();
  for (const url of urls) {
    // most specific route wins, so /work-orders/new covers "new" and not ":woId"
    const hit = patterns.filter((p) => toRegExp(p).test(url)).sort((a, b) => statics(b) - statics(a))[0];
    if (hit) covered.add(hit);
  }
  console.log(`${urls.length} URL literals, ${covered.size}/${patterns.length} route patterns covered`);
  for (const pattern of patterns) if (!covered.has(pattern)) fail(`smoke: no SMOKE_URLS entry for route ${pattern}`);
}

// ---------------------------------------------------------------- result

heading("result");
if (failures.length === 0) {
  console.log(STATIC_ONLY ? "GATE PASSED (static checks only)" : "GATE PASSED");
} else {
  console.error(`GATE FAILED: ${failures.length} problem${failures.length === 1 ? "" : "s"}`);
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}
