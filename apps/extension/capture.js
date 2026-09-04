function pickText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const t = el?.innerText?.trim() || el?.textContent?.trim();
    if (t) return t;
  }
  return "";
}

function extractJob() {
  const host = location.hostname.replace(/^www\./, "");
  let source = "other";
  if (host.includes("linkedin")) source = "linkedin";
  else if (host.includes("indeed")) source = "indeed";
  else if (host.includes("wellfound") || host.includes("angel.co")) source = "wellfound";
  else if (host.includes("glassdoor")) source = "glassdoor";
  else if (host.includes("weworkremotely")) source = "wwr";
  else if (host.includes("remotive")) source = "remotive";
  else if (host.includes("remoteok")) source = "remoteok";

  const title =
    pickText([
      "h1",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title",
      "h1.jobsearch-JobInfoHeader-title",
      "[data-test='job-title']",
      ".JobDetails_jobTitle",
    ]) || document.title;

  const company = pickText([
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name",
    "[data-company-name]",
    "[data-testid='inlineHeader-companyName']",
    ".jobsearch-InlineCompanyRating-companyHeader a",
    "[data-test='employer-name']",
    "a[href*='/company/']",
  ]);

  const location = pickText([
    ".job-details-jobs-unified-top-card__primary-description-container",
    ".jobs-unified-top-card__bullet",
    "#jobLocation",
    "[data-testid='job-location']",
  ]);

  const description = pickText([
    "#job-details",
    ".jobs-description",
    ".jobs-box__html-content",
    "#jobDescriptionText",
    "[data-test='job-description']",
    ".JobDetails_jobDescription",
    "article",
  ]);

  return {
    source,
    title: title.split("|")[0].split(" - ")[0].trim(),
    company: company || "Unknown",
    location: location || "Remote",
    url: location.href.split("?")[0],
    applyUrl: location.href,
    description,
  };
}

function ensureButton() {
  if (document.getElementById("astra-capture")) return;
  const btn = document.createElement("button");
  btn.id = "astra-capture";
  btn.textContent = "Enviar para Astra";
  btn.style.cssText =
    "position:fixed;z-index:2147483647;right:16px;bottom:16px;padding:10px 14px;border:0;border-radius:8px;background:#c8f07c;color:#111;font:600 13px sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25)";
  btn.onclick = async () => {
    const payload = extractJob();
    btn.textContent = "Enviando…";
    try {
      const res = await fetch("http://127.0.0.1:8790/api/jobs/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      btn.textContent = json.duplicate ? "Já estava na fila" : `Salvo #${json.id}`;
      setTimeout(() => {
        btn.textContent = "Enviar para Astra";
      }, 2500);
    } catch (err) {
      btn.textContent = "Servidor off?";
      console.warn("Astra capture failed", err);
      setTimeout(() => {
        btn.textContent = "Enviar para Astra";
      }, 2500);
    }
  };
  document.documentElement.appendChild(btn);
}

ensureButton();
setTimeout(ensureButton, 1500);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "ASTRA_EXTRACT") {
    sendResponse(extractJob());
    return true;
  }
  return false;
});
