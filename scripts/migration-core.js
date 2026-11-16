const DEFAULT_SNAPSHOT = {
  schema: { schema_version: 0 },
  customers: [],
  prescriptions: [],
  invoices: [],
  appSettings: {},
  session: { isLoggedIn: false },
  activityLog: []
};

export function normalizeMobile(value = '') {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return normalized.length === 10 ? normalized : '';
}

export function summarizeCounts(snapshot = {}) {
  return {
    customers: Array.isArray(snapshot.customers) ? snapshot.customers.length : 0,
    prescriptions: Array.isArray(snapshot.prescriptions) ? snapshot.prescriptions.length : 0,
    invoices: Array.isArray(snapshot.invoices) ? snapshot.invoices.length : 0,
    activityLog: Array.isArray(snapshot.activityLog) ? snapshot.activityLog.length : 0
  };
}

export function applyMigrations(snapshot = {}, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const source = JSON.parse(JSON.stringify(snapshot || DEFAULT_SNAPSHOT));
  const working = {
    ...DEFAULT_SNAPSHOT,
    ...source,
    schema: { ...DEFAULT_SNAPSHOT.schema, ...(source.schema || {}) }
  };

  const before = summarizeCounts(working);
  const migrationReport = {
    dryRun,
    versionBefore: Number(working.schema.schema_version || 0),
    applied: []
  };

  if (Number(working.schema.schema_version || 0) < 1) {
    migrationReport.applied.push('v1: add schema metadata and normalized mobile fields');
    working.schema.schema_version = 1;
    working.schema.migrated_at = new Date().toISOString();
    working.schema.last_migration = working.schema.migrated_at;

    working.customers = (working.customers || []).map((customer) => {
      const mobile = String(customer.mobile || '').trim();
      const normalizedMobile = normalizeMobile(mobile);
      return {
        ...customer,
        name: String(customer.name || '').trim(),
        mobile,
        mobile_normalized: normalizedMobile || customer.mobile_normalized || null,
        address: customer.address || customer.location || '',
        created_at: customer.created_at || customer.registrationDate || working.schema.migrated_at,
        updated_at: customer.updated_at || working.schema.migrated_at,
        deleted_at: customer.deleted_at ?? null
      };
    });

    working.prescriptions = (working.prescriptions || []).map((prescription) => ({
      ...prescription,
      created_at: prescription.created_at || prescription.createdAt || working.schema.migrated_at,
      updated_at: prescription.updated_at || prescription.createdAt || working.schema.migrated_at,
      deleted_at: prescription.deleted_at ?? null
    }));

    working.invoices = (working.invoices || []).map((invoice) => ({
      ...invoice,
      created_at: invoice.created_at || invoice.createdAt || working.schema.migrated_at,
      updated_at: invoice.updated_at || invoice.createdAt || working.schema.migrated_at,
      deleted_at: invoice.deleted_at ?? null
    }));
  }

  const after = summarizeCounts(working);
  return {
    ...working,
    _migrationReport: {
      ...migrationReport,
      versionAfter: Number(working.schema.schema_version || 0),
      before,
      after
    }
  };
}

export function createBackupPayload(snapshot = {}) {
  return {
    schema: snapshot.schema || { schema_version: 0 },
    customers: Array.isArray(snapshot.customers) ? snapshot.customers : [],
    prescriptions: Array.isArray(snapshot.prescriptions) ? snapshot.prescriptions : [],
    invoices: Array.isArray(snapshot.invoices) ? snapshot.invoices : [],
    appSettings: snapshot.appSettings || {},
    session: snapshot.session || { isLoggedIn: false },
    activityLog: Array.isArray(snapshot.activityLog) ? snapshot.activityLog : []
  };
}
