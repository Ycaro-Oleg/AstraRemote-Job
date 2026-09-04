const appEl = document.getElementById("app");
const statsEl = document.getElementById("stats");

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function refreshStats() {
  try {
    const s = await api("/api/jobs/stats");
    statsEl.textContent = `${s.total} jobs · queued ${s.counts.queued ?? 0} · applied ${s.counts.applied ?? 0}`;
  } catch {
    statsEl.textContent = "";
  }
}

function route() {
  const hash = location.hash.replace(/^#/, "") || "/queue";
  const parts = hash.split("/").filter(Boolean);
  return parts;
}

async function renderQueue(status = "queued") {
  const data = await api(`/api/jobs?status=${encodeURIComponent(status)}`);
  if (data.jobs.length === 0) {
    appEl.innerHTML = `<p class="muted">No ${esc(status)} jobs. Refresh boards or add more company slugs.</p>`;
    return;
  }
  appEl.innerHTML = data.jobs
    .map(
      (j) => `
      <div class="job">
        <div class="score">${Math.round(j.score)}</div>
        <div>
          <div class="title"><a href="#/jobs/${j.id}">${esc(j.title)}</a></div>
          <div class="meta">${esc(j.company)} · ${esc(j.ats)} · ${esc(j.location || "—")} · ${esc(j.roleFit)} · ${esc(j.hiringGeo)}</div>
        </div>
        <div><button data-open="${j.id}">Apply</button></div>
      </div>`,
    )
    .join("");
  appEl.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      location.hash = `#/jobs/${btn.getAttribute("data-open")}`;
    });
  });
}

async function renderJob(id) {
  const job = await api(`/api/jobs/${id}`);
  appEl.innerHTML = `
    <p><a href="#/queue">← queue</a></p>
    <h1>${esc(job.title)}</h1>
    <p class="meta">${esc(job.company)} · ${esc(job.location)} · score ${Math.round(job.score)} · ${esc(job.status)}</p>
    <p><a href="${esc(job.applyUrl)}" target="_blank" rel="noopener">Open application form</a></p>
    <div class="row">
      <button class="primary" id="packet">Generate packet</button>
      <label><input type="checkbox" id="tailor" /> Tailor resume for this JD</label>
      <select id="status">
        ${["queued", "applying", "applied", "interviewing", "offer", "rejected", "skipped"]
          .map((s) => `<option ${s === job.status ? "selected" : ""}>${s}</option>`)
          .join("")}
      </select>
      <button id="save-status">Save status</button>
    </div>
    <div id="packet-box" class="card muted">Packet not generated yet.</div>
    <h2>Description</h2>
    <div class="description">${esc(job.description)}</div>
    <label>Notes</label>
    <textarea id="notes" rows="3">${esc(job.notes ?? "")}</textarea>
  `;
  document.getElementById("packet").onclick = async () => {
    const box = document.getElementById("packet-box");
    box.textContent = "Generating…";
    try {
      const tailorResume = document.getElementById("tailor").checked;
      const packet = await api(`/api/jobs/${id}/packet`, {
        method: "POST",
        body: JSON.stringify({ tailorResume }),
      });
      box.innerHTML = `
        <p>${packet.usedLlm ? "LLM letter" : "Template letter (no API key or LLM failed)"} · resume: ${esc(packet.resume.used)}${packet.resume.reason ? ` — ${esc(packet.resume.reason)}` : ""}</p>
        <label>Cover letter</label>
        <textarea id="letter" rows="12">${esc(packet.coverLetter)}</textarea>
        <label>Why this company</label>
        <textarea rows="4">${esc(packet.whyThisCompany)}</textarea>
        <p class="muted">Copy these into the form, or use the Chrome extension Fill once it is loaded. You click Submit.</p>
      `;
      if (packet.job?.applyUrl) window.open(packet.job.applyUrl, "_blank", "noopener");
    } catch (err) {
      box.innerHTML = `<p class="err">${esc(err.message)}</p>`;
    }
  };
  document.getElementById("save-status").onclick = async () => {
    await api(`/api/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: document.getElementById("status").value,
        notes: document.getElementById("notes").value,
      }),
    });
    await renderJob(id);
    await refreshStats();
  };
}

async function renderBoards() {
  const boards = await api("/api/boards");
  appEl.innerHTML = `
    <h1>Company boards</h1>
    <div class="card">
      <div class="row">
        <input id="b-name" placeholder="Name" />
        <select id="b-ats"><option>greenhouse</option><option>lever</option><option>ashby</option><option>remotive</option><option>remoteok</option><option>wwr</option><option>himalayas</option><option>arbeitnow</option><option>jobicy</option></select>
        <input id="b-slug" placeholder="slug" />
        <select id="b-kind"><option>rails</option><option>marketplace</option><option>remote_first</option></select>
        <button id="b-add">Add</button>
      </div>
    </div>
    ${boards
      .map(
        (b) => `
      <div class="job">
        <div></div>
        <div>
          <div class="title">${esc(b.name)} <span class="muted">${esc(b.ats)}/${esc(b.slug)} · ${esc(b.kind)}</span></div>
          <div class="meta">${b.lastError ? `<span class="err">${esc(b.lastError)}</span>` : "ok"} · ${esc(b.lastFetchedAt || "never fetched")}</div>
        </div>
        <button data-del="${b.id}">Remove</button>
      </div>`,
      )
      .join("")}
  `;
  document.getElementById("b-add").onclick = async () => {
    await api("/api/boards", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("b-name").value,
        ats: document.getElementById("b-ats").value,
        slug: document.getElementById("b-slug").value,
        kind: document.getElementById("b-kind").value,
      }),
    });
    await renderBoards();
  };
  appEl.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      await api(`/api/boards/${btn.getAttribute("data-del")}`, { method: "DELETE" });
      await renderBoards();
    };
  });
}

async function renderProfile() {
  const p = await api("/api/profile");
  appEl.innerHTML = `
    <h1>Profile vault</h1>
    <p class="muted">This is what every form is filled from. Salary and notice stay empty until you type them.</p>
    <label>Name</label><input id="name" value="${esc(p.name)}" />
    <label>Email</label><input id="email" value="${esc(p.email)}" />
    <label>Phone</label><input id="phone" value="${esc(p.phone)}" />
    <label>Salary target</label><input id="salary" value="${esc(p.salaryTarget)}" placeholder="you type this" />
    <label>Notice period (days)</label><input id="notice" value="${esc(p.noticePeriodDays ?? "")}" />
    <label>Skills (comma separated)</label><input id="skills" value="${esc(p.skills.join(", "))}" />
    <p><button class="primary" id="save">Save profile</button></p>
  `;
  document.getElementById("save").onclick = async () => {
    const noticeRaw = document.getElementById("notice").value.trim();
    await api("/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        ...p,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        salaryTarget: document.getElementById("salary").value,
        noticePeriodDays: noticeRaw ? Number(noticeRaw) : null,
        skills: document
          .getElementById("skills")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    await api("/api/rescore", { method: "POST" });
    appEl.insertAdjacentHTML("afterbegin", `<p class="warn">Saved and rescored.</p>`);
  };
}

async function render() {
  await refreshStats();
  const parts = route();
  try {
    if (parts[0] === "jobs" && parts[1]) await renderJob(parts[1]);
    else if (parts[0] === "boards") await renderBoards();
    else if (parts[0] === "profile") await renderProfile();
    else if (parts[0] === "skipped") await renderQueue("skipped");
    else if (parts[0] === "applied") await renderQueue("applied");
    else await renderQueue("queued");
  } catch (err) {
    appEl.innerHTML = `<p class="err">${esc(err.message)}</p>`;
  }
}

document.getElementById("refresh").onclick = async () => {
  statsEl.textContent = "Refreshing…";
  try {
    const result = await api("/api/refresh", { method: "POST" });
    statsEl.textContent = `+${result.created} new · ${result.errors.length} board errors`;
    await render();
  } catch (err) {
    statsEl.textContent = err.message;
  }
};

window.addEventListener("hashchange", render);
render();
