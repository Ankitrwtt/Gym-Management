
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};
const KEYS = {
  USERS: "gm_users",
  SESSION: "gm_session",
  MEMBERS: "gm_members",
};

(function seed() {
  if (!store.get(KEYS.USERS)) {
    store.set(KEYS.USERS, [
      { id: crypto.randomUUID(), name: "Admin User", email: "admin@ironclub.com", pass: "admin123", role: "admin" },
      { id: crypto.randomUUID(), name: "Coach Priya", email: "priya@ironclub.com", pass: "coach123", role: "trainer" },
    ]);
  }
  if (!store.get(KEYS.MEMBERS)) {
    const today = new Date();
    const addDays = (d, n) => new Date(d.getTime() + n*86400000);
    store.set(KEYS.MEMBERS, [
      {
        id: crypto.randomUUID(),
        name: "Rahul Sharma",
        email: "rahul@example.com",
        phone: "9876543210",
        plan: "Monthly",
        startDate: toISO(addDays(today, -10)),
        endDate: toISO(addDays(today, 20)),
      },
      {
        id: crypto.randomUUID(),
        name: "Anita Verma",
        email: "anita@example.com",
        phone: "9876500012",
        plan: "Quarterly",
        startDate: toISO(addDays(today, -40)),
        endDate: toISO(addDays(today, -2)),
      },
      {
        id: crypto.randomUUID(),
        name: "Zaid Khan",
        email: "zaid@example.com",
        phone: "9811111111",
        plan: "Yearly",
        startDate: toISO(addDays(today, -100)),
        endDate: toISO(addDays(today, 230)),
      },
    ]);
  }
})();


function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
function toISO(d) { return new Date(d).toISOString().slice(0,10); }
function daysBetween(a, b) {
  const A = new Date(a); const B = new Date(b);
  return Math.ceil((B - A) / 86400000);
}
function todayISO() { return toISO(new Date()); }

function statusFor(member) {
  const now = todayISO();
  if (member.endDate < now) return "expired";
  const left = daysBetween(now, member.endDate);
  if (left <= 7) return "soon";
  return "active";
}

function badge(label, cls) {
  return `<span class="badge ${cls}">${label}</span>`;
}

function toast(msg, type="ok", timeout=2200) {
  const host = $("#toastHost");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => { el.remove(); }, timeout);
}


const tabLogin = $("#tabLogin");
const tabSignup = $("#tabSignup");
const loginForm = $("#loginForm");
const signupForm = $("#signupForm");

tabLogin.addEventListener("click", () => switchTab("login"));
tabSignup.addEventListener("click", () => switchTab("signup"));
function switchTab(which) {
  const login = which === "login";
  tabLogin.classList.toggle("active", login);
  tabSignup.classList.toggle("active", !login);
  tabLogin.setAttribute("aria-selected", login);
  tabSignup.setAttribute("aria-selected", !login);
  tabLogin.tabIndex = login ? 0 : -1;
  tabSignup.tabIndex = login ? -1 : 0;
  loginForm.classList.toggle("hidden", !login);
  signupForm.classList.toggle("hidden", login);
}


const users = () => store.get(KEYS.USERS, []);
const saveUsers = (list) => store.set(KEYS.USERS, list);

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const pass = $("#loginPass").value;
  const user = users().find(u => u.email.toLowerCase() === email && u.pass === pass);
  if (!user) {
    $("#loginMsg").textContent = "Invalid email or password.";
    toast("Login failed", "err");
    return;
  }
  store.set(KEYS.SESSION, { userId: user.id });
  $("#loginMsg").textContent = "";
  showDashboard(user);
  toast(`Welcome back, ${user.name.split(" ")[0]}!`);
});

signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#suName").value.trim();
  const email = $("#suEmail").value.trim().toLowerCase();
  const pass = $("#suPass").value;
  const role = $("#suRole").value;
  if (users().some(u => u.email.toLowerCase() === email)) {
    $("#signupMsg").textContent = "This email is already registered.";
    toast("Email already exists", "warn");
    return;
  }
  const newUser = { id: crypto.randomUUID(), name, email, pass, role };
  const list = users(); list.push(newUser); saveUsers(list);
  $("#signupMsg").textContent = "Account created! You can login now.";
  toast("Account created", "ok");
  switchTab("login");
});


window.addEventListener("DOMContentLoaded", () => {
  $("#yearNow").textContent = new Date().getFullYear();
  const sess = store.get(KEYS.SESSION);
  if (sess) {
    const user = users().find(u => u.id === sess.userId);
    if (user) { showDashboard(user); }
  }
});


const dash = $("#dashboard");
const auth = $("#authSection");
const kpiActive = $("#kpiActive");
const kpiExpiring = $("#kpiExpiring");
const kpiTrainers = $("#kpiTrainers");
const tbody = $("#memberTbody");

function currentUser() {
  const sess = store.get(KEYS.SESSION);
  if (!sess) return null;
  return users().find(u => u.id === sess.userId) || null;
}

function showDashboard(user) {
  auth.classList.add("hidden");
  dash.classList.remove("hidden");
  $("#welcomeMsg").textContent = `Welcome, ${user.name} (${user.role})`;
  renderMembers();
  updateKPIs();
}

$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(KEYS.SESSION);
  dash.classList.add("hidden");
  auth.classList.remove("hidden");
  toast("Logged out", "ok");
});


const members = () => store.get(KEYS.MEMBERS, []);
const saveMembers = (list) => store.set(KEYS.MEMBERS, list);


$("#clearFilters").addEventListener("click", () => {
  $("#searchInput").value = "";
  $("#filterStatus").value = "all";
  $("#filterPlan").value = "all";
  $("#sortBy").value = "name";
  renderMembers();
});
$("#searchInput").addEventListener("input", renderMembers);
$("#filterStatus").addEventListener("change", renderMembers);
$("#filterPlan").addEventListener("change", renderMembers);
$("#sortBy").addEventListener("change", renderMembers);

const modal = $("#memberModal");
$("#openAdd").addEventListener("click", () => openMemberModal());
$("#closeModal").addEventListener("click", () => modal.close());
modal.addEventListener("cancel", (e) => e.preventDefault()); 

function openMemberModal(member = null) {
  $("#memberFormTitle").textContent = member ? "Edit Member" : "Add Member";
  $("#memberId").value = member?.id || "";
  $("#mName").value = member?.name || "";
  $("#mEmail").value = member?.email || "";
  $("#mPhone").value = member?.phone || "";
  $("#mPlan").value = member?.plan || "Monthly";
  $("#mStart").value = member?.startDate || todayISO();
  $("#mEnd").value = member?.endDate || todayISO();
  modal.showModal();
}

$("#memberForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#memberId").value || crypto.randomUUID();
  const m = {
    id,
    name: $("#mName").value.trim(),
    email: $("#mEmail").value.trim(),
    phone: $("#mPhone").value.trim(),
    plan: $("#mPlan").value,
    startDate: $("#mStart").value,
    endDate: $("#mEnd").value,
  };
  if (!m.name) { toast("Name is required", "err"); return; }
  if (new Date(m.endDate) < new Date(m.startDate)) {
    toast("End date cannot be before start date", "err"); return;
  }
  const list = members();
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = m; else list.push(m);
  saveMembers(list);
  modal.close();
  toast("Member saved");
  renderMembers();
  updateKPIs();
});


function renderMembers() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const fStatus = $("#filterStatus").value;
  const fPlan = $("#filterPlan").value;
  const sortBy = $("#sortBy").value;

  let data = members().map(m => ({ ...m, _status: statusFor(m) }));

 
  if (q) {
    data = data.filter(m =>
      [m.name, m.email, m.phone, m.plan].filter(Boolean)
        .some(v => v.toLowerCase().includes(q))
    );
  }
  if (fStatus !== "all") data = data.filter(m => (m._status === fStatus));
  if (fPlan !== "all") data = data.filter(m => (m.plan === fPlan));

  
  const collators = new Intl.Collator(undefined, { sensitivity: "base" });
  data.sort((a, b) => {
    if (sortBy === "name") return collators.compare(a.name, b.name);
    if (sortBy === "startDate") return new Date(a.startDate) - new Date(b.startDate);
    if (sortBy === "endDate") return new Date(a.endDate) - new Date(b.endDate);
    if (sortBy === "status") return collators.compare(a._status, b._status);
    return 0;
  });

 
  tbody.innerHTML = data.map(m => {
    const st = m._status;
    const daysLeft = Math.max(0, daysBetween(todayISO(), m.endDate));
    const statusBadge =
      st === "active" ? badge("Active", "active") :
      st === "soon" ? badge("Expiring", "soon") :
      badge("Expired", "expired");

    return `<tr>
      <td>${escapeHTML(m.name)}</td>
      <td>
        ${m.email ? `<div>${escapeHTML(m.email)}</div>` : ""}
        ${m.phone ? `<small>${escapeHTML(m.phone)}</small>` : ""}
      </td>
      <td>${badge(m.plan, "plan")}</td>
      <td>${m.startDate}</td>
      <td>${m.endDate}</td>
      <td>${statusBadge}</td>
      <td>${daysLeft}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn" data-edit="${m.id}" title="Edit">Edit</button>
          <button class="btn danger" data-del="${m.id}" title="Delete">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  $all('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
    const m = members().find(x => x.id === btn.dataset.edit);
    if (m) openMemberModal(m);
  }));
  $all('[data-del]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.del;
    const list = members();
    const m = list.find(x => x.id === id);
    if (!m) return;
    if (confirm(`Delete member "${m.name}"?`)) {
      saveMembers(list.filter(x => x.id !== id));
      toast("Member deleted", "warn");
      renderMembers(); updateKPIs();
    }
  }));
}

function updateKPIs() {
  const list = members().map(m => ({...m, _status: statusFor(m)}));
  kpiActive.textContent = list.filter(m => m._status === "active" || m._status === "soon").length;
  kpiExpiring.textContent = list.filter(m => m._status === "soon").length;
  kpiTrainers.textContent = users().filter(u => u.role === "trainer").length;
}

function escapeHTML(s = "") {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (document.activeElement?.tagName === "INPUT")) {
    const visibleForm = !loginForm.classList.contains("hidden") ? loginForm : !signupForm.classList.contains("hidden") ? signupForm : null;
    if (visibleForm) visibleForm.requestSubmit();
  }
});
