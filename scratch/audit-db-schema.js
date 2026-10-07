const fs = require('fs');
const https = require('https');
const path = require('path');

function loadEnv(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, '');
    process.env[key] = value;
  }
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx|sql)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function extractUsedTables(root) {
  const used = new Map();
  const patterns = [
    /\.from\(['"`]([^'"`]+)['"`]\)/g,
    /storage\.from\(['"`]([^'"`]+)['"`]\)/g,
  ];

  const runtimeDirs = ['app', 'components', 'lib', 'utils']
    .map((name) => path.join(root, name))
    .filter((dir) => fs.existsSync(dir));
  const runtimeFiles = runtimeDirs.flatMap((dir) => walk(dir));

  for (const file of runtimeFiles) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text))) {
        const name = match[1];
        if (!used.has(name)) used.set(name, new Set());
        used.get(name).add(rel);
      }
    }
  }
  return used;
}

function fetchOpenApi(base, key) {
  return new Promise((resolve, reject) => {
    https
      .get(
        `${base.replace(/\/$/, '')}/rest/v1/`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            Accept: 'application/openapi+json',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
              return;
            }
            resolve(JSON.parse(data));
          });
        },
      )
      .on('error', reject);
  });
}

async function main() {
  const root = process.cwd();
  loadEnv(path.join(root, '.env.local'));

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('Missing Supabase URL or key in .env.local');

  const openapi = await fetchOpenApi(base, key);
  const liveTables = Object.keys(openapi.paths || {})
    .map((item) => item.replace(/^\//, ''))
    .filter(Boolean)
    .filter((name) => !name.startsWith('rpc/'))
    .sort((a, b) => a.localeCompare(b));

  const used = extractUsedTables(root);
  const usedTables = Array.from(used.keys()).sort((a, b) => a.localeCompare(b));
  const normalizedUsed = new Set(usedTables.map((name) => name.toLowerCase()));
  const unusedLive = liveTables.filter((name) => !normalizedUsed.has(name.toLowerCase()));
  const missingLive = usedTables.filter(
    (name) => !liveTables.some((live) => live.toLowerCase() === name.toLowerCase()),
  );

  console.log('LIVE_TABLES');
  console.log(liveTables.join('\n'));
  console.log('\nUSED_BY_CODE');
  for (const name of usedTables) {
    console.log(`${name}: ${Array.from(used.get(name)).sort().join(', ')}`);
  }
  console.log('\nLIVE_NOT_REFERENCED_BY_CODE');
  console.log(unusedLive.join('\n') || '(none)');
  console.log('\nCODE_REFERENCES_NOT_EXPOSED_AS_LIVE_TABLES');
  console.log(missingLive.join('\n') || '(none)');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
