#!/usr/bin/env node
/**
 * Renders the home hero's generated venue art to public/images/hero-1.jpg
 * (Aurora: a convention campus at dusk) and hero-2.jpg (The Foundry: a
 * decommissioned steel works). Text-free, no people, subject right of centre
 * because the headline sits over the left ~55%. Deterministic: no randomness.
 *
 *   node scripts/hero-art.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const W = 2400;
const H = 1200;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');

const stars = Array.from({ length: 90 }, (_, i) => {
  const x = (i * 977) % W;
  const y = (i * 389) % 520;
  return `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.7}" fill="#fff" opacity="${0.25 + (i % 5) * 0.12}"/>`;
}).join('');

const windows = (x0, y0, cols, rows, dx, dy, w, h, fill, every = 3) => {
  let out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if ((r * 7 + c * 3) % every === 0) continue;
    out += `<rect x="${x0 + c * dx}" y="${y0 + r * dy}" width="${w}" height="${h}" fill="${fill}" opacity="${0.55 + ((r + c) % 3) * 0.15}"/>`;
  }
  return out;
};

const aurora = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b0f2e"/><stop offset=".45" stop-color="#3b2a7a"/>
      <stop offset=".72" stop-color="#c2527a"/><stop offset="1" stop-color="#f4a261"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7dd3fc" stop-opacity=".9"/><stop offset="1" stop-color="#6d28d9" stop-opacity=".8"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fde68a" stop-opacity=".7"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${stars}
  <circle cx="1500" cy="800" r="420" fill="url(#glow)"/>
  <!-- distant skyline -->
  <g fill="#2a1d5e" opacity=".85">
    <rect x="0" y="760" width="220" height="440"/><rect x="240" y="700" width="140" height="500"/>
    <rect x="400" y="790" width="260" height="410"/><rect x="2060" y="720" width="180" height="480"/>
    <rect x="2260" y="780" width="160" height="420"/>
  </g>
  <!-- the convention hall: a long glass atrium with a swept roof -->
  <g>
    <path d="M1000 760 Q1500 520 2000 760 L2000 1000 L1000 1000 Z" fill="url(#glass)"/>
    <path d="M1000 760 Q1500 520 2000 760" fill="none" stroke="#e0e7ff" stroke-width="10"/>
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${1000 + i * 100}" y1="${700 - Math.sin((i / 10) * Math.PI) * 190 + 60}" x2="${1000 + i * 100}" y2="1000" stroke="#e0e7ff" stroke-opacity=".55" stroke-width="4"/>`).join('')}
    <rect x="1000" y="860" width="1000" height="6" fill="#e0e7ff" opacity=".5"/>
    <rect x="1120" y="1000" width="760" height="60" fill="#1e1b4b"/>
    <rect x="1040" y="940" width="920" height="30" fill="#fde68a" opacity=".55"/>
  </g>
  <!-- tower -->
  <g>
    <rect x="1840" y="330" width="170" height="670" fill="#312e81"/>
    ${windows(1858, 360, 5, 18, 30, 34, 16, 20, '#fde68a')}
  </g>
  <!-- plaza and foreground -->
  <rect y="1000" width="${W}" height="200" fill="#120d33"/>
  <path d="M0 1070 Q1200 1010 2400 1070 L2400 1200 L0 1200 Z" fill="#0b0821"/>
  <g fill="#fde68a" opacity=".85">
    ${Array.from({ length: 9 }, (_, i) => `<circle cx="${900 + i * 160}" cy="1040" r="9"/>`).join('')}
  </g>
</svg>`;

const foundry = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c1917"/><stop offset=".5" stop-color="#7c2d12"/>
      <stop offset=".85" stop-color="#ea580c"/><stop offset="1" stop-color="#fbbf24"/>
    </linearGradient>
    <radialGradient id="furnace" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fbbf24" stop-opacity=".9"/><stop offset="1" stop-color="#ea580c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <g opacity=".5">${stars}</g>
  <circle cx="1560" cy="860" r="460" fill="url(#furnace)"/>
  <!-- smoke -->
  <g fill="#292524" opacity=".55">
    <ellipse cx="1720" cy="230" rx="260" ry="70"/><ellipse cx="1900" cy="150" rx="320" ry="60"/>
    <ellipse cx="1560" cy="300" rx="200" ry="50"/>
  </g>
  <!-- chimneys -->
  <g fill="#1c1917">
    <rect x="1640" y="260" width="80" height="700"/><rect x="1636" y="250" width="88" height="24"/>
    <rect x="1790" y="340" width="64" height="620"/><rect x="1786" y="330" width="72" height="20"/>
    <rect x="2120" y="420" width="70" height="540"/><rect x="2116" y="410" width="78" height="20"/>
  </g>
  <!-- sawtooth-roofed works -->
  <g fill="#292524">
    <path d="M1000 960 L1000 700 L1160 620 L1160 700 L1320 620 L1320 700 L1480 620 L1480 700 L1640 620 L1640 960 Z"/>
    <path d="M1860 960 L1860 640 L2020 560 L2020 640 L2180 560 L2180 960 Z"/>
    <rect x="1000" y="840" width="1200" height="120" fill="#1c1917"/>
  </g>
  <g fill="#fbbf24">
    ${Array.from({ length: 9 }, (_, i) => `<rect x="${1030 + i * 130}" y="${760}" width="64" height="130" opacity="${0.5 + (i % 3) * 0.2}"/>`).join('')}
  </g>
  <!-- gantry crane -->
  <g stroke="#0c0a09" stroke-width="12" fill="none">
    <path d="M900 960 L900 520 L2250 520 L2250 960"/><path d="M900 520 L1100 700 M2250 520 L2050 700"/>
    <line x1="1500" y1="520" x2="1500" y2="760" stroke-width="6"/>
  </g>
  <rect x="1470" y="750" width="60" height="40" fill="#0c0a09"/>
  <!-- ground and rails -->
  <rect y="960" width="${W}" height="240" fill="#0c0a09"/>
  <g stroke="#78350f" stroke-width="8"><line x1="0" y1="1040" x2="${W}" y2="1040"/><line x1="0" y1="1100" x2="${W}" y2="1100"/></g>
  <g stroke="#451a03" stroke-width="10">${Array.from({ length: 40 }, (_, i) => `<line x1="${i * 64}" y1="1030" x2="${i * 64 - 40}" y2="1110"/>`).join('')}</g>
</svg>`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [name, svg] of [['hero-1.jpg', aurora], ['hero-2.jpg', foundry]]) {
  await page.setContent(`<style>html,body{margin:0}</style>${svg}`);
  await page.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 72 });
  console.log('wrote', name);
}
await browser.close();
