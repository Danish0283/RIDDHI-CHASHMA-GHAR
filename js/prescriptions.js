const getPrescriptionById = (id) => getData(STORAGE_KEYS.prescriptions).find((prescription) => prescription.prescriptionId === id);

const generatePrescriptionOptions = () => {
  const optionPairs = [
    { selector: '[id$="_sph_dv"]', start: -20, end: 20, step: 0.25, label: 'sph' },
    { selector: '[id$="_cyl_dv"]', start: -6, end: 6, step: 0.25, label: 'cyl' },
    { selector: '[id$="_axis_dv"]', start: 1, end: 180, step: 1, label: 'axis' },
    { selector: '[id$="_add"]', start: 0.75, end: 3.5, step: 0.25, label: 'add' }
  ];

  optionPairs.forEach(({ selector, start, end, step }) => {
    document.querySelectorAll(selector).forEach((select) => {
      const values = [];
      for (let value = start; value <= end; value += step) {
        const formatted = Number(value).toFixed(2);
        values.push({ value: formatted, label: `${value > 0 ? '+' : ''}${formatted}` });
      }
      select.innerHTML = '<option value="">Select</option>' + values.map(({ value, label }) => `<option value="${value}">${label}</option>`).join('');
    });
  });

  document.querySelectorAll('[id$="_axis_dv"]').forEach((select) => {
    select.innerHTML = '<option value="">Select</option>' + Array.from({ length: 180 }, (_, index) => index + 1).map((value) => `<option value="${value}">${value}°</option>`).join('');
  });
};

const resetPrescriptionForm = () => {
  document.getElementById('prescriptionForm')?.reset();
  document.getElementById('prescriptionDate').value = getTodayISO();
  const selectedCustomer = document.getElementById('selectedCustomer');
  const customerAddress = document.getElementById('custAddress');
  const historyList = document.getElementById('customerHistoryList');
  if (selectedCustomer) selectedCustomer.style.display = 'none';
  if (customerAddress) customerAddress.textContent = 'No address';
  if (historyList) historyList.innerHTML = '';
  document.getElementById('selectedCustomerId').value = '';
  document.getElementById('customerSearch').value = '';
  document.getElementById('customerDropdown').innerHTML = '';
  document.getElementById('customerDropdown').style.display = 'none';
  document.getElementById('prescriptionCustomerError').textContent = '';
  document.getElementById('nearVisionSection').style.display = 'none';
  document.getElementById('singlePDSection').style.display = 'block';
  document.getElementById('dualPDSection').style.display = 'none';
  document.getElementById('pdType').value = 'single';
};

const openPrescriptionModal = () => {
  const modal = document.getElementById('prescriptionModal');
  if (!modal) return;
  resetPrescriptionForm();
  generatePrescriptionOptions();
  modal.classList.remove('hidden');
  setTimeout(() => document.getElementById('customerSearch')?.focus(), 100);
};

const closePrescriptionModal = () => {
  document.getElementById('prescriptionModal')?.classList.add('hidden');
};

const toggleNearVision = () => {
  const lensType = document.getElementById('lensType').value;
  const section = document.getElementById('nearVisionSection');
  section.style.display = lensType === 'Bifocal' || lensType === 'Progressive' ? 'block' : 'none';
};

const togglePDInputs = () => {
  const pdType = document.getElementById('pdType').value;
  document.getElementById('singlePDSection').style.display = pdType === 'single' ? 'block' : 'none';
  document.getElementById('dualPDSection').style.display = pdType === 'dual' ? 'block' : 'none';
};

const copyRightToLeft = () => {
  document.getElementById('os_sph_dv').value = document.getElementById('od_sph_dv').value;
  document.getElementById('os_cyl_dv').value = document.getElementById('od_cyl_dv').value;
  document.getElementById('os_axis_dv').value = document.getElementById('od_axis_dv').value;
  document.getElementById('os_va_dv').value = document.getElementById('od_va_dv').value;
  showToast('Right eye values copied to left eye.', 'success');
};

const renderCustomerPrescriptionHistory = (customerId) => {
  const historyList = document.getElementById('customerHistoryList');
  if (!historyList) return;

  const customerPrescriptions = (getData(STORAGE_KEYS.prescriptions) || []).filter((prescription) => prescription.customerId === customerId)
    .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0))
    .slice(0, 5);

  if (!customerPrescriptions.length) {
    historyList.innerHTML = '<small>No previous prescriptions found.</small>';
    return;
  }

  historyList.innerHTML = customerPrescriptions.map((prescription) => `
    <div class="history-item">
      <strong>${formatDate(prescription.date || '') || 'Date N/A'}</strong>
      <span>${prescription.prescriptionId || 'Prescription'}</span>
      <small>${prescription.lensType || 'Lens type not specified'}</small>
    </div>
  `).join('');
};

const selectPrescriptionCustomer = (customer) => {
  if (!customer) return;

  const selectedCustomer = document.getElementById('selectedCustomer');
  const customerAddress = document.getElementById('custAddress');
  const customerSearch = document.getElementById('customerSearch');
  const dropdown = document.getElementById('customerDropdown');

  document.getElementById('selectedCustomerId').value = customer.id;
  document.getElementById('custName').textContent = customer.name || 'Unnamed Customer';
  document.getElementById('custMobile').textContent = customer.mobile || 'No mobile';
  if (customerAddress) {
    customerAddress.textContent = customer.address || customer.location || 'No address';
  }
  if (selectedCustomer) selectedCustomer.style.display = 'block';
  if (customerSearch) customerSearch.value = customer.name || '';
  if (dropdown) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
  }

  renderCustomerPrescriptionHistory(customer.id);
};

globalThis.selectPrescriptionCustomer = selectPrescriptionCustomer;

const getPrescriptionCustomerMatches = (customers = [], query = '') => {
  const normalized = String(query || '').trim().toLowerCase();
  const mapped = (customers || []).map((customer) => ({
    ...customer,
    name: customer.name || 'Unnamed Customer',
    mobile: customer.mobile || 'No mobile',
    id: customer.id || ''
  })).sort((left, right) => left.name.localeCompare(right.name));

  if (!normalized) return mapped;

  return mapped.filter((customer) => {
    const haystack = `${customer.name} ${customer.mobile} ${customer.id}`.toLowerCase();
    return haystack.includes(normalized);
  });
};

globalThis.getPrescriptionCustomerMatches = getPrescriptionCustomerMatches;

const searchPrescriptionCustomers = (query) => {
  const customers = getData(STORAGE_KEYS.customers) || [];
  const results = getPrescriptionCustomerMatches(customers, query);

  const dropdown = document.getElementById('customerDropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '';
  if (results.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-item">No customers found</div>';
    dropdown.style.display = 'block';
    return;
  }

  results.forEach((customer) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'dropdown-item';
    item.innerHTML = `<strong>${customer.name}</strong><br><small>${customer.mobile} - ${customer.id}</small>`;
    item.dataset.customerId = customer.id;
    dropdown.appendChild(item);
  });
  dropdown.style.display = 'block';
};

const toggleQuickCustomerAdd = () => {
  const quickAddForm = document.getElementById('customerQuickAddForm');
  if (!quickAddForm) return;

  const isHidden = quickAddForm.style.display === 'none';
  quickAddForm.style.display = isHidden ? 'block' : 'none';
  quickAddForm.classList.toggle('hidden', !isHidden);

  if (isHidden) {
    setTimeout(() => {
      document.getElementById('quickCustomerName')?.focus();
    }, 50);
  }
};

const saveQuickCustomerAddition = () => {
  const nameInput = document.getElementById('quickCustomerName');
  const mobileInput = document.getElementById('quickCustomerMobile');
  const addressInput = document.getElementById('quickCustomerAddress');
  const customerName = String(nameInput?.value || '').trim();
  const customerMobile = String(mobileInput?.value || '').replace(/\D+/g, '');
  const customerAddress = String(addressInput?.value || '').trim();

  if (!customerName && !customerMobile && !customerAddress) {
    showToast('Enter a customer name or mobile to save.', 'error');
    return;
  }

  const customers = getData(STORAGE_KEYS.customers) || [];
  const customer = {
    id: generateCustomerId(customers),
    name: customerName || 'Unnamed Customer',
    mobile: customerMobile,
    address: customerAddress,
    location: customerAddress,
    alternateMobile: '',
    dob: '',
    email: '',
    gender: '',
    registrationDate: formatDate(new Date()),
    visits: [],
    totalVisits: 0,
    lastVisitDate: '',
    notes: '',
    profileImage: ''
  };

  saveData(STORAGE_KEYS.customers, [...customers, customer]);
  selectPrescriptionCustomer(customer);
  if (nameInput) nameInput.value = '';
  if (mobileInput) mobileInput.value = '';
  if (addressInput) addressInput.value = '';
  const quickAddForm = document.getElementById('customerQuickAddForm');
  if (quickAddForm) {
    quickAddForm.style.display = 'none';
    quickAddForm.classList.add('hidden');
  }
  showToast('Customer saved and added to the prescription list.', 'success');
  searchPrescriptionCustomers('');
};

const bindPrescriptionCustomerSearch = () => {
  const input = document.getElementById('customerSearch');
  const dropdown = document.getElementById('customerDropdown');
  if (!input || !dropdown) return;

  const refreshCustomersFromStore = () => {
    searchPrescriptionCustomers(input.value);
  };

  input.addEventListener('input', (event) => {
    searchPrescriptionCustomers(event.target.value);
  });

  input.addEventListener('focus', () => {
    searchPrescriptionCustomers(input.value);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement?.closest('#customerDropdown')) return;
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }, 150);
  });

  dropdown.addEventListener('mousedown', (event) => {
    const item = event.target.closest('.dropdown-item');
    if (!item?.dataset.customerId) return;
    event.preventDefault();
    const customer = (getData(STORAGE_KEYS.customers) || []).find((entry) => entry.id === item.dataset.customerId);
    if (customer) selectPrescriptionCustomer(customer);
  });

  dropdown.addEventListener('click', (event) => {
    const item = event.target.closest('.dropdown-item');
    if (!item?.dataset.customerId) return;
    event.preventDefault();
    const customer = (getData(STORAGE_KEYS.customers) || []).find((entry) => entry.id === item.dataset.customerId);
    if (customer) selectPrescriptionCustomer(customer);
  });

  document.addEventListener('mousedown', (event) => {
    if (!dropdown.contains(event.target) && event.target !== input) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.customers) refreshCustomersFromStore();
  });

  window.addEventListener('customers:updated', refreshCustomersFromStore);
};

const validatePrescriptionForm = () => {
  const customerId = document.getElementById('selectedCustomerId').value;
  const errors = {};
  if (!customerId) errors.customer = 'Please select a customer.';
  const odCyl = document.getElementById('od_cyl_dv').value;
  const odAxis = document.getElementById('od_axis_dv').value;
  const osCyl = document.getElementById('os_cyl_dv').value;
  const osAxis = document.getElementById('os_axis_dv').value;
  if (odCyl && odCyl !== '0.00' && !odAxis) errors.odAxis = 'AXIS required when CYL is specified.';
  if (osCyl && osCyl !== '0.00' && !osAxis) errors.osAxis = 'AXIS required when CYL is specified.';
  document.getElementById('prescriptionCustomerError').textContent = errors.customer || '';
  return Object.keys(errors).length === 0;
};

const buildPrescriptionTable = () => {
  const tbody = document.querySelector('#prescriptionTable tbody');
  if (!tbody) return;
  const prescriptions = getData(STORAGE_KEYS.prescriptions) || [];
  const customers = getData(STORAGE_KEYS.customers) || [];
  tbody.innerHTML = prescriptions.map((prescription) => {
    const customer = customers.find((cust) => cust.id === prescription.customerId) || { name: 'Unknown' };
    const summary = `OD: SPH ${prescription.distanceVision?.rightEye?.sph || 0} CYL ${prescription.distanceVision?.rightEye?.cyl || 0}`;
    return `
      <tr>
        <td>${formatDate(prescription.date)}</td>
        <td>${customer.name}</td>
        <td>${summary}</td>
        <td>${prescription.lensType}</td>
        <td>
          <button class="secondary-btn small" data-action="view" data-id="${prescription.prescriptionId}">View</button>
          <button class="info-btn small" data-action="print" data-id="${prescription.prescriptionId}">Print</button>
          <button class="danger-btn small" data-action="delete" data-id="${prescription.prescriptionId}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
};

const createPrescriptionObject = () => {
  const customerId = document.getElementById('selectedCustomerId').value;
  const date = document.getElementById('prescriptionDate').value || getTodayISO();
  const doctorName = document.getElementById('doctorName').value.trim();
  const coatings = Array.from(document.querySelectorAll('.coating-checkbox input:checked')).map((checkbox) => checkbox.value);
  const pdType = document.getElementById('pdType').value;
  const pd = pdType === 'single' ? document.getElementById('pd_single').value : `${document.getElementById('pd_right').value}/${document.getElementById('pd_left').value}`;
  const brand = document.getElementById('lensBrand').value;
  return {
    prescriptionId: generateId('PRE', getData(STORAGE_KEYS.prescriptions)),
    customerId,
    date,
    doctorName,
    distanceVision: {
      rightEye: {
        sph: document.getElementById('od_sph_dv').value,
        cyl: document.getElementById('od_cyl_dv').value,
        axis: document.getElementById('od_axis_dv').value,
        va: document.getElementById('od_va_dv').value
      },
      leftEye: {
        sph: document.getElementById('os_sph_dv').value,
        cyl: document.getElementById('os_cyl_dv').value,
        axis: document.getElementById('os_axis_dv').value,
        va: document.getElementById('os_va_dv').value
      }
    },
    nearVision: {
      rightEye: { add: document.getElementById('od_add').value, va: document.getElementById('od_va_nv').value },
      leftEye: { add: document.getElementById('os_add').value, va: document.getElementById('os_va_nv').value }
    },
    pd,
    pdType,
    lensType: document.getElementById('lensType').value,
    lensMaterial: document.getElementById('lensMaterial').value,
    lensIndex: document.getElementById('lensIndex').value,
    coatings,
    lensBrand: brand,
    lensColor: document.getElementById('lensColor').value,
    frameType: document.getElementById('frameType').value,
    notes: document.getElementById('prescriptionNotes').value,
    createdAt: new Date().toISOString()
  };
};

const savePrescription = (event) => {
  event.preventDefault();
  if (!validatePrescriptionForm()) return;
  const prescription = createPrescriptionObject();
  const prescriptions = getData(STORAGE_KEYS.prescriptions) || [];
  saveData(STORAGE_KEYS.prescriptions, [...prescriptions, prescription]);
  const customers = getData(STORAGE_KEYS.customers) || [];
  const updatedCustomers = customers.map((customer) => {
    if (customer.id !== prescription.customerId) return customer;
    return {
      ...customer,
      visits: [...(customer.visits || []), {
        visitId: prescription.prescriptionId,
        visitDate: prescription.date,
        prescriptionId: prescription.prescriptionId,
        type: 'prescription',
        lensesUsed: prescription.lensType,
        amountPaid: 0
      }],
      totalVisits: (customer.totalVisits || 0) + 1,
      lastVisitDate: prescription.date
    };
  });
  saveData(STORAGE_KEYS.customers, updatedCustomers);
  trackActivity(`Prescription saved for ${getCustomerById(prescription.customerId)?.name || 'Customer'}`);
  showToast('Prescription saved successfully!', 'success');
  closePrescriptionModal();
  buildPrescriptionTable();
};

const printPrescription = (prescriptionId) => {
  const prescription = getPrescriptionById(prescriptionId);
  if (!prescription) return;
  const customer = getCustomerById(prescription.customerId);
  const content = `
    <html>
      <head>
        <title>Prescription - ${prescription.prescriptionId}</title>
        <style>body{font-family:Arial,sans-serif;padding:24px}h1,h2,p{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #d1d5db;padding:8px}</style>
      </head>
      <body>
        <h1>RIDDHI CHASHMA GHAR</h1>
        <p><strong>Prescription:</strong> ${prescription.prescriptionId}</p>
        <p><strong>Customer:</strong> ${customer?.name || 'Unknown'}</p>
        <p><strong>Date:</strong> ${formatDate(prescription.date)}</p>
        <p><strong>Doctor:</strong> ${prescription.doctorName || 'N/A'}</p>
        <table><thead><tr><th>Field</th><th>OD</th><th>OS</th></tr></thead><tbody><tr><td>SPH</td><td>${prescription.distanceVision?.rightEye?.sph || ''}</td><td>${prescription.distanceVision?.leftEye?.sph || ''}</td></tr><tr><td>CYL</td><td>${prescription.distanceVision?.rightEye?.cyl || ''}</td><td>${prescription.distanceVision?.leftEye?.cyl || ''}</td></tr><tr><td>AXIS</td><td>${prescription.distanceVision?.rightEye?.axis || ''}</td><td>${prescription.distanceVision?.leftEye?.axis || ''}</td></tr><tr><td>ADD</td><td>${prescription.nearVision?.rightEye?.add || ''}</td><td>${prescription.nearVision?.leftEye?.add || ''}</td></tr></tbody></table>
        <p><strong>Lens Type:</strong> ${prescription.lensType}</p>
        <p><strong>Coatings:</strong> ${prescription.coatings.join(', ') || 'None'}</p>
        <p><strong>Brand:</strong> ${prescription.lensBrand || 'N/A'}</p>
        <p><strong>PD:</strong> ${prescription.pd}</p>
      </body>
    </html>
  `;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const viewPrescriptionDetails = (prescriptionId) => {
  const prescription = getPrescriptionById(prescriptionId);
  const customer = getCustomerById(prescription?.customerId);
  const modal = document.getElementById('prescriptionViewModal');
  const body = document.getElementById('prescriptionViewBody');
  if (!modal || !body || !prescription) return;
  body.innerHTML = `
    <div class="panel-card">
      <h4>Customer</h4>
      <p><strong>${customer?.name || 'Unknown'}</strong> (${customer?.id || ''})</p>
      <p><strong>Date:</strong> ${formatDate(prescription.date)}</p>
      <p><strong>Doctor:</strong> ${prescription.doctorName || 'N/A'}</p>
    </div>
    <div class="panel-card">
      <h4>Prescription</h4>
      <table>
        <thead><tr><th></th><th>OD</th><th>OS</th></tr></thead>
        <tbody>
          <tr><td>SPH</td><td>${prescription.distanceVision?.rightEye?.sph || ''}</td><td>${prescription.distanceVision?.leftEye?.sph || ''}</td></tr>
          <tr><td>CYL</td><td>${prescription.distanceVision?.rightEye?.cyl || ''}</td><td>${prescription.distanceVision?.leftEye?.cyl || ''}</td></tr>
          <tr><td>AXIS</td><td>${prescription.distanceVision?.rightEye?.axis || ''}</td><td>${prescription.distanceVision?.leftEye?.axis || ''}</td></tr>
          <tr><td>ADD</td><td>${prescription.nearVision?.rightEye?.add || ''}</td><td>${prescription.nearVision?.leftEye?.add || ''}</td></tr>
        </tbody>
      </table>
      <p><strong>PD:</strong> ${prescription.pd}</p>
      <p><strong>Lens Type:</strong> ${prescription.lensType}</p>
      <p><strong>Coatings:</strong> ${prescription.coatings.join(', ') || 'None'}</p>
      <p><strong>Brand:</strong> ${prescription.lensBrand || 'N/A'}</p>
    </div>
  `;
  modal.classList.remove('hidden');
};

const initPrescriptionPage = () => {
  if (!document.getElementById('prescriptionSearch')) return;
  resetPrescriptionForm();
  buildPrescriptionTable();

  document.getElementById('openPrescriptionForm').addEventListener('click', openPrescriptionModal);
  document.getElementById('closePrescriptionModal').addEventListener('click', closePrescriptionModal);
  document.getElementById('cancelPrescriptionForm').addEventListener('click', closePrescriptionModal);
  document.getElementById('quickAddCustomerButton')?.addEventListener('click', toggleQuickCustomerAdd);
  document.getElementById('cancelQuickCustomerAdd')?.addEventListener('click', toggleQuickCustomerAdd);
  document.getElementById('saveQuickCustomerAdd')?.addEventListener('click', saveQuickCustomerAddition);
  document.getElementById('prescriptionForm').addEventListener('submit', savePrescription);
  document.getElementById('copyRightToLeft').addEventListener('click', copyRightToLeft);
  document.getElementById('lensType').addEventListener('change', toggleNearVision);
  document.getElementById('pdType').addEventListener('change', togglePDInputs);
  bindPrescriptionCustomerSearch();

  document.getElementById('prescriptionTable').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'view') viewPrescriptionDetails(id);
    if (action === 'print') printPrescription(id);
    if (action === 'delete') {
      if (!confirm('Delete this prescription?')) return;
      deleteData(STORAGE_KEYS.prescriptions, (item) => item.prescriptionId === id);
      showToast('Prescription deleted.', 'success');
      buildPrescriptionTable();
    }
  });

  document.getElementById('prescriptionViewBody')?.closest('.modal')?.querySelector('#closePrescriptionView, #closePrescriptionViewButton')?.addEventListener('click', () => {
    document.getElementById('prescriptionViewModal').classList.add('hidden');
  });

  document.getElementById('prescriptionSearch').addEventListener('input', debounce((event) => {
    const query = event.target.value.trim().toLowerCase();
    const prescriptions = getData(STORAGE_KEYS.prescriptions) || [];
    const customers = getData(STORAGE_KEYS.customers) || [];
    const filtered = prescriptions.filter((prescription) => {
      const customer = customers.find((cust) => cust.id === prescription.customerId);
      return [prescription.prescriptionId, customer?.name, customer?.mobile, prescription.date].some((field) => field?.toString().toLowerCase().includes(query));
    });
    const tbody = document.querySelector('#prescriptionTable tbody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map((prescription) => {
      const customer = customers.find((cust) => cust.id === prescription.customerId) || { name: 'Unknown' };
      const summary = `OD: SPH ${prescription.distanceVision?.rightEye?.sph || 0} CYL ${prescription.distanceVision?.rightEye?.cyl || 0}`;
      return `
        <tr>
          <td>${formatDate(prescription.date)}</td>
          <td>${customer.name}</td>
          <td>${summary}</td>
          <td>${prescription.lensType}</td>
          <td>
            <button class="secondary-btn small" data-action="view" data-id="${prescription.prescriptionId}">View</button>
            <button class="info-btn small" data-action="print" data-id="${prescription.prescriptionId}">Print</button>
            <button class="danger-btn small" data-action="delete" data-id="${prescription.prescriptionId}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }), 300);
};

window.addEventListener('DOMContentLoaded', initPrescriptionPage);
