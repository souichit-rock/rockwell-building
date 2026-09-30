// Headless smoke: node scripts/smoke.mjs <baseUrl> [light|dark]
// Needs Chrome installed and puppeteer-core available globally (npm i -g puppeteer-core); not a project dependency.
// Loads every smoke URL at 1280 and 390 px, records console/page errors, blank main, "Something went wrong",
// Not-found card presence, horizontal overflow, duplicate h1, and the word "department".
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const globalRoot = process.env.NPM_GLOBAL_ROOT || execSync("npm root -g").toString().trim();
const require = createRequire(globalRoot + "/");
const puppeteer = require("puppeteer-core");

const base = process.argv[2] || "http://localhost:4180";
const theme = process.argv[3] || "light";
const URLS = ["/", "/towers", "/towers/eds", "/towers/grb", "/towers/eds/floors/eds-b3", "/towers/eds/floors/eds-b3?highlight=asset:eds-b3-fp-01&layer=FIRE", "/towers/eds/floors/eds-l12?highlight=space:eds-l12-u01", "/towers/eds/floors/eds-b3?highlight=doc:doc-eds-fp-ab", "/spaces/eds-b3-fpr", "/assets?tower=grb", "/assets?brand=kestrel-pumps", "/assets?tower=grb&crit=A&om=missing", "/assets?band=30d,90d", "/assets/eds-b3-fp-01", "/assets/eds-b3-fp-01?tab=documents", "/assets/eds-b3-fp-01?tab=maintenance", "/assets/eds-b3-fp-01?tab=history", "/a/EDS-B3-FP-01", "/standards", "/standards/rds-fp-01", "/finishes?tower=grb", "/compliance", "/catalogue", "/catalogue/brands/kestrel-pumps", "/catalogue/models/hf-750e", "/documents?tower=grb", "/documents?tower=grb&discipline=ELEC&type=as-built&current=0", "/documents/doc-eds-e-ab", "/permits?tower=grb", "/work-orders?tower=grb", "/work-orders?view=list&tower=grb", "/work-orders/new?assetId=eds-b3-fp-01", "/work-orders/wo-1", "/maintenance?tower=grb", "/maintenance?view=calendar&tower=grb", "/maintenance/pm-eds-b3-fp-01-1", "/inspections?tower=grb", "/inspections?assetId=eds-b3-fp-01", "/inspections/new?assetId=eds-b3-fp-01&planId=pm-eds-b3-fp-01-1", "/inspections/insp-1", "/warranties?tower=grb", "/warranties?band=30d", "/vendors?tower=grb", "/vendors/halcyon-fire-philippines", "/nowhere/at/all", "/towers/zzz", "/towers/constructor", "/vendors/constructor", "/assets/constructor", "/assets/zzz", "/a/ZZZ-00-XX-00", "/documents/zzz", "/work-orders/zzz", "/vendors/zzz", "/towers/eds/floors/zzz", "/spaces/zzz", "/standards/zzz", "/catalogue/brands/zzz", "/catalogue/models/zzz", "/maintenance/zzz", "/inspections/zzz"];
const isBad = (u) => /zzz|nowhere|ZZZ|constructor/.test(u);

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
const rows = [];
try {
  for (const w of [1280, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 800, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((t) => { try { localStorage.setItem("rb-theme", t); localStorage.removeItem("rb:v1"); } catch {} }, theme);
    for (const url of URLS) {
      const errs = [];
      const onConsole = (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); };
      const onErr = (e) => errs.push("pageerror: " + String(e.message || e).slice(0, 160));
      page.on("console", onConsole); page.on("pageerror", onErr);
      const t0 = Date.now();
      try {
        await page.goto(base + url, { waitUntil: "networkidle0", timeout: 30000 });
        await page.waitForFunction(() => !/loading building data/i.test(document.body.innerText), { timeout: 10000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 400));
        const m = await page.evaluate(() => {
          const de = document.documentElement; const main = document.querySelector("main");
          const text = ((main ? main.innerText : document.body.innerText) || "").replace(/\s+/g, " ").trim();
          const h1 = document.querySelector("h1");
          return { h1: h1 ? h1.innerText.trim().slice(0, 50) : null, len: text.length, notFound: /not found/i.test(text), wentWrong: /something went wrong/i.test(text), loading: /loading building data/i.test(text), overflowX: Math.max(de.scrollWidth, document.body.scrollWidth) - de.clientWidth, h1count: document.querySelectorAll("h1").length, dept: /department/i.test(document.body.innerText), theme: de.dataset.theme };
        });
        rows.push({ url, w, ms: Date.now() - t0, ...m, errs });
      } catch (e) { rows.push({ url, w, ms: Date.now() - t0, harnessError: String(e.message || e).slice(0, 160), errs }); }
      page.off("console", onConsole); page.off("pageerror", onErr);
    }
    await page.close();
  }
} finally { await browser.close(); }

const bad = rows.filter((r) => r.harnessError || (r.len ?? 0) < 20 || r.wentWrong || r.overflowX > 0 || r.errs.length || r.dept || r.loading || r.h1count > 1 || (r.notFound && !isBad(r.url)) || (!r.notFound && isBad(r.url)));
console.log(JSON.stringify({ base, theme, loads: rows.length, bad: bad.length, maxMs: Math.max(...rows.map((r) => r.ms)), themes: [...new Set(rows.map((r) => r.theme))], problems: bad.map((r) => ({ url: r.url, w: r.w, h1: r.h1, len: r.len, nf: r.notFound, wrong: r.wentWrong, ox: r.overflowX, h1s: r.h1count, errs: r.errs, he: r.harnessError })) }, null, 1));
process.exit(bad.length ? 1 : 0);
