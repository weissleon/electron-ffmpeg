// app/index.js
const path = require("path");
const { app, BrowserWindow, ipcMain, dialog, protocol } = require("electron");
const fs = require("fs");
const customProtocol = "weissleon-protocol";

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

function fileHandler(req, callback) {
  const url = req.url.replace(`${customProtocol}://`, "");
  try {
    return callback(decodeURIComponent(url));
  } catch (error) {
    // Handle the error as needed
    console.error(error);
  }
}

app.whenReady().then(() => {
  protocol.registerFileProtocol(customProtocol, fileHandler);

  const ffmpeg = require("fluent-ffmpeg");
  const ffmpegPath = require("ffmpeg-static");
  const ffprobePath = require("ffprobe-static");
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath.path);

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

  ipcMain.on("video:render", async (event, data) => {
    console.log("File Path:", filePath);
    if (filePath === "") return;
    if (data.length === 0) return;

    const overlayFilters = [];

    if (!fs.existsSync("render")) fs.mkdirSync("render", { recursive: true });

    let index = 0;
    let renderData = [];
    for (const datum of data) {
      const subFileName = `sub_${index
        .toString()
        .padStart(data.length.toString().length, "0")}.png`;

      fs.writeFileSync("render/" + subFileName, Buffer.from(datum.buffer));

      if (index === 0) {
        overlayFilters.push({
          filter: "overlay",
          options: {
            enable: `between(t,${datum.start},${datum.end})`,
          },
          inputs: "[0:v][1:v]",
          outputs: `v${index + 1}`,
        });
      } else {
        overlayFilters.push({
          filter: "overlay",
          options: {
            enable: `between(t,${datum.start},${datum.end})`,
          },
          inputs: `[v${index}][${index + 1}:v]`,
          outputs: `v${index + 1}`,
        });

        // overlayFilters.push({
        //   filter: "overlay",
        //   options: {
        //     enable: `between(t,${datum.start},${datum.end})`,
        //   },
        //   inputs: `[v1][2:v]"`,
        //   outputs: `v2`,
        // });
      }

      renderData.push({
        fileName: subFileName,
        start: datum.start,
        end: datum.end,
      });

      index++;
    }

    function getBitrate() {
      return new Promise((resolve, reject) => {
        let bitrate = 0;
        ffmpeg()
          .input(filePath)
          .ffprobe((err, data) => {
            console.log("Input Data:", data.streams[0].nb_frames);
            bitrate = data.streams[0].bit_rate;
            totalFrame = data.streams[0].nb_frames;
            resolve((bitrate / 1000).toFixed(0));
          });
      });
    }

    function getFrameNumber(path) {
      return new Promise((resolve, reject) => {
        let bitrate = 0;
        ffmpeg()
          .input(path)
          .ffprobe((err, data) => {
            let totalFrame = data.streams[0].nb_frames;
            resolve(totalFrame);
          });
      });
    }

    const frameNumber = await getFrameNumber("src/assets/Woman - 58142.mp4");

    let bitrate = await getBitrate();
    // const command = ffmpeg(filePath).outputFormat("avi");

    const command = ffmpeg({ logger: console })
      .on("progress", (progress) => {
        console.log(
          `${(
            (progress.frames / ((frameNumber / 25) * 29.97 + totalFrame)) *
            100
          ).toFixed(2)}% Complete`
        );
      })
      .input(filePath);

    for (const data of renderData) {
      console.log("Inserting:", data.fileName);
      command.input(`render/${data.fileName}`);
    }

    const filters = [
      ...overlayFilters,
      {
        filter: "concat",
        options: {
          n: "2",
          v: "1",
        },
        inputs: `[${index + 1}:v][v${index}]`,
        outputs: "watermark",
      },
    ];

    console.log(filters);

    command
      .input("src/assets/Woman - 58142.mp4")
      .complexFilter(filters, "watermark")
      .videoCodec("libx264");

    command.on("end", async () => {
      dialog.showMessageBox(mainWindow, { message: "Render Complete." });
      fs.rmSync("render", { recursive: true, force: true });
    });

    console.log("Bitrate:", bitrate);

    if (!fs.existsSync("export"))
      fs.mkdir("export", { recursive: true }, (err) => console.log(err));

    command
      // .withVideoBitrate(`${bitrate}k`)
      .withVideoBitrate(`7881k`)
      .withFpsOutput(29.97)
      .save("export/output.mp4");
  });

  ipcMain.on("image:save", async (event, arrayBuffer) => {
    console.log(arrayBuffer);
    const buffer = Buffer.from(arrayBuffer);

    console.log("buffer:", buffer);

    if (fs.existsSync("render")) {
      console.log("Exists!");
    } else {
      fs.mkdirSync("render", { recursive: true }, (err) => console.log(err));
    }

    fs.writeFileSync("render/screenshot.png", buffer);
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
