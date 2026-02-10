window.createOniwireExportApi = function createOniwireExportApi(deps){
	const {
		serializeGraph,
		toast,
		state,
		previewBase
	} = deps;

	function formatBytes(bytes){
		if(bytes < 1024) return `${bytes} B`;
		const kb = bytes / 1024;
		if(kb < 1024) return `${kb.toFixed(1)} KB`;
		const mb = kb / 1024;
		if(mb < 1024) return `${mb.toFixed(1)} MB`;
		const gb = mb / 1024;
		return `${gb.toFixed(2)} GB`;
	}

	async function exportAnimationJSON(name = "animation"){
		const outNode = Array.from(state.nodes.values()).find(n => n.type === "Output");
		if(!outNode){
			toast("No Output node found.");
			return;
		}

		const duration = Math.max(0.5, Number(outNode.params?.duration) || 5);
		const fps = Math.max(1, Math.min(60, Number(outNode.params?.fps) || 30));
		const ratio = outNode.params?.ratio || "16:9";
		const totalFrames = Math.round(duration * fps);

		const payload = serializeGraph();
		payload.name = name;

		const animData = {
			version: "2.0",
			type: "oniwire-animation-data",
			name,
			metadata: {
				duration,
				fps,
				totalFrames,
				width: Math.max(1, Math.round(previewBase.w)),
				height: Math.max(1, Math.round(previewBase.h)),
				ratio
			},
			project: payload
		};

		const blob = new Blob([JSON.stringify(animData, null, 2)], { type: "application/json" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${name.replace(/[^\w\-]+/g, "_")}_animation.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);

		toast(`Animation data exported ✅ (${formatBytes(blob.size)})`);
	}

	return {
		exportAnimationJSON
	};
};
