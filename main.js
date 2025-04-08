//main.js

const { ipcMain, Menu, MenuItem } = require("electron");
const { app, BrowserWindow } = require("electron/main");
const path = require("node:path");
const fs = require("fs");
//functionality for opening files
const { shell } = require('electron');

// Add this function to determine if we should open internally or externally
function shouldOpenInternally(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // List of extensions to open internally
  const internalExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',  // Images
    '.txt', '.md', '.json', '.js', '.html', '.css',    // Text files
    '.pdf'                                             // PDFs
  ];
  
  return internalExtensions.includes(ext);
}

// Add this function to open files in a new BrowserWindow
function openFileInternalViewer(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const viewerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,  // Change this to false for simpler IPC
      nodeIntegration: true,    // Enable Node.js integration in the viewer
      webSecurity: false        // This allows loading local files (use cautiously)
    }
  });
  
  // Use an absolute path to ensure the file is found
  const viewerPath = path.join(__dirname, 'file-viewer.html');
  viewerWindow.loadFile(viewerPath);
  
  // Wait for the window to be ready before sending data
  viewerWindow.webContents.on('did-finish-load', () => {
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
      // For images, format the path properly
      viewerWindow.webContents.send('file-to-view', {
        type: 'image',
        path: filePath.replace(/\\/g, '/'),  // Convert backslashes to forward slashes
        name: path.basename(filePath)
      });
    } 
    else if (['.txt', '.md', '.json', '.js', '.html', '.css'].includes(ext)) {
      // For text files
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        viewerWindow.webContents.send('file-to-view', {
          type: 'text',
          content: content,
          name: path.basename(filePath),
          extension: ext.substring(1)
        });
      } catch (err) {
        console.error('Error reading file:', err);
        viewerWindow.webContents.send('file-to-view', {
          type: 'error',
          error: err.message
        });
      }
    }
    else if (ext === '.pdf') {
      // For PDFs, use a properly formatted URL
      viewerWindow.loadURL(`file://${filePath.replace(/\\/g, '/')}`);
    }
  });
  
  viewerWindow.setTitle(path.basename(filePath));
  return viewerWindow;
}



let currentPath = path.parse(process.platform === "win32" ? "C:\\" : "/").root;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  ipcMain.handle("list-files", async (event, dirPath = null) => {
    // If dirPath is provided, update the current path
    if (dirPath !== null) {
      currentPath = dirPath;
    }
  
    try {
      // Get files and their stats
      const files = await fs.promises.readdir(currentPath);
      const fileDetails = await Promise.all(files.map(async (file) => {
        try {
          const filePath = path.join(currentPath, file);
          const stats = await fs.promises.stat(filePath);
          return {
            name: file,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
        } catch (err) {
          console.error(`Error reading file stats for ${file}:`, err);
          return {
            name: file,
            isDirectory: false,
            error: true
          };
        }
      }));
      
      return {
        path: currentPath,
        files: fileDetails
      };
    } catch (err) {
      console.error("Error reading directory:", err);
      return {
        path: currentPath,
        files: [],
        error: err.message
      };
    }
  });

  ipcMain.handle("open-directory", async (event, dirName) => {
    const dirPath = path.join(currentPath, dirName);
    
    try {
      const stats = await fs.promises.stat(dirPath);
      if (stats.isDirectory()) {
        // Instead of trying to access the handler, just update the current path
        // and call list-files with the new path
        currentPath = dirPath;
        
        // Return the files in the new directory using the same code as list-files
        const files = await fs.promises.readdir(currentPath);
        const fileDetails = await Promise.all(files.map(async (file) => {
          try {
            const filePath = path.join(currentPath, file);
            const stats = await fs.promises.stat(filePath);
            return {
              name: file,
              isDirectory: stats.isDirectory(),
              size: stats.size,
              modified: stats.mtime
            };
          } catch (err) {
            console.error(`Error reading file stats for ${file}:`, err);
            return {
              name: file,
              isDirectory: false,
              error: true
            };
          }
        }));
        
        return {
          path: currentPath,
          files: fileDetails
        };
      } else {
        return { error: "Not a directory" };
      }
    } catch (err) {
      console.error("Error opening directory:", err);
      return { error: err.message };
    }
  });

  ipcMain.handle("navigate-up", async () => {
    const parentPath = path.dirname(currentPath);
    
    // Prevent navigating above the root directory
    if (parentPath === currentPath) {
      // Just return the current directory contents
      const files = await fs.promises.readdir(currentPath);
      const fileDetails = await Promise.all(files.map(async (file) => {
        try {
          const filePath = path.join(currentPath, file);
          const stats = await fs.promises.stat(filePath);
          return {
            name: file,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
        } catch (err) {
          return {
            name: file,
            isDirectory: false,
            error: true
          };
        }
      }));
      
      return {
        path: currentPath,
        files: fileDetails
      };
    }
    
    // Update path and return files
    currentPath = parentPath;
    
    const files = await fs.promises.readdir(currentPath);
    const fileDetails = await Promise.all(files.map(async (file) => {
      try {
        const filePath = path.join(currentPath, file);
        const stats = await fs.promises.stat(filePath);
        return {
          name: file,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      } catch (err) {
        return {
          name: file,
          isDirectory: false,
          error: true
        };
      }
    }));
    
    return {
      path: currentPath,
      files: fileDetails
    };
  });

  ipcMain.handle("open-menu", (e, params) => {
    console.log("open menu params::::::::", params);
    // console.log("eeeeeeeee::::::::::",e)
    const { x, y, file } = params;

    // Define the context menu for a specific element
    const menu = new Menu();
    // In main.js, update the menu.append for "Open":
    // Update the 'Open' menu item click handler
menu.append(new MenuItem({
  label: 'Open',
  click: async () => {
    console.log('OPEN clicked', file);
    const filePath = path.join(currentPath, file);
    
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.isDirectory()) {
        // If it's a directory, tell the renderer to navigate to it
        const focusedWindow = BrowserWindow.getFocusedWindow();
        focusedWindow.webContents.send('navigate-to-directory', file);
      } else {
        // For files, check if we should open internally or externally
        if (shouldOpenInternally(filePath)) {
          openFileInternalViewer(filePath);
        } else {
          // Use the default system application to open the file
          shell.openPath(filePath)
            .then(result => {
              if (result !== '') {
                console.error('Failed to open file:', result);
              }
            });
        }
      }
    } catch (err) {
      console.error("Error opening file:", err);
    }
  }
}));
    menu.append(new MenuItem({
      label: 'Rename',
      click: () => {
        console.log('RENAME clicked', file);
        const focusedWindow = BrowserWindow.getFocusedWindow();
        focusedWindow.webContents.send('rename-request', file);
      }
    }));
    menu.append(new MenuItem({
      label: 'Delete',
      click: () => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        console.log('DELETE clicked', file);
        focusedWindow.webContents.send('delete-request', file); // send message to renderer
      }
    }));
    menu.popup({ window: BrowserWindow.getFocusedWindow() });
    // menu.popup({ x, y });  // Show the context menu at the mouse position
  });

  ipcMain.handle("rename-file", async (event, oldName, newName) => {
    const oldPath = path.join(currentPath, oldName);
    const newPath = path.join(currentPath, newName);
    
    try {
      // Check if the new name already exists
      try {
        await fs.promises.access(newPath);
        // If we get here, the file already exists
        return { 
          success: false, 
          error: "A file or directory with that name already exists" 
        };
      } catch (err) {
        // This is good - the file doesn't exist
      }
      
      // Rename the file
      await fs.promises.rename(oldPath, newPath);
      console.log(`Renamed ${oldPath} to ${newPath}`);
      
      // Get updated stats for the renamed file
      const stats = await fs.promises.stat(newPath);
      
      return { 
        success: true,
        file: {
          name: newName,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        }
      };
    } catch (err) {
      console.error(`Failed to rename ${oldPath} to ${newPath}:`, err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("delete-file", async (e, fileName) => {
    const rootDir = path.parse(process.platform === "win32" ? "C:\\" : "/").root;
    const filePath = path.join(currentPath, fileName); // Use currentPath instead of rootDir
    
    try {
      const stat = await fs.promises.lstat(filePath);
    
      if (stat.isDirectory()) {
        await fs.promises.rm(filePath, { recursive: true, force: true });
        console.log(`Deleted directory: ${filePath}`);
      } else {
        await fs.promises.unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    
      return { success: true };
    } catch (err) {
      console.error("Failed to delete:", err);
      return { success: false, error: err.message };
    }
  });

  win.webContents.openDevTools();

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();
});
