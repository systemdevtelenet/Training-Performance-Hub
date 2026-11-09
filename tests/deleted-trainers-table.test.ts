import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoots = ['app', 'lib', 'scripts', 'scratch'];
const query = /\.from\s*\(\s*['"]trainers['"]\s*\)/;
const references: string[] = [];

function visit(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && query.test(readFileSync(path, 'utf8'))) references.push(path);
  }
}

for (const root of sourceRoots) visit(root);

assert.deepEqual(references, [], `Removed public.trainers table is still queried in: ${references.join(', ')}`);
console.log('No application or import code queries the deleted public.trainers table.');
