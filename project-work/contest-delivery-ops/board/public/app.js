async function loadBoard() {
  const res = await fetch("/api/board");
  const data = await res.json();

  document.getElementById("phase").textContent = data.phase || "No phase recorded";
  document.getElementById("current-branch").textContent = data.currentBranch || "-";
  document.getElementById("shot-count").textContent = String(data.screenshots.length);
  document.getElementById("doc-count").textContent = String(data.docs.filter((item) => item.exists).length);

  renderList("blocker-list", data.blockers);
  renderRootList(data.workspaceRoots);
  renderBranchList(data.branchList, data.dirtyFiles);
  renderValidation(data.validation.items);
  renderTasks(data.taskSections);
  renderScreenshots(data.screenshots);
  renderDocs(data.docs);
  renderOrdered("next-actions", data.nextActions);
  document.getElementById("react-preview").textContent = data.reactPreview;
}

function renderList(id, items) {
  const host = document.getElementById(id);
  host.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderOrdered(id, items) {
  const host = document.getElementById(id);
  host.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderBranchList(branches, dirtyFiles) {
  renderList("branch-list", branches);
  const dirty = dirtyFiles.length ? dirtyFiles : ["clean"];
  renderList("dirty-list", dirty);
}

function renderRootList(roots) {
  const host = document.getElementById("root-list");
  host.innerHTML = roots
    .map(
      (root) => `
        <li>
          <strong>${escapeHtml(root.label)}</strong>
          <span>${escapeHtml(root.path)}</span>
        </li>`,
    )
    .join("");
}

function renderValidation(items) {
  const host = document.getElementById("validation-list");
  host.innerHTML = items
    .map(
      (item) => `
        <li class="${item.done ? "done" : "todo"}">
          <span class="status-dot"></span>
          <span>${escapeHtml(item.label)}</span>
        </li>`,
    )
    .join("");
}

function renderTasks(sections) {
  const host = document.getElementById("task-sections");
  host.innerHTML = sections
    .map(
      (section) => `
        <section class="task-section">
          <h3>${escapeHtml(section.title)}</h3>
          <ul class="check-list">
            ${section.items
              .map(
                (item) => `
                  <li class="${item.done ? "done" : "todo"}">
                    <span class="status-dot"></span>
                    <span>${escapeHtml(item.label)}</span>
                  </li>`,
              )
              .join("")}
          </ul>
        </section>`,
    )
    .join("");
}

function renderScreenshots(items) {
  const host = document.getElementById("gallery");
  if (!items.length) {
    host.innerHTML = `<p class="empty">No screenshots saved yet.</p>`;
    return;
  }
  host.innerHTML = items
    .map(
      (item) => `
        <figure class="shot">
          <img src="${item.url}" alt="${escapeHtml(item.name)}" />
          <figcaption>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.updatedAt.replace("T", " ").replace("Z", " UTC"))} · ${item.sizeKb} KB · ${escapeHtml(item.source)}</span>
            <code>${escapeHtml(item.displayPath)}</code>
          </figcaption>
        </figure>`,
    )
    .join("");
}

function renderDocs(items) {
  const host = document.getElementById("docs-list");
  host.innerHTML = items
    .map(
      (item) => `
        <li>
          <span>
            <strong>${escapeHtml(item.name)}</strong>
            ${item.displayPath ? `<small>${escapeHtml(item.displayPath)}</small>` : ""}
          </span>
          <span class="doc-state ${item.exists ? "ok" : "missing"}">${item.exists ? "READY" : "MISSING"}</span>
        </li>`,
    )
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

loadBoard().catch((error) => {
  document.body.innerHTML = `<pre class="fatal">${escapeHtml(error.stack || String(error))}</pre>`;
});
