const STATUS_OPTIONS = [
  "Pending",
  "In Progress",
  "Waiting for Parts",
  "Completed",
  "Closed",
  "Supervisor Approved",
];

const WO_STATUS_OPTIONS = ["Open", "In Progress", "Completed", "Closed", "Supervisor Approved"];

function setView(viewId) {
  $$$(".view").forEach((v) => v.classList.remove("active"));
  $$(viewId).classList.add("active");

  const loggedIn = viewId === "#viewApp";
  $$("#btnLogout").style.display = loggedIn ? "inline-flex" : "none";
  $$("#whoami").style.display = loggedIn ? "inline-flex" : "none";
}

function setRoute(route) {
  const map = {
    dashboard: "#routeDashboard",
    daily: "#routeDaily",
    workorders: "#routeWorkOrders",
    users: "#routeUsers",
  };
  $$$(".route").forEach((r) => r.classList.remove("active"));
  const el = $$(map[route] || map.dashboard);
  if (el) el.classList.add("active");

  $$$(".nav__item").forEach((b) => b.classList.remove("active"));
  const btn = $$('.nav__item[data-route="' + route + '"]');
  if (btn) btn.classList.add("active");
}

function setWhoami(user) {
  const el = $$("#whoami");
  if (!user) {
    el.textContent = "";
    return;
  }
  el.textContent = `${user.name || user.email} • ${user.role}`;
}

function requireRole(user, allowedRoles) {
  return allowedRoles.includes(user?.role);
}

function ensureRoleOrWarn(user, allowed, msg) {
  if (requireRole(user, allowed)) return true;
  openModal("Permission denied", `<p class="muted">${escapeHtml(msg)}</p>`);
  return false;
}

function renderTable(container, cols, rows, rowActions = null) {
  const head = cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((r) => {
      const tds = cols
        .map((c) => {
          const v = typeof c.value === "function" ? c.value(r) : r[c.value];
          return `<td>${v ?? ""}</td>`;
        })
        .join("");
      const extra = rowActions ? `<td>${rowActions(r) || ""}</td>` : "";
      return `<tr>${tds}${extra}</tr>`;
    })
    .join("");
  const actionsHead = rowActions ? `<th>Actions</th>` : "";
  container.innerHTML = `<table><thead><tr>${head}${actionsHead}</tr></thead><tbody>${body}</tbody></table>`;
}

async function loadDashboard(date) {
  const data = await apiPost({ action: "dashboard.stats", token: token(), date });
  $$("#kpiTotal").textContent = data.total ?? 0;
  $$("#kpiPending").textContent = data.byStatus?.["Pending"] ?? 0;
  $$("#kpiInProgress").textContent = data.byStatus?.["In Progress"] ?? 0;
  $$("#kpiWaiting").textContent = data.byStatus?.["Waiting for Parts"] ?? 0;
  $$("#kpiCompleted").textContent = data.byStatus?.["Completed"] ?? 0;
  $$("#kpiApproved").textContent = data.byStatus?.["Supervisor Approved"] ?? 0;
  $$("#dashMeta").textContent = `Records shown: ${Math.min((data.sampleRows || []).length, 20)}`;

  const cols = [
    { label: "Job No", value: (r) => escapeHtml(r.jobNo || r.id || "") },
    { label: "Time", value: (r) => escapeHtml(r.time || "") },
    { label: "Equipment", value: (r) => escapeHtml(r.equipment || "") },
    { label: "Technician", value: (r) => escapeHtml(r.technician || "") },
    {
      label: "Status",
      value: (r) => {
        const [cls, txt] = tagForStatus(r.status);
        return `<span class="${cls}">${escapeHtml(txt)}</span>`;
      },
    },
    { label: "Priority", value: (r) => escapeHtml(r.priority || "") },
  ];
  renderTable($$("#dashTable"), cols, data.sampleRows || []);
}

async function loadDaily(filters) {
  const data = await apiPost({ action: "daily.list", token: token(), ...filters });
  const cols = [
    { label: "Job No", value: (r) => escapeHtml(r.jobNo || r.id || "") },
    { label: "Date", value: (r) => escapeHtml(r.date || "") },
    { label: "Time", value: (r) => escapeHtml(r.time || "") },
    { label: "Shift", value: (r) => escapeHtml(r.shift || "") },
    { label: "Technician", value: (r) => escapeHtml(r.technician || "") },
    {
      label: "Status",
      value: (r) => {
        const [cls, txt] = tagForStatus(r.status);
        return `<span class="${cls}">${escapeHtml(txt)}</span>`;
      },
    },
    { label: "Equipment", value: (r) => escapeHtml(r.equipment || "") },
    { label: "Location", value: (r) => escapeHtml(r.location || "") },
  ];
  renderTable($$("#dailyTable"), cols, data.rows || []);
}

function dailyFormHtml(defaults = {}) {
  return `
  <form id="dailyForm" class="form">
    <div class="row wrap">
      <label class="field">
        <span>Date</span>
        <input name="date" type="date" value="${escapeHtml(defaults.date || todayISO())}" required />
      </label>
      <label class="field">
        <span>Time</span>
        <input name="time" type="time" value="${escapeHtml(defaults.time || "09:00")}" required />
      </label>
      <label class="field">
        <span>Shift</span>
        <select name="shift">
          ${["Morning", "Afternoon", "Night"].map((v) => `<option ${defaults.shift === v ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
      <label class="field">
        <span>Priority</span>
        <select name="priority">
          ${["Low", "Medium", "High", "Critical"].map((v) => `<option ${defaults.priority === v ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
      <label class="field">
        <span>Status</span>
        <select name="status">
          ${STATUS_OPTIONS.map((v) => `<option ${defaults.status === v ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
    </div>

    <div class="row wrap">
      <label class="field">
        <span>Technician</span>
        <input name="technician" placeholder="Technician name" value="${escapeHtml(defaults.technician || "")}" required />
      </label>
      <label class="field">
        <span>Supervisor</span>
        <input name="supervisor" placeholder="Supervisor name" value="${escapeHtml(defaults.supervisor || "")}" />
      </label>
      <label class="field">
        <span>Department</span>
        <input name="department" placeholder="Department" value="${escapeHtml(defaults.department || "")}" />
      </label>
      <label class="field">
        <span>Location</span>
        <input name="location" placeholder="Location" value="${escapeHtml(defaults.location || "")}" />
      </label>
    </div>

    <div class="row wrap">
      <label class="field">
        <span>Equipment</span>
        <input name="equipment" placeholder="Equipment name" value="${escapeHtml(defaults.equipment || "")}" required />
      </label>
      <label class="field">
        <span>Asset/Serial</span>
        <input name="assetSerial" placeholder="Serial" value="${escapeHtml(defaults.assetSerial || "")}" />
      </label>
      <label class="field">
        <span>Breakdown Type</span>
        <input name="breakdownType" placeholder="Electrical/Mechanical/HVAC…" value="${escapeHtml(defaults.breakdownType || "")}" />
      </label>
      <label class="field">
        <span>Maintenance Type</span>
        <input name="maintenanceType" placeholder="Breakdown/Preventive…" value="${escapeHtml(defaults.maintenanceType || "")}" />
      </label>
      <label class="field">
        <span>Downtime (hrs)</span>
        <input name="downtimeHrs" type="number" step="0.1" min="0" value="${escapeHtml(defaults.downtimeHrs ?? 0)}" />
      </label>
    </div>

    <label class="field">
      <span>Work Description</span>
      <textarea name="workDescription" placeholder="What happened?">${escapeHtml(defaults.workDescription || "")}</textarea>
    </label>
    <label class="field">
      <span>Action Taken</span>
      <textarea name="actionTaken" placeholder="What did you do?">${escapeHtml(defaults.actionTaken || "")}</textarea>
    </label>
    <label class="field">
      <span>Spare Parts Used</span>
      <textarea name="spareParts" placeholder="Parts and quantities…">${escapeHtml(defaults.spareParts || "")}</textarea>
    </label>
    <label class="field">
      <span>Completion Remarks</span>
      <textarea name="completionRemarks" placeholder="Final notes…">${escapeHtml(defaults.completionRemarks || "")}</textarea>
    </label>

    <div class="row wrap">
      <label class="field">
        <span>Before photo link</span>
        <input name="beforePhoto" placeholder="https://..." value="${escapeHtml(defaults.beforePhoto || "")}" />
      </label>
      <label class="field">
        <span>During photo link</span>
        <input name="duringPhoto" placeholder="https://..." value="${escapeHtml(defaults.duringPhoto || "")}" />
      </label>
      <label class="field">
        <span>After photo link</span>
        <input name="afterPhoto" placeholder="https://..." value="${escapeHtml(defaults.afterPhoto || "")}" />
      </label>
    </div>

    <div class="row">
      <button class="btn btn--primary" type="submit">Save</button>
      <button class="btn" type="button" data-close="1">Cancel</button>
    </div>
    <div id="dailyFormError" class="error"></div>
  </form>`;
}

async function createDaily(user) {
  if (!ensureRoleOrWarn(user, ["Admin", "Supervisor", "Technician"], "You cannot create daily records.")) return;
  openModal("New Daily Job Done entry", dailyFormHtml({ technician: user.name || user.email }));
  const form = $$("#dailyForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const row = Object.fromEntries(fd.entries());
    row.downtimeHrs = Number(row.downtimeHrs || 0);
    row.createdBy = user.name || user.email;
    try {
      await apiPost({ action: "daily.create", token: token(), row });
      closeModal();
      await loadDaily({
        date: $$("#dailyFilterDate").value || "",
        status: $$("#dailyFilterStatus").value || "",
        technician: $$("#dailyFilterTech").value || "",
      });
    } catch (err) {
      $$("#dailyFormError").textContent = String(err.message || err);
    }
  });
}

async function loadWorkOrders(filters) {
  const data = await apiPost({ action: "wo.list", token: token(), ...filters });
  const cols = [
    { label: "WO No", value: (r) => escapeHtml(r.woNo || r.id || "") },
    { label: "Title", value: (r) => escapeHtml(r.title || "") },
    { label: "Assigned", value: (r) => escapeHtml(r.assignedTo || "") },
    { label: "Priority", value: (r) => escapeHtml(r.priority || "") },
    {
      label: "Status",
      value: (r) => {
        const [cls, txt] = tagForStatus(r.status);
        return `<span class="${cls}">${escapeHtml(txt)}</span>`;
      },
    },
    { label: "Created", value: (r) => escapeHtml((r.createdAt || "").slice(0, 10)) },
  ];

  const user = window.__user;
  const canUpdate = requireRole(user, ["Admin", "Supervisor"]);
  const actions = canUpdate
    ? (r) =>
        `
      <select data-wo-status="${escapeHtml(r.id)}">
        ${WO_STATUS_OPTIONS.map((s) => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    `
    : null;

  renderTable($$("#woTable"), cols, data.rows || [], actions);

  if (canUpdate) {
    $$$("select[data-wo-status]").forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        const id = e.target.dataset.woStatus;
        const status = e.target.value;
        try {
          await apiPost({ action: "wo.updateStatus", token: token(), id, status });
        } catch (err) {
          openModal("Error", `<p class="muted">${escapeHtml(String(err.message || err))}</p>`);
        }
      });
    });
  }
}

function woFormHtml(defaults = {}) {
  return `
  <form id="woForm" class="form">
    <div class="row wrap">
      <label class="field">
        <span>Title</span>
        <input name="title" value="${escapeHtml(defaults.title || "")}" required />
      </label>
      <label class="field">
        <span>Priority</span>
        <select name="priority">
          ${["Low", "Medium", "High", "Critical"].map((v) => `<option ${defaults.priority === v ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
      <label class="field">
        <span>Status</span>
        <select name="status">
          ${WO_STATUS_OPTIONS.map((v) => `<option ${defaults.status === v ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="row wrap">
      <label class="field">
        <span>Assigned to</span>
        <input name="assignedTo" value="${escapeHtml(defaults.assignedTo || "")}" placeholder="Technician name" />
      </label>
      <label class="field">
        <span>Department</span>
        <input name="department" value="${escapeHtml(defaults.department || "")}" />
      </label>
      <label class="field">
        <span>Location</span>
        <input name="location" value="${escapeHtml(defaults.location || "")}" />
      </label>
    </div>
    <label class="field">
      <span>Description</span>
      <textarea name="description" placeholder="Work order details...">${escapeHtml(defaults.description || "")}</textarea>
    </label>
    <div class="row">
      <button class="btn btn--primary" type="submit">Save</button>
      <button class="btn" type="button" data-close="1">Cancel</button>
    </div>
    <div id="woFormError" class="error"></div>
  </form>`;
}

async function createWO(user) {
  if (!ensureRoleOrWarn(user, ["Admin", "Supervisor"], "Only Admin/Supervisor can create work orders.")) return;
  openModal("New Work Order", woFormHtml({ status: "Open" }));
  const form = $$("#woForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const row = Object.fromEntries(fd.entries());
    row.createdBy = user.name || user.email;
    try {
      await apiPost({ action: "wo.create", token: token(), row });
      closeModal();
      await loadWorkOrders({
        status: $$("#woFilterStatus").value || "",
        assignedTo: $$("#woFilterTech").value || "",
      });
    } catch (err) {
      $$("#woFormError").textContent = String(err.message || err);
    }
  });
}

async function boot() {
  // PWA service worker
  try {
    if ("serviceWorker" in navigator) await navigator.serviceWorker.register("./sw.js");
  } catch (e) {}

// ---------------- Admin: Users ----------------

async function loadUsers() {
  const data = await apiPost({ action: "admin.users.list", token: token() });
  const cols = [
    { label: "Email", value: (r) => escapeHtml(r.email) },
    { label: "Name", value: (r) => escapeHtml(r.name) },
    { label: "Role", value: (r) => escapeHtml(r.role) },
    {
      label: "Enabled",
      value: (r) => `<span class="${r.enabled ? "tag tag--ok" : "tag tag--bad"}">${r.enabled ? "Yes" : "No"}</span>`,
    },
    {
      label: "Reset required",
      value: (r) => `<span class="${r.resetRequired ? "tag tag--warn" : "tag tag--info"}">${r.resetRequired ? "Yes" : "No"}</span>`,
    },
  ];

  const actions = (r) => `
    <div class="row wrap">
      <button class="btn btn--sm" data-user-reset="${escapeHtml(r.email)}" type="button">Reset password</button>
      <button class="btn btn--sm" data-user-toggle="${escapeHtml(r.email)}" type="button">${r.enabled ? "Disable" : "Enable"}</button>
      <button class="btn btn--sm btn--ghost" data-user-delete="${escapeHtml(r.email)}" type="button">Delete</button>
    </div>
  `;

  renderTable($$("#usersTable"), cols, data.rows || [], actions);

  $$$("[data-user-reset]").forEach((b) =>
    b.addEventListener("click", () => openResetPasswordModal(b.dataset.userReset))
  );
  $$$("[data-user-toggle]").forEach((b) =>
    b.addEventListener("click", () => toggleUserEnabled(b.dataset.userToggle))
  );
  $$$("[data-user-delete]").forEach((b) =>
    b.addEventListener("click", () => deleteUser(b.dataset.userDelete))
  );
}

function userFormHtml() {
  return `
    <form id="userForm" class="form">
      <label class="field">
        <span>Email</span>
        <input name="email" type="email" placeholder="user@company.com" required />
      </label>
      <label class="field">
        <span>Name</span>
        <input name="name" placeholder="Full name" />
      </label>
      <label class="field">
        <span>Role</span>
        <select name="role">
          ${["Admin", "Supervisor", "Technician"].map((r) => `<option>${r}</option>`).join("")}
        </select>
      </label>
      <label class="field">
        <span>Temporary password</span>
        <input name="password" type="text" minlength="8" placeholder="At least 8 characters" required />
      </label>
      <div class="row">
        <button class="btn btn--primary" type="submit">Create</button>
        <button class="btn" type="button" data-close="1">Cancel</button>
      </div>
      <div id="userFormError" class="error"></div>
    </form>
  `;
}

async function openCreateUserModal() {
  const user = window.__user;
  if (!ensureRoleOrWarn(user, ["Admin"], "Only Admin can manage users.")) return;
  openModal("Add user", userFormHtml());
  const form = $$("#userForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const u = Object.fromEntries(fd.entries());
    try {
      await apiPost({ action: "admin.users.create", token: token(), user: u });
      closeModal();
      await loadUsers();
    } catch (err) {
      $$("#userFormError").textContent = String(err.message || err);
    }
  });
}

function resetPasswordHtml(email) {
  const pw = "Temp@" + Math.random().toString(36).slice(2, 8) + "1";
  return `
    <p class="muted">Reset password for: <b>${escapeHtml(email)}</b></p>
    <form id="resetForm" class="form">
      <label class="field">
        <span>New temporary password</span>
        <input name="tempPassword" type="text" minlength="8" value="${escapeHtml(pw)}" required />
      </label>
      <div class="row">
        <button class="btn btn--primary" type="submit">Reset</button>
        <button class="btn" type="button" data-close="1">Cancel</button>
      </div>
      <div id="resetFormError" class="error"></div>
    </form>
  `;
}

function openResetPasswordModal(email) {
  const user = window.__user;
  if (!ensureRoleOrWarn(user, ["Admin"], "Only Admin can reset passwords.")) return;
  openModal("Reset password", resetPasswordHtml(email));
  const form = $$("#resetForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tempPassword = String(new FormData(form).get("tempPassword") || "");
    try {
      await apiPost({ action: "admin.users.resetPassword", token: token(), email, tempPassword });
      closeModal();
      await loadUsers();
      openModal("Password reset", `<p class="muted">New temporary password for <b>${escapeHtml(email)}</b>: <b>${escapeHtml(tempPassword)}</b></p>`);
    } catch (err) {
      $$("#resetFormError").textContent = String(err.message || err);
    }
  });
}

async function toggleUserEnabled(email) {
  const user = window.__user;
  if (!ensureRoleOrWarn(user, ["Admin"], "Only Admin can manage users.")) return;
  const data = await apiPost({ action: "admin.users.list", token: token() });
  const u = (data.rows || []).find((x) => x.email === email);
  const enabled = !(u && u.enabled);
  await apiPost({ action: "admin.users.update", token: token(), email, enabled });
  await loadUsers();
}

async function deleteUser(email) {
  const user = window.__user;
  if (!ensureRoleOrWarn(user, ["Admin"], "Only Admin can manage users.")) return;
  openModal(
    "Confirm delete",
    `<p class="muted">Delete user <b>${escapeHtml(email)}</b>? This will disable the account and keep it in audit logs.</p>
     <div class="row">
       <button id="btnConfirmDelete" class="btn btn--primary" type="button">Delete</button>
       <button class="btn" type="button" data-close="1">Cancel</button>
     </div>`
  );
  $$("#btnConfirmDelete").addEventListener("click", async () => {
    try {
      await apiPost({ action: "admin.users.delete", token: token(), email });
      closeModal();
      await loadUsers();
    } catch (err) {
      openModal("Error", `<p class="muted">${escapeHtml(String(err.message || err))}</p>`);
    }
  });
}

function forcePasswordChangeIfNeeded(user) {
  if (!user?.resetRequired) return;
  window.__modalLocked = true;
  openModal(
    "Password update required",
    `
      <p class="muted">Your password must be changed before you can continue.</p>
      <form id="pwForm" class="form">
        <label class="field">
          <span>New password</span>
          <input name="p1" type="password" minlength="8" required />
        </label>
        <label class="field">
          <span>Confirm password</span>
          <input name="p2" type="password" minlength="8" required />
        </label>
        <div class="row">
          <button class="btn btn--primary" type="submit">Update</button>
          <button class="btn" type="button" id="pwLogout">Logout</button>
        </div>
        <div id="pwErr" class="error"></div>
      </form>
    `
  );
  $$("#pwLogout").addEventListener("click", () => {
    clearSession();
    window.__user = null;
    setWhoami(null);
    window.__modalLocked = false;
    closeModal();
    setView("#viewLogin");
  });
  $$("#pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData($$("#pwForm"));
    const p1 = String(fd.get("p1") || "");
    const p2 = String(fd.get("p2") || "");
    if (p1 !== p2) {
      $$("#pwErr").textContent = "Passwords do not match.";
      return;
    }
    try {
      const u2 = await changePassword(p1);
      window.__modalLocked = false;
      closeModal();
      window.__user = u2;
      setWhoami(u2);
    } catch (err) {
      $$("#pwErr").textContent = String(err.message || err);
    }
  });
}

  // Init selects
  // Init selects
  setSelectOptions($$("#dailyFilterStatus"), STATUS_OPTIONS, true);
  setSelectOptions($$("#woFilterStatus"), WO_STATUS_OPTIONS, true);

  // Default dates
  $$("#dashDate").value = todayISO();
  $$("#dailyFilterDate").value = todayISO();

  // Login actions
  $$("#btnDemo").addEventListener("click", async () => {
    DEMO_MODE = true;
    try {
      const user = await login("admin@voltas.local", "Admin@123");
      await afterLogin(user);
    } catch (err) {
      $$("#loginError").textContent = String(err.message || err);
    }
  });

  $$("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $$("#loginError").textContent = "";
    try {
      const user = await login($$("#loginEmail").value.trim(), $$("#loginPassword").value);
      await afterLogin(user);
    } catch (err) {
      $$("#loginError").textContent = String(err.message || err);
    }
  });

  $$("#btnLogout").addEventListener("click", () => {
    clearSession();
    window.__user = null;
    setWhoami(null);
    window.__modalLocked = false;
    closeModal();
    setView("#viewLogin");
  });

  // Routing
  $$$(".nav__item").forEach((b) =>
    b.addEventListener("click", () => {
      const r = b.dataset.route;
      setRoute(r);
    })
  );

  // Dashboard
  $$("#btnRefreshDash").addEventListener("click", async () => {
    await loadDashboard($$("#dashDate").value);
  });

  // Daily
  $$("#btnNewDaily").addEventListener("click", async () => createDaily(window.__user));
  $$("#btnReloadDaily").addEventListener("click", async () => {
    await loadDaily({
      date: $$("#dailyFilterDate").value || "",
      status: $$("#dailyFilterStatus").value || "",
      technician: $$("#dailyFilterTech").value || "",
    });
  });
  $$("#btnApplyDailyFilters").addEventListener("click", async () => {
    await loadDaily({
      date: $$("#dailyFilterDate").value || "",
      status: $$("#dailyFilterStatus").value || "",
      technician: $$("#dailyFilterTech").value || "",
    });
  });

  // Work orders
  $$("#btnNewWO").addEventListener("click", async () => createWO(window.__user));
  $$("#btnReloadWO").addEventListener("click", async () => {
    await loadWorkOrders({
      status: $$("#woFilterStatus").value || "",
      assignedTo: $$("#woFilterTech").value || "",
    });
  });
  $$("#btnApplyWOFilters").addEventListener("click", async () => {
    await loadWorkOrders({
      status: $$("#woFilterStatus").value || "",
      assignedTo: $$("#woFilterTech").value || "",
    });
  });

  // Admin users
  $$("#btnNewUser").addEventListener("click", async () => openCreateUserModal());
  $$("#btnReloadUsers").addEventListener("click", async () => loadUsers());

  // Auto-login if session exists
  try {
    const u = await me();
    if (u) await afterLogin(u);
    else setView("#viewLogin");
  } catch (err) {
    setView("#viewLogin");
  }
}

async function afterLogin(user) {
  window.__user = user;
  setWhoami(user);
  setView("#viewApp");
  setRoute("dashboard");

  // Admin nav
  const isAdmin = user?.role === "Admin";
  $$("#navUsers").style.display = isAdmin ? "inline-flex" : "none";

  await loadDashboard($$("#dashDate").value);
  await loadDaily({ date: $$("#dailyFilterDate").value, status: "", technician: "" });
  await loadWorkOrders({ status: "", assignedTo: "" });
  if (isAdmin) await loadUsers();

  forcePasswordChangeIfNeeded(user);
}

boot();
