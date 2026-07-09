#!/usr/bin/env node
/**
 * version-bump.mjs — bump Nexus Architect version across all config files.
 *
 * Usage:
 *   node scripts/version-bump.mjs <new-version>
 *   node scripts/version-bump.mjs 1.1.0
 *
 * Files updated:
 *   nexus-architect.php   (Version header + NEXUS_VERSION constant)
 *   readme.txt            (Stable tag)
 *   package.json          (root workspace version — informational)
 *   apps/builder/package.json
 *   packages/core/package.json
 *   packages/wp-adapter/package.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, '..');

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Usage: node scripts/version-bump.mjs <major.minor.patch>');
  process.exit(1);
}

console.log(`\nBumping Nexus Architect to v${newVersion}\n`);

// ── Helper ────────────────────────────────────────────────────────────────────

function patch(filePath, transform) {
  const abs = resolve(ROOT, filePath);
  const before = readFileSync(abs, 'utf8');
  const after  = transform(before);
  if (before === after) {
    console.log(`  [unchanged] ${filePath}`);
    return;
  }
  writeFileSync(abs, after, 'utf8');
  console.log(`  [updated]   ${filePath}`);
}

// ── nexus-architect.php ────────────────────────────────────────────────────────

patch('nexus-architect.php', (src) => src
  // Plugin header: * Version: X.Y.Z
  .replace(/(\* Version:\s+)\d+\.\d+\.\d+/, `$1${newVersion}`)
  // @version docblock
  .replace(/(@version\s+)\d+\.\d+\.\d+/, `$1${newVersion}`)
  // PHP constant
  .replace(/(define\('NEXUS_VERSION',\s+')\d+\.\d+\.\d+(')/,  `$1${newVersion}$2`)
);

// ── readme.txt ────────────────────────────────────────────────────────────────

patch('readme.txt', (src) => src
  .replace(/(Stable tag:\s+)\d+\.\d+\.\d+/, `$1${newVersion}`)
);

// ── package.json files ────────────────────────────────────────────────────────

[
  'package.json',
  'apps/builder/package.json',
  'packages/core/package.json',
  'packages/wp-adapter/package.json',
].forEach((f) => {
  patch(f, (src) => {
    const obj = JSON.parse(src);
    obj.version = newVersion;
    return JSON.stringify(obj, null, 2) + '\n';
  });
});

console.log(`\n✅  All files updated to v${newVersion}`);
console.log(`   Next steps:`);
console.log(`   1. Review the changes: git diff`);
console.log(`   2. Update CHANGELOG.md with release notes`);
console.log(`   3. git commit -am "chore: bump version to v${newVersion}"`);
console.log(`   4. git tag v${newVersion}`);
console.log(`   5. git push origin main --tags`);
console.log(`   6. .\\build-plugin.ps1  (creates dist/nexus-architect-${newVersion}.zip)\n`);
