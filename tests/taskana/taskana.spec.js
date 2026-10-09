// End-to-end checks for Taskana's main flows and the QA fixes.
const { test, expect } = require("@playwright/test");

const open = async (page, route = "home") => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(test.info().project.use.baseURL + "#/" + route);
  await expect(page.locator(".top h1")).toBeVisible();
  return errors;
};
const store = page => page.evaluate(() => JSON.parse(localStorage.getItem("galil-taskana-v1")));
const go = (page, route) => page.evaluate(r => { location.hash = "#/" + r; }, route);

test("every page renders without errors", async ({ page }) => {
  const errors = await open(page);
  for (const r of ["inbox", "my", "board", "tasks", "insights", "clients", "clients/c-iai", "project/p-iai1", "people", "people/u-pm", "view/v-3", "task/RSOM-1"]) {
    await go(page, r);
    await expect(page.locator(".top h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("demo data is saved on first load", async ({ page }) => {
  await open(page);
  expect((await store(page)).tasks.length).toBeGreaterThan(30);
});

test("Ctrl+C does not open the new-task dialog; c does", async ({ page }) => {
  await open(page, "board");
  await page.keyboard.press("Control+c");
  await expect(page.locator(".modal")).toHaveCount(0);
  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: "New task" })).toBeVisible();
});

test("Esc while editing the description cancels the edit, not the task; unsaved text asks first", async ({ page }) => {
  await open(page, "task/RSOM-1");
  await page.locator(".desc").click();
  await page.fill("#desc-ed", "Unsaved words");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Discard your changes/ })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("#desc-ed")).toHaveValue("Unsaved words");
});

test("description draft survives other changes in the task", async ({ page }) => {
  await open(page, "task/RSOM-1");
  await page.locator(".desc").click();
  await page.fill("#desc-ed", "Draft in progress");
  await page.locator(".ck-row input").nth(2).check();
  await expect(page.locator("#desc-ed")).toHaveValue("Draft in progress");
});

test("focus stays on a field after changing it", async ({ page }) => {
  await open(page, "task/RSOM-1");
  await page.fill("#tf-deliverable", "Vol 1 · Ch 3b");
  await page.keyboard.press("Tab");
  const id = await page.evaluate(() => document.activeElement.id);
  expect(id).toBe("tf-labels");
});

test("negative estimates are rejected", async ({ page }) => {
  await open(page, "task/RSOM-1");
  await page.fill("#tf-estimateHours", "-5");
  await page.keyboard.press("Tab");
  await expect(page.locator(".toast")).toContainText("between 0 and 2000");
  expect((await store(page)).tasks.find(t => t.id === "t-1").estimateHours).toBe(24);
});

test("Back closes the task and returns to the page it was opened from", async ({ page }) => {
  await open(page, "tasks");
  await page.locator("tr.click").first().click();
  await expect(page.locator(".modal.wide")).toBeVisible();
  await page.goBack();
  await expect(page.locator(".modal")).toHaveCount(0);
  expect(page.url()).toContain("#/tasks");
});

test("unknown task key shows a not-found page", async ({ page }) => {
  await open(page, "task/NOPE-99");
  await expect(page.locator(".top h1")).toHaveText("Task not found");
});

test("on-time shows 0% when nothing was on time", async ({ page }) => {
  await open(page);
  await page.evaluate(() => { db.tasks.forEach(t => { if (t.status === "Done") t.dueDate = "2000-01-02"; }); save(); render(); });
  await go(page, "insights");
  await expect(page.locator(".kpi").nth(3).locator(".val")).toHaveText("0%");
});

test("deactivating the current person switches 'Working as' to an active person", async ({ page }) => {
  await open(page);
  await page.evaluate(() => { byId(db.users, "u-pm").isActive = false; save(); render(); });
  const sel = await page.locator("#working-as").inputValue();
  expect(sel).not.toBe("u-pm");
  expect((await store(page)).settings.currentUserId).toBe(sel);
});

test("leaving a saved view clears the filters it applied", async ({ page }) => {
  await open(page, "view/v-3");
  await expect(page.locator("#f-clientId")).toHaveValue("c-iai");
  await page.locator(".nav button", { hasText: "Board" }).first().click();
  await expect(page.locator("#f-clientId")).toHaveValue("");
});

test("moving a task to another project keeps the old key working", async ({ page }) => {
  await open(page, "task/RSOM-1");
  await page.selectOption("#tf-projectId", "p-mob1");
  await expect(page).toHaveURL(/#\/task\/SDK-\d+/);
  await go(page, "task/RSOM-1");
  await expect(page.locator(".modal .td-title")).toHaveValue("Draft chapter 3 — Track modes");
});

test("deleting a project cleans up saved views that filtered on it", async ({ page }) => {
  await open(page);
  await page.evaluate(() => { db.views.push({ id: "v-x", name: "SDK only", ownerId: "u-pm", shared: false, mode: "tasks", filters: { projectId: "p-mob1" } }); save(); });
  await go(page, "project/p-mob1");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  const views = (await store(page)).views;
  expect(views.find(v => v.id === "v-x")).toBeUndefined();
});

test("CSV export neutralises spreadsheet formulas", async ({ page }) => {
  await open(page);
  const csv = await page.evaluate(() => { db.tasks[0].title = '=HYPERLINK("http://x")'; return tasksCSV(); });
  expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
});

test("restore rejects a broken backup and keeps the old data for undo", async ({ page }) => {
  await open(page);
  const err = await page.evaluate(() => validateBackup({ app: "galil-taskana", tasks: [{ id: "t" }], users: [], clients: [], projects: [] }));
  expect(err).toContain("has no");
});

test("board cards and list rows are keyboard reachable; dialogs trap focus", async ({ page }) => {
  await open(page, "board");
  const card = page.locator(".tcard").first();
  await card.focus();
  await page.keyboard.press("Enter");
  const dlg = page.getByRole("dialog");
  await expect(dlg).toHaveAttribute("aria-modal", "true");
  for (let i = 0; i < 60; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.querySelector(".scrim").contains(document.activeElement))).toBe(true);
});

test("a card can be moved with its Move menu and with Alt+Arrow", async ({ page }) => {
  await open(page, "board");
  const card = page.locator('[data-task="t-3"]');
  await card.locator("select.move").selectOption("To Do");
  expect((await store(page)).tasks.find(t => t.id === "t-3").status).toBe("To Do");
  await page.locator('[data-task="t-3"]').focus();
  await page.keyboard.press("Alt+ArrowRight");
  expect((await store(page)).tasks.find(t => t.id === "t-3").status).toBe("Writing");
});

test("dragging a card with the pointer moves it", async ({ page }) => {
  await open(page, "board");
  const card = page.locator('[data-task="t-3"]');
  const target = page.locator('[data-drop="Peer Review"]');
  const a = await card.boundingBox(), b = await target.boundingBox();
  await page.mouse.move(a.x + 20, a.y + 20); await page.mouse.down();
  await page.mouse.move(a.x + 60, a.y + 40, { steps: 5 });
  await page.mouse.move(b.x + 60, b.y + 80, { steps: 10 });
  await page.mouse.up();
  expect((await store(page)).tasks.find(t => t.id === "t-3").status).toBe("Peer Review");
});

test("mentions notify by id and show in the inbox", async ({ page }) => {
  await open(page, "task/RSOM-2");
  await page.fill("#composer", "@Noa");
  await page.locator(".mention-hint button", { hasText: "Noa Katz" }).click();
  await page.locator("#composer").pressSequentially("please check the figures");
  await page.getByRole("button", { name: "Post" }).click();
  const s = await store(page);
  const c = s.comments[s.comments.length - 1];
  expect(c.body).toContain("@[u-sen]");
  expect(s.notifications.some(n => n.userId === "u-sen" && n.kind === "mention")).toBe(true);
});

test("sub-tasks, links, attachments and recurrence", async ({ page }) => {
  await open(page, "task/RSOM-3");
  await page.fill("#sub-new", "Interview prep");
  await page.locator("#sub-new").press("Enter");
  await page.fill("#link-key", "RSOM-1");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page.fill("#att-url", "https://example.com/spec");
  await page.getByRole("button", { name: "Add link" }).click();
  await page.selectOption("#tf-recurrence", "Weekly");
  await page.selectOption("#tf-status", "Done");
  const s = await store(page);
  expect(s.tasks.some(t => t.parentId === "t-3" && t.title === "Interview prep")).toBe(true);
  expect(s.tasks.find(t => t.id === "t-3").links.length).toBe(1);
  expect(s.attachments.some(a => a.url === "https://example.com/spec")).toBe(true);
  expect(s.tasks.filter(t => t.title === "Maintenance procedures — outline").length).toBe(2);
});

test("bulk actions update several tasks", async ({ page }) => {
  await open(page, "tasks");
  const boxes = page.locator("tbody .chk input");
  await boxes.nth(0).check(); await boxes.nth(1).check();
  await page.selectOption("#bulk-priority", "Critical");
  await expect(page.locator(".toast")).toContainText("2 tasks updated");
});

test("viewers can't edit tasks", async ({ page }) => {
  await open(page);
  await page.evaluate(() => { db.settings.currentUserId = "u-fin"; save(); });
  await go(page, "task/RSOM-1");
  await expect(page.locator("#tf-status")).toBeDisabled();
  await expect(page.getByRole("button", { name: "New task" })).toHaveCount(0);
});

test("Hebrew switches the interface to right-to-left", async ({ page }) => {
  await open(page, "board");
  await page.getByRole("button", { name: "עברית" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".top h1")).toHaveText("לוח");
});

test("phone layout folds the filters and has no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await open(page, "tasks");
  await expect(page.locator("#f-clientId")).toBeHidden();
  await page.locator(".filters-btn").click();
  await expect(page.locator("#f-clientId")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("WorkDesk import adds people, clients and projects", async ({ page }) => {
  await open(page);
  const stats = await page.evaluate(() => importWorkdesk({ users: [{ id: "u-wd", fullName: "New Writer", role: "EMP", isActive: true }], clients: [{ id: "c-wd", name: "Rafael", initials: "RAF" }], projects: [{ id: "p-wd", clientId: "c-wd", name: "Missile Manual", status: "Active" }] }));
  expect(stats).toEqual({ users: 1, clients: 1, projects: 1 });
  const s = await store(page);
  expect(s.projects.find(p => p.id === "p-wd").key).toMatch(/^[A-Z][A-Z0-9]{1,5}$/);
});
