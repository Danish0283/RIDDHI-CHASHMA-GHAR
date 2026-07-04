const STORAGE_KEYS = {
  customers: 'customers',
  prescriptions: 'prescriptions',
  invoices: 'invoices',
  appSettings: 'appSettings',
  session: 'session',
  activityLog: 'activityLog'
};

const getLocalData = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (error) {
    return [];
  }
};

const setLocalData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    showToast('Failed to save data. Please try again.', 'error');
    return false;
  }
};

const parseDateValue = (dateValue) => {
  if (!dateValue) return null;
  const trimmed = String(dateValue).trim();
  const iso = new Date(trimmed);
  if (!Number.isNaN(iso.getTime())) return iso;
  const parts = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (parts) {
    const [, day, month, year] = parts;
    const parsed = new Date(`${year}-${month}-${day}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const formatDate = (dateValue) => {
  const date = parseDateValue(dateValue);
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateInput = (dateValue) => {
  const date = parseDateValue(dateValue);
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

const formatCurrency = (value) => {
  const number = parseFloat(value) || 0;
  return number.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
};

const validateMobile = (value) => /^[6-9]\d{9}$/.test(value);
const validateEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
const validateNumberRange = (value, min, max) => {
  const num = parseFloat(value);
  return !Number.isNaN(num) && num >= min && num <= max;
};

const generateId = (prefix, existingItems = []) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const type = prefix.toUpperCase();
  const nextIndex = existingItems.length + 1;
  const padded = String(nextIndex).padStart(3, '0');
  return `${type}-${year}${prefix === 'INV-' ? `-${month}` : ''}-${padded}`;
};

const generateCustomerId = (existingCustomers = []) => {
  const now = new Date();
  const year = now.getFullYear();
  const idNumber = String(existingCustomers.length + 1).padStart(3, '0');
  return `CUST-${year}-${idNumber}`;
};

const getCustomerById = (id) => getData(STORAGE_KEYS.customers).find((customer) => customer.id === id);

const generateInvoiceNumber = (existingInvoices = [], prefix = 'INV-', startNumber = 1) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthInvoices = existingInvoices.filter((invoice) => invoice.invoiceNumber?.startsWith(`${prefix}${year}-${month}-`));
  const invoiceIndex = startNumber + currentMonthInvoices.length;
  return `${prefix}${year}-${month}-${String(invoiceIndex).padStart(3, '0')}`;
};

const exportCSV = (data, filename) => {
  if (!Array.isArray(data) || data.length === 0) {
    showToast('Nothing to export.', 'error');
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  data.forEach((row) => {
    const values = headers.map((header) => {
      const cell = row[header] ?? '';
      const escaped = String(cell).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  });
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const daysDifference = (dateValue) => {
  const today = new Date();
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return 0;
  const diff = today - target;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const showToast = (message, type = 'success', duration = 3600) => {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, duration);
};

const safeParseJSON = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const debounce = (fn, delay = 300) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const getSettings = () => {
  const settings = getLocalData(STORAGE_KEYS.appSettings);
  return settings || {
    shopName: 'RIDDHI CHASHMA GHAR',
    address: '',
    contact: '',
    email: '',
    gst: '',
    logo: '',
    adminUsername: 'admin@riddhichashma',
    adminPassword: 'riddhi@2024',
    sessionTimeout: 30,
    invoicePrefix: 'INV-',
    invoiceStartNumber: 1,
    defaultGST: 18,
    termsConditions: 'Thank you for choosing RIDDHI CHASHMA GHAR.',
    reminderEnabled: true,
    reminderTemplate: "Hello [CustomerName], Greetings from RIDDHI CHASHMA GHAR! It's been a year since your last visit. We invite you for a FREE eye check-up and frame servicing. Book your appointment today. Thank you!",
    theme: 'light',
    primaryColor: '#2563eb',
    fontSize: 'medium',
    animationsEnabled: true
  };
};

const saveSettings = (settings) => setLocalData(STORAGE_KEYS.appSettings, settings);

const getSession = () => getLocalData(STORAGE_KEYS.session) || { isLoggedIn: false };
const saveSession = (session) => setLocalData(STORAGE_KEYS.session, session);

const getTodayISO = () => {
  const now = new Date();
  return formatDateInput(now);
};

const sortAlpha = (items, key, direction = 'asc') => {
  return [...items].sort((a, b) => {
    const rawA = a[key] ?? '';
    const rawB = b[key] ?? '';
    const dateA = key === 'lastVisitDate' ? parseDateValue(rawA) : null;
    const dateB = key === 'lastVisitDate' ? parseDateValue(rawB) : null;

    if (dateA || dateB) {
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      return direction === 'asc' ? timeA - timeB : timeB - timeA;
    }

    const numA = parseFloat(rawA);
    const numB = parseFloat(rawB);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return direction === 'asc' ? numA - numB : numB - numA;
    }

    const valueA = String(rawA).toLowerCase();
    const valueB = String(rawB).toLowerCase();
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};
