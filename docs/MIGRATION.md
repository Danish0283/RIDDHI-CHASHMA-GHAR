# Migration and data safety guide

## Goal
Preserve the legacy browser-based localStorage dataset while introducing a schema version marker and a safer, mobile-first redesign path.

## Current storage model
The app stores data in browser localStorage under keys such as:
- `customers`
- `prescriptions`
- `invoices`
- `appSettings`
- `session`
- `activityLog`
- `schema_meta`

## Schema versioning
The migration layer adds a `schema` object with a `schema_version` value and migration timestamps. The current baseline is:

```json
{
  "schema": {
    "schema_version": 1,
    "migrated_at": "ISO-8601 timestamp",
    "last_migration": "ISO-8601 timestamp"
  }
}
```

## Migration behavior
The base migration step:
- normalizes customer mobile numbers
- preserves legacy customer, prescription, and invoice records
- adds missing metadata timestamps without mutating the original snapshot in dry-run mode
- keeps the system compatible with the existing ID-driven flow

The migration is intentionally additive and backward-safe. It does not delete or rewrite old data automatically unless the app is explicitly allowed to apply the migration.

## Backup workflow
Use either of the following:
- `npm run backup`
- the Backup Database button inside the settings page

The backup file is stored in the `backups/` folder and contains the same localStorage payload with the schema metadata included.

## Dry-run validation
Before changing the live browser data, run:

```bash
npm run migrate:dry-run
```

This reports:
- version before and after
- record counts before and after
- migration actions applied
- whether data would be rewritten

## Browser app hook
The migration logic is loaded into each HTML page through `js/migration-core.js` and initialized from the shared auth/bootstrap flow. This keeps the app safe when pages load and ensures the schema is normalized before business logic runs.

## Important note
The current migration is a compatibility layer for the old system. It is designed to support the redesign, not replace the established localStorage business rules in one step.
