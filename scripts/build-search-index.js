#!/usr/bin/env node
/**
 * bos-nepali-date — Search index build script
 *
 * Reads all HTML pages from docs/, extracts text by heading sections,
 * and writes docs/search-index.json consumed by search.js.
 *
 * Usage:  node scripts/build-search-index.js
 *         (or via npm:  npm run docs:build-index)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs');
const OUT = join(DOCS, 'search-index.json');

// ── Page config: file → { url, label } ──
const PAGES = [
  { file: 'index.html',        url: '/',                  label: 'Home' },
  { file: 'documentation.html', url: '/documentation.html', label: 'Documentation' },
  { file: 'roadmap.html',      url: '/roadmap.html',       label: 'Roadmap' },
  { file: 'changelogs.html',   url: '/changelogs.html',    label: 'Changelogs' },
];

// ── Helpers ──

/** Strip HTML tags, keep text, collapse whitespace */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Naive but effective HTML section parser.
 * Splits by headings (<h2>, <h3> with id), collects text between them.
 */
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

function extractSections(html, pageUrl, pageLabel) {
  const sections = [];

  // Collect all heading positions with their id, text, and level
  // Handles both with-id and without-id headings, plus h2/h3
  const headingRegex = /<h([23])([^>]*)>([\s\S]*?)<\/h[23]>/gi;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const attrs = match[2];
    const content = match[3];
    const idMatch = attrs.match(/id="([^"]+)"/);
    const id = idMatch ? idMatch[1] : slugify(stripHtml(content));
    headings.push({
      level: parseInt(match[1], 10),
      id: id,
      text: stripHtml(content),
      start: match.index,
    });
  }

  if (headings.length === 0) {
    // No headings found — use whole body as single section
    const body = html.match(/<main[\s\S]*?<\/main>/i);
    if (body) {
      const text = stripHtml(body[0]);
      if (text.length > 30) {
        sections.push({ t: pageLabel, u: pageUrl, p: pageLabel, c: text });
      }
    }
    return sections;
  }

  // Extract content for each heading
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const nextStart = i + 1 < headings.length ? headings[i + 1].start : html.length;

    // Get text between this heading and the next
    const between = html.substring(h.start, nextStart);
    const text = stripHtml(between);

    if (text.length > 20) {
      sections.push({
        t: h.text,
        u: `${pageUrl}#${h.id}`,
        p: pageLabel,
        c: text,
      });
    }
  }

  return sections;
}

// ── Main ──

function main() {
  const allSections = [];

  for (const page of PAGES) {
    const path = join(DOCS, page.file);
    if (!existsSync(path)) {
      console.warn(`⚠  Skipping — ${page.file} not found`);
      continue;
    }
    const html = readFileSync(path, 'utf-8');
    const sections = extractSections(html, page.url, page.label);
    allSections.push(...sections);
    console.log(`  ✓ ${page.file} → ${sections.length} sections`);
  }

  writeFileSync(OUT, JSON.stringify(allSections, null, 2), 'utf-8');
  console.log(`\n✅ Written ${allSections.length} search entries to search-index.json`);
}

main();
