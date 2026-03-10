window.createOniwireToast = function createOniwireToast({ toastEl, state, durationMs = 1500 }){
	return function toast(msg){
		toastEl.textContent = msg;
		toastEl.classList.add("show");
		clearTimeout(state.toastTimer);
		state.toastTimer = setTimeout(() => toastEl.classList.remove("show"), durationMs);
	};
};

window.bindOniwireGlobalErrorHandlers = function bindOniwireGlobalErrorHandlers({ toast }){
	window.addEventListener("error", (e) => {
		try{
			console.error("App error:", e.error || e.message || e);
			toast(`Error: ${e.message || "see console"}`);
		}catch{}
	});

	window.addEventListener("unhandledrejection", (e) => {
		try{
			console.error("Unhandled promise:", e.reason || e);
			toast(`Error: ${(e.reason && e.reason.message) || "see console"}`);
		}catch{}
	});
};

window.oniwireEscapeAttr = function oniwireEscapeAttr(s){
	return String(s).replaceAll('"','&quot;');
};

window.oniwirePortKey = function oniwirePortKey(nodeId, kind, port){
	return `${nodeId}:${kind}:${port}`;
};

window.oniwireClamp = function oniwireClamp(v, a, b){
	return Math.max(a, Math.min(b, v));
};

window.oniwireParseRatioString = function oniwireParseRatioString(raw){
	const s = String(raw || "").trim().toLowerCase().replace(/\s+/g, "");
	const match = s.match(/^(\d+(?:\.\d+)?)(?:x|:)(\d+(?:\.\d+)?)$/);
	if(!match) return null;
	const w = Number(match[1]);
	const h = Number(match[2]);
	if(!w || !h) return null;
	return { w, h };
};

window.oniwireEditorMouse = function oniwireEditorMouse(e, editorEl){
	const er = editorEl.getBoundingClientRect();
	return { x: e.clientX - er.left, y: e.clientY - er.top };
};

window.oniwireEditorToWorld = function oniwireEditorToWorld(x, y, state){
	return { x: (x - state.panX) / state.zoom, y: (y - state.panY) / state.zoom };
};

window.oniwireTopHToPx = function oniwireTopHToPx(value, appHeight){
	const v = String(value || "").trim();
	if(v.endsWith("vh")) return appHeight * (parseFloat(v) / 100);
	if(v.endsWith("px")) return parseFloat(v);
	return parseFloat(v) || appHeight * 0.5;
};

window.oniwireIsTypingTarget = function oniwireIsTypingTarget(el){
	if(!el) return false;
	const tag = el.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
};

window.oniwireUid = function oniwireUid(state){
	return String(state.nextId++);
};

window.oniwireGetSelectedNodeIds = function oniwireGetSelectedNodeIds(state){
	return state.selectedNodes.size > 0
		? Array.from(state.selectedNodes)
		: (state.selected ? [state.selected] : []);
};

window.oniwireFindFirstOutputNode = function oniwireFindFirstOutputNode(state){
	for(const node of state.nodes.values()){
		if(node.type === "Output") return node;
	}
	return null;
};

window.createOniwireUtilsApi = function createOniwireUtilsApi(deps){
	const {
		serializeGraph,
		loadGraph,
		toast
	} = deps;

	const INDEX_KEY = "visual-node-app:saves:index";

	function getSaveIndex(){
		try { return JSON.parse(localStorage.getItem(INDEX_KEY) || "[]"); }
		catch { return []; }
	}

	function setSaveIndex(list){
		localStorage.setItem(INDEX_KEY, JSON.stringify(list));
	}

	function keyFor(name){
		return `visual-node-app:save:${name}`;
	}

	function refreshProjectList(selectedName = ""){
		const sel = document.getElementById("projectList");
		if(!sel) return;

		const list = getSaveIndex();
		sel.innerHTML = "";
		for(const name of list){
			const opt = document.createElement("option");
			opt.value = name;
			opt.textContent = name;
			if(selectedName && name === selectedName) opt.selected = true;
			sel.appendChild(opt);
		}
	}

	function saveNamed(name){
		name = (name || "").trim();
		if(!name){ toast("Name your project first."); return; }

		const payload = serializeGraph();
		payload.name = name;
		payload.savedAt = new Date().toISOString();

		try{
			localStorage.setItem(keyFor(name), JSON.stringify(payload));
		}catch(e){
			console.error(e);
			toast("Save failed (storage error).");
			return;
		}

		// Keep newest save at top and avoid duplicate entries.
		const list = getSaveIndex().filter(n => n !== name);
		list.unshift(name);
		setSaveIndex(list);
		refreshProjectList(name);
		const nameInput = document.getElementById("projectName");
		if(nameInput) nameInput.value = name;
		toast(`Saved: ${name} ✅`);
	}

	function loadNamed(name){
		name = (name || "").trim();
		if(!name){ toast("Pick a project to load."); return; }

		const raw = localStorage.getItem(keyFor(name));
		if(!raw){ toast("Not found."); return; }

		try{
			loadGraph(JSON.parse(raw));
			refreshProjectList(name);
			const nameInput = document.getElementById("projectName");
			if(nameInput) nameInput.value = name;
			toast(`Loaded: ${name} ✅`);
		}catch(e){
			console.error(e);
			toast("Load failed.");
		}
	}

	function deleteNamed(name){
		name = (name || "").trim();
		if(!name){ toast("Pick a project to delete."); return; }

		localStorage.removeItem(keyFor(name));
		const list = getSaveIndex().filter(n => n !== name);
		setSaveIndex(list);
		refreshProjectList();
		toast(`Deleted: ${name}`);
	}

	function importProjectFromFile(){
		const inp = document.createElement("input");
		inp.type = "file";
		inp.accept = "application/json";

		inp.onchange = async () => {
			const file = inp.files?.[0];
			if(!file) return;

			try{
				const text = await file.text();
				const data = JSON.parse(text);
				loadGraph(data);
				toast(`Imported: ${file.name} ✅`);
			}catch(e){
				console.error(e);
				toast("Import failed (invalid JSON).");
			}
		};

		inp.click();
	}

	function bindProjectButtons(){
		document.getElementById("btnSaveNamed")?.addEventListener("click", (ev) => {
			ev.preventDefault();
			const name = document.getElementById("projectName")?.value;
			saveNamed(name);
		});

		document.getElementById("btnLoadNamed")?.addEventListener("click", (ev) => {
			ev.preventDefault();
			const sel = document.getElementById("projectList");
			const pick = sel?.value;
			loadNamed(pick);
		});

		document.getElementById("btnDeleteProject")?.addEventListener("click", (ev) => {
			ev.preventDefault();
			const sel = document.getElementById("projectList");
			const pick = sel?.value;
			deleteNamed(pick);
		});
	}

	function initProjectUtils(){
		refreshProjectList();
	}

	return {
		getSaveIndex,
		setSaveIndex,
		keyFor,
		refreshProjectList,
		saveNamed,
		loadNamed,
		deleteNamed,
		importProjectFromFile,
		bindProjectButtons,
		initProjectUtils
	};
};
