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


// Prevent modal from closing when clicking inside & close on outside

uploadModal.addEventListener("click", (e) => {
  if (e.target === uploadModal) uploadModal.style.display = "none";
});

// Prevent inside click
document.querySelector(".modal-content").addEventListener("click", (e) => {
  e.stopPropagation();
});
