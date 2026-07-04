const getReminderQueue = () => {
  const customers = getData(STORAGE_KEYS.customers) || [];
  const settings = getSettings();
  if (!settings.reminderEnabled) return [];
  return customers.filter((customer) => {
    const lastVisit = customer.lastVisitDate;
    if (!lastVisit) return false;
    if (customer.lastReminderDismissed) return false;
    return daysDifference(lastVisit) >= 365;
  });
};

const buildReminderList = () => {
  const reminderList = document.getElementById('reminderList');
  const reminderBadge = document.getElementById('reminderBadge');
  if (!reminderList || !reminderBadge) return;
  const queue = getReminderQueue();
  reminderBadge.textContent = queue.length;
  reminderList.innerHTML = '';
  if (queue.length === 0) {
    reminderList.innerHTML = '<p>No reminders due today.</p>';
    return;
  }
  queue.forEach((customer) => {
    const item = document.createElement('li');
    item.className = 'reminder-item';
    item.innerHTML = `
      <div>
        <strong>${customer.name}</strong>
        <p>Last Visit: ${formatDate(customer.lastVisitDate)} (${daysDifference(customer.lastVisitDate)} days ago)</p>
      </div>
      <div class="item-actions">
        <button class="secondary-btn" data-action="send" data-mobile="${customer.mobile}" data-name="${customer.name}">Send Reminder</button>
        <button class="danger-btn" data-action="dismiss" data-id="${customer.id}">Dismiss</button>
      </div>
    `;
    reminderList.appendChild(item);
  });
};

const sendWhatsAppReminder = (name, mobile) => {
  if (!validateMobile(mobile)) {
    showToast('Invalid mobile number for WhatsApp reminder.', 'error');
    return;
  }
  const template = getSettings().reminderTemplate || '';
  const message = encodeURIComponent(template.replace('[CustomerName]', name));
  window.open(`https://wa.me/91${mobile}?text=${message}`, '_blank');
};

const dismissReminder = (customerId) => {
  const customers = getData(STORAGE_KEYS.customers) || [];
  const updated = customers.map((customer) => {
    if (customer.id === customerId) {
      return { ...customer, lastReminderDismissed: new Date().toISOString() };
    }
    return customer;
  });
  saveData(STORAGE_KEYS.customers, updated);
  buildReminderList();
};

const initNotifications = () => {
  if (!document.getElementById('reminderList')) return;
  buildReminderList();
  const queue = getReminderQueue();
  if (queue.length > 0) {
    showToast(`You have ${queue.length} customers due for follow-up`, 'success');
  }

  document.getElementById('reminderList').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'send') {
      sendWhatsAppReminder(button.dataset.name, button.dataset.mobile);
    }
    if (action === 'dismiss') {
      dismissReminder(button.dataset.id);
    }
  });
};
