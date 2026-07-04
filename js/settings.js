const settingsState = {};

const applySettingsToForm = () => {
  const settings = getSettings();
  document.getElementById('shopName').value = settings.shopName || '';
  document.getElementById('shopAddress').value = settings.address || '';
  document.getElementById('shopContact').value = settings.contact || '';
  document.getElementById('shopEmail').value = settings.email || '';
  document.getElementById('shopGst').value = settings.gst || '';
  const logoPreview = document.getElementById('logoPreview');
  logoPreview.innerHTML = settings.logo ? `<img src="${settings.logo}" alt="Logo preview" />` : 'No logo uploaded yet.';
  document.getElementById('currentUsername').value = settings.adminUsername || '';
  document.getElementById('logoutToggle').checked = settings.sessionTimeout > 0;
  document.getElementById('sessionTimeout').value = settings.sessionTimeout || 30;
  document.getElementById('invoicePrefix').value = settings.invoicePrefix || 'INV-';
  document.getElementById('invoiceStartNumber').value = settings.invoiceStartNumber || 1;
  document.getElementById('defaultGstRate').value = settings.defaultGST || 18;
  document.getElementById('termsConditions').value = settings.termsConditions || '';
  document.getElementById('invoiceFooter').value = settings.invoiceFooter || '';
  document.getElementById('reminderToggle').checked = settings.reminderEnabled;
  document.getElementById('reminderTemplate').value = settings.reminderTemplate || ''; 
  document.getElementById('whatsappNumber').value = settings.contact || '';
  document.getElementById('themeToggle').checked = settings.theme === 'dark';
  document.getElementById('primaryColorPicker').value = settings.primaryColor || '#2563eb';
  document.getElementById('fontSizeSelector').value = settings.fontSize || 'medium';
  document.getElementById('animationsToggle').checked = settings.animationsEnabled;
};

const saveShopDetails = (event) => {
  event.preventDefault();
  const settings = getSettings();
  settings.shopName = document.getElementById('shopName').value.trim();
  settings.address = document.getElementById('shopAddress').value.trim();
  settings.contact = document.getElementById('shopContact').value.trim();
  settings.email = document.getElementById('shopEmail').value.trim();
  settings.gst = document.getElementById('shopGst').value.trim();
  saveSettings(settings);
  showToast('Shop details saved.', 'success');
  applyThemeSettings();
};

const saveAdminAccount = (event) => {
  event.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value.trim();
  const newUsername = document.getElementById('newUsername').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const settings = getSettings();
  if (currentPassword && currentPassword !== settings.adminPassword) {
    showToast('Current password is incorrect.', 'error');
    return;
  }
  if (newPassword && newPassword !== confirmPassword) {
    showToast('Passwords do not match.', 'error');
    return;
  }
  if (newUsername) settings.adminUsername = newUsername;
  if (newPassword) settings.adminPassword = newPassword;
  settings.sessionTimeout = Number(document.getElementById('sessionTimeout').value) || 30;
  saveSettings(settings);
  showToast('Admin account updated.', 'success');
  applyThemeSettings();
};

const saveInvoiceSettings = (event) => {
  event.preventDefault();
  const settings = getSettings();
  settings.invoicePrefix = document.getElementById('invoicePrefix').value.trim() || 'INV-';
  settings.invoiceStartNumber = Number(document.getElementById('invoiceStartNumber').value) || 1;
  settings.defaultGST = Number(document.getElementById('defaultGstRate').value) || 18;
  settings.termsConditions = document.getElementById('termsConditions').value.trim();
  settings.invoiceFooter = document.getElementById('invoiceFooter').value.trim();
  saveSettings(settings);
  showToast('Invoice settings saved.', 'success');
};

const saveNotificationSettings = (event) => {
  event.preventDefault();
  const settings = getSettings();
  settings.reminderEnabled = document.getElementById('reminderToggle').checked;
  settings.reminderTemplate = document.getElementById('reminderTemplate').value.trim();
  settings.whatsappNumber = document.getElementById('whatsappNumber').value.trim();
  saveSettings(settings);
  showToast('Notification settings saved.', 'success');
};

const saveUiPreferences = (event) => {
  event.preventDefault();
  const settings = getSettings();
  settings.theme = document.getElementById('themeToggle').checked ? 'dark' : 'light';
  settings.primaryColor = document.getElementById('primaryColorPicker').value;
  settings.fontSize = document.getElementById('fontSizeSelector').value;
  settings.animationsEnabled = document.getElementById('animationsToggle').checked;
  saveSettings(settings);
  applyThemeSettings();
  showToast('UI preferences saved.', 'success');
};

const handleLogoUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const settings = getSettings();
    settings.logo = reader.result;
    saveSettings(settings);
    applySettingsToForm();
    showToast('Logo uploaded successfully.', 'success');
  };
  reader.readAsDataURL(file);
};

const openConfirm = (message, onConfirm) => {
  const modal = document.getElementById('confirmModal');
  const confirmMessage = document.getElementById('confirmMessage');
  if (!modal || !confirmMessage) return;
  confirmMessage.textContent = message;
  modal.classList.remove('hidden');
  const confirmButton = document.getElementById('confirmAction');
  const cancelButton = document.getElementById('cancelConfirm');
  const closeButton = document.getElementById('closeConfirmModal');
  const cleanup = () => {
    modal.classList.add('hidden');
    confirmButton.onclick = null;
    cancelButton.onclick = null;
    closeButton.onclick = null;
  };
  confirmButton.onclick = () => { onConfirm(); cleanup(); };
  cancelButton.onclick = cleanup;
  closeButton.onclick = cleanup;
};

const initDataManagement = () => {
  document.getElementById('backupData').addEventListener('click', exportBackup);
  document.getElementById('restoreData').addEventListener('click', () => document.getElementById('restoreInput').click());
  document.getElementById('restoreInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('This will overwrite existing data. Continue?')) return;
    importBackup(file, () => window.location.reload());
  });
  document.getElementById('exportCustomerCsv').addEventListener('click', () => {
    const customers = getData(STORAGE_KEYS.customers).map((cust) => ({
      CustomerID: cust.id,
      Name: cust.name,
      Mobile: formatPhone(cust.mobile),
      Location: cust.location,
      Email: cust.email,
      RegistrationDate: cust.registrationDate,
      LastVisitDate: cust.lastVisitDate || 'N/A'
    }));
    exportCSV(customers, 'customer-list.csv');
  });
  document.getElementById('exportInvoiceCsv').addEventListener('click', () => {
    const invoices = getData(STORAGE_KEYS.invoices).map((invoice) => ({
      InvoiceNumber: invoice.invoiceNumber,
      Customer: invoice.customerName,
      Date: invoice.date,
      TotalAmount: invoice.totalAmount,
      Status: invoice.status
    }));
    exportCSV(invoices, 'invoice-list.csv');
  });
  document.getElementById('clearDataButton').addEventListener('click', () => {
    openConfirm('Type DELETE to confirm clearing all data.', () => {
      localStorage.clear();
      showToast('All data cleared. Reloading...', 'success');
      setTimeout(() => window.location.reload(), 500);
    });
  });
};

const initSettingsPage = () => {
  if (!document.getElementById('shopDetailsForm')) return;
  applySettingsToForm();
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
    });
  });
  document.getElementById('shopDetailsForm').addEventListener('submit', saveShopDetails);
  document.getElementById('adminAccountForm').addEventListener('submit', saveAdminAccount);
  document.getElementById('invoiceSettingsForm').addEventListener('submit', saveInvoiceSettings);
  document.getElementById('notificationSettingsForm').addEventListener('submit', saveNotificationSettings);
  document.getElementById('uiPreferencesForm').addEventListener('submit', saveUiPreferences);
  document.getElementById('shopLogo').addEventListener('change', handleLogoUpload);
  document.getElementById('testReminder').addEventListener('click', () => {
    const settings = getSettings();
    if (!validateMobile(settings.whatsappNumber)) {
      showToast('Enter a valid WhatsApp number first.', 'error');
      return;
    }
    window.open(`https://wa.me/91${settings.whatsappNumber}?text=${encodeURIComponent('Test reminder from RIDDHI CHASHMA GHAR')}`, '_blank');
  });
  initDataManagement();
};

window.addEventListener('DOMContentLoaded', initSettingsPage);
