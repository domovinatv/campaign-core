// Iscrtava schema.dbml u docs/schema.png i docs/schema.svg kroz open-diagram (headless Chrome).
//
//   npm run diagram                          # raspored compact (uspravan, stane u README)
//   ALGO=snowflake npm run diagram           # left-right | pipeline | snowflake | compact
//   OPEN_DIAGRAM=/put/do/open-diagram npm run diagram
//
// Treba lokalni klon github.com/stepanic/open-diagram s instaliranim ovisnostima
// (playwright dolazi odande, pa ga ovaj repo ne vuče).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const od = process.env.OPEN_DIAGRAM ?? path.join(homedir(), "git/stepanic/open-diagram");
const algo = process.env.ALGO ?? "compact";
const outDir = process.env.OUT_DIR ?? path.join(root, "docs");
const { chromium } = createRequire(path.join(od, "package.json"))("playwright");

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(pathToFileURL(path.join(od, "index.html")).href);
await page.waitForFunction(() => window.OD && OD.app && OD.app.state.model);
await page.evaluate((src) => OD.app.openText("schema.dbml", src), readFileSync(path.join(root, "schema.dbml"), "utf8"));
await page.waitForTimeout(300);
await page.click('[data-action="auto-layout"]');
await page.click(`#layout-menu [data-algorithm="${algo}"]`);
await page.waitForTimeout(600);

const counts = await page.evaluate(() => ({
  tables: OD.app.state.model.tables.length,
  drawn: document.querySelectorAll(".od-table:not(.od-note)").length,
  refs: OD.app.state.model.refs.length,
  lines: document.querySelectorAll(".od-ref").length,
}));
if (counts.drawn !== counts.tables || counts.lines !== counts.refs || errors.length > 0) {
  console.error("iscrtavanje nepotpuno", counts, errors);
  process.exit(1);
}

for (const ext of ["svg", "png"]) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(`[data-action="export-${ext}"]`)]);
  await dl.saveAs(path.join(outDir, `schema.${ext}`));
}
await browser.close();
console.log(`docs/schema.{svg,png}: ${counts.tables} tablica, ${counts.refs} veza, raspored ${algo}`);
