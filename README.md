# RIDDHI CHASHMA GHAR

A mobile-first optical shop management app built with plain HTML, CSS, and JavaScript. It stores data in browser localStorage, keeps the legacy app flow compatible, and adds a safe migration layer before redesigning the order-prescription-payment workflow.

## Features
- Customer management
- Prescription tracking
- Invoice and payment flow
- Dashboard analytics and reminders
- Safe backup and schema migration support
- Responsive layout tuned for mobile screens

## Run locally
1. Open `index.html` directly in the browser, or
2. Serve the folder from a local web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Scripts
```bash
npm install
npm test
npm run migrate:dry-run
npm run migrate
npm run backup
```

## Data safety
This project keeps a backup-first workflow and schema metadata so data can be migrated without losing legacy records. See the docs folder for the migration and assumptions notes.

## Project structure
- `index.html`, `dashboard.html`, `customers.html`, `prescriptions.html`, `billing.html`, `analytics.html`, `settings.html`
- `css/` for styling
- `js/` for browser logic
- `scripts/` for migration and backup utilities
- `docs/` for design and migration documentation
- `tests/` for automated migration validation
