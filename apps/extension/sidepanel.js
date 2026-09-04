const API = "http://127.0.0.1:8790";
const statusEl = document.getElementById("status");
let packet = null;

document.getElementById("load").onclick = async () => {
  const id = document.getElementById("jobId").value;
  statusEl.textContent = "Loading…";
  try {
    packet = await fetch(`${API}/api/jobs/${id}/packet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tailorResume: false }),
    }).then((r) => r.json());
    if (packet.error) throw new Error(packet.error);
    document.getElementById("letter").value = packet.coverLetter ?? "";
    statusEl.textContent = "Packet ready.";
  } catch (err) {
    statusEl.innerHTML = `<span class="err">${err.message}. Is the server running?</span>`;
  }
};

document.getElementById("fill").onclick = async () => {
  if (!packet) {
    statusEl.textContent = "Load a packet first.";
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "ASTRA_FILL", packet });
  statusEl.textContent = "Fill sent. Review the form. Do not expect Submit to be clicked.";
};

document.getElementById("applied").onclick = async () => {
  const id = document.getElementById("jobId").value;
  await fetch(`${API}/api/jobs/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "applied" }),
  });
  statusEl.textContent = "Marked applied.";
};
