window.electronAPI.onDeleteRequest(async (file) => {
  const confirmDelete = confirm(`Are you sure you want to delete ${file}?`);
  if (confirmDelete) {
    const result = await window.electronAPI.deleteFile(file);
    if (result.success) {
      alert(`${file} deleted.`);
      document.getElementById(file)?.remove(); // remove span from DOM
    } else {
      alert(`Failed to delete ${file}: ${result.error}`);
    }
  }
});

const filesContainer = document.getElementById("files");
Object.assign(filesContainer.style, {
  overflow: "hidden",
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
});

const getAllFiles = async () => {
  //getting all files
  const files = await window.electronAPI.listFiles();

  //creating span for each file
  files.forEach((file) => {
    const span = document.createElement("span");
    Object.assign(span.style, {
      cursor: "pointer",
      border: "1px solid black",
      padding: "5px",
      margin: "5px",
    });
    span.draggable = true;
    // span.id = file;
    span.className
    span.textContent = file;
    span.addEventListener("contextmenu", onFileRightClick);
    span.addEventListener("dragstart", dragStart);
    span.addEventListener("dragover", dragOver);
    span.addEventListener("drop", drop);
    filesContainer.appendChild(span);
  });
  return files;
};

//calling the function to get all files
getAllFiles();

const spans = document.querySelectorAll('.draggable');

// **********************************

onFileRightClick = (e) => (e) => {
  e.preventDefault();
  window.electronAPI.openMenu({
    file: file,
    x: e.x,
    y: e.y,
  });
};

function dragStart(event) {
  // Store the dragged element
  event.dataTransfer.setData("text", event.target.innerHTML);
  event.target.style.opacity = "0.5"; // Make the dragged element semi-transparent
}

function dragOver(event) {
  event.preventDefault(); // Allow dropping by preventing the default behavior
}

function drop(event) {
  event.preventDefault();
  const draggedData = event.dataTransfer.getData("text");

  // Find the span element being dragged
  const draggedElement = Array.from(spans).find(
    (span) => span.innerHTML === draggedData
  );

  // Insert the dragged element back in the new position
  filesContainer.insertBefore(draggedElement, event.target);

  draggedElement.style.opacity = "1"; // Restore the element's opacity
}
