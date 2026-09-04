function setValue(el, value) {
  if (!el || value == null || value === "") return false;
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function byNameOrLabel(needles) {
  const inputs = [...document.querySelectorAll("input, textarea")];
  return inputs.find((el) => {
    const hay = `${el.name} ${el.id} ${el.placeholder} ${el.getAttribute("aria-label") ?? ""}`.toLowerCase();
    return needles.some((n) => hay.includes(n));
  });
}

function fill(packet) {
  const a = packet.answers ?? {};
  const letter = packet.coverLetter ?? "";
  setValue(byNameOrLabel(["first_name", "first-name", "firstname"]), a.firstName);
  setValue(byNameOrLabel(["last_name", "last-name", "lastname"]), a.lastName);
  setValue(byNameOrLabel(["full_name", "fullname"]), a.fullName);
  setValue(byNameOrLabel(["email"]), a.email);
  setValue(byNameOrLabel(["phone", "tel"]), a.phone);
  setValue(byNameOrLabel(["linkedin"]), a.linkedin);
  setValue(byNameOrLabel(["github"]), a.github);
  setValue(byNameOrLabel(["website", "portfolio", "url"]), a.website);
  setValue(byNameOrLabel(["city"]), a.city);
  setValue(byNameOrLabel(["cover", "letter", "additional"]), letter);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "ASTRA_FILL") fill(msg.packet);
});
