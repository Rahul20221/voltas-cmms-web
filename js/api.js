function apiConfigOk() {
  return !!(API_BASE_URL && API_BASE_URL.trim());
}

async function apiPost(payload) {
  if (DEMO_MODE) return demoApi(payload);
  if (!apiConfigOk()) throw new Error("API_BASE_URL is not configured. Set it in site/config.js or enable DEMO_MODE.");
  const res = await fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Backend returned non-JSON response (${res.status}): ${text.slice(0, 160)}`);
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ---------------- DEMO API ----------------

const demoStore = {
  users: [
    { email: "admin@voltas.local", password: "Admin@123", role: "Admin", name: "Admin", enabled: true, resetRequired: false },
    {
      email: "supervisor@voltas.local",
      password: "Supervisor@123",
      role: "Supervisor",
      name: "Supervisor",
      enabled: true,
      resetRequired: false,
    },
    { email: "tech@voltas.local", password: "Tech@123", role: "Technician", name: "Technician", enabled: true, resetRequired: false },
  ],
  sessions: {},
  dailyJobs: [],
  workOrders: [],
};

function demoSeedIfEmpty() {
  if (demoStore.dailyJobs.length) return;
  const d = todayISO();
  demoStore.dailyJobs.push(
    {
      id: "DJ-1001",
      jobNo: "DJ-1001",
      date: d,
      time: "09:20",
      shift: "Morning",
      technician: "Technician",
      supervisor: "Supervisor",
      department: "Maintenance",
      location: "Plant A",
      equipment: "AHU-01",
      assetSerial: "AHU01-7782",
      breakdownType: "HVAC",
      maintenanceType: "Breakdown",
      priority: "High",
      status: "In Progress",
      downtimeHrs: 1.5,
      workDescription: "Noise and vibration observed.",
      actionTaken: "Inspected belt tension, aligned pulley.",
      spareParts: "Belt x1",
      completionRemarks: "",
      supervisorRemarks: "",
      beforePhoto: "",
      duringPhoto: "",
      afterPhoto: "",
      createdBy: "Technician",
      createdAt: new Date().toISOString(),
      approvedAt: "",
      closedAt: "",
    },
    {
      id: "DJ-1002",
      jobNo: "DJ-1002",
      date: d,
      time: "11:05",
      shift: "Morning",
      technician: "Technician",
      supervisor: "Supervisor",
      department: "Utilities",
      location: "Utility Room",
      equipment: "Pump-02",
      assetSerial: "PMP02-1133",
      breakdownType: "Mechanical",
      maintenanceType: "Preventive",
      priority: "Medium",
      status: "Completed",
      downtimeHrs: 0.0,
      workDescription: "Monthly inspection & lubrication.",
      actionTaken: "Lubricated bearings, checked coupling.",
      spareParts: "Grease",
      completionRemarks: "OK",
      supervisorRemarks: "",
      beforePhoto: "",
      duringPhoto: "",
      afterPhoto: "",
      createdBy: "Technician",
      createdAt: new Date().toISOString(),
      approvedAt: "",
      closedAt: "",
    }
  );

  demoStore.workOrders.push({
    id: "WO-2001",
    woNo: "WO-2001",
    title: "Replace air filter — AHU-01",
    priority: "Medium",
    status: "Open",
    assignedTo: "Technician",
    location: "Plant A",
    department: "Maintenance",
    description: "Replace AHU filter and record photo proof.",
    createdBy: "Supervisor",
    createdAt: new Date().toISOString(),
    approvedBy: "",
    approvedAt: "",
    closedAt: "",
  });
}

function demoToken(email) {
  return `demo_${btoa(email)}_${Date.now()}`;
}

async function demoApi(payload) {
  demoSeedIfEmpty();
  const { action } = payload || {};
  if (action === "auth.login") {
    const u = demoStore.users.find((x) => x.email === payload.email && x.password === payload.password);
    if (!u) return { ok: false, error: "Invalid credentials" };
    if (!u.enabled) return { ok: false, error: "Account disabled" };
    const token = demoToken(u.email);
    demoStore.sessions[token] = { email: u.email, name: u.name, role: u.role };
    return {
      ok: true,
      token,
      user: { email: u.email, name: u.name, role: u.role, resetRequired: !!u.resetRequired },
    };
  }
  if (action === "auth.me") {
    const s = demoStore.sessions[payload.token];
    if (!s) return { ok: false, error: "Session expired" };
    const u = demoStore.users.find((x) => x.email === s.email);
    return { ok: true, user: { ...s, resetRequired: !!u?.resetRequired } };
  }
  if (action === "auth.changePassword") {
    const s = demoStore.sessions[payload.token];
    if (!s) return { ok: false, error: "Session expired" };
    const u = demoStore.users.find((x) => x.email === s.email);
    if (!u) return { ok: false, error: "User not found" };
    u.password = String(payload.newPassword || "");
    u.resetRequired = false;
    return { ok: true };
  }

  if (action === "daily.list") {
    const date = payload.date || "";
    const status = payload.status || "";
    const technician = (payload.technician || "").toLowerCase();
    let rows = demoStore.dailyJobs.slice();
    if (date) rows = rows.filter((r) => r.date === date);
    if (status) rows = rows.filter((r) => r.status === status);
    if (technician) rows = rows.filter((r) => String(r.technician).toLowerCase().includes(technician));
    return { ok: true, rows };
  }

  if (action === "daily.create") {
    const id = `DJ-${1000 + demoStore.dailyJobs.length + 1}`;
    const row = { ...payload.row, id, jobNo: id, createdAt: new Date().toISOString() };
    demoStore.dailyJobs.unshift(row);
    return { ok: true, row };
  }

  if (action === "dashboard.stats") {
    const date = payload.date || todayISO();
    const rows = demoStore.dailyJobs.filter((r) => r.date === date);
    const byStatus = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    return { ok: true, date, total: rows.length, byStatus, sampleRows: rows.slice(0, 20) };
  }

  if (action === "wo.list") {
    const status = payload.status || "";
    const tech = (payload.assignedTo || "").toLowerCase();
    let rows = demoStore.workOrders.slice();
    if (status) rows = rows.filter((r) => r.status === status);
    if (tech) rows = rows.filter((r) => String(r.assignedTo).toLowerCase().includes(tech));
    return { ok: true, rows };
  }

  if (action === "wo.create") {
    const id = `WO-${2000 + demoStore.workOrders.length + 1}`;
    const row = { ...payload.row, id, woNo: id, createdAt: new Date().toISOString() };
    demoStore.workOrders.unshift(row);
    return { ok: true, row };
  }

  if (action === "wo.updateStatus") {
    const r = demoStore.workOrders.find((x) => x.id === payload.id);
    if (!r) return { ok: false, error: "Work order not found" };
    r.status = payload.status;
    return { ok: true, row: r };
  }

  // Admin user management (demo)
  if (action === "admin.users.list") {
    return {
      ok: true,
      rows: demoStore.users.map((u) => ({
        email: u.email,
        name: u.name,
        role: u.role,
        enabled: !!u.enabled,
        resetRequired: !!u.resetRequired,
        createdAt: "",
        lastLoginAt: "",
      })),
    };
  }
  if (action === "admin.users.create") {
    const u = payload.user || {};
    if (demoStore.users.some((x) => x.email === u.email)) return { ok: false, error: "User already exists" };
    demoStore.users.push({
      email: u.email,
      name: u.name || u.email,
      role: u.role || "Technician",
      password: u.password,
      enabled: true,
      resetRequired: true,
    });
    return { ok: true, row: { email: u.email, name: u.name || u.email, role: u.role || "Technician", enabled: true, resetRequired: true } };
  }
  if (action === "admin.users.update") {
    const u = demoStore.users.find((x) => x.email === payload.email);
    if (!u) return { ok: false, error: "User not found" };
    if (payload.name !== undefined) u.name = payload.name;
    if (payload.role !== undefined) u.role = payload.role;
    if (payload.enabled !== undefined) u.enabled = !!payload.enabled;
    return { ok: true };
  }
  if (action === "admin.users.delete") {
    const idx = demoStore.users.findIndex((x) => x.email === payload.email);
    if (idx < 0) return { ok: false, error: "User not found" };
    demoStore.users.splice(idx, 1);
    return { ok: true };
  }
  if (action === "admin.users.resetPassword") {
    const u = demoStore.users.find((x) => x.email === payload.email);
    if (!u) return { ok: false, error: "User not found" };
    u.password = payload.tempPassword;
    u.resetRequired = true;
    return { ok: true };
  }

  return { ok: false, error: `Unknown action: ${action}` };
}
