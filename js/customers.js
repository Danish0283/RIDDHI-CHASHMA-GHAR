const customerState = {
  customers: [],
  filtered: [],
  currentPage: 1,
  sortKey: 'name',
  sortDirection: 'asc',
  activeLetter: 'all',
  filterMode: 'all',
  searchQuery: ''
};

const loadCustomers = () => {
  const customers = getData(STORAGE_KEYS.customers);
  if (!Array.isArray(customers)) {
    showToast('Customer data could not be loaded. Restore a valid backup and try again.', 'error');
    customerState.customers = [];
  } else {
    customerState.customers = customers;
  }
  applyCustomerFilters();
};

const normalizeCustomerRecord = (customer = {}) => ({
  ...customer,
  name: customer.name && String(customer.name).trim() ? String(customer.name).trim() : 'Unnamed Customer',
  mobile: customer.mobile ? String(customer.mobile).trim() : '',
  location: customer.location ? String(customer.location).trim() : '',
  email: customer.email ? String(customer.email).trim() : '',
  alternateMobile: customer.alternateMobile ? String(customer.alternateMobile).trim() : '',
  notes: customer.notes || '',
  profileImage: customer.profileImage || ''
});

const applyCustomerFilters = () => {
  let list = [...customerState.customers].map(normalizeCustomerRecord);
  if (customerState.filterMode === 'recent') {
    list = list.filter((cust) => cust.lastVisitDate && daysDifference(cust.lastVisitDate) <= 30);
  }
  if (customerState.filterMode === 'inactive') {
    list = list.filter((cust) => !cust.lastVisitDate || daysDifference(cust.lastVisitDate) >= 365);
  }
  if (customerState.searchQuery) {
    list = list.filter((cust) => [cust.name, cust.mobile, cust.id]
      .some((value) => String(value || '').toLowerCase().includes(customerState.searchQuery)));
  }
  if (customerState.activeLetter !== 'all') {
    list = list.filter((cust) => String(cust.name || '').charAt(0).toUpperCase() === customerState.activeLetter);
  }
  customerState.filtered = sortAlpha(list, customerState.sortKey, customerState.sortDirection);
  renderCustomerTable();
};

const createAlphabetTabs = () => {
  const container = document.getElementById('alphabetTabs');
  if (!container) return;
  const letters = ['all', ...Array.from({ length: 26 }).map((_, i) => String.fromCharCode(65 + i))];
  container.innerHTML = letters.map((letter) => `
    <button class="tab-button ${customerState.activeLetter === letter ? 'active' : ''}" data-letter="${letter}">${letter === 'all' ? 'All' : letter}</button>
  `).join('');
  if (!container.dataset.listenerAttached) {
    container.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      customerState.activeLetter = button.dataset.letter;
      customerState.currentPage = 1;
      createAlphabetTabs();
      applyCustomerFilters();
    });
    container.dataset.listenerAttached = 'true';
  }
};

const renderCustomerTable = () => {
  const tbody = document.querySelector('#customerTable tbody');
  const label = document.getElementById('customerCountLabel');
  if (!tbody || !label) return;
  const totalPages = Math.ceil(customerState.filtered.length / 20) || 1;
  customerState.currentPage = Math.min(customerState.currentPage, totalPages);
  const start = (customerState.currentPage - 1) * 20;
  const pageItems = customerState.filtered.slice(start, start + 20);
  if (!pageItems.length) {
    const emptyMessage = customerState.customers.length
      ? 'No customers match the selected search or filters.'
      : 'No customers yet. Add your first customer to get started.';
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">${emptyMessage}</td></tr>`;
    label.textContent = 'Showing 0 customers';
    renderPagination();
    return;
  }
  tbody.innerHTML = pageItems.map((customer) => {
    const safeCustomer = normalizeCustomerRecord(customer);
    const totalSpent = getCustomerInvoiceTotal(safeCustomer.id);
    return `
      <tr>
        <td>${safeCustomer.id}</td>
        <td>${safeCustomer.name}</td>
        <td>${safeCustomer.mobile ? formatPhone(safeCustomer.mobile) : 'No mobile'}</td>
        <td>${safeCustomer.location || 'No address'}</td>
        <td>${formatCurrency(totalSpent || safeCustomer.totalSpent || 0)}</td>
        <td>${safeCustomer.lastVisitDate ? formatDate(safeCustomer.lastVisitDate) : '—'}</td>
        <td>${safeCustomer.totalVisits || 0}</td>
        <td>
          <button class="secondary-btn small" data-action="view" data-id="${safeCustomer.id}">View</button>
          <button class="info-btn small" data-action="edit" data-id="${safeCustomer.id}">Edit</button>
          <button class="danger-btn small" data-action="delete" data-id="${safeCustomer.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
  label.textContent = `Showing ${pageItems.length} of ${customerState.filtered.length} customers`;
  renderPagination();
};

const renderPagination = () => {
  const pagination = document.getElementById('customerPagination');
  if (!pagination) return;
  const totalPages = Math.ceil(customerState.filtered.length / 20) || 1;
  const buttons = [];
  buttons.push(`<button ${customerState.currentPage === 1 ? 'disabled' : ''} data-page="${customerState.currentPage - 1}">Previous</button>`);
  const firstPage = Math.max(1, customerState.currentPage - 2);
  const lastPage = Math.min(totalPages, customerState.currentPage + 2);
  if (firstPage > 1) {
    buttons.push('<button data-page="1">1</button>');
    if (firstPage > 2) buttons.push('<span class="pagination-ellipsis" aria-hidden="true">&hellip;</span>');
  }
  for (let i = firstPage; i <= lastPage; i += 1) {
    buttons.push(`<button class="${customerState.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`);
  }
  if (lastPage < totalPages) {
    if (lastPage < totalPages - 1) buttons.push('<span class="pagination-ellipsis" aria-hidden="true">&hellip;</span>');
    buttons.push(`<button data-page="${totalPages}">${totalPages}</button>`);
  }
  buttons.push(`<button ${customerState.currentPage === totalPages ? 'disabled' : ''} data-page="${customerState.currentPage + 1}">Next</button>`);
  pagination.innerHTML = buttons.join('');
};

const formatPhone = (value) => (validateMobile(value) ? `+91-${value}` : value);

const getCustomerInvoiceTotal = (customerId) => {
  const invoices = getData(STORAGE_KEYS.invoices) || [];
  return invoices.filter((invoice) => invoice.customerId === customerId).reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount || 0), 0);
};

const loadCustomerPrescriptions = (customerId) => {
  const prescriptions = getData(STORAGE_KEYS.prescriptions) || [];
  const customerPrescriptions = prescriptions.filter((prescription) => prescription.customerId === customerId);
  const container = document.getElementById('prescriptionsTabContent');
  if (!container) return;
  if (customerPrescriptions.length === 0) {
    container.innerHTML = '<p class="empty-state">No prescriptions found.</p>';
    return;
  }
  container.innerHTML = customerPrescriptions.map((prescription) => `
    <div class="prescription-card">
      <div class="prescription-header">
        <h4>${formatDate(prescription.date)}</h4>
        <span class="prescription-id">${prescription.prescriptionId}</span>
      </div>
      <div class="prescription-details">
        <p><strong>Lens Type:</strong> ${prescription.lensType || 'N/A'}</p>
        <p><strong>PD:</strong> ${prescription.pd || 'N/A'}</p>
        <p><strong>Coatings:</strong> ${prescription.coatings?.join(', ') || 'None'}</p>
        ${prescription.doctorName ? `<p><strong>Doctor:</strong> ${prescription.doctorName}</p>` : ''}
      </div>
    </div>
  `).join('');
};

const loadCustomerInvoices = (customerId) => {
  const invoices = getData(STORAGE_KEYS.invoices) || [];
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customerId);
  const container = document.getElementById('invoicesTabContent');
  if (!container) return;
  if (customerInvoices.length === 0) {
    container.innerHTML = '<p class="empty-state">No invoices found.</p>';
    return;
  }
  const totalSpent = customerInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount || 0), 0);
  container.innerHTML = `
    <div class="total-summary">
      <h3>Total Spending: ${formatCurrency(totalSpent)}</h3>
      <p>Total Orders: ${customerInvoices.length}</p>
      <p>Average Order: ${formatCurrency(totalSpent / customerInvoices.length)}</p>
    </div>
    ${customerInvoices.map((invoice) => `
      <div class="invoice-card">
        <div class="invoice-header">
          <h4>${invoice.invoiceNumber}</h4>
          <span class="invoice-date">${formatDate(invoice.date)}</span>
        </div>
        <div class="invoice-details">
          <p><strong>Items:</strong> ${invoice.items?.length || 0}</p>
          <p><strong>Total Amount:</strong> ${formatCurrency(invoice.totalAmount || 0)}</p>
          <p><strong>Paid:</strong> ${formatCurrency(invoice.amountPaid || 0)}</p>
          <p><strong>Balance:</strong> ${formatCurrency(invoice.balanceDue || 0)}</p>
          <span class="status-badge status-${(invoice.status || 'Unpaid').toLowerCase().replace(/\s+/g, '-')}">${invoice.status || 'Unpaid'}</span>
        </div>
      </div>
    `).join('')}
  `;
};

const renderCustomerProfileOverview = (customer) => {
  const visits = (customer.visits || []).slice().reverse();
  return `
    <div class="panel-card">
      <h4>Visit History</h4>
      ${visits.length === 0 ? '<p>No purchase or visit history available.</p>' : `
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Reference</th><th>Amount Paid</th></tr>
          </thead>
          <tbody>
            ${visits.map((visit) => `
              <tr>
                <td>${formatDate(visit.visitDate)}</td>
                <td>${visit.invoiceId || visit.prescriptionId || 'N/A'}</td>
                <td>${formatCurrency(visit.amountPaid || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
};

const syncFormWithCustomer = (customer = null) => {
  const modal = document.getElementById('customerModal');
  const customerIdInput = document.getElementById('customerId');
  const nameInput = document.getElementById('customerName');
  const mobileInput = document.getElementById('customerMobile');
  const alternateInput = document.getElementById('customerAlternate');
  const locationInput = document.getElementById('customerLocation');
  const dobInput = document.getElementById('customerDob');
  const emailInput = document.getElementById('customerEmail');
  const genderInput = document.getElementById('customerGender');
  const registrationInput = document.getElementById('customerRegistration');
  if (!modal) return;
  if (customer) {
    customerIdInput.value = customer.id;
    nameInput.value = customer.name;
    mobileInput.value = customer.mobile;
    alternateInput.value = customer.alternateMobile || '';
    locationInput.value = customer.location;
    dobInput.value = customer.dob || '';
    emailInput.value = customer.email || '';
    genderInput.value = customer.gender || '';
    registrationInput.value = customer.registrationDate;
    modal.querySelector('h3').textContent = 'Edit Customer';
  } else {
    const generatedId = generateCustomerId(customerState.customers);
    customerIdInput.value = generatedId;
    nameInput.value = '';
    mobileInput.value = '';
    alternateInput.value = '';
    locationInput.value = '';
    dobInput.value = '';
    emailInput.value = '';
    genderInput.value = '';
    registrationInput.value = formatDate(new Date());
    modal.querySelector('h3').textContent = 'Add New Customer';
  }
};

const openCustomerModal = (customer = null) => {
  const modal = document.getElementById('customerModal');
  if (!modal) return;
  syncFormWithCustomer(customer);
  modal.classList.remove('hidden');
};

const closeCustomerModal = () => {
  document.getElementById('customerModal')?.classList.add('hidden');
};

const validateCustomerForm = () => {
  const nameInput = document.getElementById('customerName');
  const mobileInput = document.getElementById('customerMobile');
  const locationInput = document.getElementById('customerLocation');
  const emailInput = document.getElementById('customerEmail');
  const customerId = document.getElementById('customerId').value;
  const errors = {};

  if (nameInput.value.trim() && !String(nameInput.value.trim()).match(/^[a-zA-Z\s.-]+$/)) {
    errors.name = 'Name contains invalid characters';
  }
  if (mobileInput.value.trim() && !validateMobile(mobileInput.value.trim())) {
    errors.mobile = 'Mobile must be 10 digits';
  } else if (mobileInput.value.trim()) {
    const duplicate = customerState.customers.find((cust) => String(cust.mobile || '').trim() === mobileInput.value.trim() && cust.id !== customerId);
    if (duplicate) errors.mobile = 'Customer with this mobile already exists';
  }
  if (locationInput.value.trim() && locationInput.value.trim().length < 2) {
    errors.location = 'Address is too short';
  }
  if (emailInput.value.trim() && !validateEmail(emailInput.value.trim())) {
    errors.email = 'Invalid email format';
  }
  document.getElementById('customerNameError').textContent = errors.name || '';
  document.getElementById('customerMobileError').textContent = errors.mobile || '';
  document.getElementById('customerLocationError').textContent = errors.location || '';
  document.getElementById('customerEmailError').textContent = errors.email || '';
  return Object.keys(errors).length === 0;
};

const submitCustomerForm = (event) => {
  event.preventDefault();
  const customerId = document.getElementById('customerId').value;
  if (!validateCustomerForm()) return;
  const existingCustomers = customerState.customers;
  const nameValue = document.getElementById('customerName').value.trim();
  const customer = {
    id: customerId,
    name: nameValue || 'Unnamed Customer',
    mobile: document.getElementById('customerMobile').value.trim(),
    alternateMobile: document.getElementById('customerAlternate').value.trim(),
    location: document.getElementById('customerLocation').value.trim(),
    dob: document.getElementById('customerDob').value,
    email: document.getElementById('customerEmail').value.trim(),
    gender: document.getElementById('customerGender').value,
    registrationDate: document.getElementById('customerRegistration').value,
    visits: [],
    totalVisits: 0,
    lastVisitDate: '',
    notes: '',
    profileImage: ''
  };
  const existing = existingCustomers.find((cust) => cust.id === customerId);
  if (existing) {
    const updatedList = existingCustomers.map((cust) => (cust.id === customerId ? { ...cust, ...customer, visits: cust.visits, totalVisits: cust.totalVisits, lastVisitDate: cust.lastVisitDate, notes: cust.notes, profileImage: cust.profileImage } : cust));
    if (!saveData(STORAGE_KEYS.customers, updatedList)) return;
    trackActivity(`Customer updated: ${customer.name}`);
    showToast('Customer updated successfully!', 'success');
  } else {
    if (!saveData(STORAGE_KEYS.customers, [...existingCustomers, customer])) return;
    trackActivity(`Customer added: ${customer.name}`);
    showToast('Customer added successfully!', 'success');
  }
  loadCustomers();
  closeCustomerModal();
};

const renderCustomerProfileModal = (customer) => {
  const modal = document.getElementById('customerViewModal');
  const body = document.getElementById('customerViewBody');
  if (!modal || !body || !customer) return;
  const normalizedCustomer = normalizeCustomerRecord(customer);
  const totalSpent = getCustomerInvoiceTotal(normalizedCustomer.id);
  body.innerHTML = `
    <div class="panel-card">
      <h4>${normalizedCustomer.name}</h4>
      <p><strong>ID:</strong> ${normalizedCustomer.id}</p>
      <p><strong>Mobile:</strong> ${normalizedCustomer.mobile ? formatPhone(normalizedCustomer.mobile) : 'No mobile'}</p>
      <p><strong>Alternate Mobile:</strong> ${normalizedCustomer.alternateMobile ? formatPhone(normalizedCustomer.alternateMobile) : 'No alternate mobile'}</p>
      <p><strong>Location:</strong> ${normalizedCustomer.location || 'No address'}</p>
      <p><strong>Email:</strong> ${normalizedCustomer.email || 'N/A'}</p>
      <p><strong>Total Visits:</strong> ${normalizedCustomer.totalVisits || 0}</p>
      <p><strong>Total Spent:</strong> ${formatCurrency(totalSpent || normalizedCustomer.totalSpent || 0)}</p>
      <p><strong>Last Visit:</strong> ${normalizedCustomer.lastVisitDate ? formatDate(normalizedCustomer.lastVisitDate) : 'N/A'}</p>
      <p><strong>Registration Date:</strong> ${normalizedCustomer.registrationDate || 'N/A'}</p>
    </div>
    <div class="panel-card">
      <div class="profile-tabs" role="tablist">
        <button class="tab-button active" data-tab="overview">Overview</button>
        <button class="tab-button" data-tab="prescriptions">Prescriptions</button>
        <button class="tab-button" data-tab="invoices">Invoices</button>
      </div>
      <div id="customerProfileTabContent">
        ${renderCustomerProfileOverview(customer)}
      </div>
    </div>
  `;
  const profileButtons = body.querySelectorAll('.profile-tabs .tab-button');
  profileButtons.forEach((tabButton) => {
    tabButton.dataset.customerId = customer.id;
  });

  if (!body.dataset.listenerAttached) {
    body.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-tab]');
      if (!button) return;
      const tab = button.dataset.tab;
      const customerId = button.dataset.customerId;
      const content = document.getElementById('customerProfileTabContent');
      if (!content || !customerId) return;
      document.querySelectorAll('.profile-tabs .tab-button').forEach((tabButton) => tabButton.classList.toggle('active', tabButton.dataset.tab === tab));
      if (tab === 'prescriptions') {
        loadCustomerPrescriptions(customerId);
      } else if (tab === 'invoices') {
        loadCustomerInvoices(customerId);
      } else {
        const currentCustomer = customerState.customers.find((cust) => cust.id === customerId) || customer;
        content.innerHTML = renderCustomerProfileOverview(currentCustomer);
      }
    });
    body.dataset.listenerAttached = 'true';
  }
  modal.classList.remove('hidden');
};

const closeCustomerProfileModal = () => {
  document.getElementById('customerViewModal')?.classList.add('hidden');
};

const handleCustomerTable = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const action = button.dataset.action;
  const customerId = button.dataset.id;
  const customer = customerState.customers.find((cust) => cust.id === customerId);
  if (action === 'view' && customer) {
    renderCustomerProfileModal(customer);
  }
  if (action === 'edit' && customer) {
    openCustomerModal(customer);
  }
  if (action === 'delete' && customer) {
    const confirmed = confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`);
    if (!confirmed) return;
    deleteData(STORAGE_KEYS.customers, (cust) => cust.id === customerId);
    trackActivity(`Customer deleted: ${customer.name}`);
    showToast('Customer deleted successfully.', 'success');
    loadCustomers();
  }
};

const initCustomerPage = () => {
  if (!document.getElementById('customerSearch')) return;
  loadCustomers();
  createAlphabetTabs();
  renderCustomerTable();
  const searchInput = document.getElementById('customerSearch');
  const filterSelect = document.getElementById('customerFilter');
  const exportButton = document.getElementById('exportCustomers');
  const openFormButton = document.getElementById('openCustomerForm');
  const closeModalButton = document.getElementById('closeCustomerModal');
  const cancelModalButton = document.getElementById('cancelCustomerForm');
  const resetModalButton = document.getElementById('resetCustomerForm');
  const modal = document.getElementById('customerModal');
  const table = document.getElementById('customerTable');

  openFormButton.addEventListener('click', () => openCustomerModal());
  closeModalButton.addEventListener('click', closeCustomerModal);
  cancelModalButton.addEventListener('click', closeCustomerModal);
  resetModalButton.addEventListener('click', () => syncFormWithCustomer(document.getElementById('customerId').value ? customerState.customers.find((cust) => cust.id === document.getElementById('customerId').value) : null));
  document.getElementById('customerForm').addEventListener('submit', submitCustomerForm);

  searchInput.addEventListener('input', debounce((event) => {
    const value = event.target.value.trim().toLowerCase();
    customerState.searchQuery = value;
    customerState.currentPage = 1;
    applyCustomerFilters();
    if (!value) {
      document.getElementById('searchSuggestions').innerHTML = '';
      return;
    }
    const results = customerState.customers
      .map(normalizeCustomerRecord)
      .filter((cust) => [cust.name, cust.mobile, cust.id].some((field) => String(field || '').toLowerCase().includes(value)))
      .slice(0, 5);
    const suggestions = results.map((cust) => `<button type="button" data-id="${cust.id}">${cust.name} - ${cust.mobile ? formatPhone(cust.mobile) : 'No mobile'} - ${cust.lastVisitDate ? formatDate(cust.lastVisitDate) : 'No visit'}</button>`).join('');
    document.getElementById('searchSuggestions').innerHTML = suggestions || '<div class="search-empty">No results found.</div>';
  }), 300);

  document.getElementById('searchSuggestions').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const customer = customerState.customers.find((cust) => cust.id === button.dataset.id);
    if (customer) openCustomerModal(customer);
  });

  filterSelect.addEventListener('change', (event) => {
    customerState.filterMode = event.target.value;
    customerState.currentPage = 1;
    applyCustomerFilters();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.customers || event.key === null) loadCustomers();
  });

  exportButton.addEventListener('click', () => {
    const csvData = customerState.customers.map((cust) => ({
      CustomerID: cust.id,
      Name: cust.name,
      Mobile: formatPhone(cust.mobile),
      Location: cust.location,
      Email: cust.email,
      Gender: cust.gender,
      RegistrationDate: cust.registrationDate,
      LastVisitDate: cust.lastVisitDate || 'N/A',
      TotalVisits: cust.totalVisits || 0
    }));
    exportCSV(csvData, 'customers.csv');
  });

  table.addEventListener('click', handleCustomerTable);
  document.getElementById('customerPagination').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !button.dataset.page) return;
    customerState.currentPage = Number(button.dataset.page);
    renderCustomerTable();
  });

  document.querySelectorAll('#customerTable th[data-sort]').forEach((header) => {
    header.addEventListener('click', () => {
      const key = header.dataset.sort;
      customerState.sortDirection = customerState.sortKey === key && customerState.sortDirection === 'asc' ? 'desc' : 'asc';
      customerState.sortKey = key;
      applyCustomerFilters();
    });
  });
  document.getElementById('closeCustomerViewModal')?.addEventListener('click', closeCustomerProfileModal);
  document.getElementById('closeCustomerViewButton')?.addEventListener('click', closeCustomerProfileModal);
};

window.addEventListener('DOMContentLoaded', () => {
  initCustomerPage();
});
