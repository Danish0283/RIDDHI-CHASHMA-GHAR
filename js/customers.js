const customerState = {
  customers: [],
  filtered: [],
  currentPage: 1,
  sortKey: 'name',
  sortDirection: 'asc',
  activeLetter: 'all',
  filterMode: 'all'
};

const loadCustomers = () => {
  customerState.customers = getData(STORAGE_KEYS.customers) || [];
  applyCustomerFilters();
};

const applyCustomerFilters = () => {
  let list = [...customerState.customers];
  if (customerState.filterMode === 'recent') {
    list = list.filter((cust) => cust.lastVisitDate && daysDifference(cust.lastVisitDate) <= 30);
  }
  if (customerState.filterMode === 'inactive') {
    list = list.filter((cust) => !cust.lastVisitDate || daysDifference(cust.lastVisitDate) >= 365);
  }
  if (customerState.activeLetter !== 'all') {
    list = list.filter((cust) => cust.name.charAt(0).toUpperCase() === customerState.activeLetter);
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
  const start = (customerState.currentPage - 1) * 20;
  const pageItems = customerState.filtered.slice(start, start + 20);
  tbody.innerHTML = pageItems.map((customer) => {
    const totalSpent = getCustomerInvoiceTotal(customer.id);
    return `
      <tr>
        <td>${customer.id}</td>
        <td>${customer.name}</td>
        <td>${formatPhone(customer.mobile)}</td>
        <td>${customer.location}</td>
        <td>${formatCurrency(totalSpent || customer.totalSpent || 0)}</td>
        <td>${customer.lastVisitDate ? formatDate(customer.lastVisitDate) : '—'}</td>
        <td>${customer.totalVisits || 0}</td>
        <td>
          <button class="secondary-btn small" data-action="view" data-id="${customer.id}">View</button>
          <button class="info-btn small" data-action="edit" data-id="${customer.id}">Edit</button>
          <button class="danger-btn small" data-action="delete" data-id="${customer.id}">Delete</button>
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
  for (let i = 1; i <= totalPages; i += 1) {
    buttons.push(`<button class="${customerState.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`);
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
  if (!nameInput.value.trim()) {
    errors.name = 'This field is required';
  }
  if (!validateMobile(mobileInput.value.trim())) {
    errors.mobile = 'Mobile must be 10 digits';
  } else {
    const duplicate = customerState.customers.find((cust) => cust.mobile === mobileInput.value.trim() && cust.id !== customerId);
    if (duplicate) errors.mobile = 'Customer with this mobile already exists';
  }
  if (!locationInput.value.trim()) {
    errors.location = 'This field is required';
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
  const customer = {
    id: customerId,
    name: document.getElementById('customerName').value.trim(),
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
    saveData(STORAGE_KEYS.customers, updatedList);
    trackActivity(`Customer updated: ${customer.name}`);
    showToast('Customer updated successfully!', 'success');
  } else {
    saveData(STORAGE_KEYS.customers, [...existingCustomers, customer]);
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
  const totalSpent = getCustomerInvoiceTotal(customer.id);
  body.innerHTML = `
    <div class="panel-card">
      <h4>${customer.name}</h4>
      <p><strong>ID:</strong> ${customer.id}</p>
      <p><strong>Mobile:</strong> ${formatPhone(customer.mobile)}</p>
      <p><strong>Alternate Mobile:</strong> ${formatPhone(customer.alternateMobile || '')}</p>
      <p><strong>Location:</strong> ${customer.location}</p>
      <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
      <p><strong>Total Visits:</strong> ${customer.totalVisits || 0}</p>
      <p><strong>Total Spent:</strong> ${formatCurrency(totalSpent || customer.totalSpent || 0)}</p>
      <p><strong>Last Visit:</strong> ${customer.lastVisitDate ? formatDate(customer.lastVisitDate) : 'N/A'}</p>
      <p><strong>Registration Date:</strong> ${customer.registrationDate}</p>
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
  if (!body.dataset.listenerAttached) {
    body.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-tab]');
      if (!button) return;
      const tab = button.dataset.tab;
      const customerId = button.dataset.customerId;
      const content = document.getElementById('customerProfileTabContent');
      if (!content) return;
      document.querySelectorAll('.profile-tabs .tab-button').forEach((tabButton) => tabButton.classList.toggle('active', tabButton.dataset.tab === tab));
      if (tab === 'prescriptions') {
        loadCustomerPrescriptions(customerId);
      } else if (tab === 'invoices') {
        loadCustomerInvoices(customerId);
      } else {
        content.innerHTML = renderCustomerProfileOverview(customerState.customers.find((cust) => cust.id === customerId) || customer);
      }
    });
    body.dataset.listenerAttached = 'true';
  }
  body.querySelector('.profile-tabs .tab-button')?.setAttribute('data-customer-id', customer.id);
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
    if (!value) {
      applyCustomerFilters();
      document.getElementById('searchSuggestions').innerHTML = '';
      return;
    }
    const results = customerState.customers.filter((cust) => [cust.name, cust.mobile, cust.id].some((field) => field.toLowerCase().includes(value))).slice(0, 5);
    const suggestions = results.map((cust) => `<button type="button" data-id="${cust.id}">${cust.name} - ${formatPhone(cust.mobile)} - ${cust.lastVisitDate ? formatDate(cust.lastVisitDate) : 'No visit'}</button>`).join('');
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

  const body = document.getElementById('customerViewBody');
  if (body && !body.dataset.listenerAttached) {
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
        const currentCustomer = customerState.customers.find((cust) => cust.id === customerId);
        content.innerHTML = renderCustomerProfileOverview(currentCustomer || customerState.customers[0]);
      }
    });
    body.dataset.listenerAttached = 'true';
  }

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
