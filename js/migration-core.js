(function () {
  const DEFAULT_SNAPSHOT = {
    schema: { schema_version: 0 },
    customers: [],
    prescriptions: [],
    invoices: [],
    appSettings: {},
    session: { isLoggedIn: false },
    activityLog: []
  };

  function normalizeMobile(value = '') {
    const digits = String(value || '').replace(/\D+/g, '');
    if (!digits) return '';
    const normalized = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
    return normalized.length === 10 ? normalized : '';
  }

  function summarizeCounts(snapshot = {}) {
    return {
      customers: Array.isArray(snapshot.customers) ? snapshot.customers.length : 0,
      prescriptions: Array.isArray(snapshot.prescriptions) ? snapshot.prescriptions.length : 0,
      invoices: Array.isArray(snapshot.invoices) ? snapshot.invoices.length : 0,
      activityLog: Array.isArray(snapshot.activityLog) ? snapshot.activityLog.length : 0
    };
  }

  function applyMigrations(snapshot = {}, options = {}) {
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

  function readStorageSnapshot() {
    return {
      schema: window.RiddhiMigrationCore?.getSchemaMeta?.() || { schema_version: 0 },
      customers: window.getData ? getData(STORAGE_KEYS.customers) : [],
      prescriptions: window.getData ? getData(STORAGE_KEYS.prescriptions) : [],
      invoices: window.getData ? getData(STORAGE_KEYS.invoices) : [],
      appSettings: window.getData ? getData(STORAGE_KEYS.appSettings) : {},
      session: window.getData ? getData(STORAGE_KEYS.session) : { isLoggedIn: false },
      activityLog: window.getData ? getData(STORAGE_KEYS.activityLog) : []
    };
  }

  function ensureLocalStorageSchema(options = {}) {
    const dryRun = Boolean(options.dryRun);
    const snapshot = readStorageSnapshot();
    const migrated = applyMigrations(snapshot, { dryRun });

    if (dryRun) {
      console.log('Migration dry run', migrated._migrationReport);
      return migrated;
    }

    saveData(STORAGE_KEYS.schemaMeta, migrated.schema);
    saveData(STORAGE_KEYS.customers, migrated.customers);
    saveData(STORAGE_KEYS.prescriptions, migrated.prescriptions);
    saveData(STORAGE_KEYS.invoices, migrated.invoices);
    saveData(STORAGE_KEYS.appSettings, migrated.appSettings || getSettings());
    saveData(STORAGE_KEYS.session, migrated.session || { isLoggedIn: false });
    saveData(STORAGE_KEYS.activityLog, migrated.activityLog || []);
    console.log('Applied migration report', migrated._migrationReport);
    return migrated;
  }

  window.RiddhiMigrationCore = {
    normalizeMobile,
    applyMigrations,
    summarizeCounts,
    readStorageSnapshot,
    ensureLocalStorageSchema
  };
})();
