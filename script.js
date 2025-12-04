
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
    let newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 10 && newWidth < 40) {
      leftPanel.style.width = newWidth + "%";
      centerPanel.style.width = (60 - (newWidth - 20)) + "%";
    }
  }

  if (currentDrag === "right") {
    let newWidth =
      ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    if (newWidth > 10 && newWidth < 40) {
      rightPanel.style.width = newWidth + "%";
      centerPanel.style.width = (60 - (newWidth - 20)) + "%";
    }
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});


// ----------------------
// Upload Modal Logic
// ----------------------
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

// Handle manual file input
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  handleFile(file);
});


function handleFile(file) {
  if (!file || !file.name.endsWith(".md")) {
    alert("Please upload a markdown (.md) file");
    return;
  }

  alert("Markdown file uploaded: " + file.name);
  uploadModal.style.display = "none";

}


driveBtn.addEventListener("click", () => {
  openDrivePicker();
});

// ---------------------------
// FILE → LIST → EDITOR LOGIC
// ---------------------------
const notesList = document.getElementById("notesList");
const editor = document.getElementById("editor");

// ---------------------------
// LOCAL STORAGE INIT
// ---------------------------

// Load existing notes from localStorage
let notes = JSON.parse(localStorage.getItem("notes")) || {};
let currentNote = null;


window.addEventListener("DOMContentLoaded", () => {
 

  notesList.innerHTML = "";   // clear duplicates
  Object.keys(notes).forEach(addNoteToList);

});



function handleFile(file) {
  if (!file || !file.name.endsWith(".md")) {
    alert("Please upload a markdown (.md) file");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const content = e.target.result;

    
    notes[file.name] = content;

    saveNotes();      //local storage

    hideEmptyTextAfterUpload();

    
    addNoteToList(file.name);

    openNote(file.name);

    uploadModal.style.display = "none";
  };

  reader.readAsText(file);
}


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


function addNoteToList(filename) {
  const li = document.createElement("li");
  li.classList.add("note-item");
  li.textContent = filename;

  li.addEventListener("click", () => openNote(filename));

  // RIGHT CLICK MENU
  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    // Store which note was right-clicked
    contextMenu.dataset.target = filename;

    contextMenu.style.left = e.pageX + "px";
    contextMenu.style.top = e.pageY + "px";
    contextMenu.style.display = "block";
  });

  notesList.appendChild(li);
}


function openNote(filename) {
  currentNote = filename;


  document.querySelectorAll(".note-item").forEach(n => {
    n.classList.remove("active");
    if (n.textContent === filename) n.classList.add("active");
  });

 
  editor.value = notes[filename];
}


document.addEventListener("click", (e) => {
  if (!e.target.closest(".note-item") && !e.target.closest("#editor")) {
    document.querySelectorAll(".note-item.active")
      .forEach(n => n.classList.remove("active"));
    currentNote = null;
    editor.value = "";
  }
});


editor.addEventListener("input", () => {
  if (currentNote) {
    notes[currentNote] = editor.value;
    saveNotes();
  }
});


// ---------------------------
// NEW NOTE BUTTON
// ---------------------------
const newNoteBtn = document.querySelector(".new-note-btn");

// Generate unique untitled names
function generateUntitledName() {
  const base = "Untitled";
  let n = 1;


  const existing = new Set(Object.keys(notes));

  if(notesList){
    [...notesList.children].forEach(li => existing.add(li.textContent.trim()));
  }

  let name = `${base}.md`;
  while (existing.has(name)) {
    n++;
    name = `${base}${n}.md`;
  }
  return name;
}


newNoteBtn.addEventListener("click", () => {
  const filename = generateUntitledName();
  const content = "[[ ]]"; // empty file

  notes[filename] = content;
  addNoteToList(filename);
  openNote(filename);

  saveNotes();

  updateEmptyText();

});


contextMenu.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  const filename = contextMenu.dataset.target;

  if (!filename) return;

  // RENAME
  if (action === "rename") {
    const newName = prompt("Rename note:", filename);
    if (!newName || newName.trim() === "" || !newName.endsWith(".md")) {
      alert("Filename must end with .md");
      return;
    }
    if (notes[newName]) {
      alert("A file with that name already exists.");
      return;
    }

    // move content
    notes[newName] = notes[filename];
    delete notes[filename];

    saveNotes();


    // update UI
    [...notesList.children].forEach(li => {
      if (li.textContent === filename) {
        li.textContent = newName;
      }
    });

    // reopen note
    openNote(newName);
  }

  // DELETE
  if (action === "delete") {
    if (!confirm(`Delete "${filename}" ?`)) return;

    delete notes[filename];

    saveNotes();


    // remove from UI
    [...notesList.children].forEach(li => {
      if (li.textContent === filename) li.remove();
    });

    hideTextAfterDelete();

    // close editor if currently open
    if (currentNote === filename) {
      editor.value = "";
      currentNote = null;
    }
  }

  contextMenu.style.display = "none";
});


// ---------------------------
// Save notes to localStorage
// ----------------------------
function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}


/* ============================================================
   HIDE / SHOW "No notes yet" TEXT
   ============================================================ */

const emptyText = document.querySelector(".empty-text");

// Function to update the visibility
function updateEmptyText() {
  if (notesList.children.length > 0) {
    emptyText.style.display = "none";
  } else {
    emptyText.style.display = "block";
  }
}

/* --- CALL ON PAGE LOAD --- */
window.addEventListener("DOMContentLoaded", updateEmptyText);



/* --- CALL WHEN FILE IS UPLOADED --- */
function hideEmptyTextAfterUpload() {
  updateEmptyText();
}

/* --- CALL WHEN NOTE IS DELETED --- */
function hideTextAfterDelete() {
  updateEmptyText();
}

/* ============================================================
   ADDED FEATURES: PREVIEW, GRAPH, SEARCH, SHORTCUTS, EXPORT
   ============================================================ */

// ---------- Markdown Preview (A) ----------
const previewPane = document.getElementById("preview");

function updatePreview() {
  if (!previewPane) return;
  const content = currentNote ? (notes[currentNote] || "") : "";
  if (!content.trim()) {
    previewPane.innerHTML = '<div class="preview-placeholder">Rendered preview will appear here.</div>';
    return;
  }
  if (window.marked) {
    previewPane.innerHTML = marked.parse(content);
  } else {
    previewPane.textContent = content;
  }
}


let graphUpdateTimeout = null;
editor.addEventListener("input", () => {
  updatePreview();

  if (graphUpdateTimeout) clearTimeout(graphUpdateTimeout);
  graphUpdateTimeout = setTimeout(buildKnowledgeGraph, 400);
});

// ---------- Knowledge Graph (B, C, Option 2) ----------
const graphContainer = document.getElementById("graphNetwork");
const graphTooltip = document.getElementById("graphTooltip");
const graphPlaceholder = document.querySelector(".graph-placeholder");

let network = null;
let nodesDS = null;
let edgesDS = null;

// Extract links from a single note content

function extractLinks(content) {
  const targets = new Set();

  // 1. Standard Markdown links: [text](Note.md)
  const mdRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(content)) !== null) {
    let target = match[1].trim();
    if (!target) continue;

    let clean = target; 
    if (!clean.endsWith(".md")) {
       // If standard link doesn't have .md, add it
       if (notes[clean + ".md"]) clean = clean + ".md";
    }

    if (notes[clean]) targets.add(clean);
  }

  // 2. Wiki links: [[Note]]
  const wikiRegex = /\[\[([^\]]+)\]\]/g;
  let m2;
  while ((m2 = wikiRegex.exec(content)) !== null) {
    let targetName = m2[1].trim();
    if (!targetName) continue;
    
    // Check exact match (e.g. "Untitled2.md")
    if (notes[targetName]) {
      targets.add(targetName);
    } 
    // Check if user typed "Untitled2" but file is "Untitled2.md"
    else if (notes[targetName + ".md"]) {
      targets.add(targetName + ".md");
    }
  }

  return Array.from(targets);
}

function buildKnowledgeGraph() {
  if (!graphContainer) return;

  const fileNames = Object.keys(notes);
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

  
  fileNames.forEach(name => {
    degreeCount[name] = 0;
  });

  
  fileNames.forEach(source => {
    const content = notes[source] || "";
    const targets = extractLinks(content);
    targets.forEach(target => {
      if (!notes[target] || target === source) return;

      edges.push({ from: source, to: target });

      degreeCount[source] = (degreeCount[source] || 0) + 1;
      degreeCount[target] = (degreeCount[target] || 0) + 1;
    });
  });

  // create nodes with size based on degree
  fileNames.forEach(name => {
    const baseLabel = name.endsWith(".md") ? name.slice(0, -3) : name;
    const deg = degreeCount[name] || 0;

    nodes.push({
      id: name,
      label: baseLabel,
      value: 5 + deg * 2, // node size
      font: { size: 12 }
    });
  });

  nodesDS = new vis.DataSet(nodes);
  edgesDS = new vis.DataSet(edges);

  const data = {
    nodes: nodesDS,
    edges: edgesDS
  };

  const options = {
    nodes: {
      shape: "dot",
      scaling: {
        min: 5,
        max: 30
      },
      color: {
        background: "#2b2e3a",
        border: "#6a6df0",
        highlight: {
          background: "#6a6df0",
          border: "#ffffff"
        }
      },
      font: {
        color: "#e4e4e4",
        size: 12
      }
    },
    edges: {
      color: {
        color: "#555a70",
        highlight: "#9ea5ff"
      },
      arrows: "to",
      smooth: true
    },
    interaction: {
      hover: true,
      multiselect: false,
      dragNodes: true,
      zoomView: true,
      dragView: true
    },
    physics: {
      enabled: true,
      stabilization: {
        iterations: 150
      }
    }
  };

  if (network) {
    network.destroy();
  }

  network = new vis.Network(graphContainer, data, options);

 
  network.on("click", (params) => {
    if (params.nodes && params.nodes.length > 0) {
      const id = params.nodes[0];
      openNote(id);
    }
  });

  
  network.on("selectNode", (params) => {
    const id = params.nodes[0];
    showGraphSnippet(id);
    highlightActiveNode(id);
  });

 
  network.on("deselectNode", () => {
    graphTooltip.innerHTML = "";
  });

  
  if (currentNote) {
    highlightActiveNode(currentNote);
  }
}

function showGraphSnippet(filename) {
  if (!graphTooltip) return;
  const content = notes[filename] || "";
  const snippet = content.split("\n").slice(0, 6).join("\n").slice(0, 500);
  const displayName = filename.endsWith(".md") ? filename.slice(0, -3) : filename;

  graphTooltip.innerHTML = `
    <strong>${displayName}</strong>
    <pre>${snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  `;
}

function highlightActiveNode(filename) {
  if (!network || !nodesDS) return;

  const allNodes = nodesDS.get();
  const updates = [];

  
  const connected = network.getConnectedNodes(filename);

  allNodes.forEach(node => {
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
      color: {
        background: color,
        border: border
      }
    });
  });

  nodesDS.update(updates);
}


window.addEventListener("DOMContentLoaded", () => {
  buildKnowledgeGraph();
});

// ---------- Wrap openNote to hook preview, graph, last-opened (I) ----------
const _originalOpenNote = openNote;
openNote = function (filename) {
  _originalOpenNote(filename);

 
  localStorage.setItem("lastOpenedNote", filename);

  
  updatePreview();
  buildKnowledgeGraph();
  highlightActiveNode(filename);
};


window.addEventListener("DOMContentLoaded", () => {
  const last = localStorage.getItem("lastOpenedNote");
  if (last && notes[last]) {
    openNote(last);
  }
});

// ---------- Search bar (D) ----------
const searchInput = document.getElementById("searchNotes");

function updateGraphSearchHighlight(term) {
  if (!nodesDS) return;
  const lc = term.toLowerCase();
  const allNodes = nodesDS.get();
  const updates = [];

  allNodes.forEach(node => {
    const match = node.label.toLowerCase().includes(lc);
    updates.push({
      id: node.id,
      borderWidth: match && lc ? 3 : 1
    });
  });

  nodesDS.update(updates);
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();

    // Filter note list
    [...notesList.children].forEach(li => {
      const text = li.textContent.toLowerCase();
      const match = text.includes(q);
      li.style.display = match ? "" : "none";

      if (match && q) {
        li.classList.add("search-hit");
      } else {
        li.classList.remove("search-hit");
      }
    });

   
    updateGraphSearchHighlight(q);
  });
}


notesList.addEventListener("click", (e) => {
  if (e.target.classList.contains("note-item")) {
    const name = e.target.textContent.trim();
    localStorage.setItem("lastOpenedNote", name);
  }
});

// ---------- Keyboard shortcuts (E) ----------
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

  if (currentNote) {
    notes[currentNote] = editor.value;
    saveNotes();
    updatePreview();
    if (graphUpdateTimeout) clearTimeout(graphUpdateTimeout);
    graphUpdateTimeout = setTimeout(buildKnowledgeGraph, 400);
  }
}

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

  if (currentNote) {
    notes[currentNote] = editor.value;
    saveNotes();
    updatePreview();
  }
}

document.addEventListener("keydown", (e) => {
  
  const target = e.target;
  const isEditor = target === editor;
  const isSearch = target === searchInput;

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    const key = e.key.toLowerCase();

    // Ctrl+N → new note
    if (key === "n") {
      e.preventDefault();
      newNoteBtn.click();
    }

    // Ctrl+S → save
    if (key === "s") {
      e.preventDefault();
      saveNotes();
      console.log("Notes saved.");
    }

    // Ctrl+F → focus search
    if (key === "f") {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }

    // Formatting only in editor
    if (isEditor) {
      // Ctrl+B → bold
      if (key === "b") {
        e.preventDefault();
        wrapSelection("**", "**");
      }
      // Ctrl+I → italic
      if (key === "i") {
        e.preventDefault();
        wrapSelection("_", "_");
      }
      // Ctrl+H → heading
      if (key === "h") {
        e.preventDefault();
        formatHeading();
      }
    }
  }
});

// ---------- Export / Import (F) ----------
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json"
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
        if (typeof imported !== "object" || Array.isArray(imported)) {
          throw new Error("Invalid format");
        }

       
        Object.keys(imported).forEach(name => {
         
          if (!notes[name]) {
            notes[name] = imported[name];
            addNoteToList(name);
          }
        });

        saveNotes();
        updateEmptyText();
        buildKnowledgeGraph();
      } catch (err) {
        alert("Failed to import notes: " + err.message);
      }
    };

    reader.readAsText(file);
  });
}


window.addEventListener("DOMContentLoaded", () => {
  updatePreview();
});



/* ============================================================
   RESIZE EDITOR <-> PREVIEW
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
  const leftWidth = e.clientX - centerPanel.getBoundingClientRect().left;

  // Convert to %
  let editorPercent = (leftWidth / totalWidth) * 100;

  // clamp (minimum 20%, maximum 80%)
  if (editorPercent < 20) editorPercent = 20;
  if (editorPercent > 80) editorPercent = 80;

  editorArea.style.width = editorPercent + "%";
  previewArea.style.width = (100 - editorPercent) + "%";
});

document.addEventListener("mouseup", () => {
  isDraggingEP = false;
});




uploadModal.addEventListener("click", (e) => {
  if (e.target === uploadModal) uploadModal.style.display = "none";
});

// Prevent inside click
document.querySelector(".modal-content").addEventListener("click", (e) => {
  e.stopPropagation();
});

/* ================================
   GOOGLE DRIVE PICKER
================================ */

const CLIENT_ID = "364956694336-71kq54bm418a6fs159aq0uog4dpp5472.apps.googleusercontent.com";
const API_KEY = "AIzaSyCiKRt-ziIxur-wXSlxxHypMGa3SsVEs0w";


const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let tokenClient;
let gapiInited = false;
let gisInited = false;

window.gapiLoaded = function () {
  gapi.load("client:picker", initializeGapiClient); 
};

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
  });
  gapiInited = true;
}

window.gisLoaded = function () {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "", 
  });
  gisInited = true;
};

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

  
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

function createPicker(accessToken) {
  const view = new google.picker.DocsView()
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false)
    .setMimeTypes("text/markdown,text/plain,application/octet-stream");

  const picker = new google.picker.PickerBuilder()
    .setDeveloperKey(API_KEY)
    .setAppId(CLIENT_ID) 
    .setOAuthToken(accessToken) 
    .addView(view)
    .setCallback(pickerCallback)
    .build();

  picker.setVisible(true);
}

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

    
    notes[fileName] = content;
    saveNotes();
    addNoteToList(fileName);
    openNote(fileName);

    uploadModal.style.display = "none";
  } catch (err) {
    console.error("Error downloading file", err);
    alert("Error downloading file content. Check console.");
  }
}

// reset button----

const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", () => {
    const confirmed = confirm("Are you sure you want to reset everything? This will delete all notes permanently.");

    if (!confirmed) return;

    // Wipe localStorage
    localStorage.removeItem("notes");
    localStorage.removeItem("lastOpenedNote");

    // Reset JS memory
    notes = {};
    currentNote = null;

    // Clear UI
    notesList.innerHTML = "";
    editor.value = "";
    previewPane.innerHTML = '<div class="preview-placeholder">Rendered preview will appear here.</div>';

    // Reset empty state text
    updateEmptyText();

    // Clear graph
    if (network) {
        network.destroy();
        network = null;
    }
    if (graphPlaceholder) graphPlaceholder.style.display = "block";

    alert("All notes have been cleared.");
});
