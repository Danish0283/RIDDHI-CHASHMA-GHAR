import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMigrations, createBackupPayload } from './migration-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataFile = path.join(rootDir, 'data', 'local-store.json');
const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(dataFile)) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify({
    schema: { schema_version: 0 },
    customers: [],
    prescriptions: [],
    invoices: [],
    appSettings: {},
    session: { isLoggedIn: false },
    activityLog: []
  }, null, 2));
}

const original = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const result = applyMigrations(original, { dryRun });
const report = result._migrationReport;

console.log('Migration report');
console.log(JSON.stringify({
  dryRun,
  versionBefore: report.versionBefore,
  versionAfter: report.versionAfter,
  countsBefore: report.before,
  countsAfter: report.after,
  applied: report.applied
}, null, 2));

if (!dryRun) {
  fs.writeFileSync(dataFile, JSON.stringify(createBackupPayload(result), null, 2));
  console.log(`Schema updated and stored in ${dataFile}`);
} else {
  console.log('Dry run completed; no files were rewritten.');
}
