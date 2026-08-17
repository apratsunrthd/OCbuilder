(() => {
  "use strict";

  const STORAGE_KEY = "ocbuilder.state.v1";

  const REPEAT_LISTS = {
    abilities: ["name", "desc"],
    weaknesses: ["name", "desc"],
    timeline: ["when", "event"],
    relationships: ["name", "type", "desc"],
  };

  const FIELD_CLASS = {
    abilities: [".ability-name", ".ability-desc"],
    weaknesses: [".weakness-name", ".weakness-desc"],
    timeline: [".timeline-when", ".timeline-event"],
    relationships: [".rel-name", ".rel-type", ".rel-desc"],
  };

  // ---------------- data model ----------------

  function emptyCharacter() {
    return {
      id: genId(),
      updatedAt: Date.now(),
      identity: { name: "", fandom: "", nicknames: "", age: "", species: "", gender: "", occupation: "", affiliation: "", home: "" },
      appearance: { height: "", build: "", eyes: "", hair: "", description: "", distinguishing: "", outfit: "" },
      personality: { traits: "", strengths: "", flaws: "", likes: "", dislikes: "", fears: "", quirks: "" },
      voice: { pattern: "", catchphrases: "", habits: "" },
      abilities: [],
      weaknesses: [],
      backstory: { summary: "" },
      timeline: [],
      relationships: [],
      goals: { goals: "", motivation: "", secret: "" },
      notes: "",
    };
  }

  function genId() {
    return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------------- storage ----------------

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (state && state.characters && state.order) return state;
    } catch (e) { /* ignore corrupt storage */ }
    return null;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();
  if (!state) {
    const c = emptyCharacter();
    state = { characters: { [c.id]: c }, order: [c.id], currentId: c.id };
    saveState();
  }
  if (!state.currentId || !state.characters[state.currentId]) {
    state.currentId = state.order[0];
  }

  function current() {
    return state.characters[state.currentId];
  }

  // ---------------- path get/set ----------------

  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split(".");
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  }

  // ---------------- DOM refs ----------------

  const form = document.getElementById("sheetForm");
  const characterSelect = document.getElementById("characterSelect");
  const previewPane = document.getElementById("previewPane");
  const sheetPreview = document.getElementById("sheetPreview");

  // ---------------- rendering: form ----------------

  function renderForm() {
    const c = current();
    form.querySelectorAll("[data-path]").forEach((el) => {
      el.value = getPath(c, el.dataset.path) ?? "";
    });
    Object.keys(REPEAT_LISTS).forEach(renderRepeatList);
  }

  function renderRepeatList(listName) {
    const container = document.getElementById(listName + "List");
    const tpl = document.getElementById("tpl-" + listName);
    const items = current()[listName];
    container.innerHTML = "";
    items.forEach((item, idx) => {
      const row = tpl.content.firstElementChild.cloneNode(true);
      const fields = REPEAT_LISTS[listName];
      const selectors = FIELD_CLASS[listName];
      fields.forEach((fieldKey, i) => {
        const input = row.querySelector(selectors[i]);
        input.value = item[fieldKey] || "";
        input.addEventListener("input", () => {
          current()[listName][idx][fieldKey] = input.value;
          touch();
        });
      });
      row.querySelector(".row-remove").addEventListener("click", () => {
        current()[listName].splice(idx, 1);
        touch();
        renderRepeatList(listName);
      });
      container.appendChild(row);
    });
  }

  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const listName = btn.dataset.add;
      const blank = {};
      REPEAT_LISTS[listName].forEach((f) => (blank[f] = ""));
      current()[listName].push(blank);
      touch();
      renderRepeatList(listName);
    });
  });

  form.addEventListener("input", (e) => {
    const path = e.target.dataset.path;
    if (!path) return;
    setPath(current(), path, e.target.value);
    touch();
  });

  function touch() {
    current().updatedAt = Date.now();
    saveState();
    refreshSelect();
  }

  // ---------------- character manager ----------------

  function refreshSelect() {
    const prevValue = state.currentId;
    characterSelect.innerHTML = "";
    state.order.forEach((id) => {
      const c = state.characters[id];
      if (!c) return;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = c.identity.name?.trim() || "Untitled Character";
      characterSelect.appendChild(opt);
    });
    characterSelect.value = prevValue;
  }

  characterSelect.addEventListener("change", () => {
    state.currentId = characterSelect.value;
    saveState();
    renderForm();
  });

  document.getElementById("newBtn").addEventListener("click", () => {
    const c = emptyCharacter();
    state.characters[c.id] = c;
    state.order.push(c.id);
    state.currentId = c.id;
    saveState();
    refreshSelect();
    renderForm();
  });

  document.getElementById("duplicateBtn").addEventListener("click", () => {
    const src = current();
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = genId();
    copy.updatedAt = Date.now();
    copy.identity.name = (src.identity.name?.trim() || "Untitled Character") + " (copy)";
    state.characters[copy.id] = copy;
    const idx = state.order.indexOf(src.id);
    state.order.splice(idx + 1, 0, copy.id);
    state.currentId = copy.id;
    saveState();
    refreshSelect();
    renderForm();
  });

  document.getElementById("deleteBtn").addEventListener("click", () => {
    if (state.order.length <= 1) {
      alert("You need at least one character sheet — clear its fields instead of deleting the last one.");
      return;
    }
    const name = current().identity.name?.trim() || "this character";
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    const id = state.currentId;
    const idx = state.order.indexOf(id);
    delete state.characters[id];
    state.order.splice(idx, 1);
    state.currentId = state.order[Math.max(0, idx - 1)];
    saveState();
    refreshSelect();
    renderForm();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const c = current();
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (c.identity.name?.trim() || "untitled-character").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.href = url;
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        const blank = emptyCharacter();
        const merged = { ...blank, ...imported, id: genId(), updatedAt: Date.now() };
        state.characters[merged.id] = merged;
        state.order.push(merged.id);
        state.currentId = merged.id;
        saveState();
        refreshSelect();
        renderForm();
      } catch (err) {
        alert("Couldn't read that file — make sure it's a JSON export from OC Builder.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---------------- preview / print ----------------

  function tags(str) {
    return (str || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  function kv(label, value) {
    if (!value) return "";
    return `<div class="sheet-kv"><span class="k">${esc(label)}</span>${esc(value)}</div>`;
  }

  function kvGroup(pairs) {
    const cells = pairs.map(([label, value]) => kv(label, value)).filter(Boolean);
    if (cells.length === 0) return `<div class="sheet-empty">Not filled in.</div>`;
    return `<div class="sheet-grid">${cells.join("")}</div>`;
  }

  function textBlock(label, value) {
    return `<div class="sheet-section"><h2>${esc(label)}</h2>${
      value?.trim() ? `<div class="sheet-text">${esc(value)}</div>` : `<div class="sheet-empty">Not filled in.</div>`
    }</div>`;
  }

  function buildPreview() {
    const c = current();
    const id = c.identity;

    const headline = [id.species, id.occupation].filter(Boolean).join(" · ");

    let html = `
      <div class="sheet-header">
        <div class="sheet-eyebrow">${esc(id.fandom?.trim() || "Original Character")}</div>
        <h1 class="sheet-name">${esc(id.name?.trim() || "Untitled Character")}</h1>
        ${headline ? `<div class="sheet-tagline">${esc(headline)}</div>` : ""}
        ${id.nicknames ? `<div class="sheet-meta">"${esc(id.nicknames)}"</div>` : ""}
      </div>

      <div class="sheet-section">
        <h2>Identity</h2>
        ${kvGroup([
          ["Age", id.age],
          ["Gender / Pronouns", id.gender],
          ["Species / Race", id.species],
          ["Occupation", id.occupation],
          ["Affiliation", id.affiliation],
          ["Home / Origin", id.home],
        ])}
      </div>

      <div class="sheet-section">
        <h2>Appearance</h2>
        ${kvGroup([
          ["Height", c.appearance.height],
          ["Build", c.appearance.build],
          ["Eyes", c.appearance.eyes],
          ["Hair", c.appearance.hair],
        ])}
        ${c.appearance.description ? `<div class="sheet-text">${esc(c.appearance.description)}</div>` : ""}
        ${kv("Distinguishing Features", c.appearance.distinguishing)}
        ${kv("Typical Outfit", c.appearance.outfit)}
      </div>

      <div class="sheet-section">
        <h2>Personality</h2>
        ${tags(c.personality.traits).length ? `<div class="tag-row">${tags(c.personality.traits).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : `<div class="sheet-empty">No traits listed.</div>`}
        <div style="margin-top:0.7rem;">
          ${kvGroup([
            ["Strengths", c.personality.strengths],
            ["Flaws", c.personality.flaws],
            ["Likes", c.personality.likes],
            ["Dislikes", c.personality.dislikes],
            ["Fears", c.personality.fears],
            ["Quirks / Habits", c.personality.quirks],
          ])}
        </div>
      </div>

      <div class="sheet-section">
        <h2>Voice &amp; Mannerisms</h2>
        ${kvGroup([
          ["Speech Pattern", c.voice.pattern],
          ["Catchphrases", c.voice.catchphrases],
          ["Physical Habits", c.voice.habits],
        ])}
      </div>

      <div class="sheet-section">
        <h2>Abilities &amp; Skills</h2>
        ${listBlock(c.abilities, (a) => `<div class="sheet-list-item"><span class="item-title">${esc(a.name || "Untitled")}</span>${a.desc ? ` — ${esc(a.desc)}` : ""}</div>`)}
      </div>

      <div class="sheet-section">
        <h2>Weaknesses &amp; Limitations</h2>
        ${listBlock(c.weaknesses, (a) => `<div class="sheet-list-item"><span class="item-title">${esc(a.name || "Untitled")}</span>${a.desc ? ` — ${esc(a.desc)}` : ""}</div>`)}
      </div>

      ${textBlock("Backstory", c.backstory.summary)}

      <div class="sheet-section">
        <h2>Timeline</h2>
        ${listBlock(c.timeline, (t) => `<div class="sheet-list-item"><span class="item-sub">${esc(t.when || "—")}</span><br>${esc(t.event || "")}</div>`)}
      </div>

      <div class="sheet-section">
        <h2>Relationships</h2>
        ${listBlock(c.relationships, (r) => `<div class="sheet-list-item"><span class="item-title">${esc(r.name || "Untitled")}</span>${r.type ? ` <span class="item-sub">(${esc(r.type)})</span>` : ""}${r.desc ? `<br>${esc(r.desc)}` : ""}</div>`)}
      </div>

      <div class="sheet-section">
        <h2>Goals &amp; Motivation</h2>
        ${kvGroup([
          ["Goals", c.goals.goals],
          ["Motivation", c.goals.motivation],
          ["Secret", c.goals.secret],
        ])}
      </div>

      ${textBlock("Notes", c.notes)}
    `;

    sheetPreview.innerHTML = html;
  }

  function listBlock(items, render) {
    if (!items || items.length === 0) return `<div class="sheet-empty">Nothing added yet.</div>`;
    return items.map(render).join("");
  }

  document.getElementById("previewBtn").addEventListener("click", () => {
    buildPreview();
    form.classList.add("no-print");
    form.style.display = "none";
    previewPane.classList.add("active");
    window.scrollTo(0, 0);
  });

  document.getElementById("closePreview").addEventListener("click", () => {
    previewPane.classList.remove("active");
    form.style.display = "";
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });

  // ---------------- init ----------------

  refreshSelect();
  renderForm();
})();
