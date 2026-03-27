window.createOniwireNodeDefsApi = function createOniwireNodeDefsApi(deps){
	const {
		normalizeRampStops,
		ensureMotionStyles,
		measureLayerBounds,
		propagateMotionFlag,
		clamp,
		parseHexColor,
		getOutputDuration
	} = deps;

	const basicNodes = {
		Color: window.createOniwireColorNodeDef(),
		Gradient: window.createOniwireGradientNodeDef({ normalizeRampStops }),
		Ramp: window.createOniwireRampNodeDef({ normalizeRampStops })
	};

	const shapeTextNodes = {
		Shape: window.createOniwireShapeNodeDef(),
		Text: window.createOniwireTextNodeDef(),
		Image: window.createOniwireImageNodeDef(),
		Pen: window.createOniwirePenNodeDef()
	};

	const motionGlowNodes = {
		MotionIn: window.createOniwireMotionInNodeDef({ ensureMotionStyles, measureLayerBounds, clamp, getOutputDuration }),
		Motion: window.createOniwireMotionNodeDef({ ensureMotionStyles, measureLayerBounds, clamp, getOutputDuration }),
		MotionOut: window.createOniwireMotionOutNodeDef({ ensureMotionStyles, measureLayerBounds, clamp, getOutputDuration }),
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
