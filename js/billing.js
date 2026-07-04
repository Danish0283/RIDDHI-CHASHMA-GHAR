const billingState = {
  invoiceItems: []
};

const createInvoiceItemRow = (item = {}) => {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <div class="item-grid">
      <div class="form-group">
        <label>Item Description</label>
        <input type="text" class="item-input item-description" list="itemSuggestions" value="${item.description || ''}" placeholder="Frame, Lens, Service..." />
        <datalist id="itemSuggestions">
          <option value="Frame - Full Rim"></option>
          <option value="Frame - Half Rim"></option>
          <option value="Frame - Rimless"></option>
          <option value="Lenses - Single Vision"></option>
          <option value="Lenses - Bifocal"></option>
          <option value="Lenses - Progressive"></option>
          <option value="Anti-Glare Coating"></option>
          <option value="Blue Cut Coating"></option>
          <option value="Eye Check-up"></option>
          <option value="Frame Repair"></option>
          <option value="Cleaning Kit"></option>
          <option value="Spectacle Case"></option>
          <option value="Sunglasses"></option>
          <option value="Other"></option>
        </datalist>
      </div>
      <div class="form-group">
        <label>Qty</label>
        <input type="number" class="item-input item-qty" min="1" value="${item.qty || 1}" />
      </div>
      <div class="form-group">
        <label>Unit Price (₹)</label>
        <input type="number" class="item-input item-price" min="0" step="0.01" value="${item.unitPrice || 0}" />
      </div>
      <div class="form-group">
        <label>Amount (₹)</label>
        <input type="text" class="item-input item-amount" value="${formatCurrency(item.amount || 0)}" readonly />
      </div>
      <div class="form-group">
        <label>&nbsp;</label>
        <button type="button" class="danger-btn small item-remove">🗑️</button>
      </div>
    </div>
  `;
  row.querySelectorAll('input').forEach((input) => input.addEventListener('input', updateInvoiceCalculations));
  row.querySelector('.item-remove').addEventListener('click', () => {
    if (document.querySelectorAll('#itemsContainer .item-row').length === 1) return;
    row.remove();
    updateInvoiceCalculations();
  });
  return row;
};

const addInvoiceItem = () => {
  document.getElementById('itemsContainer').appendChild(createInvoiceItemRow());
  updateInvoiceCalculations();
};

const getInvoiceItemValues = () => {
  return Array.from(document.querySelectorAll('#itemsContainer .item-row')).map((row) => {
    const description = row.querySelector('.item-description').value.trim();
    const qty = parseFloat(row.querySelector('.item-qty').value) || 1;
    const unitPrice = parseFloat(row.querySelector('.item-price').value) || 0;
    const amount = qty * unitPrice;
    return { description, qty, unitPrice, amount };
  });
};

const updateInvoiceCalculations = () => {
  const items = getInvoiceItemValues();
  billingState.invoiceItems = items;
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const total = subtotal;
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  const balance = total - amountPaid;

  document.getElementById('subtotalAmount').textContent = formatCurrency(subtotal);
  document.getElementById('totalAmount').textContent = formatCurrency(total);
  document.getElementById('balanceDue').value = balance.toFixed(2);

  const statusDiv = document.getElementById('paymentStatus');
  if (balance <= 0) {
    statusDiv.innerHTML = '<span class="status-paid">✓ Fully Paid</span>';
  } else if (amountPaid > 0) {
    statusDiv.innerHTML = '<span class="status-partial">⚠ Partially Paid</span>';
  } else {
    statusDiv.innerHTML = '<span class="status-unpaid">✗ Unpaid</span>';
  }

  document.querySelectorAll('#itemsContainer .item-row').forEach((row, index) => {
    const amountInput = row.querySelector('.item-amount');
    if (amountInput) amountInput.value = formatCurrency(items[index]?.amount || 0);
  });

  return { subtotal, total, balance, amountPaid };
};

const selectInvoiceCustomer = (customer) => {
  document.getElementById('invoiceCustomerId').value = customer.id;
  document.getElementById('invCustName').textContent = customer.name;
  document.getElementById('invCustMobile').textContent = customer.mobile;
  document.getElementById('invCustLocation').textContent = customer.location || 'N/A';
  document.getElementById('invoiceSelectedCustomer').style.display = 'flex';
  document.getElementById('invoiceCustomerSearch').value = customer.name;
  document.getElementById('invoiceCustomerDropdown').style.display = 'none';
};

const searchInvoiceCustomers = (query) => {
  const customers = getData(STORAGE_KEYS.customers) || [];
  const normalized = query.toLowerCase().trim();
  const results = normalized
    ? customers.filter((customer) => {
        const haystack = `${customer.name} ${customer.mobile} ${customer.id}`.toLowerCase();
        return haystack.includes(normalized);
      }).slice(0, 6)
    : customers.slice(0, 6);

  const dropdown = document.getElementById('invoiceCustomerDropdown');
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
    item.innerHTML = `<strong>${customer.name}</strong><br><small>${customer.mobile} - ${customer.location || 'N/A'}</small>`;
    item.dataset.customerId = customer.id;
    dropdown.appendChild(item);
  });
  dropdown.style.display = 'block';
};

const bindBillingCustomerSearch = () => {
  const input = document.getElementById('invoiceCustomerSearch');
  const dropdown = document.getElementById('invoiceCustomerDropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase().trim();
    if (!query) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }
    searchInvoiceCustomers(query);
  });

  input.addEventListener('focus', () => {
    searchInvoiceCustomers(input.value);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement?.closest('#invoiceCustomerDropdown')) return;
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }, 150);
  });

  dropdown.addEventListener('mousedown', (event) => {
    const item = event.target.closest('.dropdown-item');
    if (!item?.dataset.customerId) return;
    event.preventDefault();
    const customer = getData(STORAGE_KEYS.customers).find((entry) => entry.id === item.dataset.customerId);
    if (customer) selectInvoiceCustomer(customer);
  });

  dropdown.addEventListener('click', (event) => {
    const item = event.target.closest('.dropdown-item');
    if (!item?.dataset.customerId) return;
    event.preventDefault();
    const customer = getData(STORAGE_KEYS.customers).find((entry) => entry.id === item.dataset.customerId);
    if (customer) selectInvoiceCustomer(customer);
  });

  document.addEventListener('mousedown', (event) => {
    if (!dropdown.contains(event.target) && event.target !== input) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }
  });
};

const openInvoiceModal = () => {
  const modal = document.getElementById('invoiceModal');
  if (!modal) return;
  resetInvoiceForm();
  modal.classList.remove('hidden');
};

const closeInvoiceModal = () => {
  document.getElementById('invoiceModal')?.classList.add('hidden');
};

const resetInvoiceForm = () => {
  const form = document.getElementById('invoiceForm');
  if (!form) return;
  form.reset();
  document.getElementById('invoiceCustomerError').textContent = '';
  document.getElementById('invoiceNumber').value = generateInvoiceNumber(getData(STORAGE_KEYS.invoices));
  document.getElementById('invoiceDate').value = getTodayISO();
  document.getElementById('invoiceSelectedCustomer').style.display = 'none';
  document.getElementById('invoiceCustomerId').value = '';
  document.getElementById('invoiceCustomerSearch').value = '';
  document.getElementById('invoiceCustomerDropdown').innerHTML = '';
  document.getElementById('invoiceCustomerDropdown').style.display = 'none';
  document.getElementById('paymentStatus').innerHTML = '';
  document.getElementById('itemsContainer').innerHTML = '';
  addInvoiceItem();
  updateInvoiceCalculations();
};

const validateInvoiceForm = () => {
  const customerId = document.getElementById('invoiceCustomerId').value;
  const errors = {};
  if (!customerId) errors.customer = 'Please select a customer.';
  document.getElementById('invoiceCustomerError').textContent = errors.customer || '';
  return Object.keys(errors).length === 0;
};

const saveInvoice = (event) => {
  event.preventDefault();
  if (!validateInvoiceForm()) return;
  const calculations = updateInvoiceCalculations();
  const invoiceNumber = document.getElementById('invoiceNumber').value;
  const invoiceDate = document.getElementById('invoiceDate').value || getTodayISO();
  const customerId = document.getElementById('invoiceCustomerId').value;
  const customer = getCustomerById(customerId);
  const items = getInvoiceItemValues().map((item) => ({ description: item.description, qty: item.qty, unitPrice: item.unitPrice, amount: item.amount }));
  const status = calculations.balance <= 0 ? 'Paid' : calculations.amountPaid === 0 ? 'Unpaid' : 'Partially Paid';

  const invoice = {
    invoiceNumber,
    customerId,
    customerName: customer?.name || 'Unknown',
    customerMobile: customer?.mobile || '',
    customerAddress: customer?.location || '',
    date: invoiceDate,
    items,
    subtotal: calculations.subtotal,
    totalAmount: calculations.total,
    paymentMethod: document.getElementById('paymentMethod').value,
    amountPaid: calculations.amountPaid,
    balanceDue: calculations.balance,
    status,
    createdAt: new Date().toISOString()
  };

  const invoices = getData(STORAGE_KEYS.invoices) || [];
  saveData(STORAGE_KEYS.invoices, [...invoices, invoice]);

  if (customer) {
    const updatedCustomers = getData(STORAGE_KEYS.customers).map((cust) => {
      if (cust.id !== customerId) return cust;
      return {
        ...cust,
        visits: [...(cust.visits || []), {
          visitId: invoice.invoiceNumber,
          visitDate: invoiceDate,
          invoiceId: invoice.invoiceNumber,
          type: 'invoice',
          amountPaid: invoice.amountPaid
        }],
        totalVisits: (cust.totalVisits || 0) + 1,
        lastVisitDate: invoiceDate,
        totalSpent: (cust.totalSpent || 0) + invoice.totalAmount
      };
    });
    saveData(STORAGE_KEYS.customers, updatedCustomers);
  }

  trackActivity(`Invoice created: ${invoice.invoiceNumber}`);
  showToast('Invoice saved successfully.', 'success');
  closeInvoiceModal();
  buildInvoiceTable();
};

const buildInvoiceTable = () => {
  const tbody = document.querySelector('#invoiceTable tbody');
  if (!tbody) return;
  const invoices = getData(STORAGE_KEYS.invoices) || [];
  tbody.innerHTML = invoices.map((invoice) => `
    <tr>
      <td>${invoice.invoiceNumber}</td>
      <td>${formatDate(invoice.date)}</td>
      <td>${invoice.customerName}</td>
      <td>${formatCurrency(invoice.totalAmount)}</td>
      <td><span class="badge ${invoice.status === 'Paid' ? 'success' : invoice.status === 'Partially Paid' ? 'warning' : 'danger'}">${invoice.status}</span></td>
      <td>
        <button class="secondary-btn small" data-action="view" data-id="${invoice.invoiceNumber}">View</button>
        <button class="info-btn small" data-action="print" data-id="${invoice.invoiceNumber}">Print</button>
        <button class="danger-btn small" data-action="delete" data-id="${invoice.invoiceNumber}">Delete</button>
      </td>
    </tr>
  `).join('');
};

const renderInvoiceDetails = (invoiceNumber) => {
  const invoice = getData(STORAGE_KEYS.invoices).find((item) => item.invoiceNumber === invoiceNumber);
  if (!invoice) return;
  const modal = document.getElementById('invoiceViewModal');
  const body = document.getElementById('invoiceViewBody');
  if (!modal || !body) return;
  body.innerHTML = `
    <div class="panel-card">
      <h4>Invoice ${invoice.invoiceNumber}</h4>
      <p><strong>Customer:</strong> ${invoice.customerName}</p>
      <p><strong>Date:</strong> ${formatDate(invoice.date)}</p>
      <p><strong>Status:</strong> ${invoice.status}</p>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
        <tbody>${invoice.items.map((item) => `
          <tr>
            <td>${item.description}</td>
            <td>${item.qty}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td>${formatCurrency(item.amount)}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
    <div class="panel-card">
      <p><strong>Subtotal:</strong> ${formatCurrency(invoice.subtotal)}</p>
      <p><strong>Total:</strong> ${formatCurrency(invoice.totalAmount)}</p>
      <p><strong>Amount Paid:</strong> ${formatCurrency(invoice.amountPaid)}</p>
      <p><strong>Balance Due:</strong> ${formatCurrency(invoice.balanceDue)}</p>
      <p><strong>Payment Method:</strong> ${invoice.paymentMethod}</p>
    </div>
  `;
  modal.classList.remove('hidden');
};

const generatePDFInvoice = (invoice) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto}h1{margin:0 0 8px;color:#2563eb}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #d1d5db;padding:10px}th{background:#f3f4f6} .totals{margin-top:16px;text-align:right}
        </style>
      </head>
      <body>
        <h1>RIDDHI CHASHMA GHAR</h1>
        <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Date:</strong> ${formatDate(invoice.date)}</p>
        <p><strong>Customer:</strong> ${invoice.customerName}</p>
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
          <tbody>${invoice.items.map((item) => `<tr><td>${item.description}</td><td>${item.qty}</td><td>${formatCurrency(item.unitPrice)}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('')}</tbody>
        </table>
        <div class="totals">
          <p><strong>Subtotal:</strong> ${formatCurrency(invoice.subtotal)}</p>
          <p><strong>Total:</strong> ${formatCurrency(invoice.totalAmount)}</p>
          <p><strong>Amount Paid:</strong> ${formatCurrency(invoice.amountPaid)}</p>
          <p><strong>Balance Due:</strong> ${formatCurrency(invoice.balanceDue)}</p>
        </div>
        <script>window.onload=function(){window.print();}</script>
      </body>
    </html>
  `;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

const printInvoice = (invoiceNumber) => {
  const invoice = getData(STORAGE_KEYS.invoices).find((item) => item.invoiceNumber === invoiceNumber);
  if (!invoice) return;
  generatePDFInvoice(invoice);
};

const initBillingPage = () => {
  if (!document.getElementById('invoiceNumber')) return;
  buildInvoiceTable();
  document.getElementById('openInvoiceForm').addEventListener('click', openInvoiceModal);
  document.getElementById('closeInvoiceModal').addEventListener('click', closeInvoiceModal);
  document.getElementById('closeInvoiceView').addEventListener('click', () => document.getElementById('invoiceViewModal').classList.add('hidden'));
  document.getElementById('closeInvoiceViewButton').addEventListener('click', () => document.getElementById('invoiceViewModal').classList.add('hidden'));
  document.getElementById('invoiceForm').addEventListener('submit', saveInvoice);
  document.getElementById('addInvoiceItem').addEventListener('click', addInvoiceItem);
  document.getElementById('amountPaid').addEventListener('input', updateInvoiceCalculations);
  document.getElementById('paymentMethod').addEventListener('change', updateInvoiceCalculations);
  bindBillingCustomerSearch();
  document.getElementById('changeCustomerButton').addEventListener('click', () => {
    document.getElementById('invoiceSelectedCustomer').style.display = 'none';
    document.getElementById('invoiceCustomerSearch').value = '';
    document.getElementById('invoiceCustomerId').value = '';
    document.getElementById('invoiceCustomerDropdown').style.display = 'none';
  });
  document.getElementById('printInvoiceButton').addEventListener('click', () => {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    printInvoice(invoiceNumber);
  });
  document.getElementById('pdfInvoiceButton').addEventListener('click', () => {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    printInvoice(invoiceNumber);
  });
  document.getElementById('shareInvoiceButton').addEventListener('click', () => {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const total = document.getElementById('totalAmount').textContent;
    const customerId = document.getElementById('invoiceCustomerId').value;
    const customer = getCustomerById(customerId);
    if (!customer) {
      showToast('Select a customer to share invoice.', 'error');
      return;
    }
    const message = encodeURIComponent(`Invoice ${invoiceNumber} from RIDDHI CHASHMA GHAR. Total Amount: ${total}. Thank you!`);
    window.open(`https://wa.me/91${customer.mobile}?text=${message}`, '_blank');
  });
  document.getElementById('resetInvoiceForm').addEventListener('click', () => {
    if (!confirm('Reset invoice form? All item data will be lost.')) return;
    resetInvoiceForm();
  });
  document.getElementById('invoiceTable').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'view') renderInvoiceDetails(id);
    if (action === 'print') printInvoice(id);
    if (action === 'delete') {
      if (!confirm('Delete this invoice?')) return;
      deleteData(STORAGE_KEYS.invoices, (item) => item.invoiceNumber === id);
      showToast('Invoice deleted.', 'success');
      buildInvoiceTable();
    }
  });
  document.getElementById('applyInvoiceFilter').addEventListener('click', () => {
    const status = document.getElementById('invoiceStatusFilter').value;
    const fromDate = document.getElementById('invoiceFromDate').value;
    const toDate = document.getElementById('invoiceToDate').value;
    const allInvoices = getData(STORAGE_KEYS.invoices) || [];
    const filtered = allInvoices.filter((invoice) => {
      const matchStatus = status === 'all' || invoice.status === status;
      const matchFrom = !fromDate || new Date(invoice.date) >= new Date(fromDate);
      const matchTo = !toDate || new Date(invoice.date) <= new Date(toDate);
      return matchStatus && matchFrom && matchTo;
    });
    const tbody = document.querySelector('#invoiceTable tbody');
    tbody.innerHTML = filtered.map((invoice) => `
      <tr>
        <td>${invoice.invoiceNumber}</td>
        <td>${formatDate(invoice.date)}</td>
        <td>${invoice.customerName}</td>
        <td>${formatCurrency(invoice.totalAmount)}</td>
        <td><span class="badge ${invoice.status === 'Paid' ? 'success' : invoice.status === 'Partially Paid' ? 'warning' : 'danger'}">${invoice.status}</span></td>
        <td>
          <button class="secondary-btn small" data-action="view" data-id="${invoice.invoiceNumber}">View</button>
          <button class="info-btn small" data-action="print" data-id="${invoice.invoiceNumber}">Print</button>
          <button class="danger-btn small" data-action="delete" data-id="${invoice.invoiceNumber}">Delete</button>
        </td>
      </tr>
    `).join('');
  });
  resetInvoiceForm();
};

window.addEventListener('DOMContentLoaded', initBillingPage);
