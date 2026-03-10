(function(){
	var payload = {"version":"2.0","type":"oniwire-animation-data","name":"animation","metadata":{"duration":5,"fps":30,"totalFrames":150,"width":1280,"height":720,"ratio":"16:9","rendererVersion":"oniwire-embed-player-1"},"project":{"version":"0.1","nextId":9,"panX":866.9067012902349,"panY":91.50964941194678,"zoom":0.6187833918061408,"nodes":[{"id":"1","type":"Gradient","pos":{"x":-157.56293712235532,"y":291.32148804385787},"params":{"a":"#0ea5e9","b":"#22c55e","angle":45,"type":"linear","cx":50,"cy":50}},{"id":"2","type":"Text","pos":{"x":-482.393891963127,"y":-19.18764570745177},"params":{"text":"Hello luv!","size":66.34793680326418,"color":"#ffffff","x":509.3472506249944,"y":318.9459612555403,"weight":"800","font":"Roboto","wrapMode":"manual","boxWidth":560}},{"id":"3","type":"Composite","pos":{"x":500.60710717368534,"y":166.76785119561418},"params":{"blend":"normal","opacity":100}},{"id":"4","type":"Output","pos":{"x":1105.2414490784972,"y":208.17867847894414},"params":{"ratio":"16:9","duration":5}},{"id":"5","type":"Motion","pos":{"x":-159.8405881604874,"y":-18.524696305258892},"params":{"mode":"breath","amount":0.04,"speed":0.3}},{"id":"6","type":"Transform","pos":{"x":192.46363151756327,"y":-8.828249892101539},"params":{"x":5.229826353421844,"y":-4.358188627851547,"scale":1,"rot":0,"originX":0,"originY":0}},{"id":"7","type":"Shape","pos":{"x":-46.71538000698486,"y":458.21725234164467},"params":{"shape":"hexagon","size":400,"color":"#3b82f6","x":654.8336594911937,"y":355.49902152641874}},{"id":"8","type":"Ramp","pos":{"x":-559.0109655021321,"y":290.14551451358375},"params":{"stops":[{"pos":42,"color":"#105575"},{"pos":54,"color":"#158a3f"}]}}],"wires":[{"from":{"nodeId":"1","port":"layer"},"to":{"nodeId":"3","port":"b"}},{"from":{"nodeId":"2","port":"layer"},"to":{"nodeId":"5","port":"in"}},{"from":{"nodeId":"5","port":"layer"},"to":{"nodeId":"6","port":"in"}},{"from":{"nodeId":"6","port":"layer"},"to":{"nodeId":"3","port":"a"}},{"from":{"nodeId":"7","port":"layer"},"to":{"nodeId":"3","port":"mask"}},{"from":{"nodeId":"3","port":"layer"},"to":{"nodeId":"4","port":"in"}},{"from":{"nodeId":"8","port":"ramp"},"to":{"nodeId":"1","port":"ramp"}}],"name":"animation"}};
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

	function CompactGraphPlayer(canvas, data){
		this.canvas = canvas;
		this.data = data || {};
		this.metadata = this.data.metadata || {};
		this.project = this.data.project || { nodes: [], wires: [] };
		this.nodes = new Map((this.project.nodes || []).map(function(n){ return [n.id, n]; }));
		this.wires = this.project.wires || [];
		this.canvas.width = Math.max(1, Math.round(toNumber(this.metadata.width, 1280)));
		this.canvas.height = Math.max(1, Math.round(toNumber(this.metadata.height, 720)));
		this.ctx = this.canvas.getContext('2d');
		this.duration = Math.max(0.001, toNumber(this.metadata.duration, 5));
		this.currentTime = 0;
		this.startTime = null;
		this.rafId = null;
		this.isPlaying = false;
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
			var port = list[i];
			var wire = this.wires.find(function(w){ return w.to && w.to.nodeId === nodeId && w.to.port === port; });
			if(wire && wire.from) return this.renderNode(wire.from.nodeId, timeSec, cache);
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
		return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
	};

	CompactGraphPlayer.prototype.renderNode = function(nodeId, timeSec, cache){
		if(cache.has(nodeId)) return cache.get(nodeId);
		var node = this.nodes.get(nodeId);
		if(!node) return null;
		var params = node.params || {};
		var result = null;

		if(node.type === 'Ramp'){
			result = {
				stops: (Array.isArray(params.stops) ? params.stops : [])
					.map(function(s){ return { pos: clamp(toNumber(s.pos, 0), 0, 100), color: s.color || '#ffffff' }; })
					.sort(function(a,b){ return a.pos - b.pos; })
			};
			cache.set(nodeId, result);
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
			c2.ctx.fillStyle = params.color || '#3b82f6';
			this.drawShape(c2.ctx, params.shape || 'circle', x, y, size);
			c2.ctx.fill();
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
			cText.ctx.fillStyle = params.color || '#ffffff';
			cText.ctx.font = weight + ' ' + textSize + 'px ' + font;
			cText.ctx.textBaseline = 'top';
			text.split('\n').forEach(function(line, i){ cText.ctx.fillText(line, tx, ty + i * textSize * 1.1); });
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
				var angleStart = toNumber(params.angleStart, 0);
				var angleStep = toNumber(params.angleStep, 45);
				var centerX = toNumber(params.centerX, 0);
				var centerY = toNumber(params.centerY, 0);
				var drawAt = function(dx, dy){ c4.ctx.drawImage(srcC.canvas, dx, dy); };
				if(mode === 'radial'){
					for(var i2=0;i2<radialCount;i2++){
						var ang = (angleStart + angleStep * i2) * (Math.PI/180);
						drawAt(centerX + Math.cos(ang)*radius, centerY + Math.sin(ang)*radius);
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
				var wave = (1 - Math.cos((2 * Math.PI * timeSec) / speed)) / 2;
				var scale = minScale + (maxScale - minScale) * wave;
				var bounds = this.getOpaqueBounds(srcM.canvas);
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
			var a = this.getInput(nodeId, ['a','fg','in'], timeSec, cache);
			var b = this.getInput(nodeId, ['b','bg'], timeSec, cache);
			if(a || b){
				var c8 = this.createLayer();
				if(b && b.canvas) c8.ctx.drawImage(b.canvas, 0, 0);
				if(a && a.canvas){
					var blend = params.blend || params.mode || 'normal';
					var opacity = clamp(toNumber(params.opacity, 100) / 100, 0, 1);
					var blendMap = {
						normal: 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay',
						darken: 'darken', lighten: 'lighten', 'color-dodge': 'color-dodge', 'color-burn': 'color-burn',
						'hard-light': 'hard-light', 'soft-light': 'soft-light', difference: 'difference', exclusion: 'exclusion',
						hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity', add: 'lighter'
					};
					var prevA = c8.ctx.globalAlpha;
					var prevC = c8.ctx.globalCompositeOperation;
					c8.ctx.globalAlpha = opacity;
					c8.ctx.globalCompositeOperation = blendMap[blend] || blend || 'source-over';
					c8.ctx.drawImage(a.canvas, 0, 0);
					c8.ctx.globalAlpha = prevA;
					c8.ctx.globalCompositeOperation = prevC;
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

		cache.set(nodeId, result);
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
})();