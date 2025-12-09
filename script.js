/* ============================================================
   PANEL DRAGGING (LEFT / RIGHT)
============================================================ */

const leftBar = document.getElementById("drag-left");
const rightBar = document.getElementById("drag-right");

const leftPanel = document.querySelector(".sidebar-left");
const centerPanel = document.querySelector(".center-panel");
const rightPanel = document.querySelector(".sidebar-right");

let isDragging = false;
let currentDrag = null;

leftBar.addEventListener("mousedown", () => {
  isDragging = true;
  currentDrag = "left";
});

rightBar.addEventListener("mousedown", () => {
  isDragging = true;
  currentDrag = "right";
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  if (currentDrag === "left") {
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 10 && newWidth < 40) {
      leftPanel.style.width = newWidth + "%";
      centerPanel.style.width = (60 - (newWidth - 20)) + "%";
    }
  }

  if (currentDrag === "right") {
    const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    if (newWidth > 10 && newWidth < 40) {
      rightPanel.style.width = newWidth + "%";
      centerPanel.style.width = (60 - (newWidth - 20)) + "%";
    }
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

/* ============================================================
   FILE UPLOAD HANDLING
============================================================ */

const uploadBtn = document.getElementById("uploadBtn");
const uploadModal = document.getElementById("uploadModal");
const closeModal = document.getElementById("closeModal");
const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const driveBtn = document.getElementById("driveBtn");

uploadBtn.addEventListener("click", () => {
  uploadModal.style.display = "flex";
});

closeModal.addEventListener("click", () => {
  uploadModal.style.display = "none";
});

dropArea.addEventListener("click", () => fileInput.click());

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.style.borderColor = "#6a6df0";
});

dropArea.addEventListener("dragleave", () => {
  dropArea.style.borderColor = "#3a3b44";
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.style.borderColor = "#3a3b44";

  const file = e.dataTransfer.files[0];
  handleFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  handleFile(file);
});

/* ============================================================
   NOTES / FOLDERS STORAGE
============================================================ */

const notesList = document.getElementById("notesList");
const editor = document.getElementById("editor");
const foldersList = document.getElementById("foldersList");
const newFolderBtn = document.getElementById("newFolderBtn");
const emptyText = document.querySelector(".empty-text");

let notes = JSON.parse(localStorage.getItem("notes")) || {};
let currentFolder = "__global";
let currentNote = null;

function initializeNotesStructure() {
  if (notes.__global && typeof notes.__global === "object") return;

  const values = Object.values(notes);
  const isFlat =
    values.length === 0 ||
    values.every((v) => typeof v === "string");

  if (isFlat) {
    notes = { "__global": { ...notes } };
  } else {
    if (!notes.__global) notes.__global = {};
  }
}

function ensureFolder(folderName) {
  const name = folderName || "__global";
  if (!notes[name]) notes[name] = {};
}

function getFolderNames() {
  return Object.keys(notes).filter((name) => name !== "__global");
}

function getAllNoteNames() {
  const result = [];
  Object.keys(notes).forEach((folder) => {
    const folderNotes = notes[folder] || {};
    Object.keys(folderNotes).forEach((name) => {
      if (!result.includes(name)) result.push(name);
    });
  });
  return result;
}

function findFolderForNote(filename) {
  if (notes.__global && notes.__global[filename]) return "__global";
  const folders = getFolderNames();
  for (const folder of folders) {
    if (notes[folder] && notes[folder][filename]) return folder;
  }
  return null;
}

function noteExists(filename) {
  return !!findFolderForNote(filename);
}

function getNoteContentByName(filename) {
  const folder = findFolderForNote(filename);
  if (!folder) return "";
  return notes[folder][filename] || "";
}

/* ============================================================
   FILE HANDLING
============================================================ */

function handleFile(file) {
  if (!file || !file.name.endsWith(".md")) {
    alert("Please upload a markdown (.md) file");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const content = e.target.result;

    ensureFolder(currentFolder);
    notes[currentFolder][file.name] = content;

    saveNotes();
    renderNotesForCurrentFolder();
    openNote(file.name);

    uploadModal.style.display = "none";
  };

  reader.readAsText(file);
}

/* ============================================================
   SHARED CONTEXT MENU (NOTES + FOLDERS)
============================================================ */

const contextMenu = document.createElement("div");
contextMenu.className = "note-context-menu";
contextMenu.style.cssText = `
  position: absolute;
  background: #1d1e24;
  border: 1px solid #2a2b32;
  border-radius: 6px;
  padding: 5px 0;
  width: 130px;
  z-index: 1000;
  display: none;
`;

document.body.appendChild(contextMenu);

const style = document.createElement("style");
style.textContent = `
  .ctx-item {
    padding: 8px 12px;
    cursor: pointer;
    color: #ddd;
  }
  .ctx-item:hover {
    background: #333542;
  }
`;
document.head.appendChild(style);

document.addEventListener("click", () => {
  contextMenu.style.display = "none";
});

/* ============================================================
   FOLDER LIST RENDERING + RIGHT-CLICK SUPPORT
============================================================ */

function renderFoldersList() {
  if (!foldersList) return;

  foldersList.innerHTML = "";

  const folders = getFolderNames().sort();
  folders.forEach((name) => {
    const li = document.createElement("li");
    li.className = "folder-item";
    li.textContent = name;
    li.dataset.folder = name;

    li.addEventListener("click", () => setCurrentFolder(name));

    // RIGHT CLICK → folder context
    li.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      contextMenu.dataset.folder = name;
      contextMenu.dataset.target = "";

      contextMenu.innerHTML = `
        <div class="ctx-item" data-action="rename-folder">Rename</div>
        <div class="ctx-item" data-action="delete-folder">Delete</div>
      `;

      contextMenu.style.left = e.pageX + "px";
      contextMenu.style.top = e.pageY + "px";
      contextMenu.style.display = "block";
    });

    foldersList.appendChild(li);
  });

  updateFolderActiveUI();
}

function updateFolderActiveUI() {
  [...foldersList.children].forEach((li) => {
    li.classList.toggle("active", li.dataset.folder === currentFolder);
  });
}

/* ============================================================
   NOTES LIST + RIGHT-CLICK SUPPORT
============================================================ */

function renderNotesForCurrentFolder() {
  notesList.innerHTML = "";
  ensureFolder(currentFolder);
  const folderNotes = notes[currentFolder] || {};

  Object.keys(folderNotes)
    .sort()
    .forEach((filename) => {
      addNoteToList(filename);
    });

  updateEmptyText();
}

function addNoteToList(filename) {
  const li = document.createElement("li");
  li.classList.add("note-item");
  li.textContent = filename;

  // CLICK
  li.addEventListener("click", () => openNote(filename));

  // RIGHT CLICK
  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    contextMenu.dataset.target = filename;
    contextMenu.dataset.folder = "";

    contextMenu.innerHTML = `
      <div class="ctx-item" data-action="rename">Rename</div>
      <div class="ctx-item" data-action="delete">Delete</div>
    `;

    contextMenu.style.left = e.pageX + "px";
    contextMenu.style.top = e.pageY + "px";
    contextMenu.style.display = "block";
  });

  notesList.appendChild(li);
}

/* ============================================================
   OPEN NOTE
============================================================ */

function openNote(filename) {
  const folder = findFolderForNote(filename);
  if (!folder) return;

  currentFolder = folder;
  currentNote = filename;

  renderFoldersList();
  renderNotesForCurrentFolder();

  document.querySelectorAll(".note-item").forEach((n) => {
    n.classList.remove("active");
    if (n.textContent === filename) n.classList.add("active");
  });

  editor.value = notes[currentFolder][filename] || "";
  localStorage.setItem("lastOpenedNote", filename);

  updatePreview();
  buildKnowledgeGraph();
  highlightActiveNode(filename);
}

/* ============================================================
   EMPTY CLICK BEHAVIOR
============================================================ */

document.addEventListener("click", (e) => {
  if (
    e.target.closest(".note-item") ||
    e.target.closest(".folder-item") ||
    e.target.closest(".new-note-btn") ||
    e.target.closest("#editor") ||
    e.target.closest("#preview") ||
    e.target.closest(".center-panel")
  ) {
    return;
  }

  document.querySelectorAll(".note-item.active")
    .forEach((n) => n.classList.remove("active"));

  currentNote = null;
  editor.value = "";
  updatePreview();

  currentFolder = "__global";
  renderFoldersList();
  renderNotesForCurrentFolder();
  updateEmptyText();
});

/* ============================================================
   AUTO-SAVE ON TYPING
============================================================ */

editor.addEventListener("input", () => {
  if (currentNote && currentFolder) {
    notes[currentFolder][currentNote] = editor.value;
    saveNotes();
  }

  updatePreview();

  if (graphUpdateTimeout) clearTimeout(graphUpdateTimeout);
  graphUpdateTimeout = setTimeout(buildKnowledgeGraph, 400);
});

/* ============================================================
   NEW NOTE BUTTON
============================================================ */

const newNoteBtn = document.querySelector(".new-note-btn");

function generateUntitledName() {
  const base = "Untitled";
  let n = 1;

  const existing = new Set();
  Object.keys(notes).forEach((folder) => {
    const folderNotes = notes[folder] || {};
    Object.keys(folderNotes).forEach((name) => existing.add(name));
  });

  let name = `${base}.md`;
  while (existing.has(name)) {
    n++;
    name = `${base}${n}.md`;
  }
  return name;
}

newNoteBtn.addEventListener("click", () => {
  const filename = generateUntitledName();
  const content = "[[ ]]";

  ensureFolder(currentFolder);
  notes[currentFolder][filename] = content;

  saveNotes();
  renderNotesForCurrentFolder();
  openNote(filename);
});

/* ============================================================
   SET CURRENT FOLDER
============================================================ */

function setCurrentFolder(folder) {
  currentFolder = folder;
  currentNote = null;

  renderFoldersList();
  renderNotesForCurrentFolder();
  updateEmptyText();

  editor.value = "";
  updatePreview();
}

/* ============================================================
   NEW FOLDER BUTTON
============================================================ */

newFolderBtn.addEventListener("click", () => {
  const name = prompt("Folder name:");
  if (!name || !name.trim()) return;

  const clean = name.trim();

  if (clean === "__global") return alert("This name is reserved.");
  if (notes[clean]) return alert("Folder already exists.");

  notes[clean] = {};
  saveNotes();
  renderFoldersList();
});

/* ============================================================
   CONTEXT MENU ACTION HANDLER
============================================================ */

contextMenu.addEventListener("click", (e) => {
  const action = e.target.dataset.action;

  /* NOTE RENAME */
  if (action === "rename") {
    const filename = contextMenu.dataset.target;
    const folder = findFolderForNote(filename);

    const newName = prompt("Rename note:", filename);
    if (!newName || !newName.endsWith(".md")) return alert("Name must end with .md");
    if (noteExists(newName)) return alert("A file with this name already exists.");

    notes[folder][newName] = notes[folder][filename];
    delete notes[folder][filename];

    saveNotes();
    renderNotesForCurrentFolder();
    openNote(newName);
  }

  /* NOTE DELETE */
  if (action === "delete") {
    const filename = contextMenu.dataset.target;
    const folder = findFolderForNote(filename);

    if (!confirm(`Delete "${filename}"?`)) return;

    delete notes[folder][filename];
    saveNotes();

    renderNotesForCurrentFolder();

    if (currentNote === filename) {
      editor.value = "";
      currentNote = null;
      updatePreview();
    }
  }

  /* FOLDER RENAME */
  if (action === "rename-folder") {
    const folder = contextMenu.dataset.folder;

    if (!folder || folder === "__global") return alert("Cannot rename this folder.");

    const newName = prompt("Rename folder:", folder);
    if (!newName || !newName.trim()) return;

    const clean = newName.trim();
    if (notes[clean]) return alert("A folder with this name already exists.");

    notes[clean] = { ...notes[folder] };
    delete notes[folder];

    saveNotes();
    renderFoldersList();
    setCurrentFolder(clean);
  }

  /* FOLDER DELETE */
  if (action === "delete-folder") {
    const folder = contextMenu.dataset.folder;

    if (!folder || folder === "__global") return alert("Cannot delete this folder.");
    if (!confirm(`Delete folder "${folder}" and all notes inside?`)) return;

    delete notes[folder];
    saveNotes();

    currentFolder = "__global";
    renderFoldersList();
    renderNotesForCurrentFolder();
    updateEmptyText();
  }

  contextMenu.style.display = "none";
});

/* ============================================================
   STORAGE
============================================================ */

function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}

function updateEmptyText() {
  emptyText.style.display = notesList.children.length ? "none" : "block";
}

/* ============================================================
   MARKDOWN PREVIEW
============================================================ */

const previewPane = document.getElementById("preview");

function updatePreview() {
  if (!previewPane) return;

  let content = currentNote ? getNoteContentByName(currentNote) : "";

  if (!content.trim()) {
    previewPane.innerHTML =
      '<div class="preview-placeholder">Rendered preview will appear here.</div>';
    return;
  }

  if (window.marked) previewPane.innerHTML = marked.parse(content);
  else previewPane.textContent = content;
}

/* ============================================================
   KNOWLEDGE GRAPH CODE (UNCHANGED)
============================================================ */

let graphUpdateTimeout = null;

const graphContainer = document.getElementById("graphNetwork");
const graphTooltip = document.getElementById("graphTooltip");
const graphPlaceholder = document.querySelector(".graph-placeholder");

let network = null;
let nodesDS = null;
let edgesDS = null;

function extractLinks(content) {
  const targets = new Set();

  function resolveNoteName(name) {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (noteExists(trimmed)) return trimmed;
    if (!trimmed.endsWith(".md") && noteExists(trimmed + ".md")) {
      return trimmed + ".md";
    }
    return null;
  }

  const mdRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(content)) !== null) {
    const resolved = resolveNoteName(match[1]);
    if (resolved) targets.add(resolved);
  }

  const wikiRegex = /\[\[([^\]]+)\]\]/g;
  let m2;
  while ((m2 = wikiRegex.exec(content)) !== null) {
    const resolved = resolveNoteName(m2[1]);
    if (resolved) targets.add(resolved);
  }

  return Array.from(targets);
}

function buildKnowledgeGraph() {
  if (!graphContainer) return;

  const fileNames = getAllNoteNames();

  if (fileNames.length === 0) {
    if (graphPlaceholder) graphPlaceholder.style.display = "block";
    if (network) network.destroy();
    network = null;
    return;
  }

  if (graphPlaceholder) graphPlaceholder.style.display = "none";

  const nodes = [];
  const edges = [];
  const degreeCount = {};

  fileNames.forEach((name) => (degreeCount[name] = 0));

  fileNames.forEach((source) => {
    const content = getNoteContentByName(source) || "";
    const targets = extractLinks(content);

    targets.forEach((target) => {
      if (noteExists(target) && target !== source) {
        edges.push({ from: source, to: target });
        degreeCount[source]++;
        degreeCount[target]++;
      }
    });
  });

  fileNames.forEach((name) => {
    nodes.push({
      id: name,
      label: name.replace(".md", ""),
      value: 5 + degreeCount[name] * 2,
      font: { size: 12 },
    });
  });

  nodesDS = new vis.DataSet(nodes);
  edgesDS = new vis.DataSet(edges);

  const data = { nodes: nodesDS, edges: edgesDS };

  const options = {
    nodes: {
      shape: "dot",
      color: {
        background: "#2b2e3a",
        border: "#6a6df0",
        highlight: { background: "#6a6df0", border: "#fff" },
      },
    },
    edges: {
      color: { color: "#555a70", highlight: "#9ea5ff" },
      arrows: "to",
    },
    interaction: {
      hover: true,
      dragNodes: true,
      zoomView: true,
    },
    physics: {
      enabled: true,
      stabilization: { iterations: 120 },
    },
  };

  if (network) network.destroy();
  network = new vis.Network(graphContainer, data, options);

  network.on("click", (params) => {
    if (params.nodes.length > 0) openNote(params.nodes[0]);
  });

  network.on("selectNode", (params) => {
    const id = params.nodes[0];
    showGraphSnippet(id);
    highlightActiveNode(id);
  });
}

function showGraphSnippet(filename) {
  if (!graphTooltip) return;

  const content = getNoteContentByName(filename);
  const snippet = content.split("\n").slice(0, 6).join("\n").slice(0, 400);

  graphTooltip.innerHTML = `
    <strong>${filename.replace(".md", "")}</strong>
    <pre>${snippet.replace(/</g, "&lt;")}</pre>
  `;
}

function highlightActiveNode(filename) {
  if (!network || !nodesDS) return;

  const connected = network.getConnectedNodes(filename);

  nodesDS.update(
    nodesDS.get().map((node) => ({
      id: node.id,
      color: {
        background:
          node.id === filename
            ? "#6a6df0"
            : connected.includes(node.id)
            ? "#3b3f5a"
            : "#2b2e3a",
        border: node.id === filename ? "#fff" : "#6a6df0",
      },
    }))
  );
}

/* ============================================================
   SEARCH SYSTEM (UNCHANGED)
============================================================ */

const searchInput = document.getElementById("searchNotes");

function updateGraphSearchHighlight(term) {
  if (!nodesDS) return;

  const lc = term.toLowerCase();

  nodesDS.update(
    nodesDS.get().map((node) => ({
      id: node.id,
      borderWidth: node.label.toLowerCase().includes(lc) && lc ? 3 : 1,
    }))
  );
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();

    [...notesList.children].forEach((li) => {
      const match = li.textContent.toLowerCase().includes(q);
      li.style.display = match ? "" : "none";
      li.classList.toggle("search-hit", match && q);
    });

    [...foldersList.children].forEach((li) => {
      const match = li.textContent.toLowerCase().includes(q);
      li.style.display = match ? "" : "none";
    });

    updateGraphSearchHighlight(q);
  });
}

/* ============================================================
   EXPORT / IMPORT (UNCHANGED)
============================================================ */

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes-export.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function importIntoNotes(imported) {
  if (!imported || typeof imported !== "object") throw new Error("Invalid JSON");

  const hasFoldersShape =
    imported.__global ||
    Object.values(imported).some((v) => typeof v === "object");

  if (hasFoldersShape) {
    Object.keys(imported).forEach((folder) => {
      if (!notes[folder]) notes[folder] = {};
      const folderNotes = imported[folder];
      Object.keys(folderNotes).forEach((fn) => {
        if (!noteExists(fn)) notes[folder][fn] = folderNotes[fn];
      });
    });
  } else {
    ensureFolder("__global");
    Object.keys(imported).forEach((fn) => {
      if (!noteExists(fn)) notes.__global[fn] = imported[fn];
    });
  }
}

if (importBtn && importInput) {
  importBtn.addEventListener("click", () => importInput.click());

  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        importIntoNotes(imported);
        saveNotes();
        renderFoldersList();
        renderNotesForCurrentFolder();
        buildKnowledgeGraph();
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };

    reader.readAsText(file);
  });
}

/* ============================================================
   EDITOR / PREVIEW SPLITTER (UNCHANGED)
============================================================ */

const editorArea = document.querySelector(".editor-area");
const previewArea = document.querySelector(".preview-pane");
const dragEP = document.getElementById("drag-editor-preview");

let isDraggingEP = false;

dragEP.addEventListener("mousedown", () => {
  isDraggingEP = true;
});

document.addEventListener("mousemove", (e) => {
  if (!isDraggingEP) return;

  const totalWidth = centerPanel.clientWidth;
  let editorPercent =
    ((e.clientX - centerPanel.getBoundingClientRect().left) / totalWidth) * 100;

  editorPercent = Math.max(20, Math.min(80, editorPercent));

  editorArea.style.width = editorPercent + "%";
  previewArea.style.width = 100 - editorPercent + "%";
});

document.addEventListener("mouseup", () => {
  isDraggingEP = false;
});

/* ============================================================
   RESET SYSTEM (UNCHANGED)
============================================================ */

const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", () => {
  if (!confirm("Reset everything? This will delete all notes.")) return;

  localStorage.removeItem("notes");
  localStorage.removeItem("lastOpenedNote");

  notes = { "__global": {} };
  currentFolder = "__global";
  currentNote = null;

  notesList.innerHTML = "";
  editor.value = "";

  previewPane.innerHTML =
    '<div class="preview-placeholder">Rendered preview will appear here.</div>';

  renderFoldersList();
  renderNotesForCurrentFolder();
  updateEmptyText();

  if (network) network.destroy();
  if (graphPlaceholder) graphPlaceholder.style.display = "block";

  alert("All notes cleared.");
});

/* ============================================================
   ON LOAD
============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  initializeNotesStructure();
  ensureFolder("__global");

  renderFoldersList();
  renderNotesForCurrentFolder();
  updateEmptyText();
  updatePreview();
  buildKnowledgeGraph();

  const last = localStorage.getItem("lastOpenedNote");
  if (last && noteExists(last)) openNote(last);
});
