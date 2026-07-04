const dashboardState = {
  activityLog: [],
  reminders: []
};

const getTotalCustomers = () => (getData(STORAGE_KEYS.customers) || []).length;
const getInvoices = () => getData(STORAGE_KEYS.invoices) || [];
const getCustomers = () => getData(STORAGE_KEYS.customers) || [];

const countNewCustomersThisMonth = () => {
  const now = new Date();
  return getCustomers().filter((customer) => {
    const date = new Date(customer.registrationDate);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
};

const countReturningCustomers = () => getCustomers().filter((customer) => (customer.totalVisits || 0) > 1).length;

const filterInvoicesByRange = (rangeType = '30', fromDate = null, toDate = null) => {
  const invoices = getInvoices();
  if (rangeType === 'custom' && fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    end.setHours(23, 59, 59, 999);
    return invoices.filter((invoice) => {
      const date = new Date(invoice.date);
      return date >= start && date <= end;
    });
  }

  const days = parseInt(rangeType, 10) || 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);

  return invoices.filter((invoice) => {
    const date = new Date(invoice.date);
    return date >= start;
  });
};

const getMonthlyRevenueData = ({ rangeType = '365', fromDate = null, toDate = null } = {}) => {
  const invoices = filterInvoicesByRange(rangeType, fromDate, toDate);
  const labels = [];
  const values = [];
  const customerCounts = [];

  if (rangeType === 'custom' && fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { labels, values, customerCounts };
    }
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= last) {
      const month = current.getMonth();
      const year = current.getFullYear();
      const label = current.toLocaleString('default', { month: 'short', year: '2-digit' });
      labels.push(label);
      const monthInvoices = invoices.filter((invoice) => {
        const invDate = new Date(invoice.date);
        return invDate.getMonth() === month && invDate.getFullYear() === year;
      });
      values.push(monthInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0));
      customerCounts.push(new Set(monthInvoices.map((invoice) => invoice.customerId)).size);
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    const now = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = date.toLocaleString('default', { month: 'short' });
      labels.push(label);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthInvoices = invoices.filter((invoice) => {
        const invDate = new Date(invoice.date);
        return invDate.getMonth() === month && invDate.getFullYear() === year;
      });
      values.push(monthInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0));
      customerCounts.push(new Set(monthInvoices.map((invoice) => invoice.customerId)).size);
    }
  }

  return { labels, values, customerCounts };
};

const getVisitsTrendData = () => {
  const labels = [];
  const values = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(date.toLocaleString('default', { month: 'short' }));
    const month = date.getMonth();
    const year = date.getFullYear();
    const count = getCustomers().reduce((sum, customer) => {
      const visits = (customer.visits || []).filter((visit) => {
        const visitDate = new Date(visit.visitDate);
        return visitDate.getMonth() === month && visitDate.getFullYear() === year;
      });
      return sum + visits.length;
    }, 0);
    values.push(count);
  }
  return { labels, values };
};

const getTopItems = () => {
  const itemCounts = {};
  getInvoices().forEach((invoice) => {
    (invoice.items || []).forEach((item) => {
      const key = item.description || 'Other';
      itemCounts[key] = (itemCounts[key] || 0) + 1;
    });
  });
  const entries = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return {
    labels: entries.map(([label]) => label),
    values: entries.map(([, count]) => count)
  };
};

const getCustomerRatio = () => {
  const total = getTotalCustomers();
  const returning = countReturningCustomers();
  const newCustomers = total - returning;
  return { labels: ['New', 'Returning'], values: [newCustomers, returning] };
};

const getFollowUpData = () => {
  const customers = getCustomers();
  const due = customers.filter((customer) => customer.lastVisitDate && daysDifference(customer.lastVisitDate) >= 365).length;
  const visits = customers.flatMap((customer) => customer.visits || []).map((visit) => new Date(visit.visitDate)).filter((date) => !Number.isNaN(date.getTime()));
  visits.sort((a, b) => a - b);
  const averageDays = visits.length < 2 ? 0 : Math.round(visits.slice(1).reduce((sum, date, index) => {
    const prevDate = visits[index];
    return sum + Math.abs(date - prevDate);
  }, 0) / ((visits.length - 1) * 1000 * 60 * 60 * 24));
  return { due, averageDays };
};

const drawBarChart = (canvas, labels, values, color = '#2563eb') => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const maxValue = Math.max(...values, 1);
  const barWidth = (width - 60) / labels.length;
  labels.forEach((label, index) => {
    const barHeight = (values[index] / maxValue) * (height - 80);
    const x = 40 + index * barWidth;
    const y = height - barHeight - 30;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth * 0.7, barHeight);
    ctx.fillStyle = '#374151';
    ctx.fillText(label, x, height - 10);
    ctx.fillText(formatCurrency(values[index]), x, y - 8);
  });
  ctx.strokeStyle = '#d1d5db';
  ctx.beginPath();
  ctx.moveTo(30, height - 30);
  ctx.lineTo(width - 10, height - 30);
  ctx.stroke();
};

const drawDualAxisChart = (canvas, labels, leftValues, rightValues, leftLabel = 'Revenue', rightLabel = 'Customers') => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const leftMax = Math.max(...leftValues, 1);
  const rightMax = Math.max(...rightValues, 1);
  const barWidth = (width - 80) / labels.length;
  labels.forEach((label, index) => {
    const barHeight = (leftValues[index] / leftMax) * (height - 100);
    const x = 40 + index * barWidth;
    const y = height - barHeight - 40;
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x, y, barWidth * 0.6, barHeight);
    ctx.fillStyle = '#111827';
    ctx.fillText(label, x, height - 20);
    ctx.fillText(formatCurrency(leftValues[index]), x, y - 10);
  });
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  rightValues.forEach((value, index) => {
    const x = 40 + index * barWidth + barWidth * 0.3;
    const y = height - 40 - (value / rightMax) * (height - 100);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.stroke();
  ctx.fillStyle = '#2563eb';
  ctx.fillText(leftLabel, 40, 18);
  ctx.fillStyle = '#ef4444';
  ctx.fillText(rightLabel, width - 140, 18);
  ctx.strokeStyle = '#d1d5db';
  ctx.beginPath();
  ctx.moveTo(30, height - 40);
  ctx.lineTo(width - 20, height - 40);
  ctx.stroke();
};

const drawPieChart = (canvas, labels, values, colors = ['#2563eb', '#10b981']) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  let startAngle = -Math.PI / 2;
  labels.forEach((label, index) => {
    const slice = (values[index] / total) * Math.PI * 2;
    ctx.fillStyle = colors[index % colors.length];
    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2);
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 3, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fill();
    const midAngle = startAngle + slice / 2;
    const labelX = width / 2 + Math.cos(midAngle) * (Math.min(width, height) / 2.4);
    const labelY = height / 2 + Math.sin(midAngle) * (Math.min(width, height) / 2.4);
    ctx.fillStyle = '#111827';
    ctx.font = '14px Poppins';
    ctx.fillText(`${Math.round((values[index] / total) * 100)}%`, labelX, labelY);
    startAngle += slice;
  });
};

const drawLineChart = (canvas, labels, values, color = '#2563eb') => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const maxValue = Math.max(...values, 1);
  const padding = 40;
  const stepX = (width - padding * 2) / (labels.length - 1 || 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.stroke();
  ctx.fillStyle = '#374151';
  ctx.font = '13px Poppins';
  labels.forEach((label, index) => {
    const x = padding + index * stepX;
    ctx.fillText(label, x - 10, height - 12);
  });
};

const fillDashboardSummary = () => {
  const total = getTotalCustomers();
  const revenue = getInvoices().reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const monthRevenue = getInvoices().filter((invoice) => {
    const date = new Date(invoice.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const todayAppointments = getCustomers().filter((customer) => customer.lastVisitDate === formatDateInput(new Date())).length;
  const pendingFollowups = getCustomers().filter((customer) => customer.lastVisitDate && daysDifference(customer.lastVisitDate) >= 365).length;
  const totalCustomersEl = document.getElementById('totalCustomersCount');
  if (totalCustomersEl) totalCustomersEl.textContent = total;
  const todayAppointmentsEl = document.getElementById('todayAppointmentsCount');
  if (todayAppointmentsEl) todayAppointmentsEl.textContent = todayAppointments;
  const monthRevenueEl = document.getElementById('monthRevenueAmount');
  if (monthRevenueEl) monthRevenueEl.textContent = formatCurrency(monthRevenue);
  const pendingFollowupsEl = document.getElementById('pendingFollowupsCount');
  if (pendingFollowupsEl) pendingFollowupsEl.textContent = pendingFollowups;
  const feed = document.getElementById('activityFeed');
  if (feed) {
    const activities = getLocalData(STORAGE_KEYS.activityLog).slice(0, 10);
    feed.innerHTML = activities.map((item) => `
      <li class="activity-item">
        <strong>${item.message}</strong>
        <span>${formatDate(item.timestamp)} ${new Date(item.timestamp).toLocaleTimeString('en-IN', { hour12: false })}</span>
      </li>
    `).join('') || '<li>No recent activity yet.</li>';
  }
};

const initDashboardPage = () => {
  if (!document.getElementById('totalCustomersCount')) return;
  fillDashboardSummary();
  document.querySelectorAll('[data-target]').forEach((button) => {
    button.addEventListener('click', () => window.location.href = button.dataset.target);
  });

  const fabButton = document.getElementById('fabButton');
  const fabMenu = document.getElementById('fabMenu');
  if (fabButton && fabMenu) {
    fabButton.addEventListener('click', (event) => {
      event.stopPropagation();
      fabMenu.classList.toggle('hidden');
    });
    window.addEventListener('click', (event) => {
      if (!fabButton.contains(event.target) && !fabMenu.contains(event.target)) {
        fabMenu.classList.add('hidden');
      }
    });
  }

  initNotifications();
};

const fillAnalyticsSummary = ({ rangeType = '30', fromDate = null, toDate = null } = {}) => {
  if (!document.getElementById('analyticsRevenue')) return;
  const filteredInvoices = filterInvoicesByRange(rangeType, fromDate, toDate);
  const revenue = filteredInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const totalCustomers = new Set(filteredInvoices.map((invoice) => invoice.customerId)).size;
  const newCustomers = countNewCustomersThisMonth();
  const returning = countReturningCustomers();
  document.getElementById('analyticsRevenue').textContent = formatCurrency(revenue);
  document.getElementById('analyticsCustomers').textContent = totalCustomers;
  document.getElementById('analyticsNewCustomers').textContent = `${newCustomers}`;
  document.getElementById('analyticsReturning').textContent = returning;
  const { due, averageDays } = getFollowUpData();
  document.getElementById('analyticsRetention').textContent = `${due} customers due for 1-year follow-up`;
  document.getElementById('analyticsAvgVisit').textContent = `Average days between visits: ${averageDays}`;
  const monthlyData = getMonthlyRevenueData({ rangeType, fromDate, toDate });
  drawDualAxisChart(document.getElementById('revenueChart'), monthlyData.labels, monthlyData.values, monthlyData.customerCounts, 'Revenue', 'Customers');
  drawPieChart(document.getElementById('customerPieChart'), ...Object.values(getCustomerRatio()));
  drawBarChart(document.getElementById('salesBarChart'), ...Object.values(getTopItems()), '#10b981');
  drawLineChart(document.getElementById('visitsLineChart'), ...Object.values(getVisitsTrendData()));
};

const initAnalyticsPage = () => {
  if (!document.getElementById('analyticsRange')) return;
  fillAnalyticsSummary({ rangeType: document.getElementById('analyticsRange').value });
  document.getElementById('applyAnalyticsRange').addEventListener('click', () => {
    const range = document.getElementById('analyticsRange').value;
    const fromInput = document.getElementById('analyticsFrom');
    const toInput = document.getElementById('analyticsTo');
    if (range === 'custom') {
      fromInput.hidden = false;
      toInput.hidden = false;
      if (!fromInput.value || !toInput.value) {
        showToast('Select a custom range and click Apply.', 'warning');
        return;
      }
      fillAnalyticsSummary({ rangeType: 'custom', fromDate: fromInput.value, toDate: toInput.value });
      showToast('Custom range filtering applied.', 'success');
      return;
    }
    fromInput.hidden = true;
    toInput.hidden = true;
    fillAnalyticsSummary({ rangeType: range });
    showToast('Summary refreshed for the selected range.', 'success');
  });
  document.getElementById('exportAnalytics')?.addEventListener('click', () => {
    const report = [{
      Metric: 'Total Revenue',
      Value: formatCurrency(getInvoices().reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0))
    }, {
      Metric: 'Total Customers',
      Value: getTotalCustomers()
    }, {
      Metric: 'New Customers This Month',
      Value: countNewCustomersThisMonth()
    }, {
      Metric: 'Returning Customers',
      Value: countReturningCustomers()
    }];
    exportCSV(report, 'analytics-report.csv');
  });
};

window.addEventListener('DOMContentLoaded', () => {
  initDashboardPage();
  initAnalyticsPage();
});
