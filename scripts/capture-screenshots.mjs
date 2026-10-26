import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.resolve(process.cwd(), "screenshots");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PAGES = [
  { name: "01-dashboard", path: "/" },
  { name: "02-inventory", path: "/inventory" },
  { name: "03-sku-detail", path: "/inventory/CER-MUG-COB" },
  { name: "04-bundles", path: "/bundles" },
  { name: "05-connect", path: "/connect" },
];

async function run() {
  console.log(`Connecting to ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });

  let hasOverflow = false;

  for (const p of PAGES) {
    const url = `${BASE_URL}${p.path}`;
    console.log(`\n--- Testing ${p.name} (${url}) ---`);

    // 1. Desktop 1440px
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      const filePath = path.join(OUTPUT_DIR, `${p.name}-1440.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Saved desktop: ${filePath}`);
      await context.close();
    }

    // 2. Mobile 390px (iPhone viewport simulation)
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      const metrics = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const innerWidth = window.innerWidth;

        // Find elements that overflow beyond 390px
        const overflowElements = [];
        const all = document.querySelectorAll("*");
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > 390.5 || el.scrollWidth > 390.5) {
            // Check if this element is an intentionally scrollable container
            const style = window.getComputedStyle(el);
            const isScrollable = style.overflowX === "auto" || style.overflowX === "scroll";
            if (!isScrollable && rect.right > 390.5) {
              overflowElements.push({
                tag: el.tagName,
                className: (el.className || "").toString().slice(0, 80),
                rectRight: Math.round(rect.right),
                rectWidth: Math.round(rect.width),
              });
            }
          }
        }

        return {
          docScrollWidth,
          bodyScrollWidth,
          innerWidth,
          overflowElements: overflowElements.slice(0, 5),
        };
      });

      console.log(
        `Mobile check for ${p.name}: window=${metrics.innerWidth}px, docScrollWidth=${metrics.docScrollWidth}px, bodyScrollWidth=${metrics.bodyScrollWidth}px`
      );

      if (metrics.docScrollWidth > 390) {
        console.error(
          `❌ OVERFLOW DETECTED on ${p.name}: docScrollWidth=${metrics.docScrollWidth}px > 390px`
        );
        console.error("Offending elements:", metrics.overflowElements);
        hasOverflow = true;
      } else {
        console.log(`✅ ${p.name} mobile layout fits within 390px perfectly!`);
      }

      const filePath = path.join(OUTPUT_DIR, `${p.name}-390.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Saved mobile: ${filePath}`);
      await context.close();
    }
  }

  await browser.close();

  if (hasOverflow) {
    console.error("\n❌ Some pages have horizontal overflow on 390px viewport!");
    process.exit(1);
  } else {
    console.log("\n🎉 All 5 pages pass 390px scrollWidth <= 390 assertion and screenshots saved!");
  }
}

run().catch((err) => {
  console.error("Failed to run screenshot capture:", err);
  process.exit(1);
});
