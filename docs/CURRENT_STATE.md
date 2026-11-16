# Current State of RIDDHI CHASHMA GHAR

## 1) Project stack
- Language: JavaScript (browser-side)
- Framework: none; plain HTML, CSS, and JavaScript
- UI library: custom DOM rendering, no frontend framework
- Routing: static multi-page app using direct HTML files and regular anchor navigation
- Styling: custom CSS in `css/style.css`, `css/responsive.css`, and `css/animations.css`
- Package manager: none detected (`package.json` is absent)
- Build and run: open `index.html` in a browser or serve the folder with a simple static server such as `python -m http.server 8000`

## 2) Data storage
- Storage type: browser `localStorage`
- Data lives in the browser under keys defined in `js/utils.js`:
  - `customers`
  - `prescriptions`
  - `invoices`
  - `appSettings`
  - `session`
  - `activityLog`
- Reads and writes:
  - `getLocalData` / `setLocalData` in `js/utils.js`
  - `saveData`, `getData`, `updateData`, `deleteData` in `js/storage.js`
- No ORM, migration framework, or schema manager exists.
- Data is not persisted to a server or database; the system is offline/local-only.

## 3) Data model and field inventory
### Customers
Stored in the `customers` array. Typical properties include:
- `id`: string, e.g. `CUST-2024-001`
- `name`: string
- `mobile`: string, 10-digit number
- `alternateMobile`: string
- `location`: string
- `dob`: string (date)
- `email`: string
- `gender`: string
- `registrationDate`: string (`DD/MM/YYYY` style as formatted in UI)
- `visits`: array of visit objects
- `totalVisits`: number
- `lastVisitDate`: string
- `notes`: string
- `profileImage`: string

### Prescriptions
Stored in the `prescriptions` array. Typical properties:
- `prescriptionId`: string, generated via `generateId('PRE', ...)`
- `customerId`: string
- `date`: ISO/short date string
- `doctorName`: string
- `distanceVision`: object with `rightEye` and `leftEye`
- `nearVision`: object with `rightEye` and `leftEye`
- `pd`, `pdType`: string/number
- `lensType`, `lensMaterial`, `lensIndex`
- `coatings`, `lensBrand`, `lensColor`, `frameType`
- `notes`
- `createdAt`

### Invoices / bills
Stored in the `invoices` array. Typical properties:
- `invoiceNumber`: string, generated via `generateInvoiceNumber()`
- `customerId`
- `customerName`, `customerMobile`, `customerAddress`
- `date`
- `items`: array of invoice line items
- `subtotal`, `totalAmount`, `amountPaid`, `balanceDue`
- `paymentMethod`
- `status` (`Paid`, `Unpaid`, `Partially Paid`)
- `createdAt`

### Settings and session data
- `appSettings`: shop details, admin credentials, reminder settings, theme
- `session`: login state and timeout info
- `activityLog`: recent actions

### ID format and generation
- Customers: `CUST-YYYY-NNN` via `generateCustomerId()`
- Prescriptions: `PRE-YYYY-NNN` via `generateId('PRE', ...)`
- Invoices: `INV-YYYY-MM-NNN` via `generateInvoiceNumber()`
- There is no central ID factory or UUID mechanism.

### Date and currency conventions
- Dates are passed through `formatDate()` and `formatDateInput()`.
- Display format is typically `DD/MM/YYYY` in the UI.
- Currency is rendered using `toLocaleString('en-IN', { style: 'currency', currency: 'INR' })`.

## 4) Routes and pages
This is a static multi-page app:

1. `index.html` — login screen
2. `dashboard.html` — dashboard / home screen
3. `customers.html` — customer directory and customer add/edit modal
4. `prescriptions.html` — prescription record list and prescription modal
5. `billing.html` — invoice/billing page
6. `analytics.html` — charts and summary metrics dashboard
7. `settings.html` — shop configuration and data management

### Multi-step flows currently present
- Customer creation is a standalone flow.
- Prescription creation is a separate flow.
- Invoice creation is a separate flow.
These are not yet a single combined order form.

## 5) Business logic snapshot
### Where totals and balances are calculated
- `js/analytics.js` calculates revenue, customer counts, and follow-up counts.
- `js/billing.js` calculates invoice subtotal, total, paid amount, and balance.
- `js/customers.js` calculates `totalSpent` from invoice totals per customer.
- `js/notifications.js` calculates reminder queue from `lastVisitDate` and a 365-day rule.

### Duplicated or inconsistent logic
- Revenue math is split between analytics and customer/invoice calculations.
- The app uses invoice totals in the dashboard, while the target model expects payments and balances to be derived from an orders/payments ledger.
- Balance logic is not centralized; amounts are not stored as a canonical ledger with voiding logic.
- Customer duplication risk is not checked by a normalized mobile index.

## 6) Existing reports and reminders
### Reports
- `analytics.html` provides charts and summary cards for revenue, customers, and follow-up data.
- There are no dedicated revenue or pending payments pages in the current implementation.

### Reminders
- `js/notifications.js` builds a reminder queue for customers whose `lastVisitDate` is over 365 days old.
- The reminder UI is a dashboard panel with a dismiss action and WhatsApp generation.
- This is reminder logic based on customer visits, not prescriptions.

## 7) Tests and validation
- No automated test framework was detected.
- No `package.json`, `vitest.config.*`, `jest.config.*`, or test directory exists.
- There is no migration test harness or validation script.

## 8) Redundancy and candidate simplification
Candidates for consolidation in the redesign:
- Multi-page customer → prescription → billing flow should become a single order form.
- Dashboard cards and analytics pages overlap in purpose.
- Billing and payment logic are split between invoice totals and generic customer summary views.
- Reminder logic is present in both dashboard notifications and analytics follow-up metrics.
- Old route pages can be retired once the new unified flow is validated.

## 9) Legacy data quirks and risks
Observed / likely issues from current implementation:
- Missing or inconsistent optional fields (`location`, `email`, `dob`)
- Duplicate customers can exist because no normalized mobile uniqueness rule exists
- Date formatting is inconsistent across code paths (`DD/MM/YYYY`, ISO dates, `new Date()` conversions)
- Numeric values are stored as strings and floats on some fields, which can create invalid or imprecise money values
- Unclear handling of orphaned prescription or invoice records if the customer record is deleted or missing
- No soft-delete or voiding model; deletion is performed via direct array filtering in some places

## 10) Field mapping table: current vs target model
| New requirement | Existing field or current equivalent | Status |
|---|---|---|
| Customer id | `customer.id` | Existing |
| Customer name | `customer.name` | Existing |
| Customer mobile | `customer.mobile` | Existing |
| Customer address | `customer.location` | Existing |
| Customer created_at / updated_at | missing | New field needed |
| Customer deleted_at | missing | New field needed |
| Prescription id | `prescription.prescriptionId` | Existing |
| Prescription date | `prescription.date` | Existing |
| Doctor name | `prescription.doctorName` | Existing |
| Right eye values | `distanceVision.rightEye`, `nearVision.rightEye` | Existing |
| Left eye values | `distanceVision.leftEye`, `nearVision.leftEye` | Existing |
| Add / PD / RPD / LPD | `prescription.pd`, `prescription.pdType` and related form fields | Partial / needs normalization |
| Order id | `invoice.invoiceNumber` | Existing but different concept |
| Order totals | `invoice.totalAmount`, `subtotal`, `balanceDue` | Existing |
| Payment ledger | not present | New table needed |
| Reminder model | customer `lastVisitDate` based reminder queue | Existing but different implementation |
| Settings key-value | `appSettings` | Existing |
| Schema versioning | none | New field needed |

## 11) Findings summary
The project is a functioning but fragmented static optical shop system built on browser localStorage. It already covers customer management, prescriptions, billing/invoice creation, reminders, and analytics, but the data model is not yet aligned with the target prescription-order-payment ledger required by the redesign. The strongest next step is to add a migration-safe data version layer, introduce a backup flow, and perform a gradual normalization from the current `customers` / `prescriptions` / `invoices` structure toward a ledger-based model without losing legacy data.
