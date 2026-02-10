window.createOniwireNodeDefsApi = function createOniwireNodeDefsApi(deps){
	const {
		normalizeRampStops,
		ensureMotionStyles,
		measureLayerBounds,
		propagateMotionFlag,
		clamp,
		parseHexColor
	} = deps;

	const basicNodes = {
		Color: window.createOniwireColorNodeDef(),
		Gradient: window.createOniwireGradientNodeDef({ normalizeRampStops }),
		Ramp: window.createOniwireRampNodeDef({ normalizeRampStops })
	};

	const shapeTextNodes = {
		Shape: window.createOniwireShapeNodeDef(),
		Text: window.createOniwireTextNodeDef()
	};

	const motionGlowNodes = {
		Motion: window.createOniwireMotionNodeDef({ ensureMotionStyles, measureLayerBounds, clamp }),
		Glow: window.createOniwireGlowNodeDef({ propagateMotionFlag, clamp, parseHexColor })
	};

	return {
		basicNodes,
		shapeTextNodes,
		motionGlowNodes
	};
};
