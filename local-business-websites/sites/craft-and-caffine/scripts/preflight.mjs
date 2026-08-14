#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const value = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const base = value("--base");
const pages = (value("--pages") || "").split(",").map(item => item.trim()).filter(Boolean);
if (!base || !pages.length) {
  console.error("Usage: node preflight.mjs --base http://127.0.0.1:8765/path/ --pages index.html,concept-two.html,presentation.html");
  process.exit(2);
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Users/jackjesse/.cache/puppeteer/chrome/mac_arm-127.0.6533.88/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
].filter(Boolean);
const chromePath = chromeCandidates.find(existsSync);
if (!chromePath) {
  console.error("Chrome not found. Set CHROME_PATH to a Chrome or Chromium executable.");
  process.exit(2);
}

const profile = mkdtempSync("/tmp/mergeforge-preflight-");
const chrome = spawn(chromePath, [
  "--headless",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: "ignore" });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function json(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await wait(100);
  }
  throw new Error(`Could not reach ${url}`);
}

async function debuggingPort(attempts = 60) {
  const path = join(profile, "DevToolsActivePort");
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (existsSync(path)) return Number.parseInt(readFileSync(path, "utf8").split("\n")[0], 10);
    await wait(100);
  }
  throw new Error("Chrome did not publish a debugging port");
}

class CDP {
  constructor(url) {
    this.nextId = 0;
    this.pending = new Map();
    this.events = new Map();
    this.socket = new WebSocket(url);
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
        return;
      }
      const listeners = this.events.get(message.method) || [];
      this.events.set(message.method, []);
      listeners.forEach(resolve => resolve(message.params));
    });
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  once(method) {
    return new Promise(resolve => {
      const listeners = this.events.get(method) || [];
      listeners.push(resolve);
      this.events.set(method, listeners);
    });
  }
}

const audit = `(() => {
  const h1 = document.querySelector('h1');
  const h1Style = h1 ? getComputedStyle(h1) : null;
  const lineHeight = h1Style ? parseFloat(h1Style.lineHeight) || parseFloat(h1Style.fontSize) : 1;
  const firstSection = document.querySelector('main > section:first-child');
  const primaryCta = firstSection?.querySelector('a[class*="primary"], a[class*="cta"], .actions a:first-child, .hero-cta');
  const header = document.querySelector('header');
  const title = document.title.trim();
  const description = document.querySelector('meta[name="description"]')?.content.trim() || '';
  const isPresentation = /presentation/i.test(location.pathname) || document.querySelector('.viewer');
  return {
    h1Count: document.querySelectorAll('h1').length,
    h1Lines: h1 ? Math.round(h1.getBoundingClientRect().height / lineHeight) : 0,
    ctaVisible: !primaryCta || primaryCta.getBoundingClientRect().bottom <= innerHeight + 2,
    overflow: document.documentElement.scrollWidth > innerWidth + 2,
    headerHeight: header?.getBoundingClientRect().height || 0,
    brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).length,
    missingAlt: [...document.images].filter(image => !image.hasAttribute('alt')).length,
    visibleDashes: (document.body.innerText.match(/[—–]/g) || []).length,
    scrollListeners: [...document.scripts].some(script => /addEventListener\\s*\\(\\s*['\"]scroll['\"]/.test(script.textContent)),
    titleLength: title.length,
    descriptionLength: description.length,
    schemaCount: document.querySelectorAll('script[type="application/ld+json"]').length,
    robots: document.querySelector('meta[name="robots"]')?.content || '',
    isPresentation,
    conceptCards: document.querySelectorAll('[data-concept]').length
  };
})()`;

const failures = [];
let cdp;
try {
  const port = await debuggingPort();
  const tabs = await json(`http://127.0.0.1:${port}/json/list`);
  cdp = new CDP(tabs[0].webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const modes = [
    { name: "desktop", width: 1440, height: 900, mobile: false },
    { name: "mobile", width: 390, height: 844, mobile: true }
  ];
  for (const page of pages) {
    for (const mode of modes) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: mode.width,
        height: mode.height,
        deviceScaleFactor: 1,
        mobile: mode.mobile
      });
      await cdp.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }]
      });
      const loaded = cdp.once("Page.loadEventFired");
      await cdp.send("Page.navigate", { url: new URL(page, base).href });
      await loaded;
      await wait(150);
      const evaluated = await cdp.send("Runtime.evaluate", { expression: audit, returnByValue: true });
      const report = evaluated.result.value;
      const issues = [];
      if (report.h1Count !== 1) issues.push(`h1=${report.h1Count}`);
      if (!mode.mobile && report.h1Lines > 2) issues.push(`h1-lines=${report.h1Lines}`);
      if (!report.ctaVisible) issues.push("hero-cta-below-fold");
      if (report.overflow) issues.push("horizontal-overflow");
      if (!mode.mobile && report.headerHeight > 80.5) issues.push(`header-height=${Math.round(report.headerHeight)}`);
      if (report.brokenImages) issues.push(`broken-images=${report.brokenImages}`);
      if (report.missingAlt) issues.push(`missing-alt-attribute=${report.missingAlt}`);
      if (report.visibleDashes) issues.push(`visible-dashes=${report.visibleDashes}`);
      if (report.scrollListeners) issues.push("scroll-event-listener");
      if (!report.titleLength || report.titleLength > 65) issues.push(`title-length=${report.titleLength}`);
      if (!report.descriptionLength || report.descriptionLength > 165) issues.push(`description-length=${report.descriptionLength}`);
      if (report.isPresentation) {
        if (!/noindex/i.test(report.robots)) issues.push("presentation-not-noindex");
        if (report.conceptCards !== 5) issues.push(`concept-cards=${report.conceptCards}`);
      } else if (!report.schemaCount) issues.push("missing-json-ld");
      if (issues.length) failures.push(`${page} [${mode.name}]: ${issues.join(", ")}`);
    }
  }
} finally {
  cdp?.socket.close();
  chrome.kill("SIGTERM");
  await wait(250);
  rmSync(profile, { recursive: true, force: true });
}

if (failures.length) {
  failures.forEach(failure => console.error(failure));
  process.exitCode = 1;
} else {
  console.log(`Passed ${pages.length} pages at desktop and mobile sizes.`);
}
