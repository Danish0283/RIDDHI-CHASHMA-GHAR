const AUTH_DEFAULT_USERNAME = DEFAULT_ADMIN_CREDENTIALS.username;
const AUTH_DEFAULT_PASSWORD = DEFAULT_ADMIN_CREDENTIALS.password;

const getCredentials = () => resolveAdminCredentials(getSettings());

const startSession = (username, rememberMe) => {
  const sessionTimeout = getSettings().sessionTimeout || 30;
  const loginTime = new Date().toISOString();
  const session = {
    isLoggedIn: true,
    username,
    loginTime,
    rememberMe: !!rememberMe,
    timeoutMinutes: sessionTimeout
  };
  saveSession(session);
  return session;
};

const clearSession = () => {
  saveSession({ isLoggedIn: false });
};

const isSessionValid = () => {
  const session = getSession();
  if (!session || !session.isLoggedIn) return false;
  if (session.rememberMe) return true;
  const loginTime = new Date(session.loginTime);
  if (Number.isNaN(loginTime.getTime())) return false;
  const elapsed = (new Date() - loginTime) / (1000 * 60);
  return elapsed < (session.timeoutMinutes || getSettings().sessionTimeout || 30);
};

const redirectToLogin = () => {
  window.location.href = 'index.html';
};

const enableHeaderInteractions = () => {
  const profileMenu = document.getElementById('profileMenu');
  const profileButton = document.getElementById('profileMenuButton');
  const logoutButton = document.getElementById('logoutButton');
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const sidebar = document.getElementById('sidebar');

  if (profileButton && profileMenu) {
    profileButton.addEventListener('click', () => {
      const isOpen = profileMenu.style.display === 'flex';
      profileMenu.style.display = isOpen ? 'none' : 'flex';
      profileButton.setAttribute('aria-expanded', String(!isOpen));
    });
    window.addEventListener('click', (event) => {
      if (!profileButton.contains(event.target) && !profileMenu.contains(event.target)) {
        profileMenu.style.display = 'none';
        profileButton.setAttribute('aria-expanded', 'false');
      }
    });
    profileMenu.querySelectorAll('button[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'logout') handleLogout();
        if (action === 'settings') window.location.href = 'settings.html';
      });
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  if (mobileMenuButton && sidebar) {
    mobileMenuButton.setAttribute('aria-expanded', String(sidebar.classList.contains('open')));
    mobileMenuButton.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('open');
      mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
    });
    sidebar.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('open');
        mobileMenuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }
};

const handleLogout = () => {
  clearSession();
  showToast('Logged out successfully.', 'success');
  setTimeout(redirectToLogin, 500);
};

const runLiveClock = () => {
  const clock = document.getElementById('liveClock');
  if (!clock) return;
  const update = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour12: false });
    clock.textContent = `${formatDate(now)} ${timeString}`;
  };
  update();
  setInterval(update, 1000);
};

const initLoginPage = () => {
  if (window.RiddhiMigrationCore?.ensureLocalStorageSchema) {
    window.RiddhiMigrationCore.ensureLocalStorageSchema({ dryRun: false });
  }
  initializeDemoData();

  const savedSession = getSession();
  if (!savedSession?.isLoggedIn || !isSessionValid()) {
    startSession(AUTH_DEFAULT_USERNAME, true);
  }

  if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const rememberMe = document.getElementById('rememberMe');
  const forgotPassword = document.getElementById('forgotPassword');
  const togglePassword = document.getElementById('togglePassword');
  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');
  const loginButton = document.getElementById('loginButton');

  if (!form) return;

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    usernameError.textContent = '';
    passwordError.textContent = '';
    usernameInput.classList.remove('input-error');
    passwordInput.classList.remove('input-error');

    const usernameValue = usernameInput.value.trim();
    const passwordValue = passwordInput.value.trim();
    let valid = true;

    if (usernameValue === '') {
      usernameError.textContent = 'This field is required';
      usernameInput.classList.add('input-error');
      valid = false;
    }
    if (passwordValue === '') {
      passwordError.textContent = 'This field is required';
      passwordInput.classList.add('input-error');
      valid = false;
    }
    if (!valid) return;

    const { username, password } = getCredentials();
    if (usernameValue === username && passwordValue === password) {
      loginButton.classList.add('loading');
      startSession(usernameValue, rememberMe.checked);
      setTimeout(() => {
        loginButton.classList.remove('loading');
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      showToast('Invalid credentials', 'error');
      usernameInput.classList.add('input-error');
      passwordInput.classList.add('input-error');
      document.querySelector('.auth-card').classList.add('input-error');
      setTimeout(() => {
        document.querySelector('.auth-card').classList.remove('input-error');
      }, 400);
    }
  };

  form.addEventListener('submit', handleLoginSubmit);
  loginButton.addEventListener('click', (event) => {
    event.preventDefault();
    form.requestSubmit();
  });

  forgotPassword.addEventListener('click', () => {
    alert('Please contact the system administrator for password recovery.');
  });

  togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
  });
};

const initPage = () => {
  if (window.RiddhiMigrationCore?.ensureLocalStorageSchema) {
    window.RiddhiMigrationCore.ensureLocalStorageSchema({ dryRun: false });
  }
  const session = getSession();
  if (!session?.isLoggedIn || !isSessionValid()) {
    startSession(AUTH_DEFAULT_USERNAME, true);
  }
  enableHeaderInteractions();
  runLiveClock();
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const searchInput = document.querySelector('input[type="search"]');
      if (searchInput) searchInput.focus();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      const button = document.querySelector('button#openCustomerForm');
      button?.click();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      const button = document.querySelector('button#openInvoiceForm');
      button?.click();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      const form = document.querySelector('form');
      if (form && document.activeElement?.closest('form')) {
        event.preventDefault();
        form.requestSubmit();
      }
    }
  });
};

const applyThemeSettings = () => {
  const settings = getSettings();
  document.documentElement.style.setProperty('--primary', settings.primaryColor || '#2563eb');
  const fontSize = settings.fontSize === 'large' ? '17px' : settings.fontSize === 'small' ? '15px' : '16px';
  document.documentElement.style.fontSize = fontSize;
  if (settings.theme === 'dark') {
    document.body.style.background = '#111827';
    document.body.style.color = '#f9fafb';
    document.body.classList.add('dark-mode');
  } else {
    document.body.style.background = 'var(--bg)';
    document.body.style.color = 'var(--text)';
    document.body.classList.remove('dark-mode');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  applyThemeSettings();
  if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
    initLoginPage();
  } else {
    initPage();
  }
});
