const initializeDashboardQuickOrder = () => {
  const form = document.getElementById('quickOrderForm');
  if (!form) return;

  const customerNameInput = document.getElementById('quickCustomerName');
  const customerMobileInput = document.getElementById('quickCustomerMobile');
  const customerAddressInput = document.getElementById('customerAddress');
  const customerHistoryElement = document.getElementById('customerHistorySummary');
  const suggestionsElement = document.getElementById('customerSuggestions');
  const saveButton = document.getElementById('saveEntryButton');
  const clearButton = document.getElementById('clearEntryButton');
  const addAnotherButton = document.getElementById('addAnotherButton');
  const formStatus = document.getElementById('formStatus');
  const totalAmountInput = document.getElementById('totalAmount');
  const remainingBalanceInput = document.getElementById('remainingBalance');

  const toOptionalString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const parseOptionalNumber = (value) => {
    const trimmed = toOptionalString(value);
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const updateCalculatedTotals = () => {
    const framePrice = parseOptionalNumber(document.getElementById('framePrice')?.value) || 0;
    const lensPrice = parseOptionalNumber(document.getElementById('lensPrice')?.value) || 0;
    const discount = parseOptionalNumber(document.getElementById('discount')?.value) || 0;
    const amountReceived = parseOptionalNumber(document.getElementById('amountReceived')?.value) || 0;
    const totals = calculateOrderTotals(framePrice, lensPrice, discount, amountReceived);

    if (totalAmountInput) {
      totalAmountInput.value = totals.total.toFixed(2);
    }
    if (remainingBalanceInput) {
      remainingBalanceInput.value = totals.balance.toFixed(2);
    }
  };

  const setFormStatus = (message, type = 'info') => {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = `form-status ${type}`;
  };

  const refreshDashboardHighlights = () => {
    const invoices = getData(STORAGE_KEYS.invoices) || [];
    const today = new Date();
    const salesToday = invoices
      .filter((invoice) => {
        const date = new Date(invoice.date || invoice.createdAt || invoice.created_at || new Date());
        return !Number.isNaN(date.getTime()) && date.toDateString() === today.toDateString();
      })
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);

    const pendingBalance = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
    const todayBookings = invoices.filter((invoice) => {
      const date = new Date(invoice.date || invoice.createdAt || invoice.created_at || new Date());
      return !Number.isNaN(date.getTime()) && date.toDateString() === today.toDateString();
    }).length;

    const salesNode = document.getElementById('todaySalesValue');
    const bookingsNode = document.getElementById('todayBookingsValue');
    const balanceNode = document.getElementById('pendingBalanceValue');

    if (salesNode) salesNode.textContent = formatCurrency(salesToday);
    if (bookingsNode) bookingsNode.textContent = String(todayBookings);
    if (balanceNode) balanceNode.textContent = formatCurrency(pendingBalance);
  };

  const renderCustomerSuggestions = (query) => {
    if (!customerNameInput || !suggestionsElement) return;

    const customers = getData(STORAGE_KEYS.customers) || [];
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) {
      suggestionsElement.classList.add('hidden');
      suggestionsElement.innerHTML = '';
      return;
    }

    const matches = customers.filter((customer) => {
      const name = String(customer.name || '').toLowerCase();
      const mobile = String(customer.mobile || '').toLowerCase();
      const lookup = normalizedQuery.replace(/\D+/g, '');
      return name.includes(normalizedQuery) || mobile.includes(lookup);
    }).slice(0, 6);

    if (!matches.length) {
      suggestionsElement.classList.add('hidden');
      suggestionsElement.innerHTML = '';
      return;
    }

    suggestionsElement.innerHTML = matches.map((customer) => `
      <button type="button" class="suggestion-item" data-customer-id="${customer.id}">
        <span>${customer.name || 'Unnamed Customer'}</span>
        <small>${customer.mobile || 'No mobile saved'}</small>
      </button>
    `).join('');
    suggestionsElement.classList.remove('hidden');

    suggestionsElement.querySelectorAll('.suggestion-item').forEach((button) => {
      button.addEventListener('click', () => {
        const customerId = button.dataset.customerId;
        const selectedCustomer = customers.find((entry) => entry.id === customerId);
        if (!selectedCustomer) return;

        if (customerNameInput) customerNameInput.value = selectedCustomer.name || '';
        if (customerMobileInput) customerMobileInput.value = selectedCustomer.mobile || '';
        if (customerAddressInput) {
          customerAddressInput.value = selectedCustomer.address || selectedCustomer.location || '';
        }

        if (!customerHistoryElement) return;

        const records = getData(STORAGE_KEYS.prescriptions) || [];
        const recentPrescriptions = records.filter((entry) => entry.customerId === customerId).slice(0, 3);
        const dateValues = recentPrescriptions.map((entry) => entry.date).filter(Boolean);
        const lastVisit = dateValues[0] ? formatDate(dateValues[0]) : 'No recent prescription';
        const invoiceRecords = (getData(STORAGE_KEYS.invoices) || []).filter((entry) => entry.customerId === customerId);
        const balanceDue = invoiceRecords.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);

        customerHistoryElement.innerHTML = `
          <div class="history-title">Recent customer history</div>
          <div class="history-meta">${recentPrescriptions.length} prescription(s) • Last visit: ${lastVisit}</div>
          <div class="history-meta">Outstanding: ${formatCurrency(balanceDue)}</div>
        `;
        customerHistoryElement.classList.remove('hidden');
        suggestionsElement.classList.add('hidden');
      });
    });
  };

  const resetCustomerHistory = () => {
    if (customerHistoryElement) {
      customerHistoryElement.innerHTML = '';
      customerHistoryElement.classList.add('hidden');
    }
  };

  const clearForm = () => {
    form.reset();
    resetCustomerHistory();
    setFormStatus('', 'info');
    updateCalculatedTotals();
    if (addAnotherButton) addAnotherButton.classList.add('hidden');
    if (saveButton) saveButton.disabled = false;
  };

  const handleCustomerLookup = () => {
    renderCustomerSuggestions(customerNameInput?.value || customerMobileInput?.value || '');

    const mobileDigits = String(customerMobileInput?.value || '').replace(/\D+/g, '');
    if (mobileDigits.length < 3) {
      if (customerMobileInput) delete customerMobileInput.dataset.lastMatchId;
      resetCustomerHistory();
      return;
    }

    if (!customerHistoryElement) return;

    const customers = getData(STORAGE_KEYS.customers) || [];
    const match = customers.find((entry) => String(entry.mobile || '').replace(/\D+/g, '') === mobileDigits);
    if (!match) {
      if (customerMobileInput) delete customerMobileInput.dataset.lastMatchId;
      return;
    }

    const customerIdTag = customerMobileInput?.dataset.lastMatchId;
    if (customerIdTag !== match.id) {
      showToast(`Existing customer found: ${match.name || 'Unnamed Customer'}`, 'info');
      customerMobileInput.dataset.lastMatchId = match.id;
    }

    if (customerNameInput && !customerNameInput.value.trim()) {
      customerNameInput.value = match.name || '';
    }

    if (customerAddressInput && !customerAddressInput.value.trim()) {
      customerAddressInput.value = match.address || match.location || '';
    }

    const records = getData(STORAGE_KEYS.prescriptions) || [];
    const recentPrescriptions = records.filter((entry) => entry.customerId === match.id).slice(0, 3);
    const invoiceRecords = (getData(STORAGE_KEYS.invoices) || []).filter((entry) => entry.customerId === match.id);
    const balanceDue = invoiceRecords.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);

    customerHistoryElement.innerHTML = `
      <div class="history-title">Recent customer history</div>
      <div class="history-meta">${recentPrescriptions.length} prescription(s) • Last visit: ${recentPrescriptions[0]?.date ? formatDate(recentPrescriptions[0].date) : 'No recent prescription'}</div>
      <div class="history-meta">Outstanding: ${formatCurrency(balanceDue)}</div>
    `;
    customerHistoryElement.classList.remove('hidden');
  };

  customerNameInput?.addEventListener('input', () => {
    renderCustomerSuggestions(customerNameInput.value);
  });

  customerMobileInput?.addEventListener('input', handleCustomerLookup);
  document.getElementById('framePrice')?.addEventListener('input', updateCalculatedTotals);
  document.getElementById('lensPrice')?.addEventListener('input', updateCalculatedTotals);
  document.getElementById('discount')?.addEventListener('input', updateCalculatedTotals);
  document.getElementById('amountReceived')?.addEventListener('input', updateCalculatedTotals);

  clearButton?.addEventListener('click', clearForm);

  document.getElementById('newEntryButton')?.addEventListener('click', () => {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    customerNameInput?.focus();
  });

  addAnotherButton?.addEventListener('click', () => {
    clearForm();
    customerNameInput?.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (saveButton) saveButton.disabled = true;

    const formData = new FormData(form);
    const customerName = toOptionalString(formData.get('customerName')) || 'Unnamed Customer';
    const mobile = String(formData.get('mobile') || '').replace(/\D+/g, '');
    const address = toOptionalString(formData.get('address'));
    const customers = getData(STORAGE_KEYS.customers) || [];
    const prescriptions = getData(STORAGE_KEYS.prescriptions) || [];
    const invoices = getData(STORAGE_KEYS.invoices) || [];

    const matchingCustomer = mobile
      ? customers.find((entry) => String(entry.mobile || '').replace(/\D+/g, '') === mobile)
      : customers.find((entry) => toOptionalString(entry.name).toLowerCase() === customerName.toLowerCase());

    if (matchingCustomer) {
      showToast(`Existing customer found: ${matchingCustomer.name || 'Unnamed Customer'}`, 'info');
    }

    let customer = null;
    if (mobile) {
      customer = customers.find((entry) => String(entry.mobile || '').replace(/\D+/g, '') === mobile);
    }
    if (!customer) {
      const matchedByName = customers.find((entry) => toOptionalString(entry.name).toLowerCase() === customerName.toLowerCase() && !mobile);
      if (matchedByName) customer = matchedByName;
    }

    if (!customer) {
      customer = buildCustomerEntry({
        id: generateCustomerId(customers),
        name: customerName,
        mobile,
        address,
        registrationDate: formatDate(new Date())
      });
      customers.push(customer);
    } else {
      if (!toOptionalString(customer.name).trim() && customerName !== 'Unnamed Customer') customer.name = customerName;
      if (!customer.mobile && mobile) customer.mobile = mobile;
      if (!customer.address && address) customer.address = address;
    }

    const createdAt = new Date().toISOString();
    const prescriptionId = generateId('PRE', prescriptions);
    const prescriptionPayload = {
      id: prescriptionId,
      prescriptionId,
      customerId: customer.id,
      customerName: customer.name,
      date: toOptionalString(formData.get('prescriptionDate')) || '',
      doctorName: toOptionalString(formData.get('doctorName')) || '',
      lensType: toOptionalString(formData.get('lensType')) || '',
      add: parseOptionalNumber(formData.get('add')),
      pd: parseOptionalNumber(formData.get('pd')),
      rightPd: parseOptionalNumber(formData.get('rightPd')),
      leftPd: parseOptionalNumber(formData.get('leftPd')),
      oldGlassesNumber: toOptionalString(formData.get('oldGlassesNumber')),
      odDistanceSPH: parseOptionalNumber(formData.get('odDistanceSPH')),
      odDistanceCYL: parseOptionalNumber(formData.get('odDistanceCYL')),
      odDistanceAxis: parseOptionalNumber(formData.get('odDistanceAxis')),
      odDistanceVA: toOptionalString(formData.get('odDistanceVA')),
      odNearSPH: parseOptionalNumber(formData.get('odNearSPH')),
      odNearCYL: parseOptionalNumber(formData.get('odNearCYL')),
      odNearAxis: parseOptionalNumber(formData.get('odNearAxis')),
      odNearVA: toOptionalString(formData.get('odNearVA')),
      osDistanceSPH: parseOptionalNumber(formData.get('osDistanceSPH')),
      osDistanceCYL: parseOptionalNumber(formData.get('osDistanceCYL')),
      osDistanceAxis: parseOptionalNumber(formData.get('osDistanceAxis')),
      osDistanceVA: toOptionalString(formData.get('osDistanceVA')),
      osNearSPH: parseOptionalNumber(formData.get('osNearSPH')),
      osNearCYL: parseOptionalNumber(formData.get('osNearCYL')),
      osNearAxis: parseOptionalNumber(formData.get('osNearAxis')),
      osNearVA: toOptionalString(formData.get('osNearVA')),
      nextCheckupDate: toOptionalString(formData.get('nextCheckupDate')) || '',
      remarks: toOptionalString(formData.get('remarks')) || '',
      createdAt,
      updatedAt: createdAt,
      deleted_at: null
    };

    const prescriptionFields = Object.keys(prescriptionPayload)
      .filter((key) => !['id', 'prescriptionId', 'customerId', 'customerName', 'createdAt', 'updatedAt', 'deleted_at'].includes(key))
      .map((key) => prescriptionPayload[key]);
    const hasPrescriptionData = prescriptionFields.some((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (typeof value === 'number') return !Number.isNaN(value);
      return true;
    });

    if (hasPrescriptionData) {
      prescriptions.push(prescriptionPayload);
    }

    const framePrice = parseOptionalNumber(formData.get('framePrice')) || 0;
    const lensPrice = parseOptionalNumber(formData.get('lensPrice')) || 0;
    const discount = parseOptionalNumber(formData.get('discount')) || 0;
    const amountReceived = parseOptionalNumber(formData.get('amountReceived')) || 0;
    const paymentMethod = toOptionalString(formData.get('paymentMethod'));
    const paymentDate = toOptionalString(formData.get('paymentDate'));
    const frameName = toOptionalString(formData.get('frameName'));
    const frameDescription = toOptionalString(formData.get('frameDescription'));
    const lensBrand = toOptionalString(formData.get('lensBrand'));
    const lensType = toOptionalString(formData.get('lensType'));
    const lensDescription = toOptionalString(formData.get('lensDescription'));
    const totals = calculateOrderTotals(framePrice, lensPrice, discount, amountReceived);
    const hasBillingData = [framePrice, lensPrice, discount, amountReceived, paymentMethod, paymentDate, frameName, frameDescription, lensBrand, lensType, lensDescription].some((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (typeof value === 'number') return value !== 0;
      return true;
    });

    if (hasBillingData) {
      const invoiceNumber = generateInvoiceNumber(invoices);
      const status = totals.balance > 0 ? 'Partially Paid' : totals.balance < 0 ? 'Overpaid' : 'Paid';
      const invoice = {
        invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile || '',
        customerAddress: customer.address || '',
        date: paymentDate || formatDateInput(new Date()),
        items: [{
          description: `${lensType || 'Optical'} - ${frameName || 'Frame'} / ${lensBrand || 'Lens'}`,
          quantity: 1,
          rate: totals.total,
          amount: totals.total
        }],
        subtotal: totals.total,
        totalAmount: totals.total,
        amountPaid: totals.amountPaid,
        balanceDue: totals.balance,
        paymentMethod: paymentMethod || 'Cash',
        status,
        createdAt,
        updatedAt: createdAt,
        deleted_at: null
      };
      invoices.push(invoice);
    }

    saveData(STORAGE_KEYS.customers, customers);
    saveData(STORAGE_KEYS.prescriptions, prescriptions);
    saveData(STORAGE_KEYS.invoices, invoices);
    trackActivity(`Entry saved for ${customer.name}.`);

    if (typeof fillDashboardSummary === 'function') {
      fillDashboardSummary();
    }

    setFormStatus('Saved successfully.', 'success');
    showToast('Entry saved successfully.', 'success');
    if (addAnotherButton) addAnotherButton.classList.remove('hidden');
    if (saveButton) saveButton.disabled = false;
    if (typeof refreshDashboardHighlights === 'function') {
      refreshDashboardHighlights();
    }
  });

  refreshDashboardHighlights();
  updateCalculatedTotals();
  clearForm();
};

window.addEventListener('DOMContentLoaded', () => {
  initializeDashboardQuickOrder();
});
