import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackupPayload } from './migration-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupDir = path.join(rootDir, 'backups');
const dataFile = path.join(rootDir, 'data', 'local-store.json');

fs.mkdirSync(backupDir, { recursive: true });

const snapshot = fs.existsSync(dataFile)
  ? JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  : {
      schema: { schema_version: 0 },
      customers: [],
      prescriptions: [],
      invoices: [],
      appSettings: {},
      session: { isLoggedIn: false },
      activityLog: []
    };

const payload = createBackupPayload(snapshot);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
fs.writeFileSync(backupFile, JSON.stringify(payload, null, 2));
console.log(`Backup created at ${backupFile}`);
