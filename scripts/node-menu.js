window.createOniwireNodeMenuApi = function createOniwireNodeMenuApi(deps){
  const {
    nodeButtonsEl,
    nodeDropdown,
    addNode,
    canAddNodeType,
    onBlockedNodeType
  } = deps;

  const NODE_GROUPS = {
    generator: ["Color", "Gradient", "Ramp", "Shape", "Text", "Image", "Pen"],
    operation: ["Transform", "Clone", "Composite", "Mask", "Freeze", "ColorCorrect"],
    motion: ["MotionIn", "Motion", "MotionOut"],
    effect: ["Glow", "Curves"],
    output: ["Output"]
  };

  const NODE_LABELS = {
    ColorCorrect: "Color Corrector",
    MotionIn: "Motion - In",
    Motion: "Motion - Act",
    MotionOut: "Motion - Out"
  };

  let activeGroup = "generator";

  function setActiveGroup(group){
    activeGroup = group;
    document.querySelectorAll(".nodeCategoryBtn").forEach(btn => {
      const active = btn.getAttribute("data-group") === group;
      btn.classList.toggle("active", active);
    });
  }

  function closeNodeDropdown(){
    if(!nodeDropdown) return;
    nodeDropdown.classList.add("hidden");
    nodeDropdown.setAttribute("aria-hidden", "true");
    nodeDropdown.innerHTML = "";
  }

  function openNodeDropdown(group, anchorEl){
    if(!nodeDropdown || !nodeButtonsEl) return;
    const list = NODE_GROUPS[group] || [];
    nodeDropdown.innerHTML = "";

    for(const type of list){
      const gate = typeof canAddNodeType === "function" ? canAddNodeType(type) : { ok: true };
      const item = document.createElement("button");
      item.type = "button";
      item.className = "nodeDropdownItem";
      item.textContent = NODE_LABELS[type] || type;
      item.dataset.node = type;
      if(gate && gate.ok === false){
        item.disabled = true;
        item.title = gate.reason || "Blocked by current export mode";
        item.style.opacity = "0.5";
        item.style.cursor = "not-allowed";
      }
      nodeDropdown.appendChild(item);
    }

    const parentRect = nodeButtonsEl.getBoundingClientRect();
    const btnRect = anchorEl.getBoundingClientRect();
    const left = btnRect.left - parentRect.left;
    const top = btnRect.bottom - parentRect.top + 6;

    nodeDropdown.style.left = `${Math.max(0, left)}px`;
    nodeDropdown.style.top = `${top}px`;

    nodeDropdown.classList.remove("hidden");
    nodeDropdown.setAttribute("aria-hidden", "false");
  }

  function bind(){
    nodeButtonsEl?.addEventListener("click", (e) => {
      const btn = e.target.closest?.(".nodeCategoryBtn");
      if(btn){
        const group = btn.getAttribute("data-group");
        if(!group) return;
        const wasOpen = nodeDropdown && !nodeDropdown.classList.contains("hidden");
        const sameGroup = group === activeGroup;

        setActiveGroup(group);

        if(wasOpen && sameGroup){
          closeNodeDropdown();
        }else{
          openNodeDropdown(group, btn);
        }
        return;
      }

      const item = e.target.closest?.(".nodeDropdownItem");
      if(item){
        const t = item.getAttribute("data-node");
        if(t){
          const gate = typeof canAddNodeType === "function" ? canAddNodeType(t) : { ok: true };
          if(gate && gate.ok === false){
            if(typeof onBlockedNodeType === "function") onBlockedNodeType(t, gate.reason || "Blocked by current export mode");
            return;
          }
          addNode(t);
        }
        closeNodeDropdown();
      }
    });

    window.addEventListener("mousedown", (e) => {
      if(!nodeDropdown || nodeDropdown.classList.contains("hidden")) return;
      const within = nodeButtonsEl?.contains(e.target) || nodeDropdown.contains(e.target);
      if(!within) closeNodeDropdown();
    });

    setActiveGroup("generator");
  }

  return {
    bind,
    close: closeNodeDropdown,
    open: openNodeDropdown,
    setActiveGroup
  };
};
