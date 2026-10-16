/* =====================================================================
   Taskana — start-up and keyboard shortcuts.
   ===================================================================== */
"use strict";

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && (ui.modal || ui.openTask)) { e.preventDefault(); dismissTop(); return; }
  /* "c" = new task — only on its own, never with Ctrl/Cmd/Alt (so copying text still works) */
  if (e.key === "c" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !ui.modal && !ui.openTask && !authGate() && can.createTask()) {
    var a = document.activeElement;
    if (a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)) return;
    if (window.getSelection && String(window.getSelection())) return;
    e.preventDefault(); openModal({ kind: "task", defaults: {} });
  }
});

function boot() {
  root = document.getElementById("app");
  if (!CONNECTED) {
    db = load();
    LANG = db.settings.lang === "he" ? "he" : "en";
    authInit();
    parseRoute(); lastRoute = ui.route.slice();
    onRouteChange(null);
    render();
    return;
  }
  /* connected: sign in with Microsoft, then open the data files on OneDrive */
  db = emptyDB(); applyPrefs();
  Auth.phase = "starting"; render();
  authInit().then(function () {
    parseRoute(); lastRoute = ui.route.slice();
    render();
    if (Auth.account) return startRemote().then(function () { onRouteChange(null); render(); });
  });
}
boot();
