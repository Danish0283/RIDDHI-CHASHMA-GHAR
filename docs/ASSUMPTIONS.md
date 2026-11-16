# Assumptions and compatibility notes

## App constraints
- The app remains a static browser project using HTML, CSS, and JavaScript.
- Storage remains localStorage rather than a server-based database.
- The design must keep the legacy data model usable while moving toward a cleaner mobile-first order workflow.
- Existing customer IDs, prescription IDs, and invoice IDs are preserved wherever possible.

## Redesign direction
- The target flow is a single prescription-to-order-to-payment journey.
- The app should feel natural on a mobile phone but remain usable on tablet and desktop.
- The business workflow should be simplified without forcing a full framework migration.

## Compatibility policy
- No legacy records are deleted during migration.
- Backup files are created before destructive or version-changing steps.
- Schema metadata is added as a non-breaking extension to the existing data.
- Duplicate or malformed phone numbers are normalized only when safe and deterministic.

## Operational assumptions
- The shop runs offline or semi-offline with browser-only storage.
- Data exports/imports are handled through JSON backup files.
- A user may continue using the existing dashboard and routes while the redesign is phased in.
- The migration layer is a safety net rather than a one-time migration script that permanently changes the app model.
