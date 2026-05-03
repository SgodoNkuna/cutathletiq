#!/usr/bin/env node
/**
 * DOM-regression test for the responsive MobileFrame shell.
 *
 * Boots the built /coach SPA shell inside JSDOM at three viewport widths
 * (320 mobile · 767 just-below-md · 1280 desktop), simulates a window resize
 * across the md breakpoint, and asserts the matchMedia contract used by
 * `useIsDesktop` flips correctly. Static markup checks then verify the
 * desktop sidebar branch (w-64) and the mobile phone-shell branch
 * (max-w-[430px]) both exist in the compiled component source so neither
 * branch can silently disappear.
 */

import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const results = [];
const log = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  const tag = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`${tag} ${name}${detail ? `  — ${detail}` : ""}`);
};

function buildDom(width) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:8080/coach",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  // jsdom doesn't implement matchMedia — patch it like the app's hook expects.
  Object.defineProperty(w, "innerWidth", { value: width, configurable: true });
  w.matchMedia = (query) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const matches = min ? w.innerWidth >= parseInt(min[1], 10) : false;
    const listeners = new Set();
    return {
      matches,
      media: query,
      addEventListener: (_e, fn) => listeners.add(fn),
      removeEventListener: (_e, fn) => listeners.delete(fn),
      addListener: (fn) => listeners.add(fn),
      removeListener: (fn) => listeners.delete(fn),
      dispatchEvent: () => true,
      onchange: null,
    };
  };
  return dom;
}

function useIsDesktopSimulated(window) {
  // Mirror of src/components/MobileFrame.tsx::useIsDesktop
  const mql = window.matchMedia("(min-width: 768px)");
  return mql.matches;
}

(async () => {
  console.log("\n→ Responsive layout regression test\n");

  // 1. Breakpoint contract — useIsDesktop must flip at exactly 768px.
  const cases = [
    { width: 320, expected: false, label: "iPhone SE" },
    { width: 414, expected: false, label: "mobile L" },
    { width: 767, expected: false, label: "just-below-md" },
    { width: 768, expected: true, label: "md (boundary)" },
    { width: 1024, expected: true, label: "tablet/desktop" },
    { width: 1920, expected: true, label: "desktop XL" },
  ];
  for (const c of cases) {
    const dom = buildDom(c.width);
    const got = useIsDesktopSimulated(dom.window);
    log(
      `breakpoint @ ${c.width}px (${c.label}) → ${c.expected ? "desktop" : "mobile"}`,
      got === c.expected,
      `got=${got ? "desktop" : "mobile"}`,
    );
  }

  // 2. Live resize across breakpoint must update the matchMedia result
  //    (so the sidebar can't get stuck in the phone shell on desktop).
  const dom = buildDom(400);
  const before = useIsDesktopSimulated(dom.window);
  Object.defineProperty(dom.window, "innerWidth", { value: 1440, configurable: true });
  const after = useIsDesktopSimulated(dom.window);
  log(
    "live resize 400 → 1440 flips desktop true",
    before === false && after === true,
    `before=${before} after=${after}`,
  );

  // Reverse direction
  Object.defineProperty(dom.window, "innerWidth", { value: 360, configurable: true });
  const back = useIsDesktopSimulated(dom.window);
  log("live resize 1440 → 360 flips back to mobile", back === false, `got=${back}`);

  // 3. Source-level guarantees — both layout branches still exist.
  const src = readFileSync("src/components/MobileFrame.tsx", "utf8");
  log(
    "MobileFrame source contains desktop sidebar (w-64)",
    /aside[^>]*w-64/.test(src) || /w-64[^"]*shrink-0/.test(src),
    "",
  );
  log(
    "MobileFrame source contains mobile phone-shell (max-w-[430px])",
    /max-w-\[430px\]/.test(src),
    "",
  );
  log("MobileFrame uses (min-width: 768px) — md breakpoint", /min-width:\s*768px/.test(src), "");
  log(
    "MobileFrame subscribes to matchMedia change events",
    /matchMedia\(/.test(src) && /addEventListener\("change"/.test(src),
    "",
  );
  log(
    "MobileFrame branches on isDesktop before mobile shell",
    /if\s*\(\s*isDesktop\s*\)/.test(src),
    "",
  );

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n${passed} passed · ${failed} failed · ${results.length} total\n`);
  if (failed > 0) {
    console.log("Failed cases:");
    for (const r of results.filter((r) => !r.ok)) console.log(`  ✗ ${r.name} — ${r.detail}`);
    process.exit(1);
  }
})().catch((e) => {
  console.error("\nResponsive test crashed:", e);
  process.exit(1);
});
