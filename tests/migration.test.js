import fs from 'node:fs';
import vm from 'node:vm';
import { describe, it, expect } from 'vitest';
import { normalizeMobile, applyMigrations } from '../scripts/migration-core.js';

const loadUtilsContext = () => {
  const code = fs.readFileSync(new URL('../js/utils.js', import.meta.url), 'utf8');
  const context = {
    console,
    localStorage: {
      getItem: () => null,
      setItem: () => true
    },
    document: {
      getElementById: () => null
    },
    window: {},
    setTimeout,
    clearTimeout,
    URL,
    Blob
  };
  vm.runInNewContext(code, context);
  return context;
};

const { resolveAdminCredentials, buildCustomerEntry, calculateOrderTotals } = loadUtilsContext();

const loadPrescriptionContext = () => {
  const code = fs.readFileSync(new URL('../js/prescriptions.js', import.meta.url), 'utf8');
  const context = {
    console,
    localStorage: {
      getItem: () => null,
      setItem: () => true
    },
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => null,
      createElement: () => ({
        type: '',
        className: '',
        dataset: {},
        value: '',
        style: {},
        innerHTML: '',
        appendChild: () => {},
        addEventListener: () => {}
      })
    },
    window: { addEventListener: () => {} },
    showToast: () => {},
    debounce: (fn) => fn,
    formatDate: (value) => value || '',
    generateId: (prefix, items) => `${prefix}-${(items || []).length + 1}`,
    getTodayISO: () => '2026-11-16',
    deleteData: () => true,
    getData: () => [],
    saveData: () => true,
    trackActivity: () => {},
    getCustomerById: () => null,
    STORAGE_KEYS: { customers: 'customers', prescriptions: 'prescriptions' },
    setTimeout,
    clearTimeout,
    URL,
    Blob
  };
  vm.runInNewContext(code, context);
  return context;
};

describe('migration core', () => {
  it('normalizes indian mobile numbers', () => {
    expect(normalizeMobile('+91 98765 43210')).toBe('9876543210');
    expect(normalizeMobile('919876543210')).toBe('9876543210');
    expect(normalizeMobile('9876543210')).toBe('9876543210');
  });

  it('adds schema metadata and normalizes records without mutating the original snapshot when dry run is used', () => {
    const original = {
      schema: { schema_version: 0 },
      customers: [
        { id: 'CUST-1', name: 'Asha', mobile: '+91 98765 43210', location: 'Pune' },
        { id: 'CUST-2', name: 'Raj', mobile: '9988776655', location: 'Nagpur' }
      ],
      prescriptions: [],
      invoices: []
    };

    const result = applyMigrations(original, { dryRun: true });

    expect(result.schema.schema_version).toBe(1);
    expect(result.customers[0].mobile_normalized).toBe('9876543210');
    expect(original.customers[0].mobile_normalized).toBeUndefined();
    expect(result.customers[0].created_at).toBeDefined();
    expect(result.schema.migrated_at).toBeDefined();
  });

  it('falls back to default admin credentials when stored settings are empty or corrupted', () => {
    expect(resolveAdminCredentials(null)).toEqual({
      username: 'admin@riddhichashma',
      password: 'riddhi@2024'
    });

    expect(resolveAdminCredentials({ adminUsername: '   ', adminPassword: '' })).toEqual({
      username: 'admin@riddhichashma',
      password: 'riddhi@2024'
    });
  });

  it('allows empty customer details while calculating totals safely', () => {
    const customer = buildCustomerEntry({ name: '', mobile: '', address: 'Pune' });

    expect(customer.name).toBe('Unnamed Customer');
    expect(customer.mobile).toBe('');
    expect(calculateOrderTotals(5000, 0, 0, 2000)).toEqual({
      total: 5000,
      balance: 3000,
      amountPaid: 2000,
      discount: 0,
      framePrice: 5000,
      lensPrice: 0
    });
  });

  it('shows all matching customers in the prescription search list without truncating to a tiny subset', () => {
    const context = loadPrescriptionContext();
    const customers = [
      { id: 'CUST-2026-003', name: 'Zaid Khan', mobile: '9988776655' },
      { id: 'CUST-2026-001', name: 'Asha Verma', mobile: '9876543210' },
      { id: 'CUST-2026-002', name: 'Rohit Shah', mobile: '9123456789' }
    ];

    expect(context.getPrescriptionCustomerMatches(customers, '')).toHaveLength(3);
    expect(context.getPrescriptionCustomerMatches(customers, '').map((customer) => customer.name)).toEqual([
      'Asha Verma',
      'Rohit Shah',
      'Zaid Khan'
    ]);
  });

  it('fills the selected customer details from the shared customer store and shows their prescription history', () => {
    const context = loadPrescriptionContext();
    const customers = [{
      id: 'CUST-1001',
      name: 'Asha Verma',
      mobile: '9876543210',
      location: 'Pune'
    }];
    const prescriptions = [{
      customerId: 'CUST-1001',
      prescriptionId: 'PRE-101',
      date: '2026-11-10',
      lensType: 'Single Vision'
    }];

    const elements = new Map();
    const getElement = (id) => {
      if (!elements.has(id)) {
        elements.set(id, {
          id,
          value: '',
          textContent: '',
          innerHTML: '',
          style: {},
          dataset: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          addEventListener: () => {}
        });
      }
      return elements.get(id);
    };

    const doc = {
      getElementById: getElement,
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => {},
      createElement: () => ({
        type: '',
        className: '',
        dataset: {},
        style: {},
        innerHTML: '',
        appendChild: () => {},
        addEventListener: () => {}
      })
    };

    context.document = doc;
    context.getData = (key) => (key === 'customers' ? customers : key === 'prescriptions' ? prescriptions : []);
    context.window = { addEventListener: () => {} };
    context.selectPrescriptionCustomer(customers[0]);

    expect(getElement('selectedCustomerId').value).toBe('CUST-1001');
    expect(getElement('custName').textContent).toBe('Asha Verma');
    expect(getElement('custMobile').textContent).toBe('9876543210');
    expect(getElement('custAddress').textContent).toBe('Pune');
    expect(getElement('customerHistoryList').innerHTML).toContain('PRE-101');
  });
});
