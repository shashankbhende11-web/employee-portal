/**
 * CloudESS — App Controller & Router
 * Manages UI rendering, events, routing, and form actions.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRouter();
  initSidebar();
  initDigitalClock();
  initEventHandlers();

  // Set initial route
  handleRoute();
});

// ==========================================
// 1. ROUTER & VIEW MANAGEMENT
// ==========================================

function initRouter() {
  window.addEventListener('hashchange', handleRoute);
}

async function handleRoute() {
  const hash = window.location.hash || '#/dashboard';

  // Toggle active views
  const views = document.querySelectorAll('.app-view');
  views.forEach(view => view.classList.remove('active'));

  // Toggle active navigation highlights
  const navLinks = document.querySelectorAll('.nav-menu-item');
  navLinks.forEach(link => link.classList.remove('active'));

  if (hash === '#/dashboard') {
    document.getElementById('dashboard-view').classList.add('active');
    document.getElementById('nav-dashboard').classList.add('active');
    await renderDashboard();
  } else if (hash === '#/register') {
    document.getElementById('register-view').classList.add('active');
    document.getElementById('nav-register').classList.add('active');
    await renderRegisterPage();
  } else if (hash === '#/attendance') {
    document.getElementById('attendance-view').classList.add('active');
    document.getElementById('nav-attendance').classList.add('active');
    await renderAttendancePage();
  } else if (hash === '#/leaves') {
    document.getElementById('leaves-view').classList.add('active');
    document.getElementById('nav-leaves').classList.add('active');
    await renderLeavesPage();
    //await markAbsentEmployees();
  } else {
    // Default fallback
    window.location.hash = '#/dashboard';
  }

  // Auto-close sidebar on mobile after navigating
  const sidebar = document.querySelector('.sidebar-wrapper');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (sidebar.classList.contains('show')) {
    sidebar.classList.remove('show');
    backdrop.classList.remove('show');
  }

  // ✅ ALWAYS RUN (IMPORTANT)
  //await markAbsentEmployees();
}

// ==========================================
// 2. THEME CONTROLLER (Light / Dark Mode)
// ==========================================

function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const toggleIcon = document.getElementById('theme-toggle-icon');

  if (!toggleBtn) return;

  const updateThemeIcon = (theme) => {
    if (theme === 'dark') {
      toggleIcon.className = 'bi bi-sun-fill';
    } else {
      toggleIcon.className = 'bi bi-moon-fill';
    }
  };

  // Sync button icon with initial theme set in <head>
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcon(currentTheme);

  toggleBtn.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = activeTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} mode!`, 'success');
  });
}

// ==========================================
// 3. SIDEBAR TOGGLER
// ==========================================

function initSidebar() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const sidebar = document.querySelector('.sidebar-wrapper');
  const backdrop = document.querySelector('.sidebar-backdrop');

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      backdrop.classList.toggle('show');
    });

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('show');
      backdrop.classList.remove('show');
    });
  }
}

// ==========================================
// 4. DIGITAL CLOCK (Kiosk Console helper)
// ==========================================

function initDigitalClock() {
  const clockTimeEl = document.getElementById('clock-time');
  const clockDateEl = document.getElementById('clock-date');

  function updateTime() {
    const now = new Date();

    if (clockTimeEl) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      clockTimeEl.innerText = `${hours}:${minutes}:${seconds}`;
    }

    if (clockDateEl) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      clockDateEl.innerText = now.toLocaleDateString('en-US', options);
    }
  }

  updateTime();
  setInterval(updateTime, 1000);
}

// ==========================================
// 5. VIEW RENDERERS & STATE SYNCS
// ==========================================

// Global state trackers for filters
let empSearchQuery = '';
let attendanceFilterDate = '';
let attendanceFilterStatus = '';
let leaveFilterStatus = '';

// --- DASHBOARD RENDERER ---
async function renderDashboard() {
  const employees = await API.getEmployees();
  const attendance = await API.getAttendance();
  const leaves = await API.getLeaveRequests();

  // Metrics calculations
  const totalEmployees = employees.length;

  // Calculate clocked in count for today
  const today = API.getTodayString();
  const clockedInToday = attendance.filter(log => log.date === today && log.clockIn !== '--:--').length;

  // Total leaves request logged
  const totalLeavesCount = leaves.length;

  // Pending leaves
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

  // Bind metrics values
  document.getElementById('stat-total-employees').innerText = totalEmployees;
  document.getElementById('stat-clocked-in').innerText = clockedInToday;
  document.getElementById('stat-on-leave').innerText = totalLeavesCount;
  document.getElementById('stat-pending-leaves').innerText = pendingLeaves;

  // Render recent activity feed (max 4 items)
  const feedContainer = document.getElementById('dashboard-activity-feed');
  if (feedContainer) {
    const activities = [];

    // Collect activities from leaves
    leaves.slice(0, 3).forEach(lv => {
      activities.push({
        type: 'warning',
        icon: 'bi-calendar-range-fill',
        text: `Leave requested: ${lv.name} (${lv.type})`,
        time: new Date(lv.created_at || new Date())
      });
    });

    // Collect activities from attendance
    attendance.slice(0, 4).forEach(att => {
      if (att.clockIn !== '--:--') {
        activities.push({
          type: 'success',
          icon: 'bi-box-arrow-in-right',
          text: `Clocked In: ${att.name} at ${att.clockIn}`,
          time: new Date(`${att.date}T${att.clockIn}`)
        });
      }
      if (att.clockOut !== '--:--') {
        activities.push({
          type: 'danger',
          icon: 'bi-box-arrow-left',
          text: `Clocked Out: ${att.name} at ${att.clockOut}`,
          time: new Date(`${att.date}T${att.clockOut}`)
        });
      }
    });

    // Collect activities from employee registrations
    employees.slice(0, 3).forEach(emp => {
      activities.push({
        type: 'info',
        icon: 'bi-person-plus-fill',
        text: `New registration: ${emp.name} (${emp.id})`,
        time: new Date(emp.created_at || new Date())
      });
    });

    // Sort by newest time
    activities.sort((a, b) => b.time - a.time);

    const displayActivities = activities.slice(0, 4);

    if (displayActivities.length === 0) {
      feedContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-activity d-block fs-2 mb-2 text-secondary"></i>
          No activity recorded in the portal yet.
        </div>
      `;
    } else {
      feedContainer.innerHTML = displayActivities.map(act => {
        const timeFormatted = act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="activity-item ${act.type}">
            <div class="activity-time">${timeFormatted}</div>
            <div class="activity-text text-dark">${escapeHTML(act.text)}</div>
          </div>
        `;
      }).join('');
    }
  }

  // Update header notifications icon
  updateHeaderNotifications(leaves, attendance);
}

function updateHeaderNotifications(leaves, attendance) {
  const badgeEl = document.getElementById('notification-badge');
  const countEl = document.getElementById('notification-count');
  const listEl = document.getElementById('notification-list');
  if (!listEl) return;

  const today = API.getTodayString();
  const alerts = [];

  // Pending leaves
  leaves.filter(l => l.status === 'Pending').forEach(req => {
    alerts.push({
      title: `${req.name} requested leave`,
      desc: `${req.type}: ${req.start_date} to ${req.end_date}`,
      icon: 'bi-calendar-range-fill',
      bgClass: 'bg-warning-light text-warning'
    });
  });

  // Today's clock-ins
  attendance.filter(a => a.date === today).forEach(att => {
    alerts.push({
      title: `${att.name} marked attendance`,
      desc: `Status: ${att.status} (In: ${att.clockIn})`,
      icon: 'bi-clock-fill',
      bgClass: 'bg-success-light text-success'
    });
  });

  if (alerts.length > 0) {
    if (badgeEl) badgeEl.classList.remove('d-none');
    if (countEl) countEl.innerText = alerts.length;

    listEl.innerHTML = alerts.slice(0, 5).map(alert => {
      return `
        <li>
          <a href="javascript:void(0)" class="dropdown-item px-3 py-2 border-bottom d-flex align-items-start gap-2 text-wrap" style="transition: var(--transition-smooth);">
            <div class="${alert.bgClass} rounded-circle p-1 me-1 fs-7 d-flex align-items-center justify-content-center" style="width: 30px; height: 30px; flex-shrink: 0;">
              <i class="bi ${alert.icon}"></i>
            </div>
            <div class="flex-grow-1">
              <div class="fw-semibold text-dark fs-7" style="font-size: 0.85rem;">${escapeHTML(alert.title)}</div>
              <div class="text-muted fs-8 text-truncate" style="max-width: 190px; font-size: 0.75rem;">${escapeHTML(alert.desc)}</div>
            </div>
          </a>
        </li>
      `;
    }).join('');
  } else {
    if (badgeEl) badgeEl.classList.add('d-none');
    if (countEl) countEl.innerText = '0';

    listEl.innerHTML = `
      <li class="px-3 py-4 text-center text-muted small">
        <i class="bi bi-bell-slash d-block fs-3 mb-2 text-secondary"></i>
        No recent activities to display.
      </li>
    `;
  }
}

// --- REGISTRATION PAGE RENDERER ---
async function renderRegisterPage() {
  await updateRegisterIdPreview();
  await renderEmployeeDirectoryTable();
}

async function updateRegisterIdPreview() {
  const employees = await API.getEmployees();

  // Calculate next ID num
  let nextIdNum = 101;

  if (employees.length > 0) {
    const numericIds = employees
      .map(emp => {
        const match = emp.id.match(/^emp[-_](\d+)$/i);
        return match ? parseInt(match[1]) : null;
      })
      .filter(num => num !== null);

    if (numericIds.length > 0) {
      nextIdNum = Math.max(...numericIds) + 1;
    }
  }

  const generatedId = `emp-${nextIdNum}`;
  const previewInput = document.getElementById('reg-preview-id');
  if (previewInput) {
    previewInput.value = generatedId;
  }
}

async function renderEmployeeDirectoryTable() {
  const tbody = document.getElementById('employee-table-body');
  if (!tbody) return;

  const employees = await API.getEmployees();

  // Apply query filters
  const filtered = employees.filter(emp => {
    const q = empSearchQuery.toLowerCase();
    return emp.name.toLowerCase().includes(q) ||
      emp.id.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q);
  });

  document.getElementById('employee-directory-count').innerText = `Total: ${filtered.length} employees`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-muted">
          <i class="bi bi-people d-block fs-2 mb-2 text-secondary"></i>
          No profiles found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(emp => {
    return `
      <tr>
        <td><span class="text-secondary fw-semibold">${emp.id}</span></td>
        <td><span class="fw-semibold text-dark">${escapeHTML(emp.name)}</span></td>
        <td><span class="fw-semibold text-dark">${escapeHTML(emp.department)}</span></td>
        <td><span class="text-secondary">${escapeHTML(emp.role)}</span></td>
      </tr>
    `;
  }).join('');
}

// --- ATTENDANCE PAGE RENDERER ---
async function renderAttendancePage() {
  // Populate dropdown
  const employees = await API.getEmployees();
  const select = document.getElementById('att-employee-select');
  if (select) {
    const currentValue = select.value;
    select.innerHTML = '<option value="" disabled selected>Select Employee</option>' +
      employees.map(emp => `<option value="${emp.id}">${escapeHTML(emp.name)} (${emp.id})</option>`).join('');

    // Maintain selection if exists
    if (currentValue && employees.find(e => e.id === currentValue)) {
      select.value = currentValue;
    } else {
      select.value = '';
      document.getElementById('att-employee-id').value = '';
      resetClockConsoleButtons();
    }
  }

  await renderAttendanceHistoryTable();
}

async function syncClockConsoleState(empId) {
  const alertWr = document.getElementById('attendance-status-alert');
  const alertText = document.getElementById('attendance-alert-text');
  const alertIcon = document.getElementById('attendance-alert-icon');
  const btnIn = document.getElementById('btn-clock-in');
  const btnOut = document.getElementById('btn-clock-out');

  if (!empId) {
    resetClockConsoleButtons();
    return;
  }

  const todayRecord = await API.getAttendanceToday(empId);

  if (alertWr && alertText && alertIcon) {
    alertWr.classList.remove('d-none');

    if (!todayRecord) {
      // 1. Not Clocked In yet - show Clock In, hide Clock Out
      alertWr.className = 'col-12 alert-wrapper';
      alertWr.querySelector('.alert').className = 'alert alert-info d-flex align-items-center mb-0';
      alertIcon.className = 'bi bi-info-circle-fill fs-5 me-2';
      alertText.innerText = 'Not clocked in today. Please Clock In to register attendance.';

      if (btnIn) {
        btnIn.classList.remove('d-none');
        btnIn.disabled = false;
      }
      if (btnOut) {
        btnOut.classList.add('d-none');
      }
    } else if (todayRecord.clockOut === '--:--') {
      // 2. Clocked In, pending Clock Out - hide Clock In, show Clock Out
      alertWr.className = 'col-12 alert-wrapper';
      alertWr.querySelector('.alert').className = 'alert alert-warning d-flex align-items-center mb-0';
      alertIcon.className = 'bi bi-exclamation-triangle-fill fs-5 me-2';
      alertText.innerText = `Clocked In today at ${todayRecord.clockIn} (${todayRecord.status}). Clock Out is pending.`;

      if (btnIn) {
        btnIn.classList.add('d-none');
      }
      if (btnOut) {
        btnOut.classList.remove('d-none');
        btnOut.disabled = false;
      }
    } else {
      // 3. Clock Out complete - hide both buttons
      alertWr.className = 'col-12 alert-wrapper';
      alertWr.querySelector('.alert').className = 'alert alert-success d-flex align-items-center mb-0';
      alertIcon.className = 'bi bi-check-circle-fill fs-5 me-2';
      alertText.innerText = `Shift complete! Clocked In: ${todayRecord.clockIn} | Clocked Out: ${todayRecord.clockOut}.`;

      if (btnIn) {
        btnIn.classList.add('d-none');
      }
      if (btnOut) {
        btnOut.classList.add('d-none');
      }
    }
  }
}

function resetClockConsoleButtons() {
  const alertWr = document.getElementById('attendance-status-alert');
  const btnIn = document.getElementById('btn-clock-in');
  const btnOut = document.getElementById('btn-clock-out');

  if (alertWr) alertWr.classList.add('d-none');
  if (btnIn) {
    btnIn.classList.remove('d-none');
    btnIn.disabled = true;
  }
  if (btnOut) {
    btnOut.classList.remove('d-none');
    btnOut.disabled = true;
  }
}

async function renderAttendanceHistoryTable() {
  const tbody = document.getElementById('attendance-table-body');
  if (!tbody) return;

  const attendance = await API.getAttendance();

  // Apply filters
  const filtered = attendance.filter(log => {
    const matchesDate = attendanceFilterDate === '' || log.date === attendanceFilterDate;
    const matchesStatus = attendanceFilterStatus === '' || log.status === attendanceFilterStatus;
    return matchesDate && matchesStatus;
  });

  document.getElementById('attendance-log-count').innerText = `Total: ${filtered.length} logs`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          <i class="bi bi-calendar-x d-block fs-2 mb-2 text-secondary"></i>
          No attendance logs recorded.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(log => {
    let badgeClass = 'present';
    if (log.status === 'Late') badgeClass = 'late';

    const formattedDate = new Date(log.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // 🔥 FIX: map Supabase fields properly
    const name = log.name;
    const empId = log.empId;
    const clockIn = log.clockIn ?? '--:--';
    const clockOut = log.clockOut ?? '--:--';

    return `
  <tr>
    <td>
      <div class="fw-semibold text-dark">${escapeHTML(name)}</div>
      <div class="text-secondary small" style="font-size: 0.75rem;">ID: ${empId}</div>
    </td>
    <td><span class="text-secondary">${formattedDate}</span></td>
    <td><span class="text-secondary fw-semibold">${clockIn}</span></td>
    <td><span class="text-secondary fw-semibold">${clockOut}</span></td>
    <td><span class="status-badge ${badgeClass}">${log.status}</span></td>
  </tr>
`;
  }).join('');
}

// --- LEAVES PAGE RENDERER ---
async function renderLeavesPage() {
  // Populate dropdown
  const employees = await API.getEmployees();
  const select = document.getElementById('leave-employee-select');
  if (select) {
    const currentValue = select.value;
    select.innerHTML = '<option value="" disabled selected>Select Employee</option>' +
      employees.map(emp => `<option value="${emp.id}">${escapeHTML(emp.name)} (${emp.id})</option>`).join('');

    if (currentValue && employees.find(e => e.id === currentValue)) {
      select.value = currentValue;
    } else {
      select.value = '';
      document.getElementById('leave-employee-id').value = '';
    }
  }

  // Set min dates for start/end inputs (can request leave starting today)
  const todayStr = API.getTodayString();
  const startInput = document.getElementById('leave-start-date');
  const endInput = document.getElementById('leave-end-date');
  if (startInput) startInput.min = todayStr;
  if (endInput) endInput.min = todayStr;

  await renderLeaveHistoryTable();
}

async function renderLeaveHistoryTable() {
  const tbody = document.getElementById('leave-table-body');
  if (!tbody) return;

  const leaves = await API.getLeaveRequests();

  // Apply filters
  const filtered = leaves.filter(lv => {
    return leaveFilterStatus === '' || lv.status === leaveFilterStatus;
  });

  document.getElementById('leave-log-count').innerText = `Total: ${filtered.length} leave requests`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          <i class="bi bi-file-earmark-x d-block fs-2 mb-2 text-secondary"></i>
          No leave requests recorded.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(lv => {
    let badgeClass = 'pending';
    if (lv.status === 'Approved') badgeClass = 'approved';
    if (lv.status === 'Rejected') badgeClass = 'rejected';

    const fmtStart = new Date(lv.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fmtEnd = new Date(lv.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr>
        <td><span class="text-secondary fw-semibold">${lv.id}</span></td>
        <td>
          <div class="fw-semibold text-dark">${escapeHTML(lv.name)}</div>
          <div class="text-secondary small" style="font-size: 0.75rem;">ID: ${lv.empId}</div>
        </td>
        <td><span class="fw-semibold text-secondary">${lv.type}</span></td>
        <td>
          <span class="text-secondary">${fmtStart} to ${fmtEnd}</span>
        </td>
        <td><span class="status-badge ${badgeClass}">${lv.status}</span></td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 6. FORM HANDLING & ACTIONS
// ==========================================

function initEventHandlers() {
  // --- Employee Registration Submission ---
  const registerForm = document.getElementById('employeeRegisterForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const phone = document.getElementById('reg-phone').value;
      const department = document.getElementById('reg-department').value;
      const role = document.getElementById('reg-role').value;

      try {
        const result = await API.createEmployee({ name, email, phone, department, role });
        showToast(`Registration Successful! Employee ID: ${result.id}`, 'success');
        registerForm.reset();
        await renderRegisterPage();
      } catch (err) {
        console.error(err);
        showToast('Registration failed. Please try again.', 'danger');
      }
    });
  }

  // --- Registration Directory Search ---
  const searchInput = document.getElementById('employee-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      empSearchQuery = e.target.value;
      renderEmployeeDirectoryTable();
    });
  }

  // --- Attendance Console Name Dropdown Sync ---
  const attSelect = document.getElementById('att-employee-select');
  if (attSelect) {
    attSelect.addEventListener('change', async (e) => {
      const empId = e.target.value;
      document.getElementById('att-employee-id').value = empId;
      await syncClockConsoleState(empId);
    });
  }

  // --- Clock In Button Action ---
  const btnClockIn = document.getElementById('btn-clock-in');
  if (btnClockIn) {
    btnClockIn.addEventListener('click', async () => {
      const select = document.getElementById('att-employee-select');
      const empId = select.value;
      if (!empId) return;

      const employees = await API.getEmployees();
      const emp = employees.find(e => e.id === empId);
      if (!emp) return;

      btnClockIn.disabled = true; // prevent double clicks
      try {
        const record = await API.clockIn(emp.id, emp.name);
        showToast(`Clocked In successfully at ${record.clockIn}! Status: ${record.status}`, 'success');
        await syncClockConsoleState(empId);
        await renderAttendanceHistoryTable();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Clock In failed.', 'danger');
        btnClockIn.disabled = false;
      }
    });
  }

  // --- Clock Out Button Action ---
  const btnClockOut = document.getElementById('btn-clock-out');
  if (btnClockOut) {
    btnClockOut.addEventListener('click', async () => {
      const select = document.getElementById('att-employee-select');
      const empId = select.value;
      if (!empId) return;

      btnClockOut.disabled = true; // prevent double clicks
      try {
        const record = await API.clockOut(empId);
        showToast(`Clocked Out successfully at ${record.clockOut}!`, 'success');
        await syncClockConsoleState(empId);
        await renderAttendanceHistoryTable();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Clock Out failed.', 'danger');
        btnClockOut.disabled = false;
      }
    });
  }

  // --- Attendance Log Filters ---
  const attFilterDateEl = document.getElementById('filter-attendance-date');
  if (attFilterDateEl) {
    attFilterDateEl.addEventListener('change', (e) => {
      attendanceFilterDate = e.target.value;
      renderAttendanceHistoryTable();
    });
  }

  const attFilterStatusEl = document.getElementById('filter-attendance-status');
  if (attFilterStatusEl) {
    attFilterStatusEl.addEventListener('change', (e) => {
      attendanceFilterStatus = e.target.value;
      renderAttendanceHistoryTable();
    });
  }

  // --- Leave Request Name Dropdown Sync ---
  const leaveSelect = document.getElementById('leave-employee-select');
  if (leaveSelect) {
    leaveSelect.addEventListener('change', (e) => {
      const empId = e.target.value;
      document.getElementById('leave-employee-id').value = empId;
    });
  }

  // --- Leave Request Start/End date validations ---
  const leaveStartEl = document.getElementById('leave-start-date');
  const leaveEndEl = document.getElementById('leave-end-date');
  if (leaveStartEl && leaveEndEl) {
    leaveStartEl.addEventListener('change', () => {
      // End date cannot be before start date
      leaveEndEl.min = leaveStartEl.value;
      if (leaveEndEl.value && leaveEndEl.value < leaveStartEl.value) {
        leaveEndEl.value = leaveStartEl.value;
      }
    });
  }

  // --- Leave Request Submission ---
  const leaveForm = document.getElementById('leaveRequestForm');
  if (leaveForm) {
    leaveForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const empId = document.getElementById('leave-employee-select').value;
      const type = document.getElementById('leave-type').value;
      const startDate = document.getElementById('leave-start-date').value;
      const endDate = document.getElementById('leave-end-date').value;
      const reason = document.getElementById('leave-reason').value;

      const employees = await API.getEmployees();
      const emp = employees.find(e => e.id === empId);
      if (!emp) return;

      // Validate date bounds
      if (endDate < startDate) {
        showToast('End Date cannot be before Start Date.', 'danger');
        return;
      }

      try {
        const result = await API.createLeaveRequest({
          employee_id: emp.id,
          name: emp.name,
          type: type,
          start_date: startDate,
          end_date: endDate,
          reason: reason
        });

        showToast(`Leave request submitted! ID: ${result.id}`, 'success');
        leaveForm.reset();
        document.getElementById('leave-employee-id').value = '';
        await renderLeavesPage();
      } catch (err) {
        console.error(err);
        showToast('Failed to submit leave request.', 'danger');
      }
    });
  }

  // --- Leave History Filters ---
  const leaveFilterStatusEl = document.getElementById('filter-leave-status');
  if (leaveFilterStatusEl) {
    leaveFilterStatusEl.addEventListener('change', (e) => {
      leaveFilterStatus = e.target.value;
      renderLeaveHistoryTable();
    });
  }
}

// ==========================================
// 7. TOAST NOTIFICATION UTILITY
// ==========================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger'} border-0 show`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.style.marginBottom = '10px';

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body fw-semibold">
        <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-x-circle-fill'} me-2"></i>
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toast);

  // Auto-remove toast after 3.2 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  container.style.zIndex = '1100';
  document.body.appendChild(container);
  return container;
}

// ==========================================
// 8. ESCAPE HTML HELPER (XSS mitigation)
// ==========================================

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
async function markAbsentEmployees() {
  try {
    const employees = await API.getEmployees();
    const attendance = await API.getAttendance();
    const today = API.getTodayString();

    const todayLogs = attendance.filter(a => a.date === today);

    for (const emp of employees) {
      const alreadyMarked = todayLogs.some(log => log.empId === emp.id);

      if (!alreadyMarked) {
        await API.markAbsent(emp.id, emp.name);
      }
    }

    console.log("Absent marking completed");
  } catch (err) {
    console.error(err);
  }
}