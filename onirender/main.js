const path = require("path");
const fs = require("fs/promises");
const { spawn } = require("child_process");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const ffmpegPath = require("ffmpeg-static");

let mainWindow = null;
let activeRender = null;

function createWindow(){
  mainWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
}

function parseSequenceParts(fileName){
  const parsed = path.parse(fileName);
  const ext = String(parsed.ext || "").toLowerCase();
  if(ext !== ".png") return null;

  const stem = parsed.name;
  const m = stem.match(/^(.*?)(\d+)([^\d]*)$/);
  if(!m) return null;

  return {
    fileName,
    ext,
    prefix: m[1] || "",
    numberRaw: m[2],
    suffix: m[3] || "",
    number: Number(m[2])
  };
}

function detectSequenceGroups(fileNames){
  const groups = new Map();

  for(const fileName of fileNames){
    const p = parseSequenceParts(fileName);
    if(!p || !Number.isFinite(p.number)) continue;

    const key = `${p.prefix}||${p.suffix}||${p.numberRaw.length}`;
    let group = groups.get(key);
    if(!group){
      group = {
        key,
        prefix: p.prefix,
        suffix: p.suffix,
        padding: p.numberRaw.length,
        ext: p.ext,
        frames: new Map()
      };
      groups.set(key, group);
    }

    group.frames.set(p.number, p.fileName);
  }

  const out = [];
  for(const group of groups.values()){
    const frameNumbers = Array.from(group.frames.keys()).sort((a, b) => a - b);
    if(frameNumbers.length < 2) continue;

    const first = frameNumbers[0];
    const last = frameNumbers[frameNumbers.length - 1];
    const missing = [];
    for(let n = first; n <= last; n++){
      if(!group.frames.has(n)) missing.push(n);
    }

    out.push({
      key: group.key,
      prefix: group.prefix,
      suffix: group.suffix,
      padding: group.padding,
      ext: group.ext,
      first,
      last,
      detectedCount: frameNumbers.length,
      expectedCount: (last - first + 1),
      missing,
      pattern: `${group.prefix}%0${group.padding}d${group.suffix}${group.ext}`,
      sampleStart: group.frames.get(first),
      sampleEnd: group.frames.get(last)
    });
  }

  out.sort((a, b) => {
    if(b.detectedCount !== a.detectedCount) return b.detectedCount - a.detectedCount;
    return a.pattern.localeCompare(b.pattern);
  });

  return out;
}

async function readSequenceCandidates(folderPath){
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = entries.filter(e => e.isFile()).map(e => e.name);
  const pngCount = files.filter(f => String(path.extname(f)).toLowerCase() === ".png").length;
  const groups = detectSequenceGroups(files);

  for(const group of groups){
    const sampleEnd = String(group.sampleEnd || "");
    if(!sampleEnd){
      group.latestMtimeMs = 0;
      continue;
    }
    try{
      const stat = await fs.stat(path.join(folderPath, sampleEnd));
      group.latestMtimeMs = Number(stat.mtimeMs) || 0;
    }catch(_){
      group.latestMtimeMs = 0;
    }
  }

  groups.sort((a, b) => {
    const mA = Number(a.latestMtimeMs) || 0;
    const mB = Number(b.latestMtimeMs) || 0;
    if(mB !== mA) return mB - mA;
    if(b.detectedCount !== a.detectedCount) return b.detectedCount - a.detectedCount;
    return a.pattern.localeCompare(b.pattern);
  });

  return {
    folderPath,
    fileCount: files.length,
    pngCount,
    groups
  };
}

function parseFfmpegFrame(line){
  const m = line.match(/frame=\s*(\d+)/i);
  if(!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

ipcMain.handle("onirender:pick-folder", async () => {
  const res = await dialog.showOpenDialog({
    title: "Select PNG Sequence Folder",
    properties: ["openDirectory"]
  });

  if(res.canceled || !res.filePaths || !res.filePaths[0]) return null;
  const folderPath = res.filePaths[0];
  const scan = await readSequenceCandidates(folderPath);
  return scan;
});

ipcMain.handle("onirender:pick-output", async (_event, defaultName) => {
  const res = await dialog.showSaveDialog({
    title: "Save MP4",
    defaultPath: defaultName || "render.mp4",
    filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
    properties: ["createDirectory", "showOverwriteConfirmation"]
  });

  if(res.canceled || !res.filePath) return null;
  return res.filePath;
});

ipcMain.handle("onirender:render", async (_event, payload) => {
  if(activeRender) throw new Error("A render is already running.");
  if(!ffmpegPath) throw new Error("ffmpeg binary not available.");

  const {
    folderPath,
    outputPath,
    fps,
    prefix,
    suffix,
    padding,
    first,
    last,
    expectedCount,
    stopOnMissing
  } = payload || {};

  if(!folderPath || !outputPath) throw new Error("Missing folder or output path.");
  if(!Number.isFinite(Number(fps)) || Number(fps) <= 0) throw new Error("Invalid FPS.");

  const expected = Number(expectedCount);
  if(!Number.isFinite(expected) || expected <= 0) throw new Error("Invalid sequence length.");

  if(stopOnMissing){
    for(let n = Number(first); n <= Number(last); n++){
      const fileName = `${prefix}${String(n).padStart(Number(padding), "0")}${suffix}.png`;
      const fullPath = path.join(folderPath, fileName);
      try{
        await fs.access(fullPath);
      }catch(_){
        throw new Error(`Missing frame ${String(n).padStart(Number(padding), "0")}: ${fileName}`);
      }
    }
  }

  const inputPattern = path.join(folderPath, `${prefix}%0${padding}d${suffix}.png`);
  const totalFrames = expected;
  const alphaCompositeFilter = "[0:v]format=rgba[fg];color=c=black:s=2x2[bg0];[bg0][fg]scale2ref[bg][fg2];[bg][fg2]overlay=format=auto,pad=ceil(iw/2)*2:ceil(ih/2)*2:color=black,setsar=1,colorspace=all=bt709:iall=bt709:fast=0,format=yuv420p[v]";
  const safeFps = Math.max(1, Math.round(Number(fps) || 30));
  const gopSize = Math.max(1, safeFps);

  const runFfmpeg = (args) => new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    activeRender = { proc };

    let stderrText = "";
    let lastFrame = 0;

    proc.stderr.on("data", (buf) => {
      const text = String(buf || "");
      stderrText += text;
      const lines = text.split(/\r?\n/).filter(Boolean);
      for(const line of lines){
        const frame = parseFfmpegFrame(line);
        if(frame !== null){
          lastFrame = Math.max(lastFrame, frame);
          mainWindow?.webContents?.send("onirender:progress", {
            frame: lastFrame,
            totalFrames
          });
        }
      }
    });

    proc.on("error", (err) => {
      activeRender = null;
      reject(err);
    });

    proc.on("close", (code) => {
      activeRender = null;
      if(code === 0){
        mainWindow?.webContents?.send("onirender:progress", {
          frame: totalFrames,
          totalFrames
        });
        resolve({ ok: true, outputPath, totalFrames });
        return;
      }

      const tail = stderrText.split(/\r?\n/).slice(-14).join("\n").trim();
      reject(new Error(tail || `ffmpeg exited with code ${code}`));
    });
  });

  const primaryArgs = [
    "-y",
    "-framerate", String(Number(fps)),
    "-start_number", String(Number(first)),
    "-i", inputPattern,
    "-filter_complex", alphaCompositeFilter,
    "-map", "[v]",
    "-r", String(Number(fps)),
    "-vsync", "cfr",
    "-fps_mode", "cfr",
    "-frames:v", String(totalFrames),
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level", "4.1",
    "-g", String(gopSize),
    "-keyint_min", String(gopSize),
    "-sc_threshold", "0",
    "-bf", "2",
    "-crf", "16",
    "-preset", "slow",
    "-tune", "animation",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-colorspace", "bt709",
    "-color_range", "pc",
    "-x264-params", "colormatrix=bt709:colorprim=bt709:transfer=bt709:fullrange=on:force-cfr=1",
    "-movflags", "+faststart",
    outputPath
  ];

  const fallbackArgs = [
    "-y",
    "-framerate", String(Number(fps)),
    "-start_number", String(Number(first)),
    "-i", inputPattern,
    "-filter_complex", alphaCompositeFilter,
    "-map", "[v]",
    "-r", String(Number(fps)),
    "-vsync", "cfr",
    "-fps_mode", "cfr",
    "-frames:v", String(totalFrames),
    "-c:v", "libx264",
    "-profile:v", "main",
    "-g", String(gopSize),
    "-keyint_min", String(gopSize),
    "-sc_threshold", "0",
    "-bf", "1",
    "-crf", "18",
    "-preset", "medium",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-colorspace", "bt709",
    "-color_range", "pc",
    "-x264-params", "colormatrix=bt709:colorprim=bt709:transfer=bt709:fullrange=on:force-cfr=1",
    "-movflags", "+faststart",
    outputPath
  ];

  try{
    return await runFfmpeg(primaryArgs);
  }catch(primaryErr){
    return await runFfmpeg(fallbackArgs).catch((fallbackErr) => {
      throw new Error(
        `Primary encode failed, fallback failed.\nPrimary: ${String(primaryErr?.message || primaryErr)}\nFallback: ${String(fallbackErr?.message || fallbackErr)}`
      );
    });
  }
});

ipcMain.handle("onirender:cancel", async () => {
  if(!activeRender?.proc) return { cancelled: false };
  try{
    activeRender.proc.kill("SIGKILL");
  }catch(_){ }
  activeRender = null;
  return { cancelled: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if(BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if(process.platform !== "darwin") app.quit();
});
