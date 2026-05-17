const AUTH_STORAGE_KEY = "voltas_cmms_session";

function saveSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function login(email, password) {
  const data = await apiPost({ action: "auth.login", email, password });
  saveSession({ token: data.token, user: data.user });
  return data.user;
}

async function me() {
  const s = loadSession();
  if (!s?.token) return null;
  const data = await apiPost({ action: "auth.me", token: s.token });
  s.user = data.user;
  saveSession(s);
  return data.user;
}

async function changePassword(newPassword) {
  const s = loadSession();
  if (!s?.token) throw new Error("Not logged in");
  await apiPost({ action: "auth.changePassword", token: s.token, newPassword });
  const u = await me();
  return u;
}

function token() {
  return loadSession()?.token || "";
}
