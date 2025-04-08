//renderer.js
let currentPath = "";

//delete listener
function showDeleteConfirmation(fileName) {
  // Check if dialog already exists
  let existingDialog = document.getElementById('delete-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // Create dialog elements
  const dialog = document.createElement('div');
  dialog.id = 'delete-dialog';
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = '#fff';
  dialog.style.padding = '20px';
  dialog.style.borderRadius = '5px';
  dialog.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  dialog.style.zIndex = '1000';
  
  const header = document.createElement('h3');
  header.textContent = 'Delete Confirmation';
  dialog.appendChild(header);
  
  const message = document.createElement('p');
  message.textContent = `Are you sure you want to delete "${fileName}"? This cannot be undone.`;
  dialog.appendChild(message);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'space-between';
  buttonContainer.style.marginTop = '15px';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.onclick = () => dialog.remove();
  
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.style.padding = '8px 16px';
  deleteButton.style.backgroundColor = '#f44336';
  deleteButton.style.color = 'white';
  deleteButton.style.border = 'none';
  deleteButton.style.borderRadius = '4px';
  deleteButton.style.marginLeft = '10px';
  
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(deleteButton);
  dialog.appendChild(buttonContainer);
  
  // Add dialog to document
  document.body.appendChild(dialog);
  
  // Return a promise that resolves when the user makes a choice
  return new Promise((resolve) => {
    deleteButton.onclick = () => {
      dialog.remove();
      resolve(true);
    };
    
    cancelButton.onclick = () => {
      dialog.remove();
      resolve(false);
    };
  });
}

// And update the delete request handler to use it:
window.electronAPI.onDeleteRequest(async (file) => {
  const confirmDelete = await showDeleteConfirmation(file);
  if (confirmDelete) {
    const result = await window.electronAPI.deleteFile(file);
    if (result.success) {
      // Remove the element from the DOM
      const fileElement = document.getElementById(file);
      if (fileElement) {
        fileElement.remove();
      }
      console.log(`${file} deleted successfully`);
    } else {
      alert(`Failed to delete ${file}: ${result.error}`);
    }
  }
});

//renaming listener
// Add this at the top of renderer.js with other event listeners
window.electronAPI.onRenameRequest(async (file) => {
  // Create rename UI
  showRenameDialog(file);
});

// Add this function to handle the rename UI
function showRenameDialog(fileName) {
  // Check if dialog already exists
  let existingDialog = document.getElementById('rename-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // Create dialog elements
  const dialog = document.createElement('div');
  dialog.id = 'rename-dialog';
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = '#fff';
  dialog.style.padding = '20px';
  dialog.style.borderRadius = '5px';
  dialog.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  dialog.style.zIndex = '1000';
  
  const header = document.createElement('h3');
  header.textContent = 'Rename';
  dialog.appendChild(header);
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = fileName;
  input.style.width = '100%';
  input.style.padding = '8px';
  input.style.marginBottom = '15px';
  input.style.boxSizing = 'border-box';
  dialog.appendChild(input);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'space-between';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.onclick = () => dialog.remove();
  
  const renameButton = document.createElement('button');
  renameButton.textContent = 'Rename';
  renameButton.style.padding = '8px 16px';
  renameButton.style.backgroundColor = '#4CAF50';
  renameButton.style.color = 'white';
  renameButton.style.border = 'none';
  renameButton.style.borderRadius = '4px';
  renameButton.style.marginLeft = '10px';
  
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(renameButton);
  dialog.appendChild(buttonContainer);
  
  // Add dialog to document
  document.body.appendChild(dialog);
  
  // Focus the input
  input.focus();
  input.select();
  
  // Handle rename on button click
  renameButton.onclick = async () => {
    const newName = input.value.trim();
    
    if (!newName) {
      alert('Please enter a valid name');
      return;
    }
    
    if (newName === fileName) {
      dialog.remove();
      return;
    }
    
    // Send rename request to main process
    const result = await window.electronAPI.renameFile(fileName, newName);
    
    if (result.success) {
      // Remove the dialog
      dialog.remove();
      
      // Update the UI
      const fileElement = document.getElementById(fileName);
      if (fileElement) {
        fileElement.id = newName;
        
        // Update the text content (account for our icon span)
        const textSpan = fileElement.querySelector('span:nth-child(2)');
        if (textSpan) {
          textSpan.textContent = newName;
        } else {
          // Fallback if we don't find the span
          const icon = fileElement.innerHTML.split(' ')[0]; // Keep the icon
          fileElement.innerHTML = `${icon} ${newName}`;
        }
      } else {
        // If for some reason we can't find the element, refresh the whole view
        getAllFiles();
      }
    } else {
      alert(`Failed to rename: ${result.error}`);
    }
  };
  
  // Allow Enter key to submit
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      renameButton.click();
    }
  });
}

window.electronAPI.onNavigateToDirectory(async (dir) => {
  await navigateToDirectory(dir);
});

// window.electronAPI.onDeleteRequest(async (file) => {
//   const confirmDelete = confirm(`Are you sure you want to delete ${file}?`);
//   if (confirmDelete) {
//     const result = await window.electronAPI.deleteFile(file);
//     if (result.success) {
//       alert(`${file} deleted.`);
//       document.getElementById(file)?.remove(); // remove div from DOM
//     } else {
//       alert(`Failed to delete ${file}: ${result.error}`);
//     }
//   }
// });

// Update the UI to show the current path
function updatePathDisplay(path) {
  currentPath = path;
  const pathDisplay = document.getElementById("current-path");
  if (!pathDisplay) {
    const header = document.querySelector("h1");
    const pathDiv = document.createElement("div");
    pathDiv.id = "current-path";
    pathDiv.textContent = path;
    header.insertAdjacentElement("afterend", pathDiv);
  } else {
    pathDisplay.textContent = path;
  }
}

// Add a back button if it doesn't exist
function ensureBackButton() {
  if (!document.getElementById("back-button")) {
    const header = document.querySelector("h1");
    const backButton = document.createElement("button");
    backButton.id = "back-button";
    backButton.textContent = "↩️ Back";
    backButton.addEventListener("click", navigateUp);
    header.insertAdjacentElement("afterend", backButton);
  }
}

// Navigate to parent directory
async function navigateUp() {
  const result = await window.electronAPI.navigateUp();
  if (!result.error) {
    updatePathDisplay(result.path);
    displayFiles(result.files);
  }
}

// Handle file/directory click
function handleItemClick(item) {
  if (item.isDirectory) {
    navigateToDirectory(item.name);
  } else {
    // We could add file preview functionality here in the future
    console.log(`Clicked on file: ${item.name}`);
  }
}

// Navigate into a directory
async function navigateToDirectory(dirName) {
  console.log("dir in renderer", dirName);
  const result = await window.electronAPI.openDirectory(dirName);
  console.log("dir result in renderer", result);
  if (!result.error) {
    updatePathDisplay(result.path);
    displayFiles(result.files);
  } else {
    alert(`Error opening directory: ${result.error}`);
  }
}

// Display files and directories
function displayFiles(files) {
  // Clear existing elements
  filesContainer.innerHTML = "";

  // Create a new element for each file/directory
  files.forEach((item) => {
    const div = document.createElement("div");
    Object.assign(div.style, {
      border: "3px solid #666",
      "background-color": item.isDirectory ? "#b8c9f2" : "#ddd",
      "border-radius": ".5em",
      padding: "10px",
      cursor: item.isDirectory ? "pointer" : "move",
    });
    
    div.draggable = true;
    div.className = "box";
    div.id = item.name; // Set ID for easier reference
    
    // Add icon based on type
    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
    iconSpan.textContent = item.isDirectory ? "📁 " : "📄 ";
    div.appendChild(iconSpan);
    
    // Add text content
    const textSpan = document.createElement("span");
    textSpan.textContent = item.name;
    div.appendChild(textSpan);
    
    // Add click and context menu event listeners
    if (item.isDirectory) {
      div.addEventListener("dblclick", () => navigateToDirectory(item.name));
    }
    div.addEventListener("contextmenu", onFileRightClick);
    
    // Add to the container
    filesContainer.appendChild(div);
  });

  // Setup drag and drop again for the new elements
  setupDragAndDrop();
}

const filesContainer = document.getElementById("files");
Object.assign(filesContainer.style, {
  display: "grid",
  "grid-template-columns": "repeat(5, 1fr)",
  gap: "10px",
});

const getAllFiles = async () => {
  // Getting all files
  const result = await window.electronAPI.listFiles();
  
  if (result.error) {
    alert(`Error listing files: ${result.error}`);
    return [];
  }
  
  updatePathDisplay(result.path);
  // if (currentPath !== '/') {
    ensureBackButton();
  // }
  displayFiles(result.files);
  
  return result.files;
};

//calling the function to get all files
getAllFiles();

// Setup drag and drop functionality
function setupDragAndDrop() {
  const items = document.querySelectorAll('.box');
  items.forEach(function(item) {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

// Update your existing drag and drop handlers to work with the new structure

function onFileRightClick(e) {
  e.preventDefault();
  // Get the file name from the element that was right-clicked
  const file = e.currentTarget.id;

  window.electronAPI.openMenu({
    file: file,
    x: e.x,
    y: e.y,
  });
}

// const divs = document.querySelectorAll('.draggable');

// **********************************

// document.addEventListener('DOMContentLoaded', (event) => {

var dragSrcEl = null;

function handleDragStart(e) {
  this.style.opacity = "0.4";

  dragSrcEl = this;

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }

  e.dataTransfer.dropEffect = "move";

  return false;
}

function handleDragEnter(e) {
  this.classList.add("over");
}

function handleDragLeave(e) {
  this.classList.remove("over");
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation(); // stops the browser from redirecting.
  }

  if (dragSrcEl != this) {
    dragSrcEl.innerHTML = this.innerHTML;
    this.innerHTML = e.dataTransfer.getData("text/html");
  }

  return false;
}

function handleDragEnd(e) {
  this.style.opacity = "1";
  const items = document.querySelectorAll('.box');
  items.forEach(function (item) {
    item.classList.remove("over");
  });
}

// let items = document.querySelectorAll('.file .box');
// items.forEach(function(item) {
//   item.addEventListener('dragstart', handleDragStart, false);
//   item.addEventListener('dragenter', handleDragEnter, false);
//   item.addEventListener('dragover', handleDragOver, false);
//   item.addEventListener('dragleave', handleDragLeave, false);
//   item.addEventListener('drop', handleDrop, false);
//   item.addEventListener('dragend', handleDragEnd, false);
// });
// });

// function dragStart(event) {
//   // Store the dragged element
//   event.dataTransfer.setData("text", event.target.innerHTML);
//   event.target.style.opacity = "0.5"; // Make the dragged element semi-transparent
// }

// function dragOver(event) {
//   event.preventDefault(); // Allow dropping by preventing the default behavior
// }

// function drop(event) {
//   event.preventDefault();
//   const draggedData = event.dataTransfer.getData("text");

//   // Find the div element being dragged
//   const draggedElement = Array.from(divs).find(
//     (div) => div.innerHTML === draggedData
//   );

//   // Insert the dragged element back in the new position
//   filesContainer.insertBefore(draggedElement, event.target);

//   draggedElement.style.opacity = "1"; // Restore the element's opacity
// }
