// Recreates database.sqlite from scratch with seed data. Stop the server first.
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const suffix of ['', '-journal', '-wal', '-shm']) {
  rmSync(join(root, `database.sqlite${suffix}`), { force: true });
}

const { initDatabase } = await import('../db.js');
initDatabase();
console.log('database.sqlite recreated with seed data');
