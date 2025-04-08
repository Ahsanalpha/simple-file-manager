const { ipcMain, Menu, MenuItem } = require("electron");
const { app, BrowserWindow } = require("electron/main");
const path = require("node:path");
const fs = require("fs");

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
    menu.append(
      new MenuItem({
        label: "Open",
        click: async () => {
          console.log("OPEN clicked", file);
          const filePath = path.join(currentPath, file);

          try {
            const stats = await fs.promises.stat(filePath);
            if (stats.isDirectory()) {
              // If it's a directory, tell the renderer to navigate to it
              const focusedWindow = BrowserWindow.getFocusedWindow();
              focusedWindow.webContents.send("navigate-to-directory", file);
            } else {
              // For files, we might want to implement a file opening functionality
              // This could be platform-specific or use a default application
              console.log(`File ${file} opened`);
            }
          } catch (err) {
            console.error("Error opening file:", err);
          }
        },
      })
    );
    menu.append(
      new MenuItem({
        label: "Rename",
        click: (e) => {
          console.log("RENAME clicked", file);
        },
      })
    );
    menu.append(
      new MenuItem({
        label: "Delete",
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          console.log("DELETE clicked", file);
          console.log("focusedWindow::::::::::", focusedWindow);
          focusedWindow.webContents.send("delete-request", file); // send message to renderer
        },
      })
    );
    menu.popup({ window: BrowserWindow.getFocusedWindow() });
    // menu.popup({ x, y });  // Show the context menu at the mouse position
  });

  ipcMain.handle("delete-file", async (e, fileName) => {
    const rootDir = path.parse(
      process.platform === "win32" ? "C:\\" : "/"
    ).root;
    const filePath = path.join(rootDir, fileName);

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
