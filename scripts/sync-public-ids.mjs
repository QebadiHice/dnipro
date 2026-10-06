import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const anchorPath = path.join(root, 'Anchor.toml');
const sdkPath = path.join(root, 'sdk/src/constants/index.ts');

if (!fs.existsSync(anchorPath) || !fs.existsSync(sdkPath)) {
  throw new Error('Run this command from the Dnipro repository root.');
}

function parseAnchorIds(source) {
  const section = source.match(/\[programs\.localnet\]([\s\S]*?)(?:\n\[|$)/)?.[1];
  if (!section) throw new Error('Could not find [programs.localnet] in Anchor.toml');

  const ids = {};
  for (const line of section.split('\n')) {
    const m = line.match(/^\s*([a-zA-Z0-9_]+)\s*=\s*"([1-9A-HJ-NP-Za-km-z]+)"/);
    if (m) ids[m[1]] = m[2];
  }
  return ids;
}

function parseCurrentSdkIds(source) {
  const get = (re, label) => {
    const value = source.match(re)?.[1];
    if (!value) throw new Error(`Could not read current ${label} ID from SDK constants.`);
    return value;
  };
  return {
    dispatcher: get(/DISPATCHER_PROGRAM_ID[\s\S]*?new PublicKey\(\s*'([^']+)'\s*\)/, 'dispatcher'),
    registry: get(/REGISTRY_PROGRAM_ID[\s\S]*?new PublicKey\(\s*'([^']+)'\s*\)/, 'registry'),
    kamino_adapter: get(/kamino:\s*new PublicKey\('([^']+)'\)/, 'kamino adapter'),
    marginfi_adapter: get(/marginfi:\s*new PublicKey\('([^']+)'\)/, 'marginfi adapter'),
    jupiter_adapter: get(/jupiter:\s*new PublicKey\('([^']+)'\)/, 'jupiter adapter'),
    maple_adapter: get(/maple:\s*new PublicKey\('([^']+)'\)/, 'maple adapter'),
    drift_adapter: get(/drift:\s*new PublicKey\('([^']+)'\)/, 'drift adapter'),
  };
}

const anchorIds = parseAnchorIds(fs.readFileSync(anchorPath, 'utf8'));
const oldIds = parseCurrentSdkIds(fs.readFileSync(sdkPath, 'utf8'));
const required = ['dispatcher', 'registry', 'kamino_adapter', 'marginfi_adapter', 'jupiter_adapter', 'maple_adapter', 'drift_adapter'];

for (const key of required) {
  if (!anchorIds[key]) throw new Error(`Anchor.toml is missing ${key}. Run anchor keys sync first.`);
}

const replacements = Object.fromEntries(required.map(key => [oldIds[key], anchorIds[key]]));
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.rs', '.md', '.toml', '.json']);
const ignored = new Set(['node_modules', '.git', '.next', 'target', 'dist']);
let changed = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!allowedExtensions.has(path.extname(entry.name))) continue;

    let source = fs.readFileSync(full, 'utf8');
    let next = source;
    for (const [from, to] of Object.entries(replacements)) {
      if (from !== to) next = next.split(from).join(to);
    }
    if (next !== source) {
      fs.writeFileSync(full, next);
      changed += 1;
    }
  }
}

walk(root);

console.log('Dnipro public program IDs synced from Anchor.toml:');
for (const key of required) console.log(`  ${key.padEnd(18)} ${anchorIds[key]}`);
console.log(`Updated ${changed} file(s). Private keypair files were not copied or committed.`);
