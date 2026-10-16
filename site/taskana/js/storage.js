/* =====================================================================
   Taskana — where the data lives.
   Standalone demo: this browser's localStorage (core.js load/save).
   Connected: files in a OneDrive folder, through Microsoft Graph:
     taskana-data.json            the shared data (everyone reads and writes it)
     attachments/<id>-<name>      files attached to tasks
     backups/taskana-<date>.json  a copy of the data, once a day
   Saving is optimistic: each upload carries the file's eTag; if someone
   else saved in between, their version is fetched and merged record by
   record (and field by field) before trying again. Other people's changes
   are picked up every 30 seconds and when the tab comes back into view.
   A copy is cached in this browser so Taskana opens instantly and keeps
   working through a dropped connection.
   ===================================================================== */
"use strict";

var GRAPH = "https://graph.microsoft.com/v1.0";
var CACHE_KEY = "galil-taskana-cache", PREFS_KEY = "galil-taskana-prefs", BACKUP_DAY_KEY = "galil-taskana-backup-day";
var MAX_ONEDRIVE_ATTACHMENT = 50 * 1024 * 1024;
var COLLECTIONS = ["users", "clients", "projects", "tasks", "comments", "activity", "views", "notifications", "attachments"];

var Store = {
  remote: false, state: "idle", error: "", lastSync: null, folder: null, etag: null, base: null, baseText: null,
  dirty: false, busy: false, again: false, timer: null, poller: null, retry: null, size: 0, merges: 0, renderWait: null, subs: {},

  changed: function () { savePrefs(true); this.dirty = true; writeCache(); this.schedule(700); },
  schedule: function (ms) { var s = this; clearTimeout(s.timer); s.timer = setTimeout(function () { pushRemote(); }, ms); },
  stop: function () { clearTimeout(this.timer); clearInterval(this.poller); clearTimeout(this.retry); this.remote = false; this.state = "idle"; this.folder = null; this.etag = null; this.base = null; this.baseText = null; this.dirty = false; },
  clearCache: function () { try { [CACHE_KEY, CACHE_KEY + ":data", CACHE_KEY + ":base"].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} },
  pollNow: function () { poll(true); }
};

/* ---------- device preferences (theme, language) stay on the device ---------- */
function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; } catch (e) { return {}; } }
function applyPrefs() { var p = readPrefs(); if (p.theme !== undefined) db.settings.theme = p.theme; if (p.lang) db.settings.lang = p.lang; LANG = db.settings.lang === "he" ? "he" : "en"; }
function savePrefs(quiet) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: db.settings.theme || null, lang: db.settings.lang || "en" })); } catch (e) {}
  if (!quiet && !Store.remote && db.users.length) save(true);
}

/* the shared part of the data, as uploaded (per-device settings left out) */
function sharedText(d) { return JSON.stringify(Object.assign({}, d, { settings: undefined })); }
function parseShared(text) { var o = JSON.parse(text); if (!isBackup(o)) throw new Error(tr("The OneDrive file isn't Taskana data.")); return upgrade(o); }

/* ---------- Microsoft Graph ---------- */
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function graphFetch(method, path, opts, tries) {
  opts = opts || {}; tries = tries || 0;
  return graphToken(tries > 0 && opts.authRetry).then(function (token) {
    return fetch(/^https:/.test(path) ? path : GRAPH + path, { method: method, cache: "no-store", headers: Object.assign({ Authorization: "Bearer " + token }, opts.headers || {}), body: opts.body });
  }).then(function (res) {
    if ((res.status === 429 || res.status === 503 || res.status === 504) && tries < 3) {
      var ra = +res.headers.get("Retry-After"); return wait((ra > 0 ? Math.min(ra, 30) : Math.pow(2, tries + 1)) * 1000).then(function () { return graphFetch(method, path, opts, tries + 1); });
    }
    if (res.status === 401 && tries < 1) return graphFetch(method, path, Object.assign({}, opts, { authRetry: true }), tries + 1);
    return res;
  }, function (e) { var err = new Error(tr("Can't reach OneDrive. Check the connection.")); err.network = true; err.cause = e; throw err; });
}
function graphError(res) {
  return res.text().then(function (t) {
    var j = null; try { j = JSON.parse(t); } catch (e) {}
    var e = new Error((j && j.error && j.error.message) || ("HTTP " + res.status)); e.status = res.status; e.code = j && j.error && j.error.code; return e;
  });
}
function graphJSON(method, path, body) {
  return graphFetch(method, path, body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } })
    .then(function (res) { if (!res.ok) return graphError(res).then(function (e) { throw e; }); return res.status === 204 ? null : res.json(); });
}
function shareId(url) { return "u!" + btoa(unescape(encodeURIComponent(url))).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-"); }
function folderOf(it, shared) { return { driveId: (it.parentReference || {}).driveId, id: it.id, name: it.name, webUrl: it.webUrl, shared: shared }; }
function resolveFolder() {
  var c = CONFIG.onedrive;
  if (c.folderLink) return graphJSON("GET", "/shares/" + shareId(c.folderLink) + "/driveItem").then(function (it) {
    if (!it.folder) throw new Error(tr("The OneDrive link points to a file, not a folder."));
    if (it.parentReference && it.parentReference.driveId) return folderOf(it, true);
    return graphJSON("GET", "/shares/" + shareId(c.folderLink) + "/driveItem?$select=id,name,webUrl,parentReference").then(function (x) { return folderOf(x, true); });
  });
  return graphJSON("GET", "/me/drive/root:/" + encodeURIComponent(c.folderName)).catch(function (e) {
    if (e.status !== 404) throw e;
    return graphJSON("POST", "/me/drive/root/children", { name: c.folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" });
  }).then(function (it) { return folderOf(it, false); });
}
function itemPath(name) { var f = Store.folder; return "/drives/" + f.driveId + "/items/" + f.id + ":/" + name.split("/").map(encodeURIComponent).join("/") + ":"; }
function ensureSub(name) {
  if (Store.subs[name]) return Promise.resolve();
  var f = Store.folder;
  return graphJSON("POST", "/drives/" + f.driveId + "/items/" + f.id + "/children", { name: name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" })
    .catch(function (e) { if (e.status !== 409) throw e; }).then(function () { Store.subs[name] = 1; });
}

/* ---------- read / write the data file ---------- */
function pullRemote() {
  var file = CONFIG.onedrive.fileName;
  return graphJSON("GET", itemPath(file)).then(function (meta) {
    var url = meta["@microsoft.graph.downloadUrl"];
    return (url ? fetch(url, { cache: "no-store" }) : graphFetch("GET", itemPath(file) + "/content")).then(function (res) {
      if (!res.ok) return graphError(res).then(function (e) { throw e; });
      return res.text();
    }).then(function (text) { Store.size = meta.size || text.length; return { text: text, etag: meta.eTag, meta: meta }; });
  }, function (e) { if (e.status === 404) return null; throw e; });
}
function adopt(r) {
  var remote = parseShared(r.text), base = parseShared(r.text);
  if (Store.base) merge3(Store.base, db, remote);
  else { var keep = db.settings; COLLECTIONS.forEach(function (k) { db[k] = remote[k]; }); db.rosterVersion = remote.rosterVersion; db.settings = keep; }
  Store.base = base; Store.baseText = sharedText(base); Store.etag = r.etag;
  Store.dirty = sharedText(db) !== Store.baseText;
  dataVersion++;
}
function pushRemote() {
  if (!Store.remote || !Store.folder || Store.state === "setup") return Promise.resolve();
  if (Store.busy) { Store.again = true; return Promise.resolve(); }
  Store.busy = true; clearTimeout(Store.retry);
  var file = CONFIG.onedrive.fileName, attempt = 0;
  var step = function () {
    var text = sharedText(db);
    if (text === Store.baseText) { Store.dirty = false; return Promise.resolve(); }
    if (attempt++ > 4) throw new Error(tr("OneDrive kept changing while saving. Try again in a moment."));
    setState("saving");
    var hd = { "Content-Type": "application/json" };
    if (Store.etag) hd["If-Match"] = Store.etag; else hd["If-None-Match"] = "*";
    return graphFetch("PUT", itemPath(file) + "/content", { body: text, headers: hd }).then(function (res) {
      if (res.ok) return res.json().then(function (it) {
        Store.etag = it.eTag; Store.size = it.size || text.length; Store.base = parseShared(text); Store.baseText = sharedText(Store.base); Store.lastSync = new Date();
        dailyBackup(text);
        return step();
      });
      if (res.status === 412 || res.status === 409) {
        /* someone else saved first: bring their changes in, then try again */
        return pullRemote().then(function (r) {
          if (!r) { Store.etag = null; return step(); }
          adopt(r); Store.merges++; refreshUI(); return step();
        });
      }
      return graphError(res).then(function (e) { throw e; });
    });
  };
  return step().then(function () { setState("saved"); }, function (e) {
    setState(e.network ? "offline" : "error", e.message);
    Store.retry = setTimeout(function () { pushRemote(); }, e.network ? 15000 : 60000);
  }).then(function () {
    Store.busy = false; writeCache();
    if (Store.again) { Store.again = false; Store.schedule(50); }
  });
}
function dailyBackup(text) {
  var day = today(), last = null;
  try { last = localStorage.getItem(BACKUP_DAY_KEY); } catch (e) {}
  if (last === day) return;
  try { localStorage.setItem(BACKUP_DAY_KEY, day); } catch (e) {}
  ensureSub("backups").then(function () {
    return graphFetch("PUT", itemPath("backups/taskana-" + day + ".json") + "/content", { body: text, headers: { "Content-Type": "application/json", "If-None-Match": "*" } });
  }).catch(function () {});
}

/* ---------- three-way merge, in place (so open screens keep pointing at live records) ---------- */
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function mapOf(arr) { var m = {}; (arr || []).forEach(function (x) { if (x && x.id) m[x.id] = x; }); return m; }
function mergeRecord(b, l, r) {
  if (b && same(b, l)) {                                  // unchanged here: take theirs
    Object.keys(l).forEach(function (k) { if (!(k in r)) delete l[k]; });
    Object.assign(l, r);
  } else if (b) {                                         // changed here: per field, theirs where only they changed it
    var keys = {}; [b, l, r].forEach(function (o) { Object.keys(o).forEach(function (k) { keys[k] = 1; }); });
    Object.keys(keys).forEach(function (k) {
      if (same(l[k], b[k]) && !same(r[k], b[k])) { if (r[k] === undefined) delete l[k]; else l[k] = r[k]; }
    });
  }
  if (l.nextNum != null && r.nextNum != null) l.nextNum = Math.max(l.nextNum, r.nextNum);
}
function merge3(base, local, remote) {
  COLLECTIONS.forEach(function (k) {
    var B = mapOf(base[k]), L = mapOf(local[k]), out = [], seen = {};
    (remote[k] || []).forEach(function (r) {
      seen[r.id] = 1;
      var l = L[r.id], b = B[r.id];
      if (l) { mergeRecord(b, l, r); out.push(l); }
      else if (!b || !same(b, r)) out.push(r);           // new there, or deleted here but changed there
    });
    (local[k] || []).forEach(function (l) {
      if (seen[l.id]) return;
      var b = B[l.id];
      if (!b || !same(b, l)) out.push(l);                // new here, or deleted there but changed here
    });
    local[k] = out;
  });
  local.rosterVersion = Math.max(local.rosterVersion || 0, remote.rosterVersion || 0);
  /* two people added a task to the same project at once: the later one gets the next number */
  var p = mapOf(local.projects), used = {};
  local.tasks.forEach(function (t) {
    var pr = p[t.projectId]; if (!pr) return;
    var key = t.projectId + "#" + t.num;
    if (used[key]) t.num = pr.nextNum++;
    used[t.projectId + "#" + t.num] = 1;
    if (pr.nextNum <= t.num) pr.nextNum = t.num + 1;
  });
  return local;
}

/* ---------- this browser's copy ---------- */
function cacheId() { return (Auth.account ? Auth.account.username.toLowerCase() : "") + "|" + (CONFIG.onedrive.folderLink || CONFIG.onedrive.folderName); }
function writeCache() {
  if (!Store.remote || !db.users.length) return;
  try {
    localStorage.setItem(CACHE_KEY + ":data", sharedText(db));
    if (Store.dirty && Store.baseText) localStorage.setItem(CACHE_KEY + ":base", Store.baseText); else localStorage.removeItem(CACHE_KEY + ":base");
    localStorage.setItem(CACHE_KEY, JSON.stringify({ id: cacheId(), etag: Store.etag, dirty: Store.dirty, at: nowISO() }));
  } catch (e) {}
}
function readCache() {
  try {
    var m = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!m || m.id !== cacheId()) return null;
    var data = localStorage.getItem(CACHE_KEY + ":data"), base = localStorage.getItem(CACHE_KEY + ":base");
    return { meta: m, data: parseShared(data), base: m.dirty && base ? parseShared(base) : null };
  } catch (e) { return null; }
}

/* ---------- start, keep in step ---------- */
function startRemote() {
  Store.remote = true; setState("loading");
  var cached = readCache();
  if (cached) {
    var keep = db.settings; db = cached.data; db.settings = keep; dataVersion++;
    Store.etag = cached.meta.etag;
    Store.base = cached.base || parseShared(sharedText(cached.data));
    Store.baseText = sharedText(Store.base);
    Store.dirty = !!cached.meta.dirty;
  }
  return resolveFolder().then(function (f) { Store.folder = f; return pullRemote(); }).then(function (r) {
    if (!r) {
      if (cached) { Store.etag = null; Store.dirty = true; setState("saving"); pushRemote(); }   // the file was removed: put our copy back
      else setState("setup");
      return;
    }
    if (!cached || r.etag !== Store.etag) adopt(r);
    setState(Store.dirty ? "saving" : "saved"); Store.lastSync = new Date();
    if (Store.dirty) pushRemote();
  }).catch(function (e) {
    var msg = e.status === 403 || e.code === "accessDenied" ? tr("You don't have access to the Taskana folder on OneDrive. Ask an Admin to share it with you.")
      : e.status === 404 ? tr("The Taskana folder link doesn't open a folder any more. An Admin needs to update it in config.js.") : e.message;
    setState(e.network && cached ? "offline" : "error", msg);
  }).then(function () {
    clearInterval(Store.poller);
    Store.poller = setInterval(function () { poll(false); }, 30000);
    if (db.users.length && Store.state !== "setup") bindAccount();
    render();
  });
}
function poll(force) {
  if (!Store.remote || !Store.folder || Store.busy || Store.state === "setup" || (!force && document.hidden)) return Promise.resolve();
  Store.busy = true;
  return graphJSON("GET", itemPath(CONFIG.onedrive.fileName) + "?$select=eTag,size").then(function (meta) {
    if (meta.eTag === Store.etag) return;
    return pullRemote().then(function (r) { if (r) { adopt(r); refreshUI(); } });
  }).then(function () { if (Store.state === "offline" || Store.state === "error") setState(Store.dirty ? "saving" : "saved"); }, function (e) { if (e.network) setState("offline", e.message); })
    .then(function () { Store.busy = false; writeCache(); if (Store.dirty || Store.again) { Store.again = false; Store.schedule(50); } if (force) render(); });
}
document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(false); });
window.addEventListener("online", function () { if (Store.remote) { poll(true); if (Store.dirty) Store.schedule(50); } });

/* redraw with other people's changes, but never under someone's hands */
function uiBusy() {
  var a = document.activeElement;
  return !!(ui.modal || ui.editingDesc || ui.editingCommentId || drag || (a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)));
}
function refreshUI() {
  clearTimeout(Store.renderWait);
  if (uiBusy()) { Store.renderWait = setTimeout(refreshUI, 2000); return; }
  render();
}

/* sync status: shown in the sidebar, updated without a full redraw */
function setState(s, err) {
  Store.state = s; Store.error = err || "";
  var el = document.getElementById("sync-status"); if (el) el.replaceWith(syncStatus());
}
function syncStatus() {
  if (!Store.remote) return h("span", { id: "sync-status", hidden: true });
  var s = Store.state;
  var text = s === "saving" ? tr("Saving to OneDrive…") : s === "loading" ? tr("Opening from OneDrive…") : s === "offline" ? tr("Offline — changes are kept and will sync") :
    s === "error" ? tr("Not saved: {m}", { m: Store.error }) : tr("Saved to OneDrive") + (Store.lastSync ? " · " + Store.lastSync.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) : "");
  return h("button", { id: "sync-status", class: "sync " + s, title: text, onclick: function () { openModal({ kind: "data" }); } }, h("i", { class: "sync-dot", "aria-hidden": "true" }), h("span", { class: "ellipsis" }, text));
}

/* ---------- first use of an empty folder ---------- */
function createWorkspace(withDemo) {
  var keep = db.settings;
  db = seed(withDemo); db.settings = keep;
  bindAccount(true);                                       // whoever sets Taskana up is its first Admin
  Store.etag = null; Store.base = null; Store.baseText = null; Store.dirty = true;
  setState("saving"); dataVersion++;
  return pushRemote().then(function () { parseRoute(); onRouteChange(null); render(); });
}
function setupScreen() {
  var f = Store.folder || {};
  return authShell([
    h("h1", { class: "auth-h" }, tr("Set up Taskana")),
    h("p", null, tr("There's no Taskana data in the OneDrive folder {f} yet. Start it now — you'll be its first Admin.", { f: "“" + (f.name || CONFIG.onedrive.folderName) + "”" })),
    h("div", { class: "grid", style: { gap: "8px" } },
      h("button", { class: "btn primary wide", onclick: function () { createWorkspace(false); } }, icon("people"), tr("Start with the GALIL team (no tasks)")),
      h("button", { class: "btn wide", onclick: function () { createWorkspace(true); } }, icon("board"), tr("Start with the team and demo tasks")),
      h("label", { class: "btn wide" }, icon("upload"), tr("Start from a Taskana backup file…"), h("input", { type: "file", class: "sr", accept: "application/json,.json", onchange: function (e) {
        var file = e.target.files[0]; if (!file) return;
        var rd = new FileReader();
        rd.onload = function () {
          var o; try { o = JSON.parse(rd.result); } catch (x) { toast(tr("That file isn't valid JSON.")); return; }
          var err = validateBackup(o); if (err) { toast(err); return; }
          var keep = db.settings; db = upgrade(o); db.settings = keep; bindAccount(true);
          Store.etag = null; Store.base = null; Store.baseText = null; Store.dirty = true; dataVersion++;
          pushRemote().then(function () { parseRoute(); onRouteChange(null); render(); });
        };
        rd.readAsText(file);
      } }))),
    h("div", { class: "row", style: { marginTop: "12px" } }, h("button", { class: "btn ghost", onclick: signOut }, tr("Sign out")))
  ]);
}
function storeErrorScreen() {
  return authShell([
    h("h1", { class: "auth-h" }, tr("Can't open Taskana")),
    h("div", { class: "banner err", role: "alert" }, icon("alert"), " ", Store.error),
    h("div", { class: "row", style: { marginTop: "12px" } },
      h("button", { class: "btn primary", onclick: function () { startRemote(); render(); } }, icon("undo"), tr("Try again")),
      h("button", { class: "btn ghost", onclick: signOut }, tr("Sign out")))
  ]);
}

/* ---------- attachments as OneDrive files ---------- */
function uploadAttachment(file, attId) {
  var safe = file.name.replace(/[\\/:*?"<>|#%]+/g, "_").slice(-120);
  return ensureSub("attachments").then(function () {
    return graphFetch("PUT", itemPath("attachments/" + attId + "-" + safe) + "/content", { body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
  }).then(function (res) { if (!res.ok) return graphError(res).then(function (e) { throw e; }); return res.json(); });
}
function deleteAttachmentFile(a) {
  if (!a.driveItemId || !Store.folder) return;
  graphFetch("DELETE", "/drives/" + (a.driveId || Store.folder.driveId) + "/items/" + a.driveItemId).catch(function () {});
}

/* ---------- share the folder (when it was made in the Admin's own OneDrive) ---------- */
function shareFolder() {
  var f = Store.folder;
  return graphJSON("POST", "/drives/" + f.driveId + "/items/" + f.id + "/createLink", { type: "edit", scope: "organization" }).then(function (r) { return r.link.webUrl; });
}
