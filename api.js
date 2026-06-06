const supabaseUrl = 'https://bkhemgvlyntxmuftsmdz.supabase.co';

const supabaseKey = 'sb_publishable_UVBHdST6jCEX3ub66OhIgA_DxYc6lyA';

const supabaseClient = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

/**
 * CloudESS — Data Service Layer (Mock API)
 * Decoupled operations that mimic database/Supabase async queries.
 * Designed to map to Supabase tables: employees, attendance, leave_requests.
 */

const STORAGE_KEYS = {
  employees: 'ess_employees',
  attendance: 'ess_attendance',
};

// Default bootstrap data to populate the portal on first load
const DEFAULT_EMPLOYEES = [
  {
    id: 'EMP_101',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@company.com',
    phone: '+91 9876543210',
    department: 'IT',
    role: 'Software Developer',
    created_at: new Date('2024-01-15').toISOString()
  },
  {
    id: 'EMP_102',
    name: 'Priya Verma',
    email: 'priya.verma@company.com',
    phone: '+91 9123456780',
    department: 'HR',
    role: 'HR Manager',
    created_at: new Date('2023-11-10').toISOString()
  },
  {
    id: 'EMP_103',
    name: 'Aman Gupta',
    email: 'aman.gupta@company.com',
    phone: '+91 9988776655',
    department: 'Finance',
    role: 'Accountant',
    created_at: new Date('2024-03-05').toISOString()
  }
];

const DEFAULT_ATTENDANCE = [
  {
    id: 1,
    employee_id: 'EMP_101',
    name: 'Rahul Sharma',
    date: getTodayString(-1), // yesterday
    clockIn: '09:05',
    clockOut: '18:02',
    status: 'Present'
  },
  {
    id: 2,
    employee_id: 'EMP_102',
    name: 'Priya Verma',
    date: getTodayString(-1),
    clockIn: '08:52',
    clockOut: '17:35',
    status: 'Present'
  }
];

const DEFAULT_LEAVES = [
  {
    id: 'REQ_201',
    employee_id: 'EMP_103',
    name: 'Aman Gupta',
    type: 'Sick Leave',
    start_date: getTodayString(2),
    end_date: getTodayString(4),
    reason: 'Dental wisdom tooth extraction surgery and subsequent rest.',
    status: 'Approved',
    created_at: new Date().toISOString()
  },
  {
    id: 'REQ_202',
    employee_id: 'EMP_101',
    name: 'Rahul Sharma',
    type: 'Casual Leave',
    start_date: getTodayString(10),
    end_date: getTodayString(11),
    reason: 'Family gathering in my hometown.',
    status: 'Pending',
    created_at: new Date().toISOString()
  }
];

// Helper to calculate date offsets for default logs
function getTodayString() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// Helper to format localized time (HH:MM)
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Utility: Simulate network delay (150ms - 400ms) for realistic UX and loading states
function delay(ms = 0) {
  const randomDelay = ms || Math.floor(Math.random() * 250) + 150;
  return new Promise(resolve => setTimeout(resolve, randomDelay));
}

// Initialize LocalStorage if empty
function initializeDB() {
  if (!localStorage.getItem(STORAGE_KEYS.employees)) {
    localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(DEFAULT_EMPLOYEES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.attendance)) {
    localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(DEFAULT_ATTENDANCE));
  }
}

// Run initialization
initializeDB();

// ==========================================
// 1. EMPLOYEES SERVICE
// ==========================================

/**
 * Fetch all registered employees
 * @returns {Promise<Array>} List of employees
 */
async function getEmployees() {
  const { data, error } = await supabaseClient
    .from('employees')
    .select('*');

  if (error) {
    console.error('Supabase Error:', error);
    return [];
  }

  return data || [];
}

/**
 * Register a new employee with auto-generated ID (EMP_xxx)
 * @param {Object} employeeData Employee details (name, email, phone, department, role)
 * @returns {Promise<Object>} The registered employee object
 */
async function createEmployee(employeeData) {
  const employees = await getEmployees();

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

  const { data, error } = await supabaseClient
    .from('employees')
    .insert([
      {
        id: generatedId,
        name: employeeData.name.trim(),
        email: employeeData.email.trim(),
        phone: employeeData.phone.trim(),
        department: employeeData.department,
        role: employeeData.role.trim(),
        hireDate: new Date().toLocaleDateString('en-CA'),
        status: 'Active',
        avatar: null
      }
    ])
    .select();

  if (error) {
    console.error('Supabase Insert Error:', error);
    throw error;
  }

  return data[0];
}

// ==========================================
// 2. ATTENDANCE SERVICE
// ==========================================

/**
 * Fetch all attendance records
 * @returns {Promise<Array>} List of attendance logs
 */
async function getAttendanceToday(empId) {
  const today = getTodayString();

  const { data, error } = await supabaseClient
    .from("attendance")
    .select("*")
    .eq("empId", empId)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

/**
 * Fetch today's attendance record for a specific employee
 * @param {string} employeeId Employee ID
 * @returns {Promise<Object|null>} Today's attendance record or null
 */


/**
 * Perform a Clock In action for today
 * @param {string} employeeId Employee ID
 * @param {string} employeeName Employee Name
 * @returns {Promise<Object>} The newly created attendance record
 */
async function clockIn(employeeId, employeeName) {
  await delay(350);

  const today = getTodayString();
  const now = new Date();

  // Check if already clocked in today
  const { data: existing } = await supabaseClient
    .from("attendance")
    .select("*")
    .eq("empId", employeeId)
    .eq("date", today);

  if (existing && existing.length > 0) {
    throw new Error("Already clocked in for today.");
  }

  // Determine attendance status
  const hour = now.getHours();
  const min = now.getMinutes();

  let status = "Present";
  if (hour > 9 || (hour === 9 && min > 15)) {
    status = "Late";
  }

  const newRecord = {
    id: Date.now(),
    empId: employeeId,
    name: employeeName,
    date: today,
    clockIn: formatTime(now),
    clockOut: "--:--",
    status: status
  };

  const { data, error } = await supabaseClient
    .from("attendance")
    .insert([newRecord])
    .select();

  if (error) {
    console.log("Clock In Error:", error);
    throw error;
  }

  return data[0];
}

/**
 * Perform a Clock Out action for today
 * @param {string} employeeId Employee ID
 * @returns {Promise<Object>} The updated attendance record
 */
async function clockOut(employeeId) {
  await delay(350);
  const attendanceLogs = await getAttendance();
  const today = getTodayString();
  const now = new Date();

  const recordIndex = attendanceLogs.findIndex(log => log.empId === employeeId && log.date === today);
  if (recordIndex === -1) {
    throw new Error('No Clock In record found for today.');
  }

  const record = attendanceLogs[recordIndex];
  if (record.clockOut !== '--:--') {
    throw new Error('Already clocked out for today.');
  }

  // Update Clock Out time
  const { data, error } = await supabaseClient
    .from("attendance")
    .update({
      clockOut: formatTime(now)
    })
    .eq("empId", employeeId)
    .eq("date", today)
    .select();

  if (error) {
    console.log("Clock Out Error:", error);
    throw error;
  }

  return data[0];
}

// ==========================================
// 3. LEAVE REQUESTS SERVICE
// ==========================================

/**
 * Fetch all leave requests
 * @returns {Promise<Array>} List of leave requests
 */
async function getLeaveRequests() {
  const { data, error } = await supabaseClient
    .from("leaves")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.log("Fetch Leave Error:", error);
    return [];
  }

  return data;
}

/**
 * Submit a new leave request
 * @param {Object} leaveData Details of leave (employeeId, employeeName, type, startDate, endDate, reason)
 * @returns {Promise<Object>} The submitted leave request
 */
async function createLeaveRequest(leaveData) {
  const { data, error } = await supabaseClient
    .from("leaves")
    .insert([
      {
        id: `REQ_${Date.now()}`,
        empId: leaveData.employee_id,
        name: leaveData.name,
        type: leaveData.type,
        startDate: leaveData.start_date,
        endDate: leaveData.end_date,
        reason: leaveData.reason,
        status: "Pending"
      }
    ])
    .select();

  if (error) {
    console.log("Leave Insert Error:", error);
    throw error;
  }

  return data[0];
}
async function getAttendance() {
  const { data, error } = await supabaseClient
    .from("attendance")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.log("Attendance Fetch Error:", error);
    return [];
  }

  return data || [];
}
async function markAbsent(employeeId, employeeName) {
  await delay(200);

  const attendanceLogs = await getAttendance();
  const today = getTodayString();

  // check if already exists
  const existing = attendanceLogs.find(
    log => log.empId === employeeId && log.date === today
  );

  if (existing) {
    return existing; // already marked (avoid duplicates)
  }

  const newRecord = {
    id: Date.now(),
    empId: employeeId,
    name: employeeName,
    date: today,
    clockIn: '--:--',
    clockOut: '--:--',
    status: 'Absent'
  };

  const { data, error } = await supabaseClient
    .from("attendance")
    .insert([newRecord])
    .select();

  if (error) {
    console.log("Absent Insert Error:", error);
    throw error;
  }

  return data[0];
}


// Export API functions for window context
window.API = {
  getEmployees,
  createEmployee,
  getAttendance,
  getAttendanceToday,
  clockIn,
  clockOut,
  getLeaveRequests,
  createLeaveRequest,
  getTodayString,
  markAbsent
};
