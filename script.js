/* ============================================================
   LEFT / RIGHT SIDEBAR RESIZE LOGIC
   ============================================================ */

// Get drag bars & panels
const leftBar = document.getElementById("drag-left");
const rightBar = document.getElementById("drag-right");

const leftPanel = document.querySelector(".sidebar-left");
const centerPanel = document.querySelector(".center-panel");
const rightPanel = document.querySelector(".sidebar-right");

let isDragging = false;
let currentDrag = null;

// Start left sidebar drag
leftBar.addEventListener("mousedown", () => {
  isDragging = true;
  currentDrag = "left";
});

// Start right sidebar drag
rightBar.addEventListener("mousedown", () => {
  isDragging = true;
  currentDrag = "right";
});

// Handle drag movement
document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  // Resize left sidebar
  if (currentDrag === "left") {
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 10 && newWidth < 40) {
      leftPanel.style.width = newWidth + "%";
      centerPanel.style.width = (60 - (newWidth - 20)) + "%";
    }
  }

  // Resize right sidebar
  if (currentDrag === "right") {
    const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    if (newWidth > 10 && newWidth < 40) {
      rightPanel.style.width = newWidth + "%";
      centerPanel.style.width = (60 - (newWidth - 20)) + "%";
    }
  }
});

// Stop dragging on mouse up
document.addEventListener("mouseup", () => {
  isDragging = false;
});


/* ============================================================
   UPLOAD MODAL: OPEN / CLOSE / DROPZONE / MANUAL FILE INPUT
   ============================================================ */

const uploadBtn = document.getElementById("uploadBtn");
const uploadModal = document.getElementById("uploadModal");
const closeModal = document.getElementById("closeModal");
const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const driveBtn = document.getElementById("driveBtn");

// Open upload modal
uploadBtn.addEventListener("click", () => {
  uploadModal.style.display = "flex";
});

// Close upload modal
closeModal.addEventListener("click", () => {
  uploadModal.style.display = "none";
});

// Click drop area → open file explorer
dropArea.addEventListener("click", () => fileInput.click());

// Change border on drag
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.style.borderColor = "#6a6df0";
});

// Restore border
dropArea.addEventListener("dragleave", () => {
  dropArea.style.borderColor = "#3a3b44";
});

// File dropped → handle file
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.style.borderColor = "#3a3b44";

  const file = e.dataTransfer.files[0];
  handleFile(file);
});

// Manual file selection
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  handleFile(file);
});


/* ============================================================
   NOTES + FOLDERS DATA MODEL
   - notes is now: { "__global": {file: content}, "FolderName": {file: content} }
   ============================================================ */

const notesList = document.getElementById("notesList");
const editor = document.getElementById("editor");
const foldersList = document.getElementById("foldersList");
const newFolderBtn = document.getElementById("newFolderBtn");
const emptyText = document.querySelector(".empty-text");

let notes = JSON.parse(localStorage.getItem("notes")) || {};
let currentFolder = "__global"; // "__global" = global notes
let currentNote = null;

// Ensure notes has the new nested structure
function initializeNotesStructure() {
  // If already nested with __global, keep as is
  if (notes.__global && typeof notes.__global === "object") {
    return;
  }

  // Detect old flat format: { "file.md": "content", ... }
  const values = Object.values(notes);
  const isFlat =
    values.length === 0 ||
    values.every((v) => typeof v === "string");

  if (isFlat) {
    notes = { "__global": { ...notes } };
  } else {
    // Mixed / unknown → make sure __global exists
    if (!notes.__global) {
      notes.__global = {};
    }
  }
}

function ensureFolder(folderName) {
  const name = folderName || "__global";
  if (!notes[name]) {
    notes[name] = {};
  }
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
   MAIN FILE HANDLER (UPLOADS .md & LOADS INTO APP)
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
   RIGHT CLICK CONTEXT MENU (RENAME / DELETE)
   ============================================================ */

// Create custom context menu
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

contextMenu.innerHTML = `
  <div class="ctx-item" data-action="rename">Rename</div>
  <div class="ctx-item" data-action="delete">Delete</div>
`;

document.body.appendChild(contextMenu);

// Styles for context menu items
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

// Hide menu on click anywhere
document.addEventListener("click", () => {
  contextMenu.style.display = "none";
});


/* ============================================================
   RENDER FOLDERS + NOTES LIST
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

    li.addEventListener("click", () => {
      setCurrentFolder(name);
    });

    foldersList.appendChild(li);
  });

  updateFolderActiveUI();
}

function updateFolderActiveUI() {
  if (!foldersList) return;
  [...foldersList.children].forEach((li) => {
    li.classList.toggle("active", li.dataset.folder === currentFolder);
  });
}

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

  // Click to open note
  li.addEventListener("click", () => openNote(filename));

  // Right click → context menu
  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    contextMenu.dataset.target = filename;
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
  if (!folder) {
    console.warn("Note not found:", filename);
    return;
  }

  currentFolder = folder;
  currentNote = filename;

  // Update folder UI + notes list
  renderFoldersList();
  renderNotesForCurrentFolder();

  // Highlight active note
  document.querySelectorAll(".note-item").forEach((n) => {
    n.classList.remove("active");
    if (n.textContent === filename) n.classList.add("active");
  });

  editor.value = notes[currentFolder][filename] || "";

  // Persist last opened
  localStorage.setItem("lastOpenedNote", filename);

  // Update preview + graph
  updatePreview();
  buildKnowledgeGraph();
  highlightActiveNode(filename);
}


// Click empty area → deselect and clear editor
document.addEventListener("click", (e) => {
  // Do NOT reset if clicked on:
  // - a note
  // - a folder
  // - the editor
  // - the preview pane
  // - anywhere in the center panel
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

  // Clear active note highlight
  document.querySelectorAll(".note-item.active")
    .forEach((n) => n.classList.remove("active"));

  currentNote = null;
  editor.value = "";
  updatePreview();

  // Switch to GLOBAL notes
  currentFolder = "__global";
  renderFoldersList();
  renderNotesForCurrentFolder();
  updateEmptyText();
});




// Save on typing
editor.addEventListener("input", () => {
  if (currentNote && currentFolder && notes[currentFolder]) {
    notes[currentFolder][currentNote] = editor.value;
    saveNotes();
  }

  updatePreview();

  if (graphUpdateTimeout) clearTimeout(graphUpdateTimeout);
  graphUpdateTimeout = setTimeout(buildKnowledgeGraph, 400);
});


/* ============================================================
   NEW NOTE BUTTON (CREATES UNTITLED.md)
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

// Create new note
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
   NEW FOLDER BUTTON
   ============================================================ */

function setCurrentFolder(folder) {
  currentFolder = folder;
  currentNote = null;

  // update UI
  renderFoldersList();
  renderNotesForCurrentFolder();
  updateEmptyText();

  // clear editor + preview
  editor.value = "";
  updatePreview();
}


newFolderBtn.addEventListener("click", () => {
  const name = prompt("Folder name:");
  if (!name || !name.trim()) return;
  const clean = name.trim();

  if (clean === "__global") {
    alert("This name is reserved.");
    return;
  }

  if (notes[clean]) {
    alert("A folder with that name already exists.");
    return;
  }

  notes[clean] = {};
  saveNotes();
  renderFoldersList();
});


/* ============================================================
   CONTEXT MENU ACTIONS: RENAME / DELETE NOTE
   ============================================================ */

contextMenu.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  const filename = contextMenu.dataset.target;
  if (!filename) return;

  const folder = findFolderForNote(filename);
  if (!folder) return;

  // ---------- RENAME ----------
  if (action === "rename") {
    const newName = prompt("Rename note:", filename);
    if (!newName || newName.trim() === "" || !newName.endsWith(".md")) {
      alert("Filename must end with .md");
      return;
    }
    const clean = newName.trim();
    if (noteExists(clean)) {
      alert("A file with that name already exists.");
      return;
    }

    notes[folder][clean] = notes[folder][filename];
    delete notes[folder][filename];
    saveNotes();

    // Update list UI
    [...notesList.children].forEach((li) => {
      if (li.textContent === filename) {
        li.textContent = clean;
      }
    });

    openNote(clean);
  }

  // ---------- DELETE ----------
  if (action === "delete") {
    if (!confirm(`Delete "${filename}" ?`)) return;

    delete notes[folder][filename];
    saveNotes();

    renderNotesForCurrentFolder();

    if (currentNote === filename) {
      editor.value = "";
      currentNote = null;
      updatePreview();
    }
  }

  contextMenu.style.display = "none";
});


/* ============================================================
   LOCAL STORAGE SAVE HELPERS
   ============================================================ */

function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}


/* ============================================================
   EMPTY LIST PLACEHOLDER HANDLING
   ============================================================ */

function updateEmptyText() {
  if (!emptyText) return;
  if (notesList.children.length > 0) {
    emptyText.style.display = "none";
  } else {
    emptyText.style.display = "block";
  }
}


/* ============================================================
   MARKDOWN PREVIEW (Live rendered preview using marked.js)
   ============================================================ */

const previewPane = document.getElementById("preview");

function updatePreview() {
  if (!previewPane) return;

  let content = "";
  if (currentNote) {
    content = getNoteContentByName(currentNote) || "";
  }

  if (!content.trim()) {
    previewPane.innerHTML =
      '<div class="preview-placeholder">Rendered preview will appear here.</div>';
    return;
  }

  if (window.marked) {
    previewPane.innerHTML = marked.parse(content);
  } else {
    previewPane.textContent = content;
  }
}


/* ============================================================
   KNOWLEDGE GRAPH CREATION (VIS.JS)
   ============================================================ */

let graphUpdateTimeout = null;

const graphContainer = document.getElementById("graphNetwork");
const graphTooltip = document.getElementById("graphTooltip");
const graphPlaceholder = document.querySelector(".graph-placeholder");

let network = null;
let nodesDS = null;
let edgesDS = null;

// Extract links from markdown text
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

  // Markdown links [text](file.md)
  const mdRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(content)) !== null) {
    const targetRaw = match[1];
    const resolved = resolveNoteName(targetRaw);
    if (resolved) targets.add(resolved);
  }

  // Wiki links [[file]]
  const wikiRegex = /\[\[([^\]]+)\]\]/g;
  let m2;
  while ((m2 = wikiRegex.exec(content)) !== null) {
    const targetRaw = m2[1];
    const resolved = resolveNoteName(targetRaw);
    if (resolved) targets.add(resolved);
  }

  return Array.from(targets);
}

function buildKnowledgeGraph() {
  if (!graphContainer) return;

  const fileNames = getAllNoteNames();

  if (fileNames.length === 0) {
    if (graphPlaceholder) graphPlaceholder.style.display = "block";
    if (network) {
      network.destroy();
      network = null;
    }
    return;
  } else {
    if (graphPlaceholder) graphPlaceholder.style.display = "none";
  }

  const nodes = [];
  const edges = [];
  const degreeCount = {};

  fileNames.forEach((name) => {
    degreeCount[name] = 0;
  });

  // Build edges
  fileNames.forEach((source) => {
    const content = getNoteContentByName(source) || "";
    const targets = extractLinks(content);

    targets.forEach((target) => {
      if (!noteExists(target) || target === source) return;

      edges.push({ from: source, to: target });
      degreeCount[source]++;
      degreeCount[target]++;
    });
  });

  // Build nodes
  fileNames.forEach((name) => {
    const baseLabel = name.replace(".md", "");
    const deg = degreeCount[name];

    nodes.push({
      id: name,
      label: baseLabel,
      value: 5 + deg * 2,
      font: { size: 12 },
    });
  });

  nodesDS = new vis.DataSet(nodes);
  edgesDS = new vis.DataSet(edges);

  const data = { nodes: nodesDS, edges: edgesDS };

  const options = {
    nodes: {
      shape: "dot",
      scaling: { min: 5, max: 30 },
      color: {
        background: "#2b2e3a",
        border: "#6a6df0",
        highlight: {
          background: "#6a6df0",
          border: "#ffffff",
        },
      },
      font: { color: "#e4e4e4", size: 12 },
    },
    edges: {
      color: { color: "#555a70", highlight: "#9ea5ff" },
      arrows: "to",
      smooth: true,
    },
    interaction: {
      hover: true,
      multiselect: false,
      dragNodes: true,
      zoomView: true,
      dragView: true,
    },
    physics: {
      enabled: true,
      stabilization: { iterations: 150 },
    },
  };

  if (network) network.destroy();
  network = new vis.Network(graphContainer, data, options);

  // Click node → open note
  network.on("click", (params) => {
    if (params.nodes.length > 0) {
      const id = params.nodes[0];
      openNote(id);
    }
  });

  // Hover node → show snippet
  network.on("selectNode", (params) => {
    const id = params.nodes[0];
    showGraphSnippet(id);
    highlightActiveNode(id);
  });

  network.on("deselectNode", () => {
    if (graphTooltip) graphTooltip.innerHTML = "";
  });

  if (currentNote) highlightActiveNode(currentNote);
}

function showGraphSnippet(filename) {
  if (!graphTooltip) return;
  const content = getNoteContentByName(filename) || "";
  const snippet = content.split("\n").slice(0, 6).join("\n").slice(0, 500);
  const displayName = filename.replace(".md", "");

  graphTooltip.innerHTML = `
    <strong>${displayName}</strong>
    <pre>${snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  `;
}

function highlightActiveNode(filename) {
  if (!network || !nodesDS) return;

  const allNodes = nodesDS.get();
  const connected = network.getConnectedNodes(filename);
  const updates = [];

  allNodes.forEach((node) => {
    let color = "#2b2e3a";
    let border = "#6a6df0";

    if (node.id === filename) {
      color = "#6a6df0";
      border = "#ffffff";
    } else if (connected.includes(node.id)) {
      color = "#3b3f5a";
      border = "#9ea5ff";
    }

    updates.push({
      id: node.id,
      color: { background: color, border: border },
    });
  });

  nodesDS.update(updates);
}


/* ============================================================
   SEARCH BAR → FILTER NOTES + HIGHLIGHT GRAPH
   ============================================================ */

const searchInput = document.getElementById("searchNotes");

function updateGraphSearchHighlight(term) {
  if (!nodesDS) return;
  const lc = term.toLowerCase();
  const allNodes = nodesDS.get();
  const updates = [];

  allNodes.forEach((node) => {
    const match = node.label.toLowerCase().includes(lc);
    updates.push({ id: node.id, borderWidth: match && lc ? 3 : 1 });
  });

  nodesDS.update(updates);
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();

  // --- Search NOTES ---
    [...notesList.children].forEach((li) => {
        const text = li.textContent.toLowerCase();
        const match = text.includes(q);
        li.style.display = match ? "" : "none";
        
        if (match && q) {
            li.classList.add("search-hit");
        } else {
            li.classList.remove("search-hit");
        }
  });

  // --- Search FOLDERS ---
    [...foldersList.children].forEach((li) => {
        const text = li.textContent.toLowerCase();
        const match = text.includes(q);
        li.style.display = match ? "" : "none";
  });

  // --- Highlight in graph ---
    updateGraphSearchHighlight(q);
});

}


// Save last opened note on click
notesList.addEventListener("click", (e) => {
  if (e.target.classList.contains("note-item")) {
    const name = e.target.textContent.trim();
    localStorage.setItem("lastOpenedNote", name);
  }
});


/* ============================================================
   KEYBOARD SHORTCUTS (BOLD, ITALIC, HEADING, NEW NOTE, SAVE)
   ============================================================ */

function wrapSelection(before, after) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  const selected = value.slice(start, end);
  const newText = before + selected + after;

  editor.value = value.slice(0, start) + newText + value.slice(end);
  editor.focus();
  editor.selectionStart = start + before.length;
  editor.selectionEnd = start + before.length + selected.length;

  if (currentNote && currentFolder && notes[currentFolder]) {
    notes[currentFolder][currentNote] = editor.value;
    saveNotes();
    updatePreview();
    if (graphUpdateTimeout) clearTimeout(graphUpdateTimeout);
    graphUpdateTimeout = setTimeout(buildKnowledgeGraph, 400);
  }
}

// Convert current line into a heading
function formatHeading() {
  const start = editor.selectionStart;
  const value = editor.value;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", start);
  const endPos = lineEnd === -1 ? value.length : lineEnd;

  const line = value.slice(lineStart, endPos);
  const newLine = line.startsWith("#") ? line : "# " + line;

  editor.value = value.slice(0, lineStart) + newLine + value.slice(endPos);
  editor.selectionStart = editor.selectionEnd = start + 2;

  if (currentNote && currentFolder && notes[currentFolder]) {
    notes[currentFolder][currentNote] = editor.value;
    saveNotes();
    updatePreview();
  }
}

// Shortcut listener
document.addEventListener("keydown", (e) => {
  const target = e.target;
  const isEditor = target === editor;

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    const key = e.key.toLowerCase();

    if (key === "n") {
      e.preventDefault();
      newNoteBtn.click();
    }

    if (key === "s") {
      e.preventDefault();
      saveNotes();
    }

    if (key === "f") {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }

    if (isEditor) {
      if (key === "b") {
        e.preventDefault();
        wrapSelection("**", "**");
      }
      if (key === "i") {
        e.preventDefault();
        wrapSelection("_", "_");
      }
      if (key === "h") {
        e.preventDefault();
        formatHeading();
      }
    }
  }
});


/* ============================================================
   EXPORT / IMPORT NOTES (JSON)
   ============================================================ */

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");

// Export → JSON file (entire structure: folders + global)
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function importIntoNotes(imported) {
  if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
    throw new Error("Invalid format");
  }

  const hasFoldersShape =
    imported.__global ||
    Object.values(imported).some(
      (v) => typeof v === "object" && !Array.isArray(v)
    );

  if (hasFoldersShape) {
    // Treat as { folderName: { filename: content } }
    Object.keys(imported).forEach((folder) => {
      if (folder === "") return;
      if (!notes[folder]) notes[folder] = {};
      const folderNotes = imported[folder] || {};
      if (typeof folderNotes !== "object" || Array.isArray(folderNotes)) return;

      Object.keys(folderNotes).forEach((filename) => {
        if (!noteExists(filename)) {
          notes[folder][filename] = folderNotes[filename];
        }
      });
    });
  } else {
    // Old flat format → import into global
    ensureFolder("__global");
    Object.keys(imported).forEach((filename) => {
      if (!noteExists(filename)) {
        notes["__global"][filename] = imported[filename];
      }
    });
  }
}

// Import JSON → merge into notes
if (importBtn && importInput) {
  importBtn.addEventListener("click", () => {
    importInput.click();
  });

  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        importIntoNotes(imported);

        saveNotes();
        renderFoldersList();
        renderNotesForCurrentFolder();
        buildKnowledgeGraph();
      } catch (err) {
        alert("Failed to import notes: " + err.message);
      }
    };

    reader.readAsText(file);
  });
}


/* ============================================================
   RESIZE EDITOR ↔ PREVIEW (Middle drag bar)
   ============================================================ */

const editorArea = document.querySelector(".editor-area");
const previewArea = document.querySelector(".preview-pane");
const dragEP = document.getElementById("drag-editor-preview");

let isDraggingEP = false;

// Start drag
dragEP.addEventListener("mousedown", () => {
  isDraggingEP = true;
});

// Drag movement
document.addEventListener("mousemove", (e) => {
  if (!isDraggingEP) return;

  const totalWidth = centerPanel.clientWidth;
  const leftWidth = e.clientX - centerPanel.getBoundingClientRect().left;

  let editorPercent = (leftWidth / totalWidth) * 100;

  if (editorPercent < 20) editorPercent = 20;
  if (editorPercent > 80) editorPercent = 80;

  editorArea.style.width = editorPercent + "%";
  previewArea.style.width = 100 - editorPercent + "%";
});

// Stop drag
document.addEventListener("mouseup", () => {
  isDraggingEP = false;
});


/* ============================================================
   MODAL CLICK BEHAVIOR (click outside → close)
   ============================================================ */

uploadModal.addEventListener("click", (e) => {
  if (e.target === uploadModal) uploadModal.style.display = "none";
});

document
  .querySelector(".modal-content")
  .addEventListener("click", (e) => e.stopPropagation());


/* ============================================================
   GOOGLE DRIVE PICKER INTEGRATION
   ============================================================ */

const CLIENT_ID =
  "364956694336-71kq54bm418a6fs159aq0uog4dpp5472.apps.googleusercontent.com";
const API_KEY = "AIzaSyCiKRt-ziIxur-wXSlxxHypMGa3SsVEs0w";

const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Load Google API
window.gapiLoaded = function () {
  gapi.load("client:picker", initializeGapiClient);
};

// Initialize GAPI client
async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [
      "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
    ],
  });
  gapiInited = true;
}

// Load Google Identity Services
window.gisLoaded = function () {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "",
  });
  gisInited = true;
};

// Open Google Drive picker window
async function openDrivePicker() {
  if (!gapiInited || !gisInited) {
    alert("Google Drive not initialized yet. Try again in a moment.");
    return;
  }

  tokenClient.callback = async (resp) => {
    if (resp.error) {
      console.error(resp);
      return;
    }

    gapi.client.setToken(resp);
    createPicker(resp.access_token);
  };

  tokenClient.requestAccessToken({ prompt: "consent" });
}

// Build Google Picker
function createPicker(accessToken) {
  const view = new google.picker.DocsView()
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false)
    .setMimeTypes(
      "text/markdown,text/plain,application/octet-stream"
    );

  const picker = new google.picker.PickerBuilder()
    .setDeveloperKey(API_KEY)
    .setAppId(CLIENT_ID)
    .setOAuthToken(accessToken)
    .addView(view)
    .setCallback(pickerCallback)
    .build();

  picker.setVisible(true);
}

// Callback when file is selected from Drive
async function pickerCallback(data) {
  if (data.action !== google.picker.Action.PICKED) return;

  const file = data.docs[0];
  const fileId = file.id;
  const fileName = file.name;

  try {
    const res = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: "media",
    });

    const content = res.body;

    ensureFolder(currentFolder);
    notes[currentFolder][fileName] = content;
    saveNotes();
    renderNotesForCurrentFolder();
    openNote(fileName);

    uploadModal.style.display = "none";
  } catch (err) {
    console.error("Error downloading file", err);
    alert("Error downloading file content. Check console.");
  }
}

// Hook Drive button
driveBtn.addEventListener("click", () => {
  openDrivePicker();
});


/* ============================================================
   RESET BUTTON (CLEARS ALL NOTES COMPLETELY)
   ============================================================ */

const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", () => {
  const confirmed = confirm(
    "Are you sure you want to reset everything? This will delete all notes permanently."
  );

  if (!confirmed) return;

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

  if (network) {
    network.destroy();
    network = null;
  }
  if (graphPlaceholder) graphPlaceholder.style.display = "block";

  alert("All notes have been cleared.");
});


/* ============================================================
   APP INITIALIZATION
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  initializeNotesStructure();

  // Ensure __global exists
  ensureFolder("__global");

  renderFoldersList();
  renderNotesForCurrentFolder();
  updateEmptyText();
  updatePreview();
  buildKnowledgeGraph();

  const last = localStorage.getItem("lastOpenedNote");
  if (last && noteExists(last)) {
    openNote(last);
  }
});
