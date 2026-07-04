const saveData = (key, data) => setLocalData(key, data);
const getData = (key) => getLocalData(key);
const updateData = (key, callback) => {
  const data = getData(key) || [];
  const updated = callback(data);
  return saveData(key, updated) ? updated : data;
};
const deleteData = (key, predicate) => {
  const items = getData(key) || [];
  const filtered = items.filter((item) => !predicate(item));
  return saveData(key, filtered);
};
const exportBackup = () => {
  const payload = {
    customers: getData(STORAGE_KEYS.customers),
    prescriptions: getData(STORAGE_KEYS.prescriptions),
    invoices: getData(STORAGE_KEYS.invoices),
    appSettings: getData(STORAGE_KEYS.appSettings),
    session: getData(STORAGE_KEYS.session),
    activityLog: getData(STORAGE_KEYS.activityLog)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const fileName = `riddhi-backup-${formatDate(new Date()).replace(/\//g, '-')}.json`;
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
};
const importBackup = (file, onComplete) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (typeof data === 'object' && data !== null) {
        saveData(STORAGE_KEYS.customers, data.customers || []);
        saveData(STORAGE_KEYS.prescriptions, data.prescriptions || []);
        saveData(STORAGE_KEYS.invoices, data.invoices || []);
        saveData(STORAGE_KEYS.appSettings, data.appSettings || getSettings());
        saveData(STORAGE_KEYS.activityLog, data.activityLog || []);
        saveData(STORAGE_KEYS.session, data.session || { isLoggedIn: false });
        showToast('Backup restored successfully.', 'success');
        onComplete && onComplete();
      } else {
        showToast('Invalid backup file.', 'error');
      }
    } catch (error) {
      showToast('Could not restore backup.', 'error');
    }
  };
  reader.readAsText(file);
};

const initializeDemoData = () => {
  const existingCustomers = getData(STORAGE_KEYS.customers);
  if (existingCustomers.length > 0) return;

  const sampleCustomers = [
    {
      id: 'CUST-2024-001',
      name: 'Rahul Mehta',
      mobile: '9876543210',
      alternateMobile: '9123456780',
      location: 'MG Road, Pune',
      dob: '1990-07-12',
      email: 'rahul.mehta@example.com',
      gender: 'Male',
      registrationDate: formatDate(new Date()),
      visits: [],
      totalVisits: 0,
      lastVisitDate: '',
      notes: '',
      profileImage: ''
    },
    {
      id: 'CUST-2024-002',
      name: 'Neha Singh',
      mobile: '9123456789',
      alternateMobile: '',
      location: 'Baner, Pune',
      dob: '1987-03-04',
      email: 'neha.singh@example.com',
      gender: 'Female',
      registrationDate: formatDate(new Date()),
      visits: [],
      totalVisits: 0,
      lastVisitDate: '',
      notes: '',
      profileImage: ''
    },
    {
      id: 'CUST-2024-003',
      name: 'Riya Patel',
      mobile: '9988776655',
      alternateMobile: '',
      location: 'Kothrud, Pune',
      dob: '1995-11-22',
      email: 'riya.patel@example.com',
      gender: 'Female',
      registrationDate: formatDate(new Date()),
      visits: [],
      totalVisits: 0,
      lastVisitDate: '',
      notes: '',
      profileImage: ''
    },
    {
      id: 'CUST-2024-004',
      name: 'Amit Sharma',
      mobile: '9012345678',
      alternateMobile: '',
      location: 'Aundh, Pune',
      dob: '1978-09-30',
      email: 'amit.sharma@example.com',
      gender: 'Male',
      registrationDate: formatDate(new Date()),
      visits: [],
      totalVisits: 0,
      lastVisitDate: '',
      notes: '',
      profileImage: ''
    },
    {
      id: 'CUST-2024-005',
      name: 'Priya Desai',
      mobile: '9090909090',
      alternateMobile: '',
      location: 'Pimple Saudagar, Pune',
      dob: '1992-05-16',
      email: 'priya.desai@example.com',
      gender: 'Female',
      registrationDate: formatDate(new Date()),
      visits: [],
      totalVisits: 0,
      lastVisitDate: '',
      notes: '',
      profileImage: ''
    }
  ];

  saveData(STORAGE_KEYS.customers, sampleCustomers);
  saveData(STORAGE_KEYS.prescriptions, []);
  saveData(STORAGE_KEYS.invoices, []);
  saveData(STORAGE_KEYS.appSettings, getSettings());
  saveData(STORAGE_KEYS.activityLog, []);
};

const trackActivity = (message) => {
  const log = getLocalData(STORAGE_KEYS.activityLog) || [];
  log.unshift({ message, timestamp: new Date().toISOString() });
  if (log.length > 100) log.length = 100;
  saveData(STORAGE_KEYS.activityLog, log);
};
