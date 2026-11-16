import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const createCustomerContext = ({ saveSucceeds = true } = {}) => {
  const savedData = {};
  const appendedToasts = [];
  const elements = new Map();
  const createElement = (id) => {
    const classAdds = [];
    return {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      dataset: {},
      style: {},
      className: '',
      classAdds,
      classList: {
        add(...classes) {
          classAdds.push(...classes);
        },
        remove: () => {},
        toggle: () => false
      },
      addEventListener: () => {},
      appendChild: (element) => appendedToasts.push(element),
      remove: () => {},
      querySelector: () => ({ textContent: '' })
    };
  };
  const document = {
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, createElement(id));
      return elements.get(id);
    },
    querySelector: (selector) => selector === '#customerTable tbody'
      ? document.getElementById('customerTableBody')
      : null,
    querySelectorAll: () => [],
    createElement
  };
  const context = vm.createContext({
    console,
    document,
    window: { addEventListener: () => {} },
    localStorage: { getItem: () => null, setItem: () => true },
    setTimeout: () => 0,
    clearTimeout: () => {}
  });

  vm.runInContext(fs.readFileSync(new URL('../js/utils.js', import.meta.url), 'utf8'), context);
  vm.runInContext(fs.readFileSync(new URL('../js/customers.js', import.meta.url), 'utf8'), context);
  context.getData = (key) => savedData[key] || [];
  context.saveData = (key, data) => {
    if (!saveSucceeds) return false;
    savedData[key] = data;
    return true;
  };
  context.trackActivity = () => {};
  context.getCustomerInvoiceTotal = () => 0;
  context.formatPhone = (value) => value;
  return { context, elements, getElement: document.getElementById, appendedToasts };
};

const prepareCustomerForm = (getElement, customerId) => {
  getElement('customerId').value = customerId;
  getElement('customerName').value = 'Asha Verma';
  getElement('customerMobile').value = '';
  getElement('customerAlternate').value = '';
  getElement('customerLocation').value = '';
  getElement('customerDob').value = '';
  getElement('customerEmail').value = '';
  getElement('customerGender').value = '';
  getElement('customerRegistration').value = '16/11/2026';
};

describe('customer management', () => {
  it('generates a new ID after the largest existing sequence instead of using list length', () => {
    const { context } = createCustomerContext();
    const nextId = vm.runInContext(
      "generateCustomerId([{ id: `CUST-${new Date().getFullYear()}-001` }, { id: `CUST-${new Date().getFullYear()}-003` }])",
      context
    );

    expect(nextId).toBe(`CUST-${new Date().getFullYear()}-004`);
  });

  it('keeps the form open and does not report success when the customer write fails', () => {
    const { context, getElement, appendedToasts } = createCustomerContext({ saveSucceeds: false });
    prepareCustomerForm(getElement, 'CUST-2026-001');
    const modal = getElement('customerModal');

    vm.runInContext('submitCustomerForm({ preventDefault() {} })', context);

    expect(modal.classAdds).toHaveLength(0);
    expect(getElement('customerCountLabel').textContent).toBe('');
    expect(appendedToasts.some((toast) => toast.textContent.includes('successfully'))).toBe(false);
  });

  it('persists and immediately renders a newly added customer', () => {
    const { context, getElement, appendedToasts } = createCustomerContext();
    const customerId = vm.runInContext('generateCustomerId([])', context);
    prepareCustomerForm(getElement, customerId);

    vm.runInContext('submitCustomerForm({ preventDefault() {} })', context);

    expect(getElement('customerTableBody').innerHTML).toContain('Asha Verma');
    expect(getElement('customerCountLabel').textContent).toContain('1 customers');
    expect(appendedToasts.some((toast) => toast.textContent.includes('Customer added successfully!'))).toBe(true);
  });

  it('keeps pagination controls bounded for large customer lists', () => {
    const { context, getElement } = createCustomerContext();
    vm.runInContext(
      'customerState.filtered = Array.from({ length: 20000 }, (_, index) => ({ id: index })); customerState.currentPage = 500; renderPagination()',
      context
    );

    const pagination = getElement('customerPagination').innerHTML;
    expect(pagination.match(/<button/g)).toHaveLength(9);
    expect(pagination).toContain('data-page="500"');
    expect(pagination).toContain('data-page="1000"');
  });
});
