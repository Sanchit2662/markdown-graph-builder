// DRAGGING OF SIDE BARS-------------------------------------------------------------------------------
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

// ----------------------
// Upload Modal Logic
// ----------------------
const uploadBtn = document.getElementById("uploadBtn");
const uploadModal = document.getElementById("uploadModal");
const closeModal = document.getElementById("closeModal");
const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const driveBtn = document.getElementById("driveBtn");

// Open modal
uploadBtn.addEventListener("click", () => {
  uploadModal.style.display = "flex";
});

// Close modal
closeModal.addEventListener("click", () => {
  uploadModal.style.display = "none";
});

// Clicking drop area triggers file input
dropArea.addEventListener("click", () => fileInput.click());

// Drag & Drop Events
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

// File processing function
function handleFile(file) {
  if (!file || !file.name.endsWith(".md")) {
    alert("Please upload a markdown (.md) file");
    return;
  }

  alert("Markdown file uploaded: " + file.name);
  uploadModal.style.display = "none";

  // NEXT STEP: send this to your parser later
}

// Google Drive button (UI Only for now)
driveBtn.addEventListener("click", () => {
  alert("Google Drive Picker coming next!");
});

// Prevent modal from closing when clicking inside & close on outside
uploadModal.addEventListener("click", (e) => {
  if (e.target === uploadModal) uploadModal.style.display = "none";
});

// Prevent inside click
document.querySelector(".modal-content").addEventListener("click", (e) => {
  e.stopPropagation();
});

// ---------------------------
// Save notes to localStorage
// ----------------------------
function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}

// ---------------------------
// FILE → LIST → EDITOR LOGIC
// ---------------------------
const notesList = document.getElementById("notesList");
const editor = document.getElementById("editor");

// Load existing notes from localStorage
let notes = JSON.parse(localStorage.getItem("notes")) || {};
let currentNote = null;

// Rebuild notes list on page load
window.addEventListener("DOMContentLoaded", () => {
  // Object.keys(notes).forEach(filename => {
  //   addNoteToList(filename);
  // });

  notesList.innerHTML = "";   // clear duplicates
  Object.keys(notes).forEach(addNoteToList);

});


// When a Markdown file is uploaded
function handleFile(file) {
  if (!file || !file.name.endsWith(".md")) {
    alert("Please upload a markdown (.md) file");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const content = e.target.result;

    // Store file content
    notes[file.name] = content;

    saveNotes();      //local storage

    hideEmptyTextAfterUpload();

    // Add to sidebar
    addNoteToList(file.name);

    // Open immediately
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

// Styling for menu items
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

// updated addNoteToList with right click listener
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


// Open note in editor
function openNote(filename) {
  currentNote = filename;

  // highlight active note
  document.querySelectorAll(".note-item").forEach(n => {
    n.classList.remove("active");
    if (n.textContent === filename) n.classList.add("active");
  });

  // Load content into editor
  editor.value = notes[filename];
}

// Clicking anywhere should deactivate the active note

document.addEventListener("click", (e) => {
  if (!e.target.closest(".note-item") && !e.target.closest("#editor")) {
    document.querySelectorAll(".note-item.active")
      .forEach(n => n.classList.remove("active"));
    currentNote = null;
    editor.value = "";
  }
});


// Save edits live
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

  // Collect ALL existing note names from notes + notesList UI
  const existing = new Set(Object.keys(notes));

  [...notesList.children].forEach(li => existing.add(li.textContent.trim()));

  let name = `${base}.md`;
  while (existing.has(name)) {
    n++;
    name = `${base} ${n}.md`;
  }
  return name;
}


// When clicking + New Note
newNoteBtn.addEventListener("click", () => {
  const filename = generateUntitledName();
  const content = ""; // empty file

  notes[filename] = content;
  addNoteToList(filename);
  openNote(filename);

  saveNotes();

  updateEmptyText();

});

// --------------------------------
// rename/delete button
// --------------------------------
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
