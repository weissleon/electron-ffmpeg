// app/index.js
const path = require("path");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require("electron-squirrel-startup")) {
//   app.quit();
// }

const isDev = process.env.IS_DEV === "true";

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: true,
    },
  });

  // Open the DevTools.
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // mainWindow.removeMenu();
    mainWindow.loadFile(path.join(__dirname, "build", "index.html"));
  }

  return mainWindow;
}

let filePath = "";

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  const ffmpeg = require("fluent-ffmpeg");
  const ffmpegPath = require("ffmpeg-static");
  ffmpeg.setFfmpegPath(ffmpegPath);
  const command = ffmpeg();

  const mainWindow = createWindow();
  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  ipcMain.handle("file:open", async (event, args) => {
    const result = await dialog.showOpenDialog(mainWindow);
    filePath = result.filePaths[0];

    return filePath;
  });

  ipcMain.on("video:render", async () => {
    console.log("File Path:", filePath);
    if (filePath === "") return;

    const command = ffmpeg(filePath).outputFormat("avi");

    command.on("progress", (progress) => {
      console.log(`${progress.frames} frames Complete`);
    });
    command.on("end", async () => {
      dialog.showMessageBox(mainWindow, { message: "Render Complete." });
    });

    command.save("./output.avi");
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
