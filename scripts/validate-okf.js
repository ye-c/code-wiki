#!/usr/bin/env node
// code-wiki OKF v0.1 合规校验
// JSON-flow YAML 子集手写解析器（零依赖）
// 8 项检查：frontmatter 存在 / type 非空 / index 结构 / log 结构 / 推荐字段 / 未知 type / 断链 / 绝对路径

'use strict';

const fs = require('fs');
const path = require('path');

// --- JSON-flow YAML 子集解析器 ---
// 支持标量、列表（[a,b,c] 或多行 - item）、简单 map（{a:1,b:2}）
// 不支持：多行字符串 |/>、anchors &/*、tags !、复杂嵌套

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  return parseYamlSubset(match[1]);
}

function parseYamlSubset(text) {
  const result = {};
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1];
    let val = m[2].trim();
    if (val === '') {
      // 多行列表
      const items = [];
      i++;
      while (i < lines.length && lines[i].match(/^\s*-\s+/)) {
        items.push(lines[i].replace(/^\s*-\s+/, '').trim());
        i++;
      }
      result[key] = items;
      continue;
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      result[key] = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else if (val.startsWith('{') && val.endsWith('}')) {
      const obj = {};
      val.slice(1, -1).split(',').forEach(pair => {
        const pm = pair.match(/^\s*(\w+):\s*(.*)$/);
        if (pm) obj[pm[1]] = pm[2].trim();
      });
      result[key] = obj;
    } else if (val === 'true' || val === 'false') {
      result[key] = val === 'true';
    } else if (/^-?\d+$/.test(val)) {
      result[key] = parseInt(val, 10);
    } else {
      result[key] = val.replace(/^["']|["']$/g, '');
    }
    i++;
  }
  return result;
}

// --- 校验逻辑 ---

const RESERVED_FILES = new Set(['index.md', 'log.md']);
const VALID_TYPES = new Set(['Domain', 'Concept', 'Index', 'Convention', 'Flow', 'ADR', 'StateMap']);
const RECOMMENDED_FIELDS = ['title', 'description', 'resource', 'tags', 'timestamp'];

function walkMd(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMd(full));
    } else if (entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function collectLinks(content, wikiRoot, filePath) {
  const links = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const target = m[2];
    if (target.startsWith('http')) continue;
    const resolved = target.startsWith('/')
      ? path.join(wikiRoot, target.slice(1))
      : path.resolve(path.dirname(filePath), target);
    links.push({ text: m[1], target, resolved });
  }
  return links;
}

function validateWiki(wikiRoot) {
  const errors = [];
  const warnings = [];
  const infos = [];
  const files = walkMd(wikiRoot);
  let conceptCount = 0;
  const allLinks = [];

  for (const file of files) {
    const rel = path.relative(wikiRoot, file);
    const content = fs.readFileSync(file, 'utf8');
    const isReserved = RESERVED_FILES.has(path.basename(file));

    if (isReserved) {
      // index.md / log.md 结构检查
      if (path.basename(file) === 'index.md') {
        const fm = parseFrontmatter(content);
        if (!fm) errors.push(`${rel}: index.md missing frontmatter`);
      }
      if (path.basename(file) === 'log.md') {
        const dateRe = /^## (\d{4}-\d{2}-\d{2})$/m;
        if (!dateRe.test(content)) errors.push(`${rel}: log.md date heading not ISO 8601`);
      }
      continue;
    }

    conceptCount++;
    const fm = parseFrontmatter(content);
    if (!fm) { errors.push(`${rel}: missing frontmatter`); continue; }
    if (!fm.type) { errors.push(`${rel}: missing 'type' field`); continue; }

    if (!VALID_TYPES.has(fm.type)) {
      warnings.push(`${rel}: unknown type '${fm.type}'`);
    }

    for (const f of RECOMMENDED_FIELDS) {
      if (!(f in fm)) warnings.push(`${rel}: missing '${f}' field`);
    }

    allLinks.push(...collectLinks(content, wikiRoot, file).map(l => ({ ...l, from: rel })));
  }

  // 断链
  for (const link of allLinks) {
    if (!fs.existsSync(link.resolved)) {
      warnings.push(`${link.from}: broken link → ${link.target}`);
    } else if (!link.target.startsWith('/')) {
      infos.push(`${link.from}: relative link '${link.target}' (OKF recommends absolute)`);
    }
  }

  return { errors, warnings, infos, conceptCount };
}

function formatReport({ errors, warnings, infos, conceptCount }) {
  const lines = [];
  lines.push('# OKF Conformance Check');
  lines.push('');
  lines.push(`✓ ${conceptCount} concepts, ${errors.length} errors`);
  if (warnings.length) {
    lines.push(`⚠ ${warnings.length} warnings:`);
    warnings.forEach(w => lines.push(`  - ${w}`));
  }
  if (infos.length) {
    lines.push(`ℹ ${infos.length} info:`);
    infos.forEach(i => lines.push(`  - ${i}`));
  }
  lines.push('');
  lines.push(`Conformant: ${errors.length === 0 ? 'YES' : 'NO'} (${errors.length} errors)`);
  return lines.join('\n');
}

// --- CLI ---
function main() {
  const wikiRoot = process.argv[2];
  if (!wikiRoot) {
    console.error('Usage: validate-okf.js <wiki-root>');
    process.exit(2);
  }
  if (!fs.existsSync(wikiRoot)) {
    console.error(`Not found: ${wikiRoot}`);
    process.exit(2);
  }
  const result = validateWiki(wikiRoot);
  console.log(formatReport(result));
  process.exit(result.errors.length === 0 ? 0 : 1);
}

// --- 自检（Ponytail：一个 runnable check）---
function selfCheck() {
  const tmp = path.join(__dirname, '..', '.wiki-test');
  if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  fs.mkdirSync(path.join(tmp, 'core'), { recursive: true });

  // 合规 concept
  fs.writeFileSync(path.join(tmp, 'core', 'good.md'),
    '---\n' +
    'type: Concept\ntitle: Good\ndescription: ok\nresource: src/\ntags: [core]\ntimestamp: 2026-07-21\n' +
    '---\n\n# Key Files\n\n- `src/foo.ts`\n');
  // 缺 frontmatter
  fs.writeFileSync(path.join(tmp, 'core', 'bad.md'), '# No frontmatter\n');
  // 缺 type
  fs.writeFileSync(path.join(tmp, 'core', 'notype.md'),
    '---\ntitle: NoType\n---\n\nbody\n');
  // 断链
  fs.writeFileSync(path.join(tmp, 'core', 'broken.md'),
    '---\ntype: Concept\ntitle: Broken\n---\n\n[missing](/missing/page.md)\n');
  // index.md
  fs.writeFileSync(path.join(tmp, 'index.md'),
    '---\nokf_version: "0.1"\ngenerator: code-wiki\nsync_commit: abc1234\n---\n\n# Wiki\n\n* [Good](core/good.md)\n');

  const result = validateWiki(tmp);
  const expectedErrors = 2; // bad.md + notype.md
  const expectedWarnings = 1; // broken link (good.md has all recommended fields, bad.md has no fm so no field warnings, notype.md missing 4 recommended)

  const pass = result.errors.length === expectedErrors && result.warnings.length >= expectedWarnings;
  console.log(`self-check: ${pass ? 'PASS' : 'FAIL'} (${result.errors.length} errors, ${result.warnings.length} warnings)`);
  if (!pass) {
    console.log(formatReport(result));
    process.exit(1);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (process.argv[1] && process.argv[1].endsWith('validate-okf.js')) {
  if (process.argv[2] === 'self-check') {
    selfCheck();
  } else {
    main();
  }
}

module.exports = { parseFrontmatter, validateWiki, formatReport };
