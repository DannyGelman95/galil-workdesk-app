/* ============================================================
   GALIL — shared site behaviour (header, nav, language toggle,
   contact/CV forms). Every hook is guarded so this one file can
   be included, unchanged, on every page of the site.
   ============================================================ */
(function () {
  "use strict";

  /* ---- header shadow ---- */
  var hdr = document.getElementById("hdr");
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle("stuck", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- mobile nav ---- */
  var burger = document.getElementById("burger"), nav = document.getElementById("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---- language ---- */
  var buttons = document.querySelectorAll(".lang button");
  function setLang(lang) {
    var rtl = lang === "he";
    document.documentElement.lang = rtl ? "he" : "en";
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.querySelectorAll("[data-en]").forEach(function (el) {
      var v = el.getAttribute("data-" + lang);
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-en-ph]").forEach(function (el) {
      var v = el.getAttribute("data-" + lang + "-ph");
      if (v != null) el.setAttribute("placeholder", v);
    });
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    try { localStorage.setItem("galil-lang", lang); } catch (e) {}
  }
  if (buttons.length) {
    buttons.forEach(function (b) { b.addEventListener("click", function () { setLang(b.dataset.lang); }); });
    var saved = null; try { saved = localStorage.getItem("galil-lang"); } catch (e) {}
    if (saved === "he") setLang("he");
  }

  /* ---- hero diagram: one orchestrated reveal, then interactive ---- */
  var assy = document.getElementById("assy");
  var key = document.getElementById("key");
  if (assy && key) {
    requestAnimationFrame(function () { assy.classList.add("play"); });

    function focusPart(n) {
      assy.querySelectorAll(".part").forEach(function (g) {
        g.classList.toggle("dim", n !== null && g.dataset.part !== n);
      });
      assy.querySelectorAll(".cal").forEach(function (g) {
        g.classList.toggle("dim", n !== null && g.dataset.part !== n);
      });
      key.querySelectorAll("li").forEach(function (li) {
        li.classList.toggle("on", n !== null && li.dataset.part === n);
      });
    }
    key.querySelectorAll("li").forEach(function (li) {
      li.addEventListener("mouseenter", function () { focusPart(li.dataset.part); });
      li.addEventListener("mouseleave", function () { focusPart(null); });
    });
    assy.querySelectorAll(".part, .cal").forEach(function (g) {
      g.style.cursor = "pointer";
      g.addEventListener("mouseenter", function () { focusPart(g.dataset.part); });
      g.addEventListener("mouseleave", function () { focusPart(null); });
    });
  }

  /* ---- process rail lights up once, when reached ---- */
  var steps = document.getElementById("steps");
  if (steps) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { steps.classList.add("lit"); io.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(steps);
    } else { steps.classList.add("lit"); }
  }

  /* ---- generic form handling: validate, then hand off to mailto ----
     Static site, no backend — a form with [data-mailto] builds a
     mailto: link from its fields and hands the message to the
     visitor's own mail client, same pattern the app uses for
     "no backend yet" (see README § Roadmap). */
  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    var to = form.getAttribute("data-mailto");
    var subjectTpl = form.getAttribute("data-subject") || "Message from galiltc.co.il";
    var sent = form.querySelector(".sent");
    var fields = Array.prototype.slice.call(form.querySelectorAll("[data-check]"));

    function checkField(el) {
      var rule = el.getAttribute("data-check");
      var val = el.value.trim();
      if (rule === "required") return val.length > 1;
      if (rule === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
      if (rule === "message") return val.length > 9;
      return true;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = null;
      fields.forEach(function (el) {
        var field = el.closest(".field");
        var ok = checkField(el);
        if (field) field.classList.toggle("bad", !ok);
        if (!ok && !bad) bad = el;
      });
      if (bad) { bad.focus(); if (sent) sent.classList.remove("show"); return; }

      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name) data[el.name] = (el.value || "").trim();
      });
      var subject = subjectTpl.replace(/\{(\w+)\}/g, function (_, k) { return data[k] || ""; });
      var lines = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === "submit" || el.type === "file") return;
        var label = el.closest(".field") && el.closest(".field").querySelector("label");
        lines.push((label ? label.textContent : el.name) + ": " + (el.value || "—"));
      });
      var body = lines.join("\n");
      var mailto = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      window.location.href = mailto;

      if (sent) sent.classList.add("show");
      form.querySelectorAll("input,textarea").forEach(function (i) { if (i.type !== "submit") i.value = ""; });
    });

    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f) f.classList.remove("bad");
    });
  });
})();
