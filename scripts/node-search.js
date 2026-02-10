window.createOniwireNodeSearchApi = function createOniwireNodeSearchApi(deps){
  const {
    NODE_DEFS,
    NODE_CATEGORIES,
    nodeSearchEl,
    nodeSearchInput,
    nodeSearchList,
    clamp,
    editorToWorld,
    addNode,
    toast,
    isTypingTarget,
    editorEl,
    state
  } = deps;

  let nodeSearchItems = [];
  let nodeSearchIndex = 0;
  let nodeSearchOpen = false;
  let nodeSpawnEditorPos = { x: 0, y: 0 };

  function getAllNodesForSearch(){
    return Object.keys(NODE_DEFS).map(type => {
      const def = NODE_DEFS[type];
      return {
        type,
        icon: def.icon || "⬛",
        category: NODE_CATEGORIES[type] || "Other",
        haystack: `${type} ${(NODE_CATEGORIES[type] || "")}`.toLowerCase()
      };
    }).sort((a, b) => (a.category + a.type).localeCompare(b.category + b.type));
  }

  function open(atEditorX, atEditorY){
    nodeSpawnEditorPos = { x: atEditorX, y: atEditorY };

    const pad = 14;
    const boxW = 360;
    const boxH = 420;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = clamp(atEditorX + 16, pad, vw - boxW - pad);
    const top = clamp(atEditorY + 16, pad, vh - boxH - pad);

    nodeSearchEl.classList.remove("hidden");
    nodeSearchEl.style.placeItems = "start";
    nodeSearchEl.style.paddingLeft = left + "px";
    nodeSearchEl.style.paddingTop = top + "px";
    nodeSearchEl.setAttribute("aria-hidden", "false");

    nodeSearchOpen = true;
    nodeSearchInput.value = "";
    nodeSearchIndex = 0;

    renderList();
    nodeSearchInput.focus();
    nodeSearchInput.select();
  }

  function close(){
    nodeSearchEl.classList.add("hidden");
    nodeSearchEl.setAttribute("aria-hidden", "true");
    nodeSearchOpen = false;
  }

  function isOpen(){
    return nodeSearchOpen;
  }

  function filterNodes(query){
    const q = (query || "").trim().toLowerCase();
    const all = getAllNodesForSearch();
    if(!q) return all;

    const scored = [];
    for(const n of all){
      const name = n.type.toLowerCase();
      let score = 0;
      if(name.startsWith(q)) score += 100;
      if(n.haystack.includes(q)) score += 10;
      if((n.category || "").toLowerCase().includes(q)) score += 5;
      if(score > 0) scored.push({ n, score });
    }
    scored.sort((a, b) => b.score - a.score || a.n.type.localeCompare(b.n.type));
    return scored.map(s => s.n);
  }

  function renderList(){
    nodeSearchItems = filterNodes(nodeSearchInput.value);
    if(nodeSearchIndex >= nodeSearchItems.length) nodeSearchIndex = Math.max(0, nodeSearchItems.length - 1);

    nodeSearchList.innerHTML = "";

    if(nodeSearchItems.length === 0){
      const empty = document.createElement("div");
      empty.className = "nodeItem";
      empty.style.opacity = "0.6";
      empty.style.cursor = "default";
      empty.innerHTML = `<div class="nodeLeft"><div class="nodeIcon">🙃</div><div class="nodeText"><div class="nodeName">No results</div><div class="nodeCat">Try another keyword</div></div></div><div class="nodeHint">Esc</div>`;
      nodeSearchList.appendChild(empty);
      return;
    }

    nodeSearchItems.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "nodeItem" + (idx === nodeSearchIndex ? " active" : "");
      row.innerHTML = `
        <div class="nodeLeft">
          <div class="nodeIcon">${item.icon}</div>
          <div class="nodeText">
            <div class="nodeName">${item.type}</div>
            <div class="nodeCat">${item.category}</div>
          </div>
        </div>
        <div class="nodeHint">Enter</div>
      `;
      row.addEventListener("mouseenter", () => {
        nodeSearchIndex = idx;
        syncActiveRow();
      });
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });
      row.addEventListener("click", () => {
        addNodeFromSearch(item.type);
      });
      nodeSearchList.appendChild(row);
    });

    scrollActiveIntoView();
  }

  function syncActiveRow(){
    const rows = nodeSearchList.querySelectorAll(".nodeItem");
    rows.forEach((r, i) => r.classList.toggle("active", i === nodeSearchIndex));
    scrollActiveIntoView();
  }

  function scrollActiveIntoView(){
    const rows = nodeSearchList.querySelectorAll(".nodeItem");
    const active = rows[nodeSearchIndex];
    if(active) active.scrollIntoView({ block: "nearest" });
  }

  function addNodeFromSearch(type){
    const world = editorToWorld(nodeSpawnEditorPos.x, nodeSpawnEditorPos.y);
    addNode(type, { x: world.x, y: world.y });
    close();
    toast(`Added: ${type}`);
  }

  function bind(){
    nodeSearchInput.addEventListener("input", () => {
      nodeSearchIndex = 0;
      renderList();
    });

    nodeSearchEl.addEventListener("mousedown", (e) => {
      if(e.target === nodeSearchEl) close();
    });

    window.addEventListener("keydown", (e) => {
      if(!nodeSearchOpen) return;

      if(e.key === "Escape"){
        e.preventDefault();
        close();
        return;
      }

      if(e.key === "ArrowDown"){
        e.preventDefault();
        nodeSearchIndex = clamp(nodeSearchIndex + 1, 0, nodeSearchItems.length - 1);
        syncActiveRow();
        return;
      }

      if(e.key === "ArrowUp"){
        e.preventDefault();
        nodeSearchIndex = clamp(nodeSearchIndex - 1, 0, nodeSearchItems.length - 1);
        syncActiveRow();
        return;
      }

      if(e.key === "Enter"){
        e.preventDefault();
        const item = nodeSearchItems[nodeSearchIndex];
        if(item) addNodeFromSearch(item.type);
        return;
      }
    }, true);

    window.addEventListener("keydown", (e) => {
      if(e.code !== "Tab") return;
      if(isTypingTarget(e.target)) return;

      e.preventDefault();

      const rect = editorEl.getBoundingClientRect();
      const mx = state.mouse?.x ?? rect.width * 0.5;
      const my = state.mouse?.y ?? rect.height * 0.5;

      open(mx, my);
    });
  }

  return {
    bind,
    open,
    close,
    isOpen
  };
};
