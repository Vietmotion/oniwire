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

	function buildAnimationPayload(name){
		const outNode = Array.from(state.nodes.values()).find(n => n.type === "Output");
		if(!outNode){
			toast("No Output node found.");
			return null;
		}

		const duration = Math.max(0.5, Number(outNode.params?.duration) || 5);
		const fps = Math.max(1, Math.min(60, Number(outNode.params?.fps) || 30));
		const ratio = outNode.params?.ratio || "16:9";
		const totalFrames = Math.round(duration * fps);

		const payload = serializeGraph();
		payload.name = name;

		return {
			version: "2.0",
			type: "oniwire-animation-data",
			name,
			metadata: {
				duration,
				fps,
				totalFrames,
				width: Math.max(1, Math.round(previewBase.w)),
				height: Math.max(1, Math.round(previewBase.h)),
				ratio,
				rendererVersion: "oniwire-embed-player-1"
			},
			project: payload
		};
	}

	function persistExportBackup(name){
		try{
			const safeBase = String(name || "animation").trim() || "animation";
			const backupName = `${safeBase}__export_backup`;
			const indexKey = "visual-node-app:saves:index";
			const saveKey = `visual-node-app:save:${backupName}`;
			const payload = serializeGraph();
			payload.name = backupName;
			payload.savedAt = new Date().toISOString();

			localStorage.setItem(saveKey, JSON.stringify(payload));
			let index = [];
			try{ index = JSON.parse(localStorage.getItem(indexKey) || "[]"); }
			catch{ index = []; }
			if(!index.includes(backupName)){
				index.unshift(backupName);
				localStorage.setItem(indexKey, JSON.stringify(index));
			}
		}catch(err){
			console.warn("Could not create export backup", err);
		}
	}

	function hexToRgb01(hex){
		const raw = String(hex || "#ffffff").replace("#", "").trim();
		const full = raw.length === 3 ? `${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}` : raw;
		const r = parseInt(full.slice(0, 2), 16);
		const g = parseInt(full.slice(2, 4), 16);
		const b = parseInt(full.slice(4, 6), 16);
		return [
			Number.isFinite(r) ? r / 255 : 1,
			Number.isFinite(g) ? g / 255 : 1,
			Number.isFinite(b) ? b / 255 : 1,
			1
		];
	}

	function getShapeDimensions(params){
		const p = params || {};
		const size = Math.max(1, Number(p.size) || 100);
		const width = Math.max(1, Number(p.width) || size);
		const height = Math.max(1, Number(p.height) || size);
		return { width, height };
	}

	function polygonPoints(shapeType, width, height, cx, cy){
		const rx = width / 2;
		const ry = height / 2;
		if(shapeType === "triangle"){
			return [[cx, cy - ry], [cx + rx, cy + ry], [cx - rx, cy + ry]];
		}
		if(shapeType === "diamond"){
			return [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
		}
		if(shapeType === "hexagon"){
			const pts = [];
			for(let i = 0; i < 6; i++){
				const a = (Math.PI / 3) * i - Math.PI / 6;
				pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
			}
			return pts;
		}
		if(shapeType === "star"){
			const pts = [];
			const irx = rx * 0.5;
			const iry = ry * 0.5;
			for(let i = 0; i < 10; i++){
				const a = (Math.PI / 5) * i - Math.PI / 2;
				const rrX = i % 2 === 0 ? rx : irx;
				const rrY = i % 2 === 0 ? ry : iry;
				pts.push([cx + rrX * Math.cos(a), cy + rrY * Math.sin(a)]);
			}
			return pts;
		}
		return [];
	}

	function traceShapePath(ctx, shapeType, width, height, cx, cy){
		const rx = width / 2;
		const ry = height / 2;
		ctx.beginPath();
		if(shapeType === "square" || shapeType === "rectangle"){
			ctx.rect(cx - rx, cy - ry, width, height);
			return;
		}
		if(shapeType === "circle"){
			ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
			return;
		}
		const points = polygonPoints(shapeType, width, height, cx, cy);
		if(points.length < 3){
			ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
			return;
		}
		for(let i = 0; i < points.length; i++){
			const [px, py] = points[i];
			if(i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
	}

	function createLottieEase(){
		return {
			i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] },
			o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] }
		};
	}

	function createStaticSpatialTransform(anchorX, anchorY, positionX, positionY, rotation, scaleValue){
		const rotationValue = (rotation && typeof rotation === "object" && Object.prototype.hasOwnProperty.call(rotation, "k"))
			? rotation
			: { a: 0, k: Number(rotation || 0) };
		return {
			o: { a: 0, k: 100 },
			r: rotationValue,
			p: { a: 0, k: [Number(positionX || 0), Number(positionY || 0), 0] },
			a: { a: 0, k: [Number(anchorX || 0), Number(anchorY || 0), 0] },
			s: scaleValue
		};
	}

	function mapBlendModeToLottie(blend){
		const mode = String(blend || "normal").toLowerCase();
		const map = {
			normal: 0,
			multiply: 1,
			screen: 2,
			overlay: 3,
			darken: 4,
			lighten: 5,
			"color-dodge": 6,
			"color-burn": 7,
			"hard-light": 8,
			"soft-light": 9,
			difference: 10,
			exclusion: 11,
			hue: 12,
			saturation: 13,
			color: 14,
			luminosity: 15
		};
		return Number.isFinite(map[mode]) ? map[mode] : 0;
	}

	function applyOpacityMultiplier(layer, factor){
		const k = layer?.ks?.o;
		if(!k || !Number.isFinite(factor)) return;
		const f = Math.max(0, Math.min(1, factor));
		if(k.a === 0 && Number.isFinite(k.k)){
			k.k = Math.max(0, Math.min(100, k.k * f));
			return;
		}
		if(k.a === 1 && Array.isArray(k.k)){
			for(const frame of k.k){
				if(Array.isArray(frame?.s) && Number.isFinite(frame.s[0])) frame.s[0] = Math.max(0, Math.min(100, frame.s[0] * f));
				if(Array.isArray(frame?.e) && Number.isFinite(frame.e[0])) frame.e[0] = Math.max(0, Math.min(100, frame.e[0] * f));
			}
		}
	}

	function buildShapeItem(shapeNode, fillSpec){
		const p = shapeNode.params || {};
		const shapeType = String(p.shape || "circle");
		const { width, height } = getShapeDimensions(p);
		const fillColor = String(fillSpec?.color || p.color || "#3b82f6");
		const color = hexToRgb01(fillColor);

		if(shapeType === "circle"){
			return {
				items: [
					{ ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [width, height] }, d: 1, nm: "Ellipse Path 1" },
					{ ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1, bm: 0, nm: "Fill 1" }
				],
				ok: true
			};
		}

		if(shapeType === "square" || shapeType === "rectangle"){
			return {
				items: [
					{ ty: "rc", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [width, height] }, r: { a: 0, k: 0 }, d: 1, nm: "Rect Path 1" },
					{ ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1, bm: 0, nm: "Fill 1" }
				],
				ok: true
			};
		}

		const points = polygonPoints(shapeType, width, height, 0, 0);
		if(points.length < 3){
			return { ok: false, reason: `Unsupported shape type '${shapeType}'.` };
		}

		const zeros = points.map(() => [0, 0]);
		return {
			items: [
				{ ty: "sh", ks: { a: 0, k: { i: zeros, o: zeros, v: points, c: true } }, d: 1, nm: "Path 1" },
				{ ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1, bm: 0, nm: "Fill 1" }
			],
			ok: true
		};
	}

	function buildBreathScale(baseScalePct, amount, speed, duration, fps){
		const minS = Math.max(1, baseScalePct * Math.max(0.01, 1 - amount));
		const maxS = Math.max(1, baseScalePct * (1 + amount));
		const speedSec = 1 / Math.min(10, Math.max(0.1, Number(speed) || 1));
		const totalFrames = Math.max(1, Math.round(Math.max(0.5, Number(duration) || 5) * Math.max(1, Number(fps) || 30)));
		const halfCycleFrames = Math.max(1, Math.round((speedSec * fps) / 2));
		const keyframes = [];
		let frame = 0;
		let current = minS;
		let next = maxS;
		const ease = createLottieEase();
		while(frame < totalFrames){
			keyframes.push({
				...ease,
				t: frame,
				s: [current, current, 100],
				e: [next, next, 100]
			});
			frame += halfCycleFrames;
			current = next;
			next = next === maxS ? minS : maxS;
		}
		if(keyframes.length === 0){
			return { a: 0, k: [baseScalePct, baseScalePct, 100] };
		}
		keyframes.push({ t: totalFrames, s: [current, current, 100] });
		return { a: 1, k: keyframes };
	}

	function buildCircleRotation(baseRotation, speed, direction, duration, fps){
		const startRotation = Number(baseRotation || 0);
		const speedSec = 1 / Math.min(10, Math.max(0.1, Number(speed) || 1));
		const dir = String(direction || "clockwise").toLowerCase() === "counter-clockwise" ? -1 : 1;
		const totalFrames = Math.max(1, Math.round(Math.max(0.5, Number(duration) || 5) * Math.max(1, Number(fps) || 30)));
		const cycleFrames = Math.max(1, Math.round(speedSec * fps));
		const keyframes = [];
		let frame = 0;
		let turns = 0;
		const ease = createLottieEase();

		while(frame < totalFrames){
			keyframes.push({
				...ease,
				t: frame,
				s: [startRotation + (turns * 360 * dir)],
				e: [startRotation + ((turns + 1) * 360 * dir)]
			});
			frame += cycleFrames;
			turns += 1;
		}

		keyframes.push({
			t: totalFrames,
			s: [startRotation + (turns * 360 * dir)]
		});
		return { a: 1, k: keyframes };
	}

	function buildWigglePosition(baseX, baseY, amount, speed, randomAmount, radiusHint, duration, fps){
		const amt = Math.max(0, Math.min(0.5, Number(amount) || 0));
		const randomness = Math.max(0, Math.min(1, Number(randomAmount) || 0));
		const speedSec = 1 / Math.min(10, Math.max(0.1, Number(speed) || 1));
		const totalFrames = Math.max(1, Math.round(Math.max(0.5, Number(duration) || 5) * Math.max(1, Number(fps) || 30)));
		const hint = Math.max(1, Number(radiusHint) || Math.min(w, h));
		const radius = Math.max(0, Math.min(Math.min(w, h) / 2, hint * amt));
		if(radius <= 0.001) return { a: 0, k: [Number(baseX || 0), Number(baseY || 0), 0] };
		const jitter = radius * randomness;

		const quarterCycleFrames = Math.max(1, Math.round((speedSec * fps) / 4));
		const keyframes = [];
		let frame = 0;
		let segment = 0;
		const ease = createLottieEase();
		const tau = Math.PI * 2;

		const nodeSeed = Math.max(1, Math.floor((Number(baseX || 0) * 13) + (Number(baseY || 0) * 17) + (radius * 19)));
		let seed = nodeSeed % 2147483647;
		const seededRand = () => {
			seed = (seed * 48271) % 2147483647;
			return (seed / 2147483647);
		};

		while(frame < totalFrames){
			const fromT = (segment / 4) * tau;
			const toT = ((segment + 1) / 4) * tau;
			const from = [
				Math.cos(fromT) * radius + ((seededRand() * 2 - 1) * jitter),
				Math.sin(fromT) * radius + ((seededRand() * 2 - 1) * jitter)
			];
			const to = [
				Math.cos(toT) * radius + ((seededRand() * 2 - 1) * jitter),
				Math.sin(toT) * radius + ((seededRand() * 2 - 1) * jitter)
			];
			keyframes.push({
				...ease,
				t: frame,
				s: [Number(baseX || 0) + from[0], Number(baseY || 0) + from[1], 0],
				e: [Number(baseX || 0) + to[0], Number(baseY || 0) + to[1], 0]
			});
			frame += quarterCycleFrames;
			segment += 1;
		}

		const finalT = (segment / 4) * tau;
		const finalPoint = [
			Math.cos(finalT) * radius + ((seededRand() * 2 - 1) * jitter),
			Math.sin(finalT) * radius + ((seededRand() * 2 - 1) * jitter)
		];
		keyframes.push({
			t: totalFrames,
			s: [Number(baseX || 0) + finalPoint[0], Number(baseY || 0) + finalPoint[1], 0]
		});
		return { a: 1, k: keyframes };
	}

	function wrapTextLines(ctx, text, maxWidth){
		const src = String(text == null ? "" : text).replace(/\r\n/g, "\n");
		const rows = src.split("\n");
		const out = [];
		for(const row of rows){
			const words = row.split(/\s+/).filter(Boolean);
			if(words.length === 0){
				out.push("");
				continue;
			}
			let line = words[0];
			for(let i = 1; i < words.length; i++){
				const candidate = `${line} ${words[i]}`;
				if(ctx.measureText(candidate).width <= maxWidth){
					line = candidate;
				}else{
					out.push(line);
					line = words[i];
				}
			}
			out.push(line);
		}
		return out;
	}

	function normalizeTextAlign(value){
		const raw = String(value || "left").toLowerCase();
		return (raw === "center" || raw === "right") ? raw : "left";
	}

	function getAlignedLineOffset(align, blockWidth, lineWidth){
		if(align === "center") return (blockWidth - lineWidth) / 2;
		if(align === "right") return blockWidth - lineWidth;
		return 0;
	}

	function applyCanvasFillStyle(ctx, fillSpec, fallbackColor, width, height){
		if(fillSpec?.type === "gradient" && Array.isArray(fillSpec.stops) && fillSpec.stops.length){
			const stops = [...fillSpec.stops]
				.map(s => ({ pos: Math.max(0, Math.min(100, Number(s.pos) || 0)), color: String(s.color || fallbackColor) }))
				.sort((a, b) => a.pos - b.pos);
			let gradient = null;
			if(String(fillSpec.gradientType || "linear") === "radial"){
				const cx = Math.max(0, Math.min(100, Number(fillSpec.cx ?? 50))) / 100;
				const cy = Math.max(0, Math.min(100, Number(fillSpec.cy ?? 50))) / 100;
				const gx = width * cx;
				const gy = height * cy;
				gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.hypot(width, height) / 2);
			}else{
				const angle = (Number(fillSpec.angle) || 0) * (Math.PI / 180);
				const midX = width / 2;
				const midY = height / 2;
				const len = Math.hypot(width, height);
				const dx = Math.cos(angle) * (len / 2);
				const dy = Math.sin(angle) * (len / 2);
				gradient = ctx.createLinearGradient(midX - dx, midY - dy, midX + dx, midY + dy);
			}
			for(const stop of stops){
				gradient.addColorStop(stop.pos / 100, stop.color);
			}
			ctx.fillStyle = gradient;
			return;
		}
		ctx.fillStyle = String(fillSpec?.color || fallbackColor);
	}

	function renderTextAsImageAsset(textNode, fillSpec){
		const p = textNode.params || {};
		const text = String(p.text == null ? "" : p.text);
		const size = Math.max(1, Number(p.size) || 32);
		const x = Number(p.x) || 0;
		const y = Number(p.y) || 0;
		const weight = String(p.weight || "700");
		const font = String(p.font || "Inter");
		const color = String(p.color || "#ffffff");
		const wrapMode = String(p.wrapMode || "manual");
		const boxWidth = Math.max(80, Number(p.boxWidth) || 560);
		const align = normalizeTextAlign(p.align);
		const lineHeight = Math.max(1, size * 1.2);

		const measureCanvas = document.createElement("canvas");
		const measureCtx = measureCanvas.getContext("2d");
		if(!measureCtx){
			return null;
		}

		measureCtx.font = `${weight} ${size}px ${font}`;
		measureCtx.textBaseline = "top";

		const lines = wrapMode === "box"
			? wrapTextLines(measureCtx, text, boxWidth)
			: String(text).replace(/\r\n/g, "\n").split("\n");

		const lineWidths = lines.map(line => Math.ceil(measureCtx.measureText(line).width));
		let maxLineWidth = 1;
		for(let i = 0; i < lineWidths.length; i++){
			maxLineWidth = Math.max(maxLineWidth, lineWidths[i]);
		}
		const textBlockWidth = wrapMode === "box" ? boxWidth : maxLineWidth;

		const textHeight = Math.max(1, Math.ceil(lines.length * lineHeight));
		const padding = Math.max(2, Math.ceil(size * 0.2));
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.ceil(textBlockWidth) + (padding * 2));
		canvas.height = Math.max(1, textHeight + (padding * 2));
		const ctx = canvas.getContext("2d");
		if(!ctx){
			return null;
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		applyCanvasFillStyle(ctx, fillSpec, color, canvas.width, canvas.height);
		ctx.font = `${weight} ${size}px ${font}`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";

		for(let i = 0; i < lines.length; i++){
			const offsetX = getAlignedLineOffset(align, textBlockWidth, lineWidths[i] || 0);
			ctx.fillText(lines[i], padding + offsetX, padding + i * lineHeight);
		}

		const boundsX = align === "center"
			? (x - (textBlockWidth / 2))
			: (align === "right" ? (x - textBlockWidth) : x);

		return {
			dataUrl: canvas.toDataURL("image/png"),
			bounds: {
				x: boundsX,
				y,
				width: Math.ceil(textBlockWidth),
				height: textHeight
			},
			assetWidth: canvas.width,
			assetHeight: canvas.height,
			anchorX: canvas.width / 2,
			anchorY: canvas.height / 2,
			centerX: boundsX + (textBlockWidth / 2),
			centerY: y + (textHeight / 2)
		};
	}

	function renderShapeAsImageAsset(shapeNode, fillSpec){
		const p = shapeNode.params || {};
		const shapeType = String(p.shape || "circle");
		const { width, height } = getShapeDimensions(p);
		const x = Number(p.x) || 0;
		const y = Number(p.y) || 0;
		const fallbackColor = String(p.color || "#3b82f6");
		const padding = Math.max(2, Math.ceil(Math.max(width, height) * 0.05));
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.ceil(width + (padding * 2)));
		canvas.height = Math.max(1, Math.ceil(height + (padding * 2)));
		const ctx = canvas.getContext("2d");
		if(!ctx) return null;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		applyCanvasFillStyle(ctx, fillSpec, fallbackColor, canvas.width, canvas.height);
		traceShapePath(ctx, shapeType, width, height, canvas.width / 2, canvas.height / 2);
		ctx.fill();

		return {
			dataUrl: canvas.toDataURL("image/png"),
			bounds: {
				x: x - (width / 2),
				y: y - (height / 2),
				width,
				height
			},
			assetWidth: canvas.width,
			assetHeight: canvas.height,
			anchorX: canvas.width / 2,
			anchorY: canvas.height / 2,
			centerX: x,
			centerY: y
		};
	}

	function buildLottiePayload(name){
		const outNode = Array.from(state.nodes.values()).find(n => n.type === "Output");
		if(!outNode){
			toast("No Output node found.");
			return null;
		}

		const duration = Math.max(0.5, Number(outNode.params?.duration) || 5);
		const fps = Math.max(1, Math.min(60, Number(outNode.params?.fps) || 30));
		const totalFrames = Math.round(duration * fps);
		const w = Math.max(1, Math.round(previewBase.w));
		const h = Math.max(1, Math.round(previewBase.h));

		const nodesById = new Map(Array.from(state.nodes.values()).map(n => [String(n.id), n]));
		const inboundByNode = new Map();
		for(const wire of state.wires){
			const toId = String(wire.to?.nodeId || "");
			if(!inboundByNode.has(toId)) inboundByNode.set(toId, []);
			inboundByNode.get(toId).push(wire);
		}

		function findInput(nodeId, ports){
			const wires = inboundByNode.get(String(nodeId)) || [];
			const list = Array.isArray(ports) ? ports : [ports];
			for(const port of list){
				const wire = wires.find(w => w.to && w.to.port === port);
				if(wire && wire.from) return String(wire.from.nodeId);
			}
			return null;
		}

		function resolveGradientStops(gradientNode){
			const rampId = findInput(gradientNode.id, ["ramp"]);
			const rampNode = rampId ? nodesById.get(String(rampId)) : null;
			const rampStops = Array.isArray(rampNode?.params?.stops) ? rampNode.params.stops : [];
			if(rampStops.length >= 2){
				return rampStops
					.map(s => ({ pos: Math.max(0, Math.min(100, Number(s.pos) || 0)), color: String(s.color || "#ffffff") }))
					.sort((a, b) => a.pos - b.pos);
			}
			return [
				{ pos: 0, color: String(gradientNode.params?.a || "#000000") },
				{ pos: 100, color: String(gradientNode.params?.b || "#ffffff") }
			];
		}

		function resolveNodeFillSpec(node, fallbackColor){
			const fillId = findInput(node.id, ["fill", "color", "paint"]);
			if(!fillId){
				return { type: "solid", color: String(fallbackColor || "#ffffff") };
			}
			const fillNode = nodesById.get(String(fillId));
			if(!fillNode){
				return { type: "solid", color: String(fallbackColor || "#ffffff") };
			}
			if(fillNode.type === "Color"){
				return { type: "solid", color: String(fillNode.params?.color || fallbackColor || "#ffffff") };
			}
			if(fillNode.type === "Gradient"){
				return {
					type: "gradient",
					gradientType: String(fillNode.params?.type || "linear"),
					angle: Number(fillNode.params?.angle || 0),
					cx: Number(fillNode.params?.cx ?? 50),
					cy: Number(fillNode.params?.cy ?? 50),
					stops: resolveGradientStops(fillNode)
				};
			}
			return { type: "solid", color: String(fallbackColor || "#ffffff") };
		}

		function resolveTextFillSpec(textNode){
			return resolveNodeFillSpec(textNode, textNode.params?.color || "#ffffff");
		}

		function resolveShapeFillSpec(shapeNode){
			return resolveNodeFillSpec(shapeNode, shapeNode.params?.color || "#3b82f6");
		}

		function getCompositeLayerPorts(node){
			const fromParams = Array.isArray(node?.params?.inputPorts)
				? node.params.inputPorts.map(p => String(p || "").trim()).filter(Boolean)
				: [];
			if(fromParams.length) return fromParams;
			return ["a", "b"];
		}

		const supportedTypes = new Set(["Output", "Shape", "Transform", "Motion", "Color", "Gradient", "Ramp", "Text", "Composite"]);
		const usedNodeIds = new Set();
		(function walk(nodeId){
			const id = String(nodeId || "");
			if(!id || usedNodeIds.has(id)) return;
			usedNodeIds.add(id);
			const currentNode = nodesById.get(id);
			const wires = inboundByNode.get(id) || [];
			for(const wire of wires){
				if((currentNode?.type === "Text" || currentNode?.type === "Shape") && wire.to?.port === "fill") continue;
				if(wire.from?.nodeId != null) walk(String(wire.from.nodeId));
			}
		})(String(outNode.id));

		const unsupportedTypes = Array.from(usedNodeIds)
			.map(id => nodesById.get(id)?.type)
			.filter(type => type && !supportedTypes.has(type));

		if(unsupportedTypes.length > 0){
			const unique = Array.from(new Set(unsupportedTypes));
			toast(`Lottie export blocked: unsupported nodes used (${unique.join(", ")}).`);
			return null;
		}

		function decodeLayer(nodeId, accum){
			const node = nodesById.get(String(nodeId));
			if(!node) return null;

			if(node.type === "Transform"){
				const p = node.params || {};
				const ox = (Math.max(-100, Math.min(100, Number(p.originX) || 0)) + 100) / 200;
				const oy = (Math.max(-100, Math.min(100, Number(p.originY) || 0)) + 100) / 200;
				const next = {
					tx: (accum.tx || 0) + (Number(p.x) || 0),
					ty: (accum.ty || 0) + (Number(p.y) || 0),
					scale: (accum.scale || 1) * Math.max(0.01, Number(p.scale) || 1),
					rot: (accum.rot || 0) + (Number(p.rot) || 0),
					anchorX: w * ox,
					anchorY: h * oy,
					hasExplicitAnchor: true,
					motion: accum.motion || null
				};
				const srcId = findInput(node.id, ["in", "layer", "source"]);
				return srcId ? decodeLayer(srcId, next) : null;
			}

			if(node.type === "Motion"){
				const p = node.params || {};
				const next = {
					tx: accum.tx || 0,
					ty: accum.ty || 0,
					scale: accum.scale || 1,
					rot: accum.rot || 0,
					anchorX: accum.anchorX,
					anchorY: accum.anchorY,
					hasExplicitAnchor: Boolean(accum.hasExplicitAnchor),
					motion: {
						mode: String(p.mode || "breath"),
						amount: Math.max(0, Math.min(0.5, Number(p.amount) || 0)),
						random: Math.max(0, Math.min(1, Number(p.random) || 0)),
						direction: String(p.direction || "clockwise"),
						speed: Math.min(10, Math.max(0.1, Number(p.speed) || 1))
					}
				};
				const srcId = findInput(node.id, ["in", "layer", "source"]);
				return srcId ? decodeLayer(srcId, next) : null;
			}

			if(node.type === "Color"){
				return {
					type: "solid",
					node,
					transform: accum
				};
			}

			if(node.type === "Gradient"){
				return {
					type: "gradient",
					node,
					fillSpec: {
						type: "gradient",
						gradientType: String(node.params?.type || "linear"),
						angle: Number(node.params?.angle || 0),
						cx: Number(node.params?.cx ?? 50),
						cy: Number(node.params?.cy ?? 50),
						stops: resolveGradientStops(node)
					},
					transform: accum
				};
			}

			if(node.type === "Shape"){
				return {
					type: "shape",
					node,
					fillSpec: resolveShapeFillSpec(node),
					transform: accum
				};
			}

			if(node.type === "Text"){
				return {
					type: "text",
					node,
					fillSpec: resolveTextFillSpec(node),
					transform: accum
				};
			}

			if(node.type === "Composite"){
				const layerPorts = getCompositeLayerPorts(node);
				const layers = layerPorts
					.map(port => {
						const srcId = findInput(node.id, [port]);
						return srcId ? decodeLayer(srcId, { ...accum }) : null;
					})
					.filter(Boolean);
				if(!layers.length) return null;
				return {
					type: "composite",
					node,
					layers,
					transform: accum
				};
			}

			return null;
		}

		const sourceId = findInput(outNode.id, ["in", "layer", "source", "a"]);
		if(!sourceId){
			toast("Output node has no connected input for Lottie export.");
			return null;
		}

		const decoded = decodeLayer(sourceId, {
			tx: 0,
			ty: 0,
			scale: 1,
			rot: 0,
			anchorX: w / 2,
			anchorY: h / 2,
			hasExplicitAnchor: false,
			motion: null
		});

		if(!decoded){
			toast("Could not convert current node graph to Lottie. Try a simple Shape/Transform/Motion chain.");
			return null;
		}

		const textAssetCache = new Map();
		const shapeAssetCache = new Map();
		const gradientAssetCache = new Map();
		function getRenderedTextAsset(textNode, fillSpec){
			const key = String(textNode?.id || "") + "::" + JSON.stringify(fillSpec || {});
			if(textAssetCache.has(key)) return textAssetCache.get(key);
			const rendered = renderTextAsImageAsset(textNode, fillSpec);
			textAssetCache.set(key, rendered || null);
			return rendered;
		}

		function getRenderedShapeAsset(shapeNode, fillSpec){
			const key = String(shapeNode?.id || "") + "::" + JSON.stringify(fillSpec || {});
			if(shapeAssetCache.has(key)) return shapeAssetCache.get(key);
			const rendered = renderShapeAsImageAsset(shapeNode, fillSpec);
			shapeAssetCache.set(key, rendered || null);
			return rendered;
		}

		function getRenderedGradientAsset(gradientNode, fillSpec){
			const key = String(gradientNode?.id || "") + "::" + JSON.stringify(fillSpec || {});
			if(gradientAssetCache.has(key)) return gradientAssetCache.get(key);

			const canvas = document.createElement("canvas");
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext("2d");
			if(!ctx){
				gradientAssetCache.set(key, null);
				return null;
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			applyCanvasFillStyle(ctx, fillSpec, "#000000", canvas.width, canvas.height);
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const rendered = {
				dataUrl: canvas.toDataURL("image/png"),
				assetWidth: canvas.width,
				assetHeight: canvas.height,
				anchorX: canvas.width / 2,
				anchorY: canvas.height / 2,
				centerX: canvas.width / 2,
				centerY: canvas.height / 2
			};
			gradientAssetCache.set(key, rendered);
			return rendered;
		}

		function mergeBounds(a, b){
			if(!a) return b || null;
			if(!b) return a;
			return {
				minX: Math.min(a.minX, b.minX),
				minY: Math.min(a.minY, b.minY),
				maxX: Math.max(a.maxX, b.maxX),
				maxY: Math.max(a.maxY, b.maxY)
			};
		}

		function computeItemBounds(item){
			if(!item) return null;

			if(item.type === "composite"){
				const children = Array.isArray(item.layers)
					? item.layers
					: [item.fg, item.bg].filter(Boolean);
				let out = null;
				for(const child of children){
					out = mergeBounds(out, computeItemBounds(child));
				}
				return out;
			}

			const tx = Number(item.transform?.tx || 0);
			const ty = Number(item.transform?.ty || 0);

			if(item.type === "shape"){
				const { width: shapeWidth, height: shapeHeight } = getShapeDimensions(item.node?.params || {});
				const cx = Number(item.node?.params?.x || 0) + tx;
				const cy = Number(item.node?.params?.y || 0) + ty;
				const halfW = shapeWidth / 2;
				const halfH = shapeHeight / 2;
				return {
					minX: cx - halfW,
					minY: cy - halfH,
					maxX: cx + halfW,
					maxY: cy + halfH
				};
			}

			if(item.type === "text"){
				const rendered = getRenderedTextAsset(item.node, item.fillSpec);
				if(!rendered?.bounds) return null;
				return {
					minX: Number(rendered.bounds.x || 0) + tx,
					minY: Number(rendered.bounds.y || 0) + ty,
					maxX: Number(rendered.bounds.x || 0) + Number(rendered.bounds.width || 0) + tx,
					maxY: Number(rendered.bounds.y || 0) + Number(rendered.bounds.height || 0) + ty
				};
			}

			if(item.type === "solid"){
				return {
					minX: tx,
					minY: ty,
					maxX: w + tx,
					maxY: h + ty
				};
			}

			if(item.type === "gradient"){
				return {
					minX: tx,
					minY: ty,
					maxX: w + tx,
					maxY: h + ty
				};
			}

			return null;
		}

		function cloneItemWithoutMotion(item){
			if(!item) return null;
			if(item.type === "composite"){
				const srcChildren = Array.isArray(item.layers)
					? item.layers
					: [item.fg, item.bg].filter(Boolean);
				return {
					...item,
					layers: srcChildren.map(child => cloneItemWithoutMotion(child)).filter(Boolean),
					transform: {
						...(item.transform || {}),
						motion: null
					}
				};
			}
			return {
				...item,
				transform: {
					...(item.transform || {}),
					motion: null
				}
			};
		}

		function buildSingleLayer(item, ind, sharedAssets){
			const motion = item.transform?.motion || null;
			const baseScalePct = Math.max(1, (item.transform?.scale || 1) * 100);
			const lottieScale = motion && motion.mode === "breath"
				? buildBreathScale(baseScalePct, motion.amount, motion.speed, duration, fps)
				: { a: 0, k: [baseScalePct, baseScalePct, 100] };
			const lottieRotation = motion && motion.mode === "circle"
				? buildCircleRotation(Number(item.transform?.rot || 0), motion.speed, motion.direction, duration, fps)
				: { a: 0, k: Number(item.transform?.rot || 0) };
			const itemBounds = motion && motion.mode === "wiggle" ? computeItemBounds(item) : null;
			const radiusHint = itemBounds
				? Math.max(1, Math.min(itemBounds.maxX - itemBounds.minX, itemBounds.maxY - itemBounds.minY))
				: Math.min(w, h);

			function applyWiggleMotionPosition(layer, baseX, baseY){
				if(!(motion && motion.mode === "wiggle" && layer?.ks)) return;
				layer.ks.p = buildWigglePosition(baseX, baseY, motion.amount, motion.speed, motion.random, radiusHint, duration, fps);
			}

			if(item.type === "solid"){
				const sc = String(item.node.params?.color || "#000000");
				const solidAnchorX = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorX || (w / 2)) : (w / 2);
				const solidAnchorY = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorY || (h / 2)) : (h / 2);
				const layer = {
					ddd: 0,
					ind,
					ty: 1,
					nm: `Color ${item.node.id}`,
					sr: 1,
					ks: createStaticSpatialTransform(
						solidAnchorX,
						solidAnchorY,
						solidAnchorX + Number(item.transform?.tx || 0),
						solidAnchorY + Number(item.transform?.ty || 0),
						lottieRotation,
						lottieScale
					),
					ao: 0,
					sw: w,
					sh: h,
					sc,
					ip: 0,
					op: totalFrames,
					st: 0,
					bm: 0
				};
				applyWiggleMotionPosition(
					layer,
					solidAnchorX + Number(item.transform?.tx || 0),
					solidAnchorY + Number(item.transform?.ty || 0)
				);
				return layer;
			}

			if(item.type === "shape"){
				const fillSpec = item.fillSpec || { type: "solid", color: String(item.node.params?.color || "#3b82f6") };
				if(fillSpec.type === "gradient"){
					const rendered = getRenderedShapeAsset(item.node, fillSpec);
					if(!rendered || !rendered.dataUrl){
						toast("Lottie export failed: could not rasterize shape fill.");
						return null;
					}
					const assetId = `shape_asset_${item.node.id}`;
					const shapeAnchorX = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorX || rendered.anchorX) : rendered.anchorX;
					const shapeAnchorY = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorY || rendered.anchorY) : rendered.anchorY;
					const shapePosX = item.transform?.hasExplicitAnchor
						? shapeAnchorX + Number(item.transform?.tx || 0)
						: rendered.centerX + Number(item.transform?.tx || 0);
					const shapePosY = item.transform?.hasExplicitAnchor
						? shapeAnchorY + Number(item.transform?.ty || 0)
						: rendered.centerY + Number(item.transform?.ty || 0);

					if(!sharedAssets.some(a => a.id === assetId)){
						sharedAssets.push({ id: assetId, w: rendered.assetWidth, h: rendered.assetHeight, u: "", p: rendered.dataUrl, e: 1 });
					}

					const layer = {
						ddd: 0,
						ind,
						ty: 2,
						nm: `Shape ${item.node.id}`,
						refId: assetId,
						sr: 1,
						ks: createStaticSpatialTransform(
							shapeAnchorX,
							shapeAnchorY,
							shapePosX,
							shapePosY,
							lottieRotation,
							lottieScale
						),
						ao: 0,
						w: rendered.assetWidth,
						h: rendered.assetHeight,
						ip: 0,
						op: totalFrames,
						st: 0,
						bm: 0
					};
					applyWiggleMotionPosition(layer, shapePosX, shapePosY);
					return layer;
				}

				const shapeDef = buildShapeItem(item.node, fillSpec);
				if(!shapeDef.ok){
					toast(`Lottie export blocked: ${shapeDef.reason}`);
					return null;
				}
				const shapeX = Number(item.node.params?.x || 0);
				const shapeY = Number(item.node.params?.y || 0);
				const shapeAnchorX = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorX || 0) : 0;
				const shapeAnchorY = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorY || 0) : 0;
				const shapePosX = item.transform?.hasExplicitAnchor
					? shapeAnchorX + Number(item.transform?.tx || 0)
					: shapeX + Number(item.transform?.tx || 0);
				const shapePosY = item.transform?.hasExplicitAnchor
					? shapeAnchorY + Number(item.transform?.ty || 0)
					: shapeY + Number(item.transform?.ty || 0);
				const layer = {
					ddd: 0,
					ind,
					ty: 4,
					nm: `Shape ${item.node.id}`,
					sr: 1,
					ks: createStaticSpatialTransform(
						shapeAnchorX,
						shapeAnchorY,
						shapePosX,
						shapePosY,
						lottieRotation,
						lottieScale
					),
					ao: 0,
					shapes: [
						{
							ty: "gr",
							nm: "Shape Group",
							it: [
								...shapeDef.items,
								{ ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 }, nm: "Transform" }
							]
						}
					],
					ip: 0,
					op: totalFrames,
					st: 0,
					bm: 0
				};
				applyWiggleMotionPosition(layer, shapePosX, shapePosY);
				return layer;
			}

			if(item.type === "gradient"){
				const rendered = getRenderedGradientAsset(item.node, item.fillSpec);
				if(!rendered || !rendered.dataUrl){
					toast("Lottie export failed: could not rasterize gradient.");
					return null;
				}

				const assetId = `gradient_asset_${item.node.id}`;
				const gradientAnchorX = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorX || rendered.anchorX) : rendered.anchorX;
				const gradientAnchorY = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorY || rendered.anchorY) : rendered.anchorY;
				const gradientPosX = item.transform?.hasExplicitAnchor
					? gradientAnchorX + Number(item.transform?.tx || 0)
					: rendered.centerX + Number(item.transform?.tx || 0);
				const gradientPosY = item.transform?.hasExplicitAnchor
					? gradientAnchorY + Number(item.transform?.ty || 0)
					: rendered.centerY + Number(item.transform?.ty || 0);

				if(!sharedAssets.some(a => a.id === assetId)){
					sharedAssets.push({ id: assetId, w: rendered.assetWidth, h: rendered.assetHeight, u: "", p: rendered.dataUrl, e: 1 });
				}

				const layer = {
					ddd: 0,
					ind,
					ty: 2,
					nm: `Gradient ${item.node.id}`,
					refId: assetId,
					sr: 1,
					ks: createStaticSpatialTransform(
						gradientAnchorX,
						gradientAnchorY,
						gradientPosX,
						gradientPosY,
						lottieRotation,
						lottieScale
					),
					ao: 0,
					w: rendered.assetWidth,
					h: rendered.assetHeight,
					ip: 0,
					op: totalFrames,
					st: 0,
					bm: 0
				};
				applyWiggleMotionPosition(layer, gradientPosX, gradientPosY);
				return layer;
			}

			if(item.type === "text"){
				const rendered = getRenderedTextAsset(item.node, item.fillSpec);
				if(!rendered || !rendered.dataUrl){
					toast("Lottie export failed: could not rasterize text.");
					return null;
				}
				const assetId = `text_asset_${item.node.id}`;
				const textAnchorX = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorX || rendered.anchorX) : rendered.anchorX;
				const textAnchorY = item.transform?.hasExplicitAnchor ? Number(item.transform.anchorY || rendered.anchorY) : rendered.anchorY;
				const textPosX = item.transform?.hasExplicitAnchor
					? textAnchorX + Number(item.transform?.tx || 0)
					: rendered.centerX + Number(item.transform?.tx || 0);
				const textPosY = item.transform?.hasExplicitAnchor
					? textAnchorY + Number(item.transform?.ty || 0)
					: rendered.centerY + Number(item.transform?.ty || 0);

				if(!sharedAssets.some(a => a.id === assetId)){
					sharedAssets.push({ id: assetId, w: rendered.assetWidth, h: rendered.assetHeight, u: "", p: rendered.dataUrl, e: 1 });
				}

				const layer = {
					ddd: 0,
					ind,
					ty: 2,
					nm: `Text ${item.node.id}`,
					refId: assetId,
					sr: 1,
					ks: createStaticSpatialTransform(
						textAnchorX,
						textAnchorY,
						textPosX,
						textPosY,
						lottieRotation,
						lottieScale
					),
					ao: 0,
					w: rendered.assetWidth,
					h: rendered.assetHeight,
					ip: 0,
					op: totalFrames,
					st: 0,
					bm: 0
				};
				applyWiggleMotionPosition(layer, textPosX, textPosY);
				return layer;
			}

			return null;
		}

		function buildLayers(item, startInd, sharedAssets){
			if(!item) return { layers: [], nextInd: startInd };
			if(item.type === "composite"){
				const topChildren = Array.isArray(item.layers)
					? item.layers.filter(Boolean)
					: [item.fg, item.bg].filter(Boolean);
				if(!topChildren.length) return { layers: [], nextInd: startInd };

				function buildCompositeContent(contentStartInd){
					if(item.transform?.motion && !item.transform?.hasExplicitAnchor){
						const groupBounds = computeItemBounds(item);
						if(groupBounds){
							const pivotX = (groupBounds.minX + groupBounds.maxX) / 2;
							const pivotY = (groupBounds.minY + groupBounds.maxY) / 2;
							const staticItem = cloneItemWithoutMotion(item);
							const staticTopChildren = Array.isArray(staticItem.layers)
								? staticItem.layers.filter(Boolean)
								: [staticItem.fg, staticItem.bg].filter(Boolean);
							let nextIndWithParent = contentStartInd + 1;
							const childBucketsWithParent = [];
							for(const child of staticTopChildren){
								const childResult = buildLayers(child, nextIndWithParent, sharedAssets);
								childBucketsWithParent.push(childResult.layers);
								nextIndWithParent = childResult.nextInd;
							}
							const blendWithParent = mapBlendModeToLottie(item.node?.params?.blend);
							const opacityWithParent = Math.max(0, Math.min(1, Number(item.node?.params?.opacity ?? 100) / 100));
							for(let i = 0; i < childBucketsWithParent.length - 1; i++){
								for(const topLayer of childBucketsWithParent[i]){
									topLayer.bm = blendWithParent;
									applyOpacityMultiplier(topLayer, opacityWithParent);
								}
							}

							const controllerScale = item.transform.motion.mode === "breath"
								? buildBreathScale(100, item.transform.motion.amount, item.transform.motion.speed, duration, fps)
								: { a: 0, k: [100, 100, 100] };
							const controllerRotation = item.transform.motion.mode === "circle"
								? buildCircleRotation(0, item.transform.motion.speed, item.transform.motion.direction, duration, fps)
								: { a: 0, k: 0 };
							const controllerRadiusHint = Math.max(1, Math.min(groupBounds.maxX - groupBounds.minX, groupBounds.maxY - groupBounds.minY));
							const controllerLayer = {
								ddd: 0,
								ind: contentStartInd,
								ty: 3,
								nm: `Composite Motion ${item.node.id}`,
								sr: 1,
								ks: createStaticSpatialTransform(
									pivotX,
									pivotY,
									pivotX,
									pivotY,
									controllerRotation,
									controllerScale
								),
								ao: 0,
								ip: 0,
								op: totalFrames,
								st: 0,
								bm: 0
							};
							if(item.transform.motion.mode === "wiggle"){
								controllerLayer.ks.p = buildWigglePosition(
									pivotX,
									pivotY,
									item.transform.motion.amount,
									item.transform.motion.speed,
									item.transform.motion.random,
									controllerRadiusHint,
									duration,
									fps
								);
							}

							for(const bucket of childBucketsWithParent){
								for(const layer of bucket) layer.parent = contentStartInd;
							}

							return {
								layers: [controllerLayer, ...childBucketsWithParent.flat()],
								nextInd: nextIndWithParent
							};
						}
					}

					let nextInd = contentStartInd;
					const childBuckets = [];
					for(const child of topChildren){
						const childResult = buildLayers(child, nextInd, sharedAssets);
						childBuckets.push(childResult.layers);
						nextInd = childResult.nextInd;
					}
					const blend = mapBlendModeToLottie(item.node?.params?.blend);
					const opacityFactor = Math.max(0, Math.min(1, Number(item.node?.params?.opacity ?? 100) / 100));
					for(let i = 0; i < childBuckets.length - 1; i++){
						for(const topLayer of childBuckets[i]){
							topLayer.bm = blend;
							applyOpacityMultiplier(topLayer, opacityFactor);
						}
					}
					return {
						layers: childBuckets.flat(),
						nextInd
					};
				}

				const maskInputId = findInput(item.node.id, ["mask"]);
				if(maskInputId){
					const maskDecoded = decodeLayer(maskInputId, {
						tx: 0,
						ty: 0,
						scale: 1,
						rot: 0,
						anchorX: w / 2,
						anchorY: h / 2,
						hasExplicitAnchor: false,
						motion: null
					});
					const maskLayer = maskDecoded ? buildSingleLayer(maskDecoded, startInd, sharedAssets) : null;
					const contentBuilt = buildCompositeContent(1);
					if(maskLayer && contentBuilt.layers.length){
						const precompId = `composite_precomp_${item.node.id}_${startInd}`;
						if(!sharedAssets.some(a => a.id === precompId)){
							sharedAssets.push({
								id: precompId,
								w,
								h,
								layers: contentBuilt.layers
							});
						}

						const contentLayer = {
							ddd: 0,
							ind: startInd + 1,
							ty: 0,
							nm: `Composite ${item.node.id}`,
							refId: precompId,
							sr: 1,
							ks: createStaticSpatialTransform(
								w / 2,
								h / 2,
								w / 2,
								h / 2,
								0,
								{ a: 0, k: [100, 100, 100] }
							),
							ao: 0,
							w,
							h,
							ip: 0,
							op: totalFrames,
							st: 0,
							bm: 0,
							tt: 1
						};

						const matteLayer = {
							...maskLayer,
							td: 1
						};

						return {
							layers: [matteLayer, contentLayer],
							nextInd: startInd + 2
						};
					}
				}

				return buildCompositeContent(startInd);
			}

			const layer = buildSingleLayer(item, startInd, sharedAssets);
			if(!layer) return { layers: [], nextInd: startInd };
			return {
				layers: [layer],
				nextInd: startInd + 1
			};
		}

		const assets = [];
		const built = buildLayers(decoded, 1, assets);
		if(!built.layers.length){
			toast("Lottie export failed: no compatible layer generated.");
			return null;
		}

		return {
			v: "5.9.6",
			fr: fps,
			ip: 0,
			op: totalFrames,
			w,
			h,
			nm: `${name} (oniwire-lottie-beta)`,
			ddd: 0,
			assets,
			layers: built.layers,
			markers: [],
			metadata: {
				exporter: "oniwire-lottie-beta-0.1",
				note: "Supports Shape, Text(as image), Transform, Motion, Color, Composite(fg over bg) with eased motion keyframes."
			}
		};
	}

	function buildEmbedScript(animData){
		const runtime = `(function(){
	var payload = __ONIWIRE_PAYLOAD__;
	function toNumber(v, fallback){ var n = Number(v); return Number.isFinite(n) ? n : (fallback || 0); }
	function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
	function hexToRgba(hex, alpha){
		var raw = String(hex || '#ffffff').replace('#', '').trim();
		var full = raw.length === 3 ? (raw[0]+raw[0]+raw[1]+raw[1]+raw[2]+raw[2]) : raw;
		var r = parseInt(full.slice(0, 2), 16) || 255;
		var g = parseInt(full.slice(2, 4), 16) || 255;
		var b = parseInt(full.slice(4, 6), 16) || 255;
		return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + clamp(alpha == null ? 1 : alpha, 0, 1) + ')';
	}

	function splitLines(text){
		var LF = String.fromCharCode(10);
		var CR = String.fromCharCode(13);
		return String(text == null ? '' : text).split(CR).join('').split(LF);
	}

	function wrapTextLines(ctx, text, maxWidth){
		var width = Math.max(1, toNumber(maxWidth, 560));
		var lines = [];
		var paragraphs = splitLines(text);
		for(var pi = 0; pi < paragraphs.length; pi++){
			var para = paragraphs[pi];
			if(para === ''){
				lines.push('');
				continue;
			}
			var words = para.split(/\s+/).filter(Boolean);
			var line = '';
			for(var wi = 0; wi < words.length; wi++){
				var next = line ? (line + ' ' + words[wi]) : words[wi];
				if(ctx.measureText(next).width <= width || !line){
					line = next;
				}else{
					lines.push(line);
					line = words[wi];
				}
			}
			if(line) lines.push(line);
		}
		return lines;
	}

	function normalizeTextAlign(value){
		var v = String(value || 'left').toLowerCase();
		if(v === 'center' || v === 'right') return v;
		return 'left';
	}

	function getAlignedLineOffset(align, blockWidth, lineWidth){
		if(align === 'center') return (blockWidth - lineWidth) / 2;
		if(align === 'right') return (blockWidth - lineWidth);
		return 0;
	}

	function CompactGraphPlayer(canvas, data){
		this.canvas = canvas;
		this.data = data || {};
		this.metadata = this.data.metadata || {};
		this.project = this.data.project || { nodes: [], wires: [] };
		this.nodes = new Map((this.project.nodes || []).map(function(n){ return [String(n.id), n]; }));
		this.wires = this.project.wires || [];
		this.canvas.width = Math.max(1, Math.round(toNumber(this.metadata.width, 1280)));
		this.canvas.height = Math.max(1, Math.round(toNumber(this.metadata.height, 720)));
		this.ctx = this.canvas.getContext('2d');
		this.duration = Math.max(0.001, toNumber(this.metadata.duration, 5));
		this.currentTime = 0;
		this.startTime = null;
		this.rafId = null;
		this.isPlaying = false;
		this.imageAssetCache = new Map();
		this.motionBoundsCache = new Map();
		this.motionSafeScaleCache = new Map();
	}

	CompactGraphPlayer.prototype.createLayer = function(){
		var c = document.createElement('canvas');
		c.width = this.canvas.width;
		c.height = this.canvas.height;
		return { canvas: c, ctx: c.getContext('2d') };
	};

	CompactGraphPlayer.prototype.getInput = function(nodeId, ports, timeSec, cache){
		var list = Array.isArray(ports) ? ports : [ports];
		for(var i=0;i<list.length;i++){
			var port = String(list[i]);
			var nId = String(nodeId);
			var wire = this.wires.find(function(w){ return w.to && String(w.to.nodeId) === nId && String(w.to.port) === port; });
			if(wire && wire.from) return this.renderNode(String(wire.from.nodeId), timeSec, cache);
		}
		return null;
	};

	CompactGraphPlayer.prototype.drawShape = function(ctx, shapeType, x, y, size){
		var r = size / 2;
		ctx.beginPath();
		if(shapeType === 'square'){ ctx.rect(x-r, y-r, size, size); return; }
		if(shapeType === 'triangle'){ ctx.moveTo(x, y-r); ctx.lineTo(x+r, y+r); ctx.lineTo(x-r, y+r); ctx.closePath(); return; }
		if(shapeType === 'diamond'){ ctx.moveTo(x, y-r); ctx.lineTo(x+r, y); ctx.lineTo(x, y+r); ctx.lineTo(x-r, y); ctx.closePath(); return; }
		if(shapeType === 'hexagon'){
			for(var i=0;i<6;i++){
				var a = (Math.PI/3)*i - Math.PI/2;
				var px = x + Math.cos(a)*r;
				var py = y + Math.sin(a)*r;
				if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
			}
			ctx.closePath();
			return;
		}
		if(shapeType === 'star'){
			var r2 = r*0.5;
			for(var j=0;j<10;j++){
				var a2 = (Math.PI/5)*j - Math.PI/2;
				var rr = (j % 2 === 0) ? r : r2;
				var sx = x + Math.cos(a2)*rr;
				var sy = y + Math.sin(a2)*rr;
				if(j===0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
			}
			ctx.closePath();
			return;
		}
		ctx.arc(x, y, r, 0, Math.PI * 2);
	};

	CompactGraphPlayer.prototype.getOpaqueBounds = function(sourceCanvas){
		var w = sourceCanvas.width;
		var h = sourceCanvas.height;
		var tmp = document.createElement('canvas');
		tmp.width = w;
		tmp.height = h;
		var tctx = tmp.getContext('2d');
		tctx.drawImage(sourceCanvas, 0, 0);
		var data = tctx.getImageData(0, 0, w, h).data;
		var minX = w, minY = h, maxX = -1, maxY = -1;
		for(var y=0; y<h; y++){
			for(var x=0; x<w; x++){
				var a = data[(y*w + x)*4 + 3];
				if(a > 3){
					if(x < minX) minX = x;
					if(y < minY) minY = y;
					if(x > maxX) maxX = x;
					if(y > maxY) maxY = y;
				}
			}
		}
		if(maxX < minX || maxY < minY) return null;
		return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
	};

	CompactGraphPlayer.prototype.getMotionBounds = function(nodeId, sourceCanvas){
		var key = String(nodeId);
		if(this.motionBoundsCache.has(key)) return this.motionBoundsCache.get(key);
		var bounds = this.getOpaqueBounds(sourceCanvas);
		this.motionBoundsCache.set(key, bounds);
		return bounds;
	};

	CompactGraphPlayer.prototype.getMotionSafeScale = function(nodeId, bounds, canvasW, canvasH){
		var key = String(nodeId);
		if(this.motionSafeScaleCache.has(key)) return this.motionSafeScaleCache.get(key);
		if(!bounds){
			this.motionSafeScaleCache.set(key, Infinity);
			return Infinity;
		}
		var cxm = bounds.cx;
		var cym = bounds.cy;
		var safeScaleXMin = (cxm - bounds.minX) > 0 ? (cxm / (cxm - bounds.minX)) : Infinity;
		var safeScaleXMax = (bounds.maxX - cxm) > 0 ? ((canvasW - cxm) / (bounds.maxX - cxm)) : Infinity;
		var safeScaleYMin = (cym - bounds.minY) > 0 ? (cym / (cym - bounds.minY)) : Infinity;
		var safeScaleYMax = (bounds.maxY - cym) > 0 ? ((canvasH - cym) / (bounds.maxY - cym)) : Infinity;
		var safeScale = Math.min(safeScaleXMin, safeScaleXMax, safeScaleYMin, safeScaleYMax);
		if(!Number.isFinite(safeScale) || safeScale <= 0) safeScale = Infinity;
		this.motionSafeScaleCache.set(key, safeScale);
		return safeScale;
	};

	CompactGraphPlayer.prototype.getTimelineMeta = function(rendered){
		return {
			intro: Math.max(0, toNumber(rendered && rendered.motionIntroSec, 0)),
			outro: Math.max(0, toNumber(rendered && rendered.motionOutroSec, 0))
		};
	};

	CompactGraphPlayer.prototype.attachTimelineMeta = function(rendered, intro, outro){
		if(!rendered) return rendered;
		rendered.motionIntroSec = Math.max(0, toNumber(intro, 0));
		rendered.motionOutroSec = Math.max(0, toNumber(outro, 0));
		return rendered;
	};

	CompactGraphPlayer.prototype.mergeTimelineMeta = function(items){
		var intro = 0;
		var outro = 0;
		for(var i = 0; i < items.length; i++){
			var meta = this.getTimelineMeta(items[i]);
			intro = Math.max(intro, meta.intro);
			outro = Math.max(outro, meta.outro);
		}
		return { intro: intro, outro: outro };
	};

	CompactGraphPlayer.prototype.getImageAsset = function(nodeId, src){
		var key = String(nodeId);
		var existing = this.imageAssetCache.get(key);
		if(existing && existing.src === src) return existing;

		var entry = { src: src, img: null, loaded: false, error: false };
		if(!src){
			entry.error = true;
			this.imageAssetCache.set(key, entry);
			return entry;
		}

		var self = this;
		var img = new Image();
		entry.img = img;
		img.onload = function(){
			entry.loaded = true;
			entry.error = false;
			self.renderAtTime(self.currentTime);
		};
		img.onerror = function(){
			entry.error = true;
		};
		img.src = src;
		this.imageAssetCache.set(key, entry);
		return entry;
	};

	CompactGraphPlayer.prototype.renderNode = function(nodeId, timeSec, cache){
		var key = String(nodeId);
		if(cache.has(key)) return cache.get(key);
		var node = this.nodes.get(key);
		if(!node) return null;
		var params = node.params || {};
		var result = null;

		if(node.type === 'Ramp'){
			result = {
				stops: (Array.isArray(params.stops) ? params.stops : [])
					.map(function(s){ return { pos: clamp(toNumber(s.pos, 0), 0, 100), color: s.color || '#ffffff' }; })
					.sort(function(a,b){ return a.pos - b.pos; })
			};
			cache.set(key, result);
			return result;
		}

		if(node.type === 'Color'){
			var c0 = this.createLayer();
			c0.ctx.fillStyle = params.color || '#000000';
			c0.ctx.fillRect(0, 0, c0.canvas.width, c0.canvas.height);
			result = this.attachTimelineMeta({ canvas: c0.canvas }, 0, 0);
		}
		else if(node.type === 'Gradient'){
			var c1 = this.createLayer();
			var ramp = this.getInput(nodeId, 'ramp', timeSec, cache);
			var stops = (ramp && ramp.stops && ramp.stops.length)
				? ramp.stops
				: [{ pos: 0, color: params.a || '#000000' }, { pos: 100, color: params.b || '#ffffff' }];
			if((params.type || 'linear') === 'radial'){
				var rcx = (toNumber(params.cx, 50) / 100) * c1.canvas.width;
				var rcy = (toNumber(params.cy, 50) / 100) * c1.canvas.height;
				var rg = c1.ctx.createRadialGradient(rcx, rcy, 0, rcx, rcy, Math.hypot(c1.canvas.width, c1.canvas.height) / 2);
				stops.forEach(function(s){ rg.addColorStop(clamp(s.pos / 100, 0, 1), s.color); });
				c1.ctx.fillStyle = rg;
			}else{
				var angle = (toNumber(params.angle, 45) - 90) * (Math.PI / 180);
				var cx = c1.canvas.width / 2;
				var cy = c1.canvas.height / 2;
				var len = Math.hypot(c1.canvas.width, c1.canvas.height);
				var dx = Math.cos(angle) * (len / 2);
				var dy = Math.sin(angle) * (len / 2);
				var lg = c1.ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
				stops.forEach(function(s){ lg.addColorStop(clamp(s.pos / 100, 0, 1), s.color); });
				c1.ctx.fillStyle = lg;
			}
			c1.ctx.fillRect(0, 0, c1.canvas.width, c1.canvas.height);
			result = this.attachTimelineMeta({ canvas: c1.canvas }, 0, 0);
		}
		else if(node.type === 'Image'){
			var cImg = this.createLayer();
			var srcUrl = String(params.src || '');
			var asset = this.getImageAsset(nodeId, srcUrl);
			if(asset && asset.loaded && asset.img){
				var ix = toNumber(params.x, 0);
				var iy = toNumber(params.y, 0);
				var iw = Math.max(1, toNumber(params.width, asset.img.naturalWidth || cImg.canvas.width));
				var ih = Math.max(1, toNumber(params.height, asset.img.naturalHeight || cImg.canvas.height));
				var fit = String(params.fit || 'contain');
				var opacity = clamp(toNumber(params.opacity, 100) / 100, 0, 1);
				var sw = Math.max(1, asset.img.naturalWidth || asset.img.width || iw);
				var sh = Math.max(1, asset.img.naturalHeight || asset.img.height || ih);

				cImg.ctx.save();
				cImg.ctx.globalAlpha = opacity;
				if(fit === 'fill'){
					cImg.ctx.drawImage(asset.img, ix, iy, iw, ih);
				}else{
					var scale = fit === 'cover'
						? Math.max(iw / sw, ih / sh)
						: Math.min(iw / sw, ih / sh);
					var dw = sw * scale;
					var dh = sh * scale;
					var dx = ix + (iw - dw) / 2;
					var dy = iy + (ih - dh) / 2;
					cImg.ctx.beginPath();
					cImg.ctx.rect(ix, iy, iw, ih);
					cImg.ctx.clip();
					cImg.ctx.drawImage(asset.img, dx, dy, dw, dh);
				}
				cImg.ctx.restore();
			}
			result = this.attachTimelineMeta({ canvas: cImg.canvas }, 0, 0);
		}
		else if(node.type === 'Shape'){
			var c2 = this.createLayer();
			var size = Math.max(1, toNumber(params.size, 100));
			var x = toNumber(params.x, c2.canvas.width / 2);
			var y = toNumber(params.y, c2.canvas.height / 2);
			var fillInShape = this.getInput(nodeId, ['fill','color','paint'], timeSec, cache);
			if(fillInShape && fillInShape.canvas){
				var shapeMaskLayer = this.createLayer();
				shapeMaskLayer.ctx.fillStyle = '#ffffff';
				this.drawShape(shapeMaskLayer.ctx, params.shape || 'circle', x, y, size);
				shapeMaskLayer.ctx.fill();
				c2.ctx.drawImage(fillInShape.canvas, 0, 0);
				c2.ctx.globalCompositeOperation = 'destination-in';
				c2.ctx.drawImage(shapeMaskLayer.canvas, 0, 0);
				c2.ctx.globalCompositeOperation = 'source-over';
			}else{
				c2.ctx.fillStyle = params.color || '#3b82f6';
				this.drawShape(c2.ctx, params.shape || 'circle', x, y, size);
				c2.ctx.fill();
			}
			result = this.attachTimelineMeta({ canvas: c2.canvas }, 0, 0);
		}
		else if(node.type === 'Text'){
			var cText = this.createLayer();
			var text = String(params.text == null ? '' : params.text);
			var textSize = Math.max(1, toNumber(params.size, 32));
			var tx = toNumber(params.x, 0);
			var ty = toNumber(params.y, 0);
			var weight = String(params.weight || 700);
			var font = params.font || 'Inter';
			var wrapMode = String(params.wrapMode || 'manual');
			var boxWidth = Math.max(80, toNumber(params.boxWidth, 560));
			var align = normalizeTextAlign(params.align);
			var lineHeight = textSize * 1.1;
			var fillIn = this.getInput(nodeId, ['fill','color','paint'], timeSec, cache);
			cText.ctx.font = weight + ' ' + textSize + 'px ' + font;
			cText.ctx.textBaseline = 'top';
			cText.ctx.textAlign = 'left';

			var lines = wrapMode === 'box'
				? wrapTextLines(cText.ctx, text, boxWidth)
				: String(text).replace(/\\r\\n/g, '\\n').split('\\n');
			var lineWidths = lines.map(function(line){ return cText.ctx.measureText(line).width; });
			var maxLineWidth = 1;
			for(var lw = 0; lw < lineWidths.length; lw++) maxLineWidth = Math.max(maxLineWidth, lineWidths[lw]);
			var textBlockWidth = wrapMode === 'box' ? boxWidth : maxLineWidth;
			var baseX = tx;
			if(align === 'center') baseX = tx - (textBlockWidth / 2);
			if(align === 'right') baseX = tx - textBlockWidth;
			var getLineX = function(lineWidth){ return baseX + getAlignedLineOffset(align, textBlockWidth, lineWidth); };

			if(fillIn && fillIn.canvas){
				var maskLayer = this.createLayer();
				maskLayer.ctx.fillStyle = '#ffffff';
				maskLayer.ctx.font = weight + ' ' + textSize + 'px ' + font;
				maskLayer.ctx.textBaseline = 'top';
				maskLayer.ctx.textAlign = 'left';
				lines.forEach(function(line, i){ maskLayer.ctx.fillText(line, getLineX(lineWidths[i] || 0), ty + i * lineHeight); });
				cText.ctx.drawImage(fillIn.canvas, 0, 0);
				cText.ctx.globalCompositeOperation = 'destination-in';
				cText.ctx.drawImage(maskLayer.canvas, 0, 0);
				cText.ctx.globalCompositeOperation = 'source-over';
			}else{
				cText.ctx.fillStyle = params.color || '#ffffff';
				lines.forEach(function(line, i){ cText.ctx.fillText(line, getLineX(lineWidths[i] || 0), ty + i * lineHeight); });
			}
			result = this.attachTimelineMeta({ canvas: cText.canvas }, 0, 0);
		}
		else if(node.type === 'Transform'){
			var srcT = this.getInput(nodeId, ['in','layer','source'], timeSec, cache);
			if(srcT && srcT.canvas){
				var srcTMeta = this.getTimelineMeta(srcT);
				var c3 = this.createLayer();
				var xx = toNumber(params.x, 0);
				var yy = toNumber(params.y, 0);
				var ss = toNumber(params.scale, 1);
				var rr = toNumber(params.rot, 0) * (Math.PI/180);
				var ox = ((toNumber(params.originX,0) + 100) / 2) / 100;
				var oy = ((toNumber(params.originY,0) + 100) / 2) / 100;
				var px = c3.canvas.width * ox;
				var py = c3.canvas.height * oy;
				c3.ctx.save();
				c3.ctx.translate(px + xx, py + yy);
				c3.ctx.rotate(rr);
				c3.ctx.scale(ss, ss);
				c3.ctx.translate(-px, -py);
				c3.ctx.drawImage(srcT.canvas, 0, 0);
				c3.ctx.restore();
				result = this.attachTimelineMeta({ canvas: c3.canvas }, srcTMeta.intro, srcTMeta.outro);
			}
		}
		else if(node.type === 'Clone'){
			var srcC = this.getInput(nodeId, ['in','source'], timeSec, cache);
			if(srcC && srcC.canvas){
				var srcCMeta = this.getTimelineMeta(srcC);
				var c4 = this.createLayer();
				var mode = params.mode || 'x';
				var countX = Math.max(1, Math.round(toNumber(params.countX, 1)));
				var countY = Math.max(1, Math.round(toNumber(params.countY, 1)));
				var stepX = toNumber(params.stepX, 0);
				var stepY = toNumber(params.stepY, 0);
				var radialCount = Math.max(1, Math.round(toNumber(params.radialCount, 1)));
				var radius = toNumber(params.radius, 0);
				var radialMode = String(params.radialMode || 'simple');
				var angleStart = toNumber(params.angleStart, 0);
				var angleStep = toNumber(params.angleStep, 45);
				var centerX = toNumber(params.centerX, 0);
				var centerY = toNumber(params.centerY, 0);
				var drawAt = function(dx, dy){ c4.ctx.drawImage(srcC.canvas, dx, dy); };
				if(mode === 'radial'){
					if(radialMode === 'advanced'){
						for(var i2=0;i2<radialCount;i2++){
							var ang = (angleStart - 90 + angleStep * i2) * (Math.PI/180);
							drawAt(centerX + Math.cos(ang)*radius, centerY + Math.sin(ang)*radius);
						}
					}else{
						var evenStep = 360 / radialCount;
						for(var iSimple=0;iSimple<radialCount;iSimple++){
							var angSimple = (-90 + evenStep * iSimple) * (Math.PI/180);
							drawAt(Math.cos(angSimple)*radius, Math.sin(angSimple)*radius);
						}
					}
				}else if(mode === 'xy'){
					for(var yy2=0; yy2<countY; yy2++) for(var xx2=0; xx2<countX; xx2++) drawAt(xx2*stepX, yy2*stepY);
				}else if(mode === 'y'){
					for(var yy3=0; yy3<countY; yy3++) drawAt(0, yy3*stepY);
				}else{
					for(var xx3=0; xx3<countX; xx3++) drawAt(xx3*stepX, 0);
				}
				result = this.attachTimelineMeta({ canvas: c4.canvas }, srcCMeta.intro, srcCMeta.outro);
			}
		}
		else if(node.type === 'MotionIn'){
			var srcMI = this.getInput(nodeId, ['in','source'], timeSec, cache);
			if(srcMI && srcMI.canvas){
				var srcMIMeta = this.getTimelineMeta(srcMI);
				var cIn = this.createLayer();
				var inMode = String(params.mode || 'pop').toLowerCase();
				var inDir = String(params.direction || 'top-down').toLowerCase();
				var inDuration = Math.max(0.05, toNumber(params.duration, 0.6));
				var overrideAct = Boolean(params.overrideAct);
				var inAmount = clamp(toNumber(params.amount, 0.18), 0, 0.8);
				var localInTime = Math.max(0, timeSec - srcMIMeta.intro);
				var progressIn = clamp(localInTime / inDuration, 0, 1);
				var introScale = 1 - inAmount;
				var scaleIn = progressIn < 0.7
					? introScale + ((1 + (inAmount * 0.35) - introScale) * (progressIn / 0.7))
					: (1 + (inAmount * 0.35)) + ((1 - (1 + (inAmount * 0.35))) * ((progressIn - 0.7) / 0.3));
				var introStarted = timeSec >= srcMIMeta.intro;
				var opacityIn = !introStarted ? 0 : (progressIn < 0.15 ? clamp(progressIn / 0.15, 0, 1) : 1);
				var boundsIn = this.getMotionBounds(nodeId, srcMI.canvas);
				var cxi = boundsIn ? boundsIn.cx : (cIn.canvas.width / 2);
				var cyi = boundsIn ? boundsIn.cy : (cIn.canvas.height / 2);
				var inOpacity = inMode === 'fade'
					? (!introStarted ? 0 : (progressIn < 0.15 ? clamp(progressIn / 0.15, 0, 1) : 1))
					: 1;

				var flyTx = 0;
				var flyTy = 0;
				if(inMode === 'fly'){
					var minXIn = boundsIn ? boundsIn.minX : (cIn.canvas.width * 0.4);
					var minYIn = boundsIn ? boundsIn.minY : (cIn.canvas.height * 0.4);
					var maxXIn = boundsIn ? boundsIn.maxX : (cIn.canvas.width * 0.6);
					var maxYIn = boundsIn ? boundsIn.maxY : (cIn.canvas.height * 0.6);
					var padIn = 24;
					var startTx = 0;
					var startTy = 0;
					if(inDir === 'bottom-up'){
						startTy = Math.max(0, (cIn.canvas.height - minYIn) + padIn);
					}else if(inDir === 'left'){
						startTx = -Math.max(0, maxXIn + padIn);
					}else if(inDir === 'right'){
						startTx = Math.max(0, (cIn.canvas.width - minXIn) + padIn);
					}else{
						startTy = -Math.max(0, maxYIn + padIn);
					}
					var easeIn = 1 - Math.pow(1 - progressIn, 3);
					flyTx = startTx * (1 - easeIn);
					flyTy = startTy * (1 - easeIn);
				}
				cIn.ctx.save();
				cIn.ctx.globalAlpha = inOpacity;
				cIn.ctx.translate(cxi, cyi);
				if(inMode === 'pop') cIn.ctx.scale(scaleIn, scaleIn);
				cIn.ctx.translate(-cxi, -cyi);
				if(inMode === 'fly') cIn.ctx.translate(flyTx, flyTy);
				cIn.ctx.drawImage(srcMI.canvas, 0, 0);
				cIn.ctx.restore();
				result = this.attachTimelineMeta({ canvas: cIn.canvas }, srcMIMeta.intro + (overrideAct ? inDuration : 0), srcMIMeta.outro);
			}
		}
		else if(node.type === 'Motion'){
			var srcM = this.getInput(nodeId, ['in','source'], timeSec, cache);
			if(srcM && srcM.canvas){
				var srcMMeta = this.getTimelineMeta(srcM);
				var c5 = this.createLayer();
				var motionMode = String(params.mode || 'breath');
				var amount = clamp(toNumber(params.amount, 0.08), 0, 0.5);
				var speed = Math.max(0.1, toNumber(params.speed, 1));
				var random = clamp(toNumber(params.random, 0), 0, 1);
				var direction = String(params.direction || 'clockwise').toLowerCase() === 'counter-clockwise' ? -1 : 1;
				var totalDur = Math.max(0.5, toNumber(this.duration, 5));
				var activeTime = Math.max(0, timeSec - srcMMeta.intro);
				var minScale = Math.max(0.01, 1 - amount);
				var maxScale = 1 + amount;
				var bounds = this.getMotionBounds(nodeId, srcM.canvas);
				var safeScale = this.getMotionSafeScale(nodeId, bounds, c5.canvas.width, c5.canvas.height);
				if(Number.isFinite(safeScale) && safeScale > 0){
					maxScale = Math.min(maxScale, Math.max(0.01, safeScale * 0.999));
					minScale = Math.min(minScale, maxScale);
				}
				var wave = (1 - Math.cos((2 * Math.PI * activeTime) / speed)) / 2;
				var scale = minScale + (maxScale - minScale) * wave;
				var cxm = bounds ? bounds.cx : (c5.canvas.width / 2);
				var cym = bounds ? bounds.cy : (c5.canvas.height / 2);
				var actVisible = timeSec >= srcMMeta.intro && timeSec <= Math.max(srcMMeta.intro, totalDur - srcMMeta.outro);
				c5.ctx.save();
				c5.ctx.translate(cxm, cym);
				if(actVisible && motionMode === 'circle'){
					c5.ctx.rotate(direction * ((activeTime / speed) * Math.PI * 2));
				}else if(actVisible && motionMode === 'wiggle'){
					var baseSize = bounds ? Math.max(1, Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)) : 100;
					var radius = Math.max(0, baseSize * amount);
					var jitter = radius * random;
					var tx = Math.cos((activeTime / speed) * Math.PI * 2) * radius;
					var ty = Math.sin((activeTime / speed) * Math.PI * 2) * radius;
					if(jitter > 0){
						tx += Math.sin((activeTime / speed) * Math.PI * 11) * jitter;
						ty += Math.cos((activeTime / speed) * Math.PI * 7) * jitter;
					}
					c5.ctx.translate(tx, ty);
				}else{
					c5.ctx.scale(actVisible ? scale : 1, actVisible ? scale : 1);
				}
				c5.ctx.translate(-cxm, -cym);
				c5.ctx.drawImage(srcM.canvas, 0, 0);
				c5.ctx.restore();
				result = this.attachTimelineMeta({ canvas: c5.canvas }, srcMMeta.intro, srcMMeta.outro);
			}
		}
		else if(node.type === 'MotionOut'){
			var srcMO = this.getInput(nodeId, ['in','source'], timeSec, cache);
			if(srcMO && srcMO.canvas){
				var srcMOMeta = this.getTimelineMeta(srcMO);
				var cOut = this.createLayer();
				var outMode = String(params.mode || 'fade').toLowerCase();
				var outDirRaw = String(params.direction || 'top-up').toLowerCase();
				var outDir = outDirRaw === 'top-down'
					? 'top-up'
					: (outDirRaw === 'bottom-up' ? 'bottom-down' : outDirRaw);
				var outDuration = Math.max(0.05, toNumber(params.duration, 0.6));
				var outAmount = clamp(toNumber(params.amount, 0.18), 0, 0.8);
				var useStartTime = Boolean(params.useStartTime);
				var requestedStart = Math.max(0, toNumber(params.startTime, 0));
				var totalOutDur = Math.max(0.5, toNumber(this.duration, 5));
				var outStart = useStartTime
					? clamp(requestedStart, srcMOMeta.intro, Math.max(srcMOMeta.intro, totalOutDur - 0.001))
					: Math.max(0, totalOutDur - srcMOMeta.outro - outDuration);
				var progressOut = clamp((timeSec - outStart) / outDuration, 0, 1);
				var outScale = 1 + ((Math.max(0.01, 1 - outAmount) - 1) * progressOut);
				var outOpacity = 1 - progressOut;
				var boundsOut = this.getMotionBounds(nodeId, srcMO.canvas);
				var cxo = boundsOut ? boundsOut.cx : (cOut.canvas.width / 2);
				var cyo = boundsOut ? boundsOut.cy : (cOut.canvas.height / 2);
				var flyTxOut = 0;
				var flyTyOut = 0;
				if(outMode === 'fly'){
					var minXOut = boundsOut ? boundsOut.minX : (cOut.canvas.width * 0.4);
					var minYOut = boundsOut ? boundsOut.minY : (cOut.canvas.height * 0.4);
					var maxXOut = boundsOut ? boundsOut.maxX : (cOut.canvas.width * 0.6);
					var maxYOut = boundsOut ? boundsOut.maxY : (cOut.canvas.height * 0.6);
					var padOut = 24;
					var endTxOut = 0;
					var endTyOut = 0;
					if(outDir === 'bottom-down'){
						endTyOut = Math.max(0, (cOut.canvas.height - minYOut) + padOut);
					}else if(outDir === 'left'){
						endTxOut = -Math.max(0, maxXOut + padOut);
					}else if(outDir === 'right'){
						endTxOut = Math.max(0, (cOut.canvas.width - minXOut) + padOut);
					}else{
						endTyOut = -Math.max(0, maxYOut + padOut);
					}
					var easeOut = 1 - Math.pow(1 - progressOut, 3);
					flyTxOut = endTxOut * easeOut;
					flyTyOut = endTyOut * easeOut;
				}
				cOut.ctx.save();
				cOut.ctx.globalAlpha = outOpacity;
				cOut.ctx.translate(cxo, cyo);
				if(outMode === 'pop') cOut.ctx.scale(outScale, outScale);
				cOut.ctx.translate(-cxo, -cyo);
				if(outMode === 'fly') cOut.ctx.translate(flyTxOut, flyTyOut);
				cOut.ctx.drawImage(srcMO.canvas, 0, 0);
				cOut.ctx.restore();
				var nextOutMeta = useStartTime
					? Math.max(srcMOMeta.outro, Math.max(0, totalOutDur - outStart))
					: (srcMOMeta.outro + outDuration);
				result = this.attachTimelineMeta({ canvas: cOut.canvas }, srcMOMeta.intro, nextOutMeta);
			}
		}
		else if(node.type === 'Glow'){
			var srcG = this.getInput(nodeId, ['in','source'], timeSec, cache);
			if(srcG && srcG.canvas){
				var srcGMeta = this.getTimelineMeta(srcG);
				var c6 = this.createLayer();
				var blur = Math.max(0, toNumber(params.blur, 24));
				var strength = clamp(toNumber(params.strength, 70) / 100, 0, 1);
				var color = params.color || '#7aa7ff';
				c6.ctx.save();
				c6.ctx.shadowColor = hexToRgba(color, strength);
				c6.ctx.shadowBlur = blur;
				c6.ctx.drawImage(srcG.canvas, 0, 0);
				c6.ctx.restore();
				c6.ctx.drawImage(srcG.canvas, 0, 0);
				result = this.attachTimelineMeta({ canvas: c6.canvas }, srcGMeta.intro, srcGMeta.outro);
			}
		}
		else if(node.type === 'Mask'){
			var source = this.getInput(nodeId, ['source','in','a'], timeSec, cache);
			var mask = this.getInput(nodeId, ['mask','b'], timeSec, cache);
			if(source && source.canvas){
				var sourceMeta = this.getTimelineMeta(source);
				var c7 = this.createLayer();
				c7.ctx.drawImage(source.canvas, 0, 0);
				if(mask && mask.canvas){
					c7.ctx.globalCompositeOperation = 'destination-in';
					c7.ctx.drawImage(mask.canvas, 0, 0);
					c7.ctx.globalCompositeOperation = 'source-over';
				}
				result = this.attachTimelineMeta({ canvas: c7.canvas }, sourceMeta.intro, sourceMeta.outro);
			}
		}
		else if(node.type === 'Composite'){
			var layerPorts = Array.isArray(params.inputPorts) && params.inputPorts.length
				? params.inputPorts.map(function(p){ return String(p || '').trim(); }).filter(Boolean)
				: ['a', 'b'];
			var layerInputs = layerPorts.map(function(port){ return this.getInput(nodeId, [port], timeSec, cache); }, this);
			var hasLayer = layerInputs.some(function(v){ return v && v.canvas; });
			var m = this.getInput(nodeId, ['mask','m'], timeSec, cache);
			if(hasLayer){
				var compositeMeta = this.mergeTimelineMeta(layerInputs.filter(function(v){ return v && v.canvas; }));
				var c8 = this.createLayer();
				var blend = params.blend || params.mode || 'normal';
				var opacity = clamp(toNumber(params.opacity, 100) / 100, 0, 1);
				var blendMap = {
					normal: 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay',
					darken: 'darken', lighten: 'lighten', 'color-dodge': 'color-dodge', 'color-burn': 'color-burn',
					'hard-light': 'hard-light', 'soft-light': 'soft-light', difference: 'difference', exclusion: 'exclusion',
					hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity', add: 'lighter'
				};
				var foundBottom = false;
				for(var li = layerInputs.length - 1; li >= 0; li--){
					var layerInput = layerInputs[li];
					if(!layerInput || !layerInput.canvas) continue;
					if(!foundBottom){
						c8.ctx.drawImage(layerInput.canvas, 0, 0);
						foundBottom = true;
					}else{
						var prevA = c8.ctx.globalAlpha;
						var prevC = c8.ctx.globalCompositeOperation;
						c8.ctx.globalAlpha = opacity;
						c8.ctx.globalCompositeOperation = blendMap[blend] || blend || 'source-over';
						c8.ctx.drawImage(layerInput.canvas, 0, 0);
						c8.ctx.globalAlpha = prevA;
						c8.ctx.globalCompositeOperation = prevC;
					}
				}
				if(m && m.canvas){
					c8.ctx.globalCompositeOperation = 'destination-in';
					c8.ctx.drawImage(m.canvas, 0, 0);
					c8.ctx.globalCompositeOperation = 'source-over';
				}
				result = this.attachTimelineMeta({ canvas: c8.canvas }, compositeMeta.intro, compositeMeta.outro);
			}
		}
		else if(node.type === 'Freeze'){
			result = this.getInput(nodeId, ['in','source'], timeSec, cache);
		}
		else if(node.type === 'Output'){
			result = this.getInput(nodeId, ['in','layer','source','a'], timeSec, cache);
		}

		cache.set(key, result);
		return result;
	};

	CompactGraphPlayer.prototype.renderAtTime = function(timeSec){
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		var output = Array.from(this.nodes.values()).find(function(n){ return n.type === 'Output'; });
		if(!output) return;
		var rendered = this.renderNode(output.id, timeSec, new Map());
		if(rendered && rendered.canvas) this.ctx.drawImage(rendered.canvas, 0, 0);
	};

	CompactGraphPlayer.prototype.play = function(){
		if(this.isPlaying) return;
		this.isPlaying = true;
		var self = this;
		function tick(now){
			if(!self.isPlaying) return;
			if(self.startTime === null) self.startTime = now - self.currentTime * 1000;
			var elapsed = (now - self.startTime) / 1000;
			self.currentTime = elapsed;
			self.renderAtTime(self.currentTime);
			self.rafId = requestAnimationFrame(tick);
		}
		this.rafId = requestAnimationFrame(tick);
	};

	var script = document.currentScript;
	var host = document.createElement('div');
	host.className = 'oniwire-embed-root';
	host.style.width = '100%';
	host.style.position = 'relative';
	host.style.aspectRatio = String(Math.max(1, toNumber(payload.metadata && payload.metadata.width, 1280))) + ' / ' + String(Math.max(1, toNumber(payload.metadata && payload.metadata.height, 720)));

	var canvas = document.createElement('canvas');
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.style.display = 'block';
	host.appendChild(canvas);

	if(script && script.parentNode){
		script.parentNode.insertBefore(host, script.nextSibling);
	}else if(document.body){
		document.body.appendChild(host);
	}

	var player = new CompactGraphPlayer(canvas, payload);
	player.renderAtTime(0);
	player.play();
})();`;

		return runtime.replace("__ONIWIRE_PAYLOAD__", JSON.stringify(animData));
	}

	async function exportAnimationJSON(name = "animation"){
		persistExportBackup(name);
		const animData = buildAnimationPayload(name);
		if(!animData) return;

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

	async function exportEmbedJS(name = "animation"){
		persistExportBackup(name);
		const animData = buildAnimationPayload(name);
		if(!animData) return;

		const scriptText = buildEmbedScript(animData);
		const blob = new Blob([scriptText], { type: "text/javascript" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${name.replace(/[^\w\-]+/g, "_")}_embed.js`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);

		toast(`Embed JS exported ✅ (${formatBytes(blob.size)})`);
	}

	async function exportLottieJSON(name = "animation"){
		persistExportBackup(name);
		const lottiePayload = buildLottiePayload(name);
		if(!lottiePayload) return;

		const blob = new Blob([JSON.stringify(lottiePayload, null, 2)], { type: "application/json" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${name.replace(/[^\w\-]+/g, "_")}_lottie.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);

		toast(`Lottie JSON exported (beta) ✅ (${formatBytes(blob.size)})`);
	}

	return {
		exportAnimationJSON,
		exportEmbedJS,
		exportLottieJSON
	};
};
