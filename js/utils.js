const $$ = (sel, root = document) => root.querySelector(sel);
const $$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function toDateInputValue(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return todayISO();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tagForStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("approved")) return ["tag tag--ok", status];
  if (v === "completed") return ["tag tag--ok", status];
  if (v === "closed") return ["tag tag--info", status];
  if (v.includes("waiting")) return ["tag tag--warn", status];
  if (v.includes("progress")) return ["tag tag--info", status];
  if (v === "pending") return ["tag tag--warn", status];
  return ["tag", status || "—"];
}

function setSelectOptions(selectEl, options, includeAll = true) {
  selectEl.innerHTML = "";
  if (includeAll) {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "All";
    selectEl.appendChild(o);
  }
  options.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    selectEl.appendChild(o);
  });
}

function openModal(title, innerHtml) {
  $$("#modalTitle").textContent = title;
  $$("#modalBody").innerHTML = innerHtml;
  $$("#modal").classList.remove("hidden");
}

function closeModal() {
  if (window.__modalLocked) return;
  $$("#modal").classList.add("hidden");
  $$("#modalBody").innerHTML = "";
}

document.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.dataset && t.dataset.close) closeModal();
});
