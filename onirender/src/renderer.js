const btnPickFolder = document.getElementById("btnPickFolder");
const folderPathEl = document.getElementById("folderPath");
const groupsWrap = document.getElementById("groupsWrap");
const groupSelect = document.getElementById("groupSelect");
const groupMeta = document.getElementById("groupMeta");
const fpsInput = document.getElementById("fpsInput");
const stopOnMissingEl = document.getElementById("stopOnMissing");
const btnPickOutput = document.getElementById("btnPickOutput");
const outputPathEl = document.getElementById("outputPath");
const btnRender = document.getElementById("btnRender");
const btnCancel = document.getElementById("btnCancel");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const logEl = document.getElementById("log");

let currentScan = null;
let selectedGroup = null;
let outputPath = "";
let unsubscribeProgress = null;
let renderBusy = false;

function addLog(text){
  const now = new Date().toLocaleTimeString();
  const line = `[${now}] ${text}`;
  logEl.textContent = `${logEl.textContent}${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function formatMissing(missing){
  if(!Array.isArray(missing) || missing.length === 0) return "none";
  if(missing.length <= 12) return missing.join(", ");
  return `${missing.slice(0, 12).join(", ")} ... (+${missing.length - 12} more)`;
}

function refreshGroupMeta(){
  if(!selectedGroup){
    groupMeta.textContent = "";
    return;
  }

  const latest = Number(selectedGroup.latestMtimeMs) || 0;
  const latestText = latest > 0 ? new Date(latest).toLocaleString() : "unknown";

  groupMeta.textContent = [
    `Pattern: ${selectedGroup.pattern}`,
    `Frames: ${selectedGroup.first} -> ${selectedGroup.last}`,
    `Detected files: ${selectedGroup.detectedCount}`,
    `Expected contiguous: ${selectedGroup.expectedCount}`,
    `Missing: ${formatMissing(selectedGroup.missing)}`,
    `Latest modified: ${latestText}`,
    `Sample end: ${selectedGroup.sampleEnd || "n/a"}`
  ].join("\n");
}

function refreshRenderEnabled(){
  const fps = Number(fpsInput.value);
  const hasGroup = Boolean(selectedGroup);
  const hasOutput = Boolean(outputPath);
  const fpsOk = Number.isFinite(fps) && fps > 0;
  btnRender.disabled = renderBusy || !hasGroup || !hasOutput || !fpsOk;
  btnCancel.disabled = !renderBusy;
}

function setProgress(frame, total){
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeFrame = Math.max(0, Number(frame) || 0);
  const pct = Math.max(0, Math.min(100, Math.round((safeFrame / safeTotal) * 100)));
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `Frame ${safeFrame} / ${safeTotal} (${pct}%)`;
}

function loadGroups(scan){
  const groups = Array.isArray(scan?.groups) ? scan.groups : [];
  groupSelect.innerHTML = "";

  for(const g of groups){
    const opt = document.createElement("option");
    opt.value = g.key;
    opt.textContent = `${g.pattern} (${g.detectedCount} frames)`;
    groupSelect.appendChild(opt);
  }

  if(groups.length > 0){
    selectedGroup = groups[0];
    groupSelect.value = selectedGroup.key;
    groupsWrap.classList.remove("hidden");
    refreshGroupMeta();
    addLog(`Detected ${groups.length} sequence group(s).`);
    addLog(`Auto-selected newest: ${selectedGroup.pattern}`);
  }else{
    selectedGroup = null;
    groupsWrap.classList.add("hidden");
    groupMeta.textContent = "";
    addLog("No numbered PNG sequence group found.");
  }

  refreshRenderEnabled();
}

btnPickFolder.addEventListener("click", async () => {
  try{
    const scan = await window.oniRenderApi.pickFolder();
    if(!scan) return;

    currentScan = scan;
    folderPathEl.textContent = scan.folderPath;
    addLog(`Folder selected: ${scan.folderPath}`);
    addLog(`PNG files: ${scan.pngCount}`);
    loadGroups(scan);
  }catch(err){
    addLog(`ERROR: ${String(err?.message || err)}`);
  }
});

groupSelect.addEventListener("change", () => {
  const groups = currentScan?.groups || [];
  selectedGroup = groups.find(g => g.key === groupSelect.value) || null;
  if(selectedGroup){
    addLog(`Selected group: ${selectedGroup.pattern}`);
  }
  refreshGroupMeta();
  refreshRenderEnabled();
});

btnPickOutput.addEventListener("click", async () => {
  try{
    const fallback = selectedGroup ? `${selectedGroup.prefix || "render"}.mp4` : "render.mp4";
    const picked = await window.oniRenderApi.pickOutput(fallback);
    if(!picked) return;

    outputPath = picked;
    outputPathEl.textContent = picked;
    addLog(`Output selected: ${picked}`);
    refreshRenderEnabled();
  }catch(err){
    addLog(`ERROR: ${String(err?.message || err)}`);
  }
});

btnRender.addEventListener("click", async () => {
  if(!currentScan || !selectedGroup) return;

  const fps = Number(fpsInput.value);
  if(!Number.isFinite(fps) || fps <= 0){
    addLog("ERROR: Invalid FPS.");
    return;
  }

  if(Array.isArray(selectedGroup.missing) && selectedGroup.missing.length > 0 && stopOnMissingEl.checked){
    addLog("ERROR: Sequence has missing frames. Disable stop-on-missing or fix sequence.");
    return;
  }

  renderBusy = true;
  refreshRenderEnabled();
  progressFill.style.width = "0%";
  progressText.textContent = "Starting render...";

  if(unsubscribeProgress) unsubscribeProgress();
  unsubscribeProgress = window.oniRenderApi.onProgress(({ frame, totalFrames }) => {
    setProgress(frame, totalFrames);
  });

  try{
    addLog(`Render started: ${selectedGroup.pattern} @ ${fps} fps`);
    addLog(`Frame span: ${selectedGroup.first} -> ${selectedGroup.last} (expected ${selectedGroup.expectedCount})`);
    const result = await window.oniRenderApi.render({
      folderPath: currentScan.folderPath,
      outputPath,
      fps,
      prefix: selectedGroup.prefix,
      suffix: selectedGroup.suffix,
      padding: selectedGroup.padding,
      first: selectedGroup.first,
      last: selectedGroup.last,
      expectedCount: selectedGroup.expectedCount,
      stopOnMissing: Boolean(stopOnMissingEl.checked)
    });
    setProgress(result.totalFrames, result.totalFrames);
    addLog(`Render complete: ${result.outputPath}`);
  }catch(err){
    addLog(`ERROR: ${String(err?.message || err)}`);
  }finally{
    renderBusy = false;
    refreshRenderEnabled();
  }
});

btnCancel.addEventListener("click", async () => {
  try{
    await window.oniRenderApi.cancel();
    addLog("Cancel requested.");
  }catch(err){
    addLog(`ERROR: ${String(err?.message || err)}`);
  }
});

fpsInput.addEventListener("input", refreshRenderEnabled);
stopOnMissingEl.addEventListener("change", refreshRenderEnabled);

refreshRenderEnabled();
