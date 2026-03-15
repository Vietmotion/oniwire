(function(){
	window.__oniwireEmbedDebug = null;
	window.__oniwireEmbedDebugStatus = 'init';
	window.__oniwireEmbedDebugError = '';
	var payload = {"version":"2.0","type":"oniwire-animation-data","name":"Test 03","metadata":{"duration":5,"fps":30,"totalFrames":150,"width":1280,"height":720,"ratio":"16:9","rendererVersion":"oniwire-embed-player-1"},"project":{"version":"0.1","nextId":14,"panX":352.4963478646346,"panY":28.569447459829405,"zoom":0.7866278610665535,"nodes":[{"id":"1","type":"Gradient","name":"Gradient","pos":{"x":70.17483204930019,"y":399.4559453780027},"params":{"a":"#0ea5e9","b":"#22c55e","angle":45,"type":"radial","cx":50,"cy":50}},{"id":"2","type":"Text","name":"Text","pos":{"x":313.9098436591384,"y":-42.97118117603378},"params":{"text":"Hello 👋\nThis is Oniwire","size":158.57550647745606,"color":"#ffffff","x":644.4120007619676,"y":141.04012812895553,"weight":700,"font":"Inter","align":"center","wrapMode":"manual","boxWidth":560}},{"id":"3","type":"Composite","name":"Composite","pos":{"x":468.3251026313069,"y":378.78834654382615},"params":{"blend":"overlay","opacity":100,"inputPorts":["a","b"]}},{"id":"4","type":"Output","name":"Output","pos":{"x":1769.674813070709,"y":235.73245071864145},"params":{"ratio":"16:9","duration":5,"exportEmbedMode":true,"exportLottieMode":false}},{"id":"5","type":"Shape","name":"Shape","pos":{"x":-658.7152411495607,"y":57.052074663817905},"params":{"shape":"circle","size":79,"color":"#974d11","x":642.3091976516633,"y":375.53816046966733}},{"id":"6","type":"Gradient","name":"Gradient","pos":{"x":-982.035325849305,"y":66.71188517149486},"params":{"a":"#7712a5","b":"#22c55e","angle":45,"type":"linear","cx":50,"cy":50}},{"id":"7","type":"Clone","name":"Clone","pos":{"x":-329.8845117344243,"y":55.27064281860228},"params":{"mode":"radial","radialMode":"simple","countX":5,"countY":5,"stepX":40,"stepY":40,"radialCount":8,"radius":140,"angleStart":0,"angleStep":45,"centerX":0,"centerY":0}},{"id":"8","type":"Clone","name":"Clone","pos":{"x":-333.69825918538845,"y":176.03931209913569},"params":{"mode":"radial","radialMode":"simple","countX":5,"countY":5,"stepX":40,"stepY":40,"radialCount":8,"radius":241,"angleStart":0,"angleStep":45,"centerX":0,"centerY":0}},{"id":"9","type":"Ramp","name":"Ramp","pos":{"x":-294.289535525425,"y":395.9654151047387},"params":{"stops":[{"pos":24,"color":"#1f8ec1"},{"pos":50,"color":"#4a1c82"},{"pos":100,"color":"#250ed8"}]}},{"id":"10","type":"Glow","name":"Glow","pos":{"x":1415.5405716568644,"y":388.3379202028103},"params":{"mode":"luminance","color":"#7aa7ff","blur":7,"strength":70,"threshold":9,"intensity":36}},{"id":"11","type":"Composite","name":"Composite","pos":{"x":830.765962509018,"y":207.8205408571709},"params":{"blend":"hard-light","opacity":100,"inputPorts":["a","b"]}},{"id":"12","type":"Motion","name":"Motion","pos":{"x":48.94773506135405,"y":170.9543154978502},"params":{"mode":"breath","amount":0.08,"speed":0.5}},{"id":"13","type":"Motion","name":"Motion","pos":{"x":615.9248561047007,"y":-45.158040056788664},"params":{"mode":"breath","amount":0.04,"speed":0.6}}],"wires":[{"from":{"nodeId":"1","port":"layer"},"to":{"nodeId":"3","port":"b"}},{"from":{"nodeId":"6","port":"layer"},"to":{"nodeId":"5","port":"fill"}},{"from":{"nodeId":"5","port":"layer"},"to":{"nodeId":"7","port":"in"}},{"from":{"nodeId":"7","port":"layer"},"to":{"nodeId":"8","port":"in"}},{"from":{"nodeId":"9","port":"ramp"},"to":{"nodeId":"1","port":"ramp"}},{"from":{"nodeId":"10","port":"layer"},"to":{"nodeId":"4","port":"in"}},{"from":{"nodeId":"3","port":"layer"},"to":{"nodeId":"11","port":"b"}},{"from":{"nodeId":"8","port":"layer"},"to":{"nodeId":"12","port":"in"}},{"from":{"nodeId":"12","port":"layer"},"to":{"nodeId":"3","port":"a"}},{"from":{"nodeId":"11","port":"layer"},"to":{"nodeId":"10","port":"in"}},{"from":{"nodeId":"2","port":"layer"},"to":{"nodeId":"13","port":"in"}},{"from":{"nodeId":"13","port":"layer"},"to":{"nodeId":"11","port":"a"}}],"name":"Test 03"}};
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

	function canvasAlphaCount(canvas){
		if(!canvas) return 0;
		var ctx = canvas.getContext('2d', { willReadFrequently: true });
		if(!ctx) return 0;
		var w = canvas.width || 0;
		var h = canvas.height || 0;
		if(!w || !h) return 0;
		var data = ctx.getImageData(0, 0, w, h).data;
		var hits = 0;
		for(var i = 3; i < data.length; i += 16){
			if(data[i] > 8) hits++;
		}
		return hits;
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
			result = { canvas: c0.canvas };
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
			result = { canvas: c1.canvas };
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
			result = { canvas: c2.canvas };
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
				: String(text).replace(/\r\n/g, '\n').split('\n');
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
			result = { canvas: cText.canvas };
		}
		else if(node.type === 'Transform'){
			var srcT = this.getInput(nodeId, ['in','layer','source'], timeSec, cache);
			if(srcT && srcT.canvas){
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
				result = { canvas: c3.canvas };
			}
		}
		else if(node.type === 'Clone'){
			var srcC = this.getInput(nodeId, ['in','source'], timeSec, cache);
			if(srcC && srcC.canvas){
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
				result = { canvas: c4.canvas };
			}
		}
		else if(node.type === 'Motion'){
			var srcM = this.getInput(nodeId, ['in','source'], timeSec, cache);
			if(srcM && srcM.canvas){
				var c5 = this.createLayer();
				var amount = clamp(toNumber(params.amount, 0.08), 0, 0.5);
				var speed = Math.max(0.2, toNumber(params.speed, 2));
				var minScale = Math.max(0.01, 1 - amount);
				var maxScale = 1 + amount;
				var bounds = this.getMotionBounds(nodeId, srcM.canvas);
				var safeScale = this.getMotionSafeScale(nodeId, bounds, c5.canvas.width, c5.canvas.height);
				if(Number.isFinite(safeScale) && safeScale > 0){
					maxScale = Math.min(maxScale, Math.max(0.01, safeScale * 0.999));
					minScale = Math.min(minScale, maxScale);
				}
				var wave = (1 - Math.cos((2 * Math.PI * timeSec) / speed)) / 2;
				var scale = minScale + (maxScale - minScale) * wave;
				var cxm = bounds ? bounds.cx : (c5.canvas.width / 2);
				var cym = bounds ? bounds.cy : (c5.canvas.height / 2);
				c5.ctx.save();
				c5.ctx.translate(cxm, cym);
				c5.ctx.scale(scale, scale);
				c5.ctx.translate(-cxm, -cym);
				c5.ctx.drawImage(srcM.canvas, 0, 0);
				c5.ctx.restore();
				result = { canvas: c5.canvas };
			}
		}
		else if(node.type === 'Glow'){
			var srcG = this.getInput(nodeId, ['in','source'], timeSec, cache);
			if(srcG && srcG.canvas){
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
				result = { canvas: c6.canvas };
			}
		}
		else if(node.type === 'Mask'){
			var source = this.getInput(nodeId, ['source','in','a'], timeSec, cache);
			var mask = this.getInput(nodeId, ['mask','b'], timeSec, cache);
			if(source && source.canvas){
				var c7 = this.createLayer();
				c7.ctx.drawImage(source.canvas, 0, 0);
				if(mask && mask.canvas){
					c7.ctx.globalCompositeOperation = 'destination-in';
					c7.ctx.drawImage(mask.canvas, 0, 0);
					c7.ctx.globalCompositeOperation = 'source-over';
				}
				result = { canvas: c7.canvas };
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
				result = { canvas: c8.canvas };
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
		if(rendered && rendered.canvas){
			this.ctx.drawImage(rendered.canvas, 0, 0);
		}
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

	CompactGraphPlayer.prototype.buildDebugReport = function(timeSec){
		var t = toNumber(timeSec, 0);
		var report = { timeSec: t, nodes: [], outputAlpha: 0 };
		for(var node of this.nodes.values()){
			var rendered = this.renderNode(node.id, t, new Map());
			var alpha = rendered && rendered.canvas ? canvasAlphaCount(rendered.canvas) : 0;
			report.nodes.push({ id: String(node.id), type: String(node.type || ''), alpha: alpha });
		}
		report.nodes.sort(function(a, b){ return Number(b.alpha || 0) - Number(a.alpha || 0); });
		var outNode = Array.from(this.nodes.values()).find(function(n){ return n.type === 'Output'; });
		if(outNode){
			var outRendered = this.renderNode(outNode.id, t, new Map());
			report.outputAlpha = outRendered && outRendered.canvas ? canvasAlphaCount(outRendered.canvas) : 0;
		}
		return report;
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
	try{
		window.__oniwireEmbedDebug = player.buildDebugReport(0);
		window.__oniwireEmbedDebugStatus = 'ready';
	}catch(err){
		window.__oniwireEmbedDebugStatus = 'error';
		window.__oniwireEmbedDebugError = String(err && err.message ? err.message : err);
	}
	player.play();
})();