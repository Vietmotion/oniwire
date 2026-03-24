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
		Text: window.createOniwireTextNodeDef(),
		Image: window.createOniwireImageNodeDef()
	};

	const motionGlowNodes = {
		Motion: window.createOniwireMotionNodeDef({ ensureMotionStyles, measureLayerBounds, clamp }),
		Glow: window.createOniwireGlowNodeDef({ propagateMotionFlag, clamp, parseHexColor }),
		ColorCorrect: window.createOniwireColorCorrectNodeDef({ propagateMotionFlag, clamp }),
		Curves: window.createOniwireCurvesNodeDef({ propagateMotionFlag, clamp })
	};

	return {
		basicNodes,
		shapeTextNodes,
		motionGlowNodes
	};
};
