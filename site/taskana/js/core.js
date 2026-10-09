/* =====================================================================
   Taskana (by GALIL) — core: constants, utilities, data store,
   permissions, history, notifications and demo data.
   Classic script: everything here is a global used by the other files.
   ===================================================================== */
"use strict";

var KEY = "galil-taskana-v1", OLD_KEYS = ["galil-folio-v1"], BEFORE_RESTORE_KEY = "galil-taskana-before-restore";
var WORKDESK_KEY = "galil-workdesk-v1";
var APP_VERSION = 2;
var ACTIVITY_PER_TASK = 200, NOTIFICATIONS_PER_USER = 300;
var MAX_ATTACHMENT_BYTES = 1024 * 1024;

var STATUSES = [
  { k: "Backlog",     color: "var(--st-backlog)", chip: "" },
  { k: "To Do",       color: "var(--st-todo)",    chip: "blue" },
  { k: "Writing",     color: "var(--st-writing)", chip: "amber" },
  { k: "Peer Review", color: "var(--st-peer)",    chip: "pink" },
  { k: "SME Review",  color: "var(--st-sme)",     chip: "violet" },
  { k: "Done",        color: "var(--st-done)",    chip: "green" }
];
var NOT_STARTED = { "Backlog": 1, "To Do": 1 };
var TYPES = ["Writing", "Editing", "Review", "Illustration", "Translation", "Localization", "SME Interview", "Publishing", "Doc Defect", "Research"];
var TYPE_CHIP = { "Writing": "amber", "Editing": "violet", "Review": "violet", "Illustration": "teal", "Translation": "blue", "Localization": "blue", "SME Interview": "teal", "Publishing": "green", "Doc Defect": "red", "Research": "" };
var PRIORITIES = [
  { k: "Critical", color: "var(--err)" },
  { k: "High",     color: "var(--amber)" },
  { k: "Medium",   color: "var(--blue)" },
  { k: "Low",      color: "var(--grey)" }
];
var DOC_TYPES = ["User Manual", "Operator Manual", "Maintenance Manual", "Online Help", "API Reference", "Release Notes", "Training Courseware", "Quick Start Guide", "Knowledge Base", "Proposal", "Other"];
var PROJECT_STATUSES = ["Active", "On Hold", "Completed", "Archived"];
var ROLES = ["Admin", "Manager", "Member", "Viewer"];
var RECURRENCES = ["", "Weekly", "Every 2 weeks", "Monthly"];
var LINK_TYPES = ["blocks", "is blocked by", "relates to"];
var LINK_INVERSE = { "blocks": "is blocked by", "is blocked by": "blocks", "relates to": "relates to" };
var AVATAR_COLORS = ["#4E7A1C", "#2A78D6", "#B8402F", "#6250D6", "#1F7F72", "#B0661C", "#7A4E33", "#2F6F4F", "#A0326A", "#4A5A9A"];

/* ================= utilities ================= */
function uid(p) { return p + "-" + Math.random().toString(36).slice(2, 9); }
function nowISO() { return new Date().toISOString(); }
function d2s(d) { var m = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd; }
function today() { return d2s(new Date()); }
/* the calendar date (in the viewer's time zone) of a timestamp */
function localDate(iso) { return iso ? d2s(new Date(iso)) : null; }
function parseDay(s) { return new Date(s + "T00:00:00"); }
function addDays(s, n) { var d = parseDay(s); d.setDate(d.getDate() + n); return d2s(d); }
function addMonths(s, n) { var d = parseDay(s); d.setMonth(d.getMonth() + n); return d2s(d); }
/* GALIL works Sunday–Thursday */
function isWeekend(s) { if (!s) return false; var g = parseDay(s).getDay(); return g === 5 || g === 6; }
function isOverdue(t) { return !!t.dueDate && t.status !== "Done" && t.dueDate < today(); }
function initials(name) { return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(function (s) { return s[0].toUpperCase(); }).join(""); }
function colorFor(id) { var h_ = 0; for (var i = 0; i < id.length; i++) h_ = (h_ * 31 + id.charCodeAt(i)) >>> 0; return AVATAR_COLORS[h_ % AVATAR_COLORS.length]; }
function byId(arr, id) { if (!id) return null; for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
function statusOf(k) { for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].k === k) return STATUSES[i]; return STATUSES[0]; }
function prioOf(k) { for (var i = 0; i < PRIORITIES.length; i++) if (PRIORITIES[i].k === k) return PRIORITIES[i]; return PRIORITIES[2]; }
function isObj(o) { return o && typeof o === "object" && !Array.isArray(o); }
function fmtBytes(n) { return n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (Math.round(n / 104857.6) / 10) + " MB"; }

/* ================= store ================= */
var db;
var dataVersion = 0;          // bumped on every save; indexes rebuild lazily
var storageOK = true;

function emptyDB() {
  return { app: "galil-taskana", version: APP_VERSION, users: [], clients: [], projects: [], tasks: [], comments: [], activity: [],
    views: [], notifications: [], attachments: [], settings: { currentUserId: null, theme: null, lang: "en" } };
}
function isBackup(o) { return !!o && (o.app === "galil-taskana" || o.app === "galil-folio") && Array.isArray(o.tasks); }

/* bring older saves (including the app's earlier "Folio" name) up to the current shape */
function upgrade(o) {
  var e = emptyDB();
  Object.keys(e).forEach(function (k) { if (o[k] == null) o[k] = e[k]; });
  o.settings = Object.assign({}, e.settings, o.settings || {});
  o.app = "galil-taskana"; o.version = APP_VERSION;
  o.users.forEach(function (u) { if (!u.role) u.role = "Member"; if (u.isActive == null) u.isActive = true; });
  o.tasks.forEach(function (t) {
    if (!t.aliases) t.aliases = [];
    if (!t.links) t.links = [];
    if (!t.checklist) t.checklist = [];
    if (!t.labels) t.labels = [];
    if (t.parentId === undefined) t.parentId = null;
    if (t.status === "Done" && !t.completedAt) t.completedAt = t.updatedAt;
    if (t.status === "Done" && t.completedBy === undefined) t.completedBy = t.assigneeId;
    if (t.startedAt === undefined) t.startedAt = NOT_STARTED[t.status] ? null : t.createdAt;
  });
  o.activity.forEach(function (a) {
    if (!a.kind) { a.kind = a.text === "created the task" ? "created" : "note"; if (a.kind === "created") { var t = byId(o.tasks, a.taskId); a.to = t ? t.assigneeId : null; } }
  });
  o.comments.forEach(function (c) { c.mentions = c.mentions || []; });
  return o;
}

/* Validate a backup before it replaces anything. Returns an error message or "". */
function validateBackup(o) {
  if (!isObj(o)) return "The file is not a JSON object.";
  if (!isBackup(o)) return "This file is not a Taskana backup.";
  var need = { users: ["id", "fullName"], clients: ["id", "name"], projects: ["id", "clientId", "key", "name"], tasks: ["id", "projectId", "title", "status"] };
  for (var k in need) {
    if (!Array.isArray(o[k])) return "The backup has no “" + k + "” list.";
    for (var i = 0; i < o[k].length; i++) {
      var r = o[k][i];
      if (!isObj(r)) return "Entry " + (i + 1) + " in “" + k + "” is not an object.";
      for (var j = 0; j < need[k].length; j++) if (r[need[k][j]] == null || r[need[k][j]] === "") return "Entry " + (i + 1) + " in “" + k + "” has no " + need[k][j] + ".";
    }
  }
  var pids = {}; o.projects.forEach(function (p) { pids[p.id] = 1; });
  for (var n = 0; n < o.tasks.length; n++) if (!pids[o.tasks[n].projectId]) return "Task “" + o.tasks[n].title + "” belongs to a project that is not in the backup.";
  ["comments", "activity", "views", "notifications", "attachments"].forEach(function (k2) { if (o[k2] != null && !Array.isArray(o[k2])) o[k2] = []; });
  return "";
}

function readStore() {
  try {
    var keys = [KEY].concat(OLD_KEYS);
    for (var i = 0; i < keys.length; i++) {
      var s = localStorage.getItem(keys[i]);
      if (s) { var o = JSON.parse(s); if (isBackup(o)) return upgrade(o); }
    }
  } catch (e) {}
  return null;
}
function load() {
  var o = readStore();
  if (o) return o;
  o = seed(); db = o; save(true);   // save the demo data at once so its dates stay fixed
  return o;
}
function save(quiet) {
  dataVersion++;
  try { localStorage.setItem(KEY, JSON.stringify(db)); storageOK = true; }
  catch (e) { storageOK = false; if (!quiet && typeof toast === "function") toast(tr("Browser storage is full — the last change was not saved. Remove attachments or download a backup.")); }
}
function storageSize() { try { return (localStorage.getItem(KEY) || "").length * 2; } catch (e) { return 0; } }

/* ================= lookups & indexes ================= */
var idx = { v: -1 };
function index() {
  if (idx.v === dataVersion) return idx;
  idx = { v: dataVersion, keys: {}, comments: {}, openQ: {}, children: {}, attachments: {} };
  var pk = {}; db.projects.forEach(function (p) { pk[p.id] = p.key; });
  db.tasks.forEach(function (t) {
    idx.keys[(pk[t.projectId] || "?") + "-" + t.num] = t;
    (t.aliases || []).forEach(function (a) { if (!idx.keys[a]) idx.keys[a] = t; });
    if (t.parentId) (idx.children[t.parentId] = idx.children[t.parentId] || []).push(t);
  });
  db.comments.forEach(function (c) {
    (idx.comments[c.taskId] = idx.comments[c.taskId] || []).push(c);
    if (c.kind === "question" && !c.resolved) (idx.openQ[c.taskId] = idx.openQ[c.taskId] || []).push(c);
  });
  Object.keys(idx.comments).forEach(function (k) { idx.comments[k].sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }); });
  db.attachments.forEach(function (a) { (idx.attachments[a.taskId] = idx.attachments[a.taskId] || []).push(a); });
  return idx;
}
function me() {
  var u = byId(db.users, db.settings.currentUserId);
  if (u && u.isActive) return u;
  /* the chosen person was deactivated or removed: switch to someone active */
  u = db.users.filter(function (x) { return x.isActive; })[0] || db.users[0];
  if (u && db.settings.currentUserId !== u.id) { db.settings.currentUserId = u.id; save(true); }
  return u;
}
function userName(id) { var u = byId(db.users, id); return u ? u.fullName : tr("Unassigned"); }
function projectOf(t) { return byId(db.projects, t.projectId); }
function clientOf(p) { return p ? byId(db.clients, p.clientId) : null; }
function taskKey(t) { var p = projectOf(t); return (p ? p.key : "?") + "-" + t.num; }
function taskByKey(k) { return index().keys[k] || null; }
function commentsOf(taskId) { return index().comments[taskId] || []; }
function openQuestions(taskId) { return index().openQ[taskId] || []; }
function childrenOf(taskId) { return index().children[taskId] || []; }
function attachmentsOf(taskId) { return index().attachments[taskId] || []; }

/* ================= permissions ================= */
function roleOf(u) { return (u || me()).role || "Member"; }
function isManager(u) { var r = roleOf(u); return r === "Admin" || r === "Manager"; }
var can = {
  manageClients: function () { return isManager(); },
  manageProjects: function () { return isManager(); },
  managePeople: function () { return roleOf() === "Admin"; },
  manageData: function () { return roleOf() === "Admin"; },
  createTask: function () { return roleOf() !== "Viewer"; },
  editTask: function () { return roleOf() !== "Viewer"; },
  deleteTask: function (t) { return isManager() || (roleOf() !== "Viewer" && t.reporterId === me().id); },
  comment: function () { return true; },
  editComment: function (c) { return c.authorId === me().id; },
  deleteComment: function (c) { return c.authorId === me().id || roleOf() === "Admin"; },
  resolveQuestion: function (c, t) {
    var u = me(), p = projectOf(t);
    return isManager() || c.authorId === u.id || t.assigneeId === u.id || t.reporterId === u.id || (p && p.leadUserId === u.id);
  },
  editView: function (v) { return v.ownerId === me().id || roleOf() === "Admin"; }
};

/* ================= history ================= */
function log(taskId, kind, fields) {
  var a = Object.assign({ id: uid("a"), taskId: taskId, userId: me().id, at: nowISO(), kind: kind }, fields || {});
  db.activity.push(a);
  /* keep each task's history to a sane length */
  var mine = db.activity.filter(function (x) { return x.taskId === taskId; });
  if (mine.length > ACTIVITY_PER_TASK) {
    var drop = {}; mine.slice(0, mine.length - ACTIVITY_PER_TASK).forEach(function (x) { if (x.kind !== "created") drop[x.id] = 1; });
    db.activity = db.activity.filter(function (x) { return !drop[x.id]; });
  }
  return a;
}

/* ================= notifications ================= */
function notify(userIds, kind, taskId, extra) {
  var by = me().id, seen = {};
  userIds.forEach(function (u) {
    if (!u || u === by || seen[u]) return; seen[u] = 1;
    var usr = byId(db.users, u); if (!usr || !usr.isActive) return;
    db.notifications.push(Object.assign({ id: uid("n"), userId: u, kind: kind, taskId: taskId, byId: by, at: nowISO(), read: false }, extra || {}));
  });
  /* cap per person */
  var count = {};
  for (var i = db.notifications.length - 1; i >= 0; i--) {
    var n = db.notifications[i]; count[n.userId] = (count[n.userId] || 0) + 1;
    if (count[n.userId] > NOTIFICATIONS_PER_USER) db.notifications.splice(i, 1);
  }
}
function unreadCount() { var u = me(); return db.notifications.filter(function (n) { return n.userId === u.id && !n.read; }).length; }

/* ================= mentions =================
   Stored as @[user-id] so renames and duplicate names stay unambiguous. */
var MENTION_RE = /@\[([\w-]+)\]/g;
function mentionIds(body) { var out = [], m; MENTION_RE.lastIndex = 0; while ((m = MENTION_RE.exec(body))) if (out.indexOf(m[1]) < 0) out.push(m[1]); return out; }
/* "@Full Name" → "@[id]": names picked from the list (picked) win; otherwise a name used by exactly one person */
function encodeMentions(text, picked) {
  var names = {};
  db.users.forEach(function (u) { (names[u.fullName] = names[u.fullName] || []).push(u.id); });
  Object.keys(picked || {}).forEach(function (n) { names[n] = [picked[n]]; });
  var list = Object.keys(names).filter(function (n) { return names[n].length === 1; }).sort(function (a, b) { return b.length - a.length; });
  if (!list.length) return text;
  var re = new RegExp("@(" + list.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")(?![\\w])", "g");
  return text.replace(re, function (_, n) { return "@[" + names[n][0] + "]"; });
}
function decodeMentions(body, picked) {
  return body.replace(MENTION_RE, function (_, id) { var u = byId(db.users, id); if (!u) return "@?"; if (picked) picked[u.fullName] = id; return "@" + u.fullName; });
}

/* ================= task changes ================= */
function setField(t, k, v) {
  var old = t[k];
  if (JSON.stringify(old) === JSON.stringify(v)) return false;
  if (k === "projectId") {
    var np = byId(db.projects, v); if (!np) return false;
    t.aliases = (t.aliases || []).concat([taskKey(t)]);
    t.num = np.nextNum++;
  }
  t[k] = v; t.updatedAt = nowISO();
  if (k === "status") onStatusChange(t, old, v);
  if (k === "assigneeId" && v) notify([v], "assigned", t.id);
  log(t.id, "field", { field: k, from: old == null ? null : old, to: v == null ? null : v });
  save();
  return true;
}
function onStatusChange(t, old, v) {
  if (!NOT_STARTED[v] && !t.startedAt) t.startedAt = nowISO();
  if (v === "Done") {
    if (old !== "Done") { t.completedAt = nowISO(); t.completedBy = t.assigneeId || null; maybeRecur(t); }
  } else { t.completedAt = null; t.completedBy = null; }
  if (v === "Done" && t.reporterId) notify([t.reporterId], "done", t.id);
}
/* recurring work: closing it schedules the next one */
function maybeRecur(t) {
  if (!t.recurrence) return;
  var p = byId(db.projects, t.projectId); if (!p) return;
  var step = function (s) { return !s ? null : t.recurrence === "Weekly" ? addDays(s, 7) : t.recurrence === "Every 2 weeks" ? addDays(s, 14) : addMonths(s, 1); };
  var n = Object.assign({}, t, {
    id: uid("t"), num: p.nextNum++, status: "To Do", aliases: [], links: [],
    checklist: (t.checklist || []).map(function (c) { return { id: uid("ck"), text: c.text, done: false }; }),
    startDate: step(t.startDate), dueDate: step(t.dueDate) || step(today()),
    createdAt: nowISO(), updatedAt: nowISO(), startedAt: null, completedAt: null, completedBy: null
  });
  db.tasks.push(n);
  log(n.id, "created", { to: n.assigneeId, recurFrom: t.id });
  log(t.id, "recurred", { to: n.id });
}
function createTask(fields) {
  var p = byId(db.projects, fields.projectId);
  var t = Object.assign({
    id: uid("t"), num: p.nextNum++, title: "", type: "Writing", priority: "Medium", status: "To Do", assigneeId: null,
    reporterId: me().id, startDate: null, dueDate: null, estimateHours: null, deliverable: "", description: "",
    labels: [], checklist: [], links: [], aliases: [], parentId: null, recurrence: "",
    createdAt: nowISO(), updatedAt: nowISO(), startedAt: null, completedAt: null, completedBy: null
  }, fields);
  if (!NOT_STARTED[t.status]) t.startedAt = t.createdAt;
  if (t.status === "Done") { t.completedAt = t.createdAt; t.completedBy = t.assigneeId; }
  db.tasks.push(t);
  log(t.id, "created", { to: t.assigneeId });
  if (t.assigneeId) notify([t.assigneeId], "assigned", t.id);
  save();
  return t;
}
function deleteTasks(ids) {
  var set = {}; ids.forEach(function (i) { set[i] = 1; });
  /* sub-tasks of a deleted task become top-level tasks */
  db.tasks.forEach(function (t) { if (t.parentId && set[t.parentId] && !set[t.id]) t.parentId = null; t.links = (t.links || []).filter(function (l) { return !set[l.taskId]; }); });
  db.tasks = db.tasks.filter(function (t) { return !set[t.id]; });
  db.comments = db.comments.filter(function (c) { return !set[c.taskId]; });
  db.activity = db.activity.filter(function (a) { return !set[a.taskId]; });
  db.notifications = db.notifications.filter(function (n) { return !set[n.taskId]; });
  db.attachments = db.attachments.filter(function (a) { return !set[a.taskId]; });
  save();
}
function addLink(a, type, b) {
  if (a.id === b.id) return;
  a.links = (a.links || []).filter(function (l) { return l.taskId !== b.id; }).concat([{ type: type, taskId: b.id }]);
  b.links = (b.links || []).filter(function (l) { return l.taskId !== a.id; }).concat([{ type: LINK_INVERSE[type], taskId: a.id }]);
  a.updatedAt = b.updatedAt = nowISO();
  log(a.id, "link", { field: type, to: b.id });
  save();
}
function removeLink(a, b) {
  a.links = (a.links || []).filter(function (l) { return l.taskId !== b.id; });
  b.links = (b.links || []).filter(function (l) { return l.taskId !== a.id; });
  save();
}
function openBlockers(t) { return (t.links || []).filter(function (l) { if (l.type !== "is blocked by") return false; var o = byId(db.tasks, l.taskId); return o && o.status !== "Done"; }); }

/* Saved views that point at a deleted client/project lose that filter; views left with nothing are removed. */
function cleanViews(kind, id) {
  var changed = 0, removed = 0;
  db.views = db.views.filter(function (v) {
    var f = v.filters || {};
    if ((kind === "client" && f.clientId === id) || (kind === "project" && f.projectId === id)) {
      delete f[kind === "client" ? "clientId" : "projectId"];
      if (kind === "client") delete f.projectId;
      changed++;
      if (!Object.keys(f).length) { removed++; return false; }
    }
    return true;
  });
  return { changed: changed, removed: removed };
}

/* ================= seed data ================= */
function seed() {
  var d = emptyDB();
  var T = function (n_) { var x = new Date(); x.setDate(x.getDate() + n_); return d2s(x); };
  var A = function (daysAgo, hr) { var x = new Date(); x.setDate(x.getDate() - daysAgo); x.setHours(hr || 10, (daysAgo * 7) % 60, 0, 0); return x.toISOString(); };
  var U = function (id, name, title, dept, role) {
    return { id: id, fullName: name, email: name.toLowerCase().replace(/[^a-z]+/g, ".") + "@galiltc.co.il", jobTitle: title, department: dept, role: role, isActive: true };
  };
  d.users = [
    U("u-ceo", "Dana Galil", "Founder & CEO", "Management", "Admin"),
    U("u-ops", "Ronen Shaked", "Operations Manager", "Operations", "Admin"),
    U("u-pm", "Maya Ben Ari", "Project Manager", "Delivery", "Manager"),
    U("u-tl", "Eitan Levi", "Team Lead, Docs", "Delivery", "Manager"),
    U("u-sen", "Noa Katz", "Senior Technical Writer", "Delivery", "Member"),
    U("u-emp", "Yossi Mizrahi", "Technical Writer", "Delivery", "Member"),
    U("u-emp2", "Tal Rosen", "Trainer", "Delivery", "Member"),
    U("u-fin", "Orit Hadad", "Finance Controller", "Finance", "Viewer"),
    U("u-ext", "Adam Peled", "Contract Illustrator", "External", "Member"),
    U("u-new", "Shira Cohen", "Technical Writer", "Delivery", "Member")
  ];
  d.clients = [
    { id: "c-iai", name: "IAI", code: "IAI", industry: "Aerospace & Defence", contactName: "Ilan Barak", contactEmail: "ilan@iai.example", notes: "Style guide: IAI-TW-SG rev F. All deliverables in S1000D-lite Word templates." },
    { id: "c-elb", name: "Elbit Systems", code: "ELB", industry: "Defence Electronics", contactName: "Rita Gold", contactEmail: "rita@elbit.example", notes: "Help authored in DITA, published via the client's CCMS." },
    { id: "c-mob", name: "Mobileye", code: "MOB", industry: "Automotive", contactName: "Sagi Peer", contactEmail: "sagi@mobileye.example", notes: "Developer docs in Markdown, reviewed through the client's Git." },
    { id: "c-gal", name: "GALIL (internal)", code: "GAL", industry: "Internal", contactName: "", contactEmail: "", notes: "Internal templates, style guide and training." }
  ];
  d.projects = [
    { id: "p-iai1", clientId: "c-iai", key: "RSOM", name: "Radar Suite — Operator Manual", docType: "Operator Manual", status: "Active", leadUserId: "u-pm", startDate: T(-120), dueDate: T(90), description: "Two-volume operator manual for the radar suite (Vol 1 Operation, Vol 2 Maintenance)." },
    { id: "p-iai2", clientId: "c-iai", key: "MTP", name: "Maintenance Training Package", docType: "Training Courseware", status: "Active", leadUserId: "u-pm", startDate: T(-60), dueDate: T(120), description: "Instructor guide, student handbook and slides for the level-2 maintenance course." },
    { id: "p-elb1", clientId: "c-elb", key: "AVH", name: "Avionics Help System", docType: "Online Help", status: "Active", leadUserId: "u-tl", startDate: T(-200), dueDate: T(30), description: "Migration of the legacy CHM help to DITA, then content refresh for release 5." },
    { id: "p-mob1", clientId: "c-mob", key: "SDK", name: "SDK Documentation Refresh", docType: "API Reference", status: "Active", leadUserId: "u-sen", startDate: T(-40), dueDate: T(60), description: "Rewrite the getting-started guide and regenerate the API reference for SDK 4.x." },
    { id: "p-gal1", clientId: "c-gal", key: "STY", name: "GALIL Style Guide 2027", docType: "Other", status: "On Hold", leadUserId: "u-tl", startDate: T(-20), dueDate: T(150), description: "Refresh of the house style guide and Word/FrameMaker templates." }
  ];
  var n = {};
  var rows = [
    ["p-iai1", "Draft chapter 3 — Track modes", "Writing", "Writing", "High", "u-emp", "u-pm", T(6), 24, "Vol 1 · Ch 3", "Full draft with screenshots placed, ready for peer review.\n\nSource: SRS v2.3 §4.1–4.6 and the recorded walkthrough from 12 Sep.", ["vol1"], [["Outline approved", true], ["Screenshots captured", true], ["Draft written", false], ["Self-check against style guide", false]], 10],
    ["p-iai1", "Illustration pass — chapter 3", "Illustration", "To Do", "Medium", "u-ext", "u-pm", T(12), 16, "Vol 1 · Ch 3", "Redraw 12 figures to the client style sheet (line weights 0.5/1 pt, callouts in Arial 8).", ["vol1", "figures"], [], 7],
    ["p-iai1", "Maintenance procedures — outline", "Research", "Backlog", "Medium", "u-sen", "u-pm", T(20), 8, "Vol 2", "Agree the task breakdown with the client SME before writing starts.", ["vol2"], [], 3],
    ["p-iai1", "SME interview — antenna alignment", "SME Interview", "To Do", "High", "u-sen", "u-pm", T(3), 3, "Vol 2 · Ch 5", "Book 1 h with the field engineer. Prepare questions from the alignment test report.", ["vol2", "sme"], [["Questions sent in advance", false], ["Interview recorded", false]], 2],
    ["p-iai1", "Peer review — chapter 2", "Review", "Peer Review", "Medium", "u-tl", "u-emp", T(1), 6, "Vol 1 · Ch 2", "Review for accuracy, terminology and style-guide compliance. Use tracked changes.", ["vol1"], [], 5],
    ["p-iai2", "Build module 4 slides", "Writing", "Writing", "Medium", "u-emp2", "u-pm", T(9), 20, "Module 4", "Slides plus facilitator notes for the hydraulics module.", ["courseware"], [], 12],
    ["p-iai2", "Student handbook — module 3 edit", "Editing", "SME Review", "Medium", "u-sen", "u-pm", T(-2), 10, "Module 3", "Copy-edit pass done; with the client SME for technical sign-off.", ["courseware"], [], 15],
    ["p-iai2", "Translate module 1 to Hebrew", "Translation", "Backlog", "Low", null, "u-pm", T(45), 30, "Module 1", "Send to the translation vendor once module 1 is signed off. Glossary attached in the project share.", ["he"], [], 1],
    ["p-elb1", "Help topic migration — batch 2", "Writing", "Peer Review", "Critical", "u-emp", "u-tl", T(-1), 40, "Release 5", "Convert 80 topics to the new DITA map. Keep the old topic IDs as aliases so context-sensitive links keep working.", ["dita", "migration"], [["Topics converted", true], ["Map validated", true], ["Broken links fixed", false]], 21],
    ["p-elb1", "Fix broken cross-references in nav topics", "Doc Defect", "To Do", "High", "u-emp", "u-tl", T(4), 4, "Release 5", "QA found 14 xrefs pointing at removed topics (see the link report in the CCMS).", ["defect"], [], 4],
    ["p-elb1", "Publish release 5 help to staging", "Publishing", "Backlog", "Medium", "u-tl", "u-tl", T(25), 2, "Release 5", "Run the publish job and send the staging URL to Rita.", ["publish"], [], 1],
    ["p-mob1", "API reference — endpoints A–F", "Writing", "Done", "Medium", "u-sen", "u-sen", T(-8), 30, "SDK 4.0", "Generate and hand-edit reference pages.", ["api"], [], 30],
    ["p-mob1", "Getting-started guide rewrite", "Writing", "Writing", "High", "u-new", "u-sen", T(14), 18, "SDK 4.0", "New quick start for SDK 4: install, auth, first call, troubleshooting.", ["guide"], [["Install section", true], ["Auth section", false], ["First call sample", false], ["Troubleshooting", false]], 9],
    ["p-mob1", "API reference — endpoints G–M", "Writing", "To Do", "Medium", "u-sen", "u-sen", T(28), 30, "SDK 4.0", "Same approach as A–F.", ["api"], [], 2],
    ["p-gal1", "Collect style-guide change requests", "Research", "Backlog", "Low", "u-tl", "u-ceo", T(40), 6, "", "Survey the writers for pain points with the current guide.", [], [], 20]
  ];
  rows.forEach(function (r, i) {
    n[r[0]] = (n[r[0]] || 0) + 1;
    var created = A(r[13], 9), updated = A(Math.max(0, r[13] - 3), 14);
    d.tasks.push({
      id: "t-" + (i + 1), projectId: r[0], num: n[r[0]], title: r[1], type: r[2], status: r[3], priority: r[4],
      assigneeId: r[5], reporterId: r[6], startDate: null, dueDate: r[7], estimateHours: r[8], deliverable: r[9], description: r[10],
      labels: r[11], checklist: r[12].map(function (c) { return { id: uid("ck"), text: c[0], done: c[1] }; }),
      links: [], aliases: [], parentId: null, recurrence: "",
      createdAt: created, updatedAt: updated, startedAt: NOT_STARTED[r[3]] ? null : A(Math.max(0, r[13] - 1), 9),
      completedAt: r[3] === "Done" ? updated : null, completedBy: r[3] === "Done" ? r[5] : null
    });
  });
  /* a sub-task, a blocker and a recurring task */
  d.tasks[1].parentId = "t-1";
  d.tasks[0].links = [{ type: "is blocked by", taskId: "t-4" }]; d.tasks[3].links = [{ type: "blocks", taskId: "t-1" }];
  d.tasks[14].recurrence = "Monthly";

  /* closed work from the last few months, so Insights has history to show */
  var hist = {
    "p-iai1": [["Vol 1 front matter and safety summary", "Writing"], ["Terminology list for Vol 1", "Research"], ["Peer review — chapter 1", "Review"], ["Chapter 1 — System overview", "Writing"], ["Chapter 2 — Operating modes", "Writing"], ["Figures for chapter 1", "Illustration"], ["Copy-edit chapter 1", "Editing"], ["SME interview — display console", "SME Interview"]],
    "p-iai2": [["Training needs analysis", "Research"], ["Module 1 slides", "Writing"], ["Module 2 slides", "Writing"], ["Instructor guide — module 1", "Writing"], ["Module 1 diagrams", "Illustration"], ["Copy-edit module 2", "Editing"]],
    "p-elb1": [["Help migration — batch 1", "Writing"], ["DITA map skeleton", "Research"], ["Fix broken images in batch 1", "Doc Defect"], ["Publish release 4.2 help", "Publishing"], ["Translate release 4.2 topics", "Translation"], ["Localize UI strings in help", "Localization"], ["Peer review — batch 1", "Review"]],
    "p-mob1": [["SDK 4 doc plan", "Research"], ["Changelog for SDK 4.0", "Writing"], ["Code sample review", "Review"], ["Publish SDK 4.0 beta docs", "Publishing"]],
    "p-gal1": [["Audit current templates", "Research"]]
  };
  var people = ["u-emp", "u-sen", "u-tl", "u-emp2", "u-ext", "u-new", "u-pm"];
  var seq = 0;
  Object.keys(hist).forEach(function (pid) {
    hist[pid].forEach(function (r) {
      seq++;
      var age = 8 + ((seq * 37) % 150);          // opened 8–158 days ago
      var wait = (seq * 5) % 6;                  // sat 0–5 days before work started
      var cycle = 3 + ((seq * 11) % 19);         // worked 3–21 days
      var doneAgo = Math.max(1, age - wait - cycle);
      var slack = ((seq * 7) % 9) - 3;           // due -3…+5 days around completion
      var due = T(-(doneAgo + slack)); if (isWeekend(due)) due = addDays(due, -2);
      var who = r[1] === "Illustration" ? "u-ext" : r[1] === "Publishing" ? "u-tl" : people[(seq * 3) % people.length];
      n[pid] = (n[pid] || 0) + 1;
      d.tasks.push({ id: "t-h" + seq, projectId: pid, num: n[pid], title: r[0], type: r[1], status: "Done", priority: ["Medium", "High", "Low", "Medium"][seq % 4],
        assigneeId: who, reporterId: (d.projects.filter(function (p) { return p.id === pid; })[0] || {}).leadUserId || "u-pm",
        startDate: null, dueDate: due, estimateHours: 4 + (seq * 5) % 30, deliverable: "", description: "", labels: [], checklist: [], links: [], aliases: [], parentId: null, recurrence: "",
        createdAt: A(age, 9), updatedAt: A(doneAgo, 15), startedAt: A(age - wait, 9), completedAt: A(doneAgo, 15), completedBy: who });
    });
  });
  d.projects.forEach(function (p) { p.nextNum = (n[p.id] || 0) + 1; });

  d.comments = [
    { id: "cm-1", taskId: "t-1", authorId: "u-emp", kind: "question", body: "@[u-pm] the SRS lists five track modes but the UI only shows four — is \"Silent track\" still in scope for this release?", createdAt: A(2, 11), resolved: false },
    { id: "cm-2", taskId: "t-1", authorId: "u-pm", kind: "comment", body: "Checking with Ilan at IAI, will update by Thursday.", createdAt: A(2, 15) },
    { id: "cm-3", taskId: "t-1", authorId: "u-emp", kind: "comment", body: "Screenshots are on the share under /RSOM/Vol1/Ch3/img (build 2.3.114).", createdAt: A(1, 10) },
    { id: "cm-4", taskId: "t-2", authorId: "u-ext", kind: "question", body: "Do the callouts need to be in Hebrew as well, or English only?", createdAt: A(3, 9), resolved: true, resolvedBy: "u-pm", resolvedAt: A(3, 12) },
    { id: "cm-5", taskId: "t-2", authorId: "u-pm", kind: "comment", body: "English only for this volume.", createdAt: A(3, 12) },
    { id: "cm-6", taskId: "t-9", authorId: "u-tl", kind: "comment", body: "Batch looks good overall. 6 topics still have hard-coded product names — please switch them to the keyref.", createdAt: A(1, 16) },
    { id: "cm-7", taskId: "t-9", authorId: "u-emp", kind: "question", body: "@[u-tl] should the alias IDs go in the map or in each topic's prolog?", createdAt: A(0, 9), resolved: false },
    { id: "cm-8", taskId: "t-7", authorId: "u-sen", kind: "comment", body: "Sent to the SME for sign-off. They asked for 3 working days.", createdAt: A(4, 13) },
    { id: "cm-9", taskId: "t-13", authorId: "u-new", kind: "question", body: "Is there a sandbox API key we can use in the code samples?", createdAt: A(1, 11), resolved: false }
  ];
  d.comments.forEach(function (c) { c.mentions = mentionIds(c.body); });
  d.attachments = [
    { id: "at-1", taskId: "t-1", kind: "link", name: "SRS v2.3 (client portal)", url: "https://example.com/iai/srs-2.3", addedBy: "u-emp", at: A(9, 10) }
  ];
  d.activity = d.tasks.map(function (t) { return { id: uid("a"), taskId: t.id, userId: t.reporterId, at: t.createdAt, kind: "created", to: t.assigneeId }; });
  d.notifications = [
    { id: "n-1", userId: "u-pm", kind: "mention", taskId: "t-1", byId: "u-emp", at: A(2, 11), read: false },
    { id: "n-2", userId: "u-tl", kind: "mention", taskId: "t-9", byId: "u-emp", at: A(0, 9), read: false },
    { id: "n-3", userId: "u-sen", kind: "question", taskId: "t-13", byId: "u-new", at: A(1, 11), read: false }
  ];
  d.views = [
    { id: "v-1", name: "My overdue work", ownerId: "u-pm", shared: true, mode: "tasks", filters: { assigneeId: "me", overdue: "1" }, sort: { k: "dueDate", dir: 1 } },
    { id: "v-2", name: "Waiting on SME", ownerId: "u-pm", shared: true, mode: "tasks", filters: { status: "SME Review" }, sort: { k: "dueDate", dir: 1 } },
    { id: "v-3", name: "IAI board", ownerId: "u-pm", shared: true, mode: "board", filters: { clientId: "c-iai" } },
    { id: "v-4", name: "Unanswered questions", ownerId: "u-tl", shared: true, mode: "tasks", filters: { questions: "1" }, sort: { k: "updatedAt", dir: -1 } }
  ];
  d.settings.currentUserId = "u-pm";
  return d;
}

/* ================= WorkDesk import =================
   Reads people, clients and projects from WorkDesk (same browser, or one of its backup files)
   and merges them by id. Tasks are untouched. */
function workdeskData(o) {
  if (!isObj(o)) return null;
  var d = o.app === "galil-workdesk" && isObj(o.data) ? o.data : o;
  return Array.isArray(d.users) && Array.isArray(d.clients) && Array.isArray(d.projects) ? d : null;
}
var WD_ROLE = { CEO: "Admin", OPS: "Admin", PM: "Manager", TL: "Manager", VIEW: "Viewer", FIN: "Viewer" };
function importWorkdesk(d) {
  var stats = { users: 0, clients: 0, projects: 0 };
  d.users.forEach(function (u) {
    if (!u.id || !u.fullName) return;
    var mine = byId(db.users, u.id) || (function () { var x = { id: u.id, role: WD_ROLE[u.role] || "Member" }; db.users.push(x); stats.users++; return x; })();
    Object.assign(mine, { fullName: u.fullName, email: u.email || mine.email || "", jobTitle: u.jobTitle || mine.jobTitle || "", department: u.department || mine.department || "", isActive: u.isActive !== false && !u.pendingActivation });
  });
  d.clients.forEach(function (c) {
    if (!c.id || !c.name) return;
    var mine = byId(db.clients, c.id);
    if (!mine) { mine = { id: c.id, industry: c.isInternal ? "Internal" : "" }; db.clients.push(mine); stats.clients++; }
    var code = (c.initials || c.name).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "CL";
    Object.assign(mine, { name: c.name, code: mine.code || code, contactName: c.contactName || "", contactEmail: c.contactEmail || "", notes: mine.notes || c.notes || "" });
  });
  var used = {}; db.projects.forEach(function (p) { used[p.key] = p.id; });
  d.projects.forEach(function (p) {
    if (!p.id || !p.name || !byId(db.clients, p.clientId)) return;
    var mine = byId(db.projects, p.id);
    if (!mine) {
      var base = p.name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join("").toUpperCase().replace(/^[^A-Z]+/, "").slice(0, 4) || "PRJ";
      if (base.length < 2) base = (base + "PR").slice(0, 2);
      var key = base, i = 2; while (used[key]) key = base.slice(0, 4) + i++;
      used[key] = p.id;
      mine = { id: p.id, key: key, docType: "Other", description: p.notes || "", nextNum: 1 }; db.projects.push(mine); stats.projects++;
    }
    var st = /closed|complete|done/i.test(p.status || "") ? "Completed" : /hold|pause/i.test(p.status || "") ? "On Hold" : /archiv/i.test(p.status || "") ? "Archived" : "Active";
    Object.assign(mine, { clientId: p.clientId, name: p.name, status: st, leadUserId: byId(db.users, p.ownerUserId) ? p.ownerUserId : (mine.leadUserId || null), startDate: p.startDate || null, dueDate: p.endDate || null });
  });
  save();
  return stats;
}
