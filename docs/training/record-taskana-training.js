// Records the Taskana training video (docs/training/taskana-training.mp4).
// Drives site/taskana with Playwright, overlays chapter cards, captions and a
// visible cursor, then converts the recording to MP4 with ffmpeg.
//
// Run from the repo root:
//   (cd tests/taskana && npm ci)
//   node docs/training/record-taskana-training.js
// Needs ffmpeg on PATH. Set PW_CHROMIUM to use a specific Chromium binary.
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { chromium } = require(path.resolve(__dirname, "../../tests/taskana/node_modules/@playwright/test"));

const ROOT = path.resolve(__dirname, "../..");
const APP = "file://" + path.join(ROOT, "site/taskana/index.html");
const OUT = path.join(__dirname, "taskana-training.mp4");
const TMP = path.join(__dirname, ".rec");
const W = 1280, H = 720;

const OVERLAY_CSS = `
#trn-cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);max-width:82%;z-index:2147483646;
  background:rgba(20,32,22,.92);color:#fff;font:500 21px/1.4 "Noto Sans",system-ui,sans-serif;padding:12px 22px;
  border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.35);text-align:center;direction:ltr;pointer-events:none;
  opacity:0;transition:opacity .25s}
#trn-cap.on{opacity:1}
#trn-card{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:#1F3D24;color:#fff;font-family:"Noto Sans",system-ui,sans-serif;direction:ltr;opacity:0;transition:opacity .35s;pointer-events:none}
#trn-card.on{opacity:1}
#trn-card .n{font-size:20px;letter-spacing:.2em;color:#8CC63E;text-transform:uppercase;margin-bottom:14px}
#trn-card .t{font-size:52px;font-weight:700}
#trn-card .s{font-size:22px;opacity:.85;margin-top:14px;max-width:900px;text-align:center}
#trn-cur{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483645;pointer-events:none;
  transition:transform .7s cubic-bezier(.4,0,.2,1)}
#trn-cur svg{filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
#trn-cur .ring{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:3px solid #8CC63E;opacity:0}
#trn-cur.click .ring{animation:trnring .45s ease-out}
@keyframes trnring{from{opacity:1;transform:scale(.4)}to{opacity:0;transform:scale(1.6)}}
.trn-hl{outline:3px solid #8CC63E !important;outline-offset:3px !important;border-radius:6px}
`;

async function installOverlay(page) {
  await page.evaluate(css => {
    if (document.getElementById("trn-cap")) return;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const cap = document.createElement("div"); cap.id = "trn-cap"; document.body.appendChild(cap);
    const card = document.createElement("div"); card.id = "trn-card"; document.body.appendChild(card);
    const cur = document.createElement("div"); cur.id = "trn-cur";
    cur.innerHTML = '<div class="ring"></div><svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 2l17 10-7 2-3 7z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    cur.style.transform = "translate(640px,360px)";
    document.body.appendChild(cur);
  }, OVERLAY_CSS);
}

const wait = ms => new Promise(r => setTimeout(r, ms));

function makeDirector(page) {
  const d = {};
  d.caption = async (text, ms = 3800) => {
    await page.evaluate(t => { const c = document.getElementById("trn-cap"); c.textContent = t; c.classList.toggle("on", !!t); }, text);
    if (ms) await wait(ms);
  };
  d.clear = () => page.evaluate(() => document.getElementById("trn-cap").classList.remove("on"));
  d.card = async (n, title, sub, ms = 3200) => {
    await d.clear();
    await page.evaluate(([n, t, s]) => {
      const c = document.getElementById("trn-card");
      c.innerHTML = (n ? '<div class="n"></div>' : "") + '<div class="t"></div>' + (s ? '<div class="s"></div>' : "");
      if (n) c.querySelector(".n").textContent = n;
      c.querySelector(".t").textContent = t;
      if (s) c.querySelector(".s").textContent = s;
      c.classList.add("on");
    }, [n, title, sub]);
    await wait(ms);
    await page.evaluate(() => document.getElementById("trn-card").classList.remove("on"));
    await wait(450);
  };
  d.pointTo = async (loc, { hl = true } = {}) => {
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    if (!b) return null;
    const x = b.x + Math.min(b.width / 2, 40), y = b.y + b.height / 2;
    await page.evaluate(([x, y]) => { document.getElementById("trn-cur").style.transform = `translate(${x}px,${y}px)`; }, [x, y]);
    await wait(750);
    if (hl) await loc.evaluate(el => el.classList.add("trn-hl")).catch(() => {});
    return { x, y };
  };
  d.unhl = () => page.evaluate(() => document.querySelectorAll(".trn-hl").forEach(e => e.classList.remove("trn-hl")));
  d.ripple = () => page.evaluate(() => { const c = document.getElementById("trn-cur"); c.classList.remove("click"); void c.offsetWidth; c.classList.add("click"); });
  d.click = async (loc, pause = 900) => {
    await d.pointTo(loc, { hl: false });
    await d.ripple();
    await wait(200);
    await loc.click();
    await wait(pause);
  };
  d.type = async (loc, text, pause = 500) => {
    await d.click(loc, 200);
    await loc.pressSequentially(text, { delay: 45 });
    await wait(pause);
  };
  d.select = async (loc, value, pause = 900) => {
    await d.pointTo(loc, { hl: false });
    await d.ripple();
    await loc.selectOption(value);
    await wait(pause);
  };
  d.closeAll = async () => {
    for (let i = 0; i < 3 && await page.locator(".scrim").count(); i++) {
      const x = page.locator(".scrim .modal-h .x, .scrim button.x").first();
      if (await x.count()) await d.click(x, 700); else { await page.keyboard.press("Escape"); await wait(700); }
    }
  };
  d.nav = async name => { await d.closeAll(); await d.click(page.locator(".side .nav button", { hasText: name }).first(), 1200); };
  return d;
}

async function script(page, d) {
  // ── Intro ──────────────────────────────────────────────
  await d.card("", "Taskana", "Training: planning and tracking documentation work, step by step", 4200);
  await d.caption("Taskana is GALIL's project and task tracker for technical-writing teams.", 4200);
  await d.caption("It runs in your browser. Your data is saved on this computer, in this browser.", 4200);

  // ── 1. Getting around ──────────────────────────────────
  await d.card("Chapter 1", "Getting around", "The sidebar, who you're working as, and the Overview");
  await d.pointTo(page.locator(".side .nav").first());
  await d.caption("The sidebar on the left holds every page: Overview, Inbox, My work, Board, All tasks, Insights, Clients & projects and People.", 5200);
  await d.unhl();
  await d.pointTo(page.locator("#working-as"));
  await d.caption("At the bottom, 'Working as' sets whose eyes you see Taskana through. Your role decides what you can change.", 4800);
  await d.caption("Admins can do everything, Managers handle clients and projects, Members work on tasks, and Viewers read and comment.", 5000);
  await d.unhl();
  await d.nav("Overview");
  await d.caption("The Overview gives you the big picture: what's open, what's overdue and what's coming up.", 4600);

  // ── 2. Clients & projects ──────────────────────────────
  await d.card("Chapter 2", "Clients, projects and task keys", "How work is organised");
  await d.nav("Clients & projects");
  await d.caption("Work is organised as Clients → Projects → Tasks.", 3800);
  await d.caption("Each project has a short key, like RSOM. Its tasks are numbered RSOM-1, RSOM-2 and so on.", 4800);
  const firstClient = page.locator(".content a, .content .click, .content button.card, .content .card").first();
  if (await firstClient.count()) {
    await d.click(firstClient, 1400);
    await d.caption("Open a client to see its projects. Managers and Admins can add and edit clients and projects here.", 4800);
  }

  // ── 3. Creating a task ─────────────────────────────────
  await d.card("Chapter 3", "Creating a task", "Press C anywhere, or use the New task button");
  await d.nav("Board");
  await d.pointTo(page.getByRole("button", { name: "New task" }).first());
  await d.caption("To create a task, click New task — or just press C on your keyboard.", 3800);
  await d.unhl();
  await d.click(page.getByRole("button", { name: "New task" }).first(), 1000);
  const modal = page.locator(".modal");
  await d.caption("Choose the project and give the task a clear title.", 0);
  await d.select(modal.locator("#fm-projectId"), { index: 1 });
  await d.type(modal.locator("#fm-title"), "Draft chapter 4 — Calibration");
  await d.caption("Set the type, priority, assignee and starting status.", 0);
  await d.select(modal.locator("#fm-type"), "Writing", 600);
  await d.select(modal.locator("#fm-priority"), "High", 600);
  await d.select(modal.locator("#fm-assigneeId"), { index: 2 }, 900);
  await d.caption("Add start and due dates and an estimate. Taskana warns you if a date falls on a Friday or Saturday.", 0);
  const day = n => { const t = new Date(); t.setDate(t.getDate() + n); while (t.getDay() === 5 || t.getDay() === 6) t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 10); };
  await modal.locator("#fm-startDate").fill(day(1)); await wait(500);
  await modal.locator("#fm-dueDate").fill(day(12)); await wait(500);
  await d.type(modal.locator("#fm-estimateHours"), "16", 800);
  await d.caption("The deliverable and labels make the task easy to find later.", 0);
  await d.type(modal.locator("#fm-deliverable"), "Vol 2 · Ch 4", 300);
  await d.type(modal.locator("#fm-labels"), "calibration, draft", 800);
  await d.caption("Need it every week or month? Use Repeats — closing one schedules the next.", 3800);
  await d.caption("Click Create to add the task.", 0);
  await d.click(modal.getByRole("button", { name: "Create" }), 1500);
  await d.caption("The new task gets its key and opens straight away. Close it with Esc or the X.", 4200);
  await d.closeAll();

  // ── 4. The board ───────────────────────────────────────
  await d.card("Chapter 4", "The Board", "Moving work through the writing workflow");
  await d.caption("The Board shows the workflow: Backlog → To Do → Writing → Peer Review → SME Review → Done.", 5000);
  const card = page.locator(".tcard").filter({ hasText: "Draft chapter 4 — Calibration" }).first();
  const target = page.locator('[data-drop="Writing"]');
  await d.pointTo(card);
  await d.caption("Drag a card to the next column when its stage changes.", 2600);
  await d.unhl();
  {
    const a = await card.boundingBox(), b = await target.boundingBox();
    await page.mouse.move(a.x + 20, a.y + 20); await page.mouse.down();
    await page.mouse.move(a.x + 60, a.y + 40, { steps: 5 });
    const steps = 25;
    for (let i = 1; i <= steps; i++) {
      const x = a.x + 60 + (b.x + 60 - a.x - 60) * i / steps, y = a.y + 40 + (b.y + 80 - a.y - 40) * i / steps;
      await page.mouse.move(x, y);
      await page.evaluate(([x, y]) => { const c = document.getElementById("trn-cur"); c.style.transition = "none"; c.style.transform = `translate(${x}px,${y}px)`; }, [x, y]);
      await wait(30);
    }
    await page.mouse.up();
    await page.evaluate(() => { document.getElementById("trn-cur").style.transition = ""; });
    await wait(1200);
  }
  const moved = page.locator(".tcard").filter({ hasText: "Draft chapter 4 — Calibration" }).first();
  await d.caption("No mouse? Every card has a Move menu, and Alt + arrow keys move the selected card.", 0);
  await d.pointTo(moved.locator("select.move"));
  await wait(2800);
  await d.unhl();
  await d.caption("Use the filters along the top to narrow the board by client, project, person, type or priority.", 0);
  await d.pointTo(page.locator(".filters").first());
  await wait(3200);
  await d.unhl();

  // ── 5. Task detail ─────────────────────────────────────
  await d.card("Chapter 5", "Working on a task", "Details, checklist, sub-tasks, links and attachments");
  await d.click(moved, 1500);
  await d.caption("Click any card to open the task. Every field can be edited right here — changes save automatically.", 4800);
  await d.pointTo(page.locator("#tf-status"));
  await d.caption("Status, assignee, priority, dates and estimate live on the side.", 3800);
  await d.unhl();
  await d.caption("Click the description to write the scope, sources and acceptance criteria.", 0);
  await d.click(page.locator(".modal .desc"), 500);
  await page.locator("#desc-ed").pressSequentially("Cover the calibration procedure end to end. Source: engineering spec rev C.", { delay: 25 });
  await wait(800);
  await page.locator("#desc-ed").press("Control+Enter").catch(() => {});
  const saveDesc = page.locator(".modal").getByRole("button", { name: "Save" });
  if (await page.locator("#desc-ed").count() && await saveDesc.count()) await d.click(saveDesc.first(), 800);
  await wait(800);
  await d.caption("Break bigger work into sub-tasks.", 0);
  await d.type(page.locator("#sub-new"), "Collect screenshots from the lab", 300);
  await page.locator("#sub-new").press("Enter"); await wait(1200);
  await d.caption("Link related tasks — blocks, is blocked by, or relates to.", 0);
  await d.type(page.locator("#link-key"), "RSOM-1", 300);
  await d.click(page.getByRole("button", { name: "Link", exact: true }), 1200);
  await d.caption("Attach a link to the source material, or a small file up to 1 MB.", 0);
  await d.type(page.locator("#att-url"), "https://example.com/calibration-spec", 300);
  await d.click(page.getByRole("button", { name: "Add link" }), 1400);

  // ── 6. Comments, questions, mentions ───────────────────
  await d.card("Chapter 6", "Comments, questions and @mentions", "Talk about the work where the work is");
  await page.evaluate(() => { location.hash = "#/task/RSOM-2"; });
  await wait(1500);
  await d.caption("Type @ and a name in the comment box to mention a teammate. They'll be notified in their Inbox.", 0);
  await page.locator("#composer").scrollIntoViewIfNeeded();
  await d.type(page.locator("#composer"), "@Noa", 400);
  await d.click(page.locator(".mention-hint button", { hasText: "Noa Katz" }), 400);
  await page.locator("#composer").pressSequentially("could you check the figures in section 2?", { delay: 35 });
  await wait(600);
  await d.click(page.getByRole("button", { name: "Post" }), 1500);
  await d.caption("You can also post a question. Open questions are tracked until someone answers them.", 4400);
  await d.caption("Every change to a task is recorded in its History, so you can always see who did what.", 4400);
  await d.closeAll();

  // ── 7. Inbox & My work ─────────────────────────────────
  await d.card("Chapter 7", "Inbox and My work", "Your personal to-do list");
  await d.nav("Inbox");
  await d.caption("The Inbox collects your mentions, new assignments, replies and answered questions.", 4600);
  await d.nav("My work");
  await d.caption("My work lists every open task assigned to whoever you're working as.", 4400);

  // ── 8. All tasks, bulk actions, saved views ────────────
  await d.card("Chapter 8", "All tasks, bulk changes and saved views", "Handle many tasks at once");
  await d.nav("All tasks");
  await d.caption("All tasks is a sortable list of everything. Click a column header to sort.", 4200);
  const boxes = page.locator("tbody .chk input");
  await d.caption("Tick several tasks to change them together.", 0);
  await d.click(boxes.nth(0), 400); await d.click(boxes.nth(1), 600);
  await d.select(page.locator("#bulk-priority"), "High", 2200);
  await d.caption("Filter the list, then choose Save view to keep the filter for later.", 0);
  await d.select(page.locator("#f-clientId"), { index: 1 }, 1200);
  await d.click(page.getByRole("button", { name: "Save view" }), 1000);
  const vm = page.locator(".modal");
  const nameField = vm.locator("#fm-name");
  if (await nameField.count()) await d.type(nameField, "My client's tasks", 500);
  await d.caption("Keep a view private, or share it with the whole team. Saved views appear in the sidebar.", 0);
  await d.click(vm.getByRole("button", { name: "Save" }), 1800);
  await d.caption("", 0); await d.clear();
  await wait(1500);

  // ── 9. Insights ────────────────────────────────────────
  await d.card("Chapter 9", "Insights", "How is the team doing?");
  await d.nav("Insights");
  await d.caption("Insights shows tasks closed, closing rate, on-time delivery, cycle time, overdue share and more.", 5000);
  await page.locator(".content").evaluate(el => el.scrollBy({ top: 500, behavior: "smooth" }));
  await wait(1500);
  await d.caption("Charts show opened vs closed work by week or month, work by stage, and a per-person table.", 5000);
  await page.locator(".content").evaluate(el => el.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(800);

  // ── 10. Personalising & data ───────────────────────────
  await d.card("Chapter 10", "Language, theme and your data", "Make Taskana yours — and keep it safe");
  await d.pointTo(page.getByRole("button", { name: "עברית" }));
  await d.caption("Switch between English and Hebrew. Hebrew uses a right-to-left layout.", 0);
  await wait(800);
  await d.unhl();
  await d.click(page.getByRole("button", { name: "עברית" }), 2600);
  await d.click(page.getByRole("button", { name: "English" }), 1200);
  const darkBtn = page.locator(".side").getByRole("button", { name: /Dark|Light/ }).first();
  await d.caption("Toggle light and dark themes.", 0);
  await d.click(darkBtn, 2200);
  await d.click(page.locator(".side").getByRole("button", { name: /Dark|Light/ }).first(), 1000);
  await d.caption("Data is where you back up to a file, restore a backup, export to CSV for Excel, or import from WorkDesk.", 0);
  await d.click(page.locator(".side").getByRole("button", { name: "Data" }).first(), 3800);
  await d.caption("Your data lives only in this browser — back it up regularly!", 4000);
  await page.keyboard.press("Escape"); await wait(800);

  // ── Wrap-up ────────────────────────────────────────────
  await d.card("Recap", "You're ready to go", "Create tasks · move them on the Board · talk with @mentions · track progress in Insights", 4500);
  await d.card("", "Taskana", "by GALIL", 2500);
}

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: TMP, size: { width: W, height: H } }, colorScheme: "light", locale: "en-US" });
  const page = await ctx.newPage();
  page.on("pageerror", e => console.error("page error:", e.message));
  await page.goto(APP + "#/home");
  await page.locator(".top h1").waitFor();
  await page.evaluate(() => { db.settings.currentUserId = "u-pm"; db.settings.theme = "light"; save(); render(); });
  await installOverlay(page);
  await wait(300);
  try {
    await script(page, makeDirector(page));
  } finally {
    const video = page.video();
    await ctx.close();
    await browser.close();
    const webm = await video.path();
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-preset", "slow", "-crf", "26",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], { stdio: "inherit" });
    fs.rmSync(TMP, { recursive: true, force: true });
    console.log("Wrote", path.relative(ROOT, OUT));
  }
})();
