window.createOniwireNodeDefsApi = function createOniwireNodeDefsApi(deps){
	const {
		normalizeRampStops,
		ensureMotionStyles,
		measureLayerBounds,
		propagateMotionFlag,
		clamp,
		parseHexColor,
		resolveGradientMetaFromEl,
		resolveMaskMetaFromEl,
		buildRampMaskUrl,
		buildGradientMaskUrl,
		buildShapeMaskUrl,
		hasMotionFlag,
		startLiveMaskUpdate,
		getOutputDuration,
		getCanvasSize
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
		Blur: window.createOniwireBlurNodeDef({
			propagateMotionFlag,
			clamp,
			getCanvasSize,
			normalizeRampStops,
			resolveGradientMetaFromEl,
			resolveMaskMetaFromEl,
			buildRampMaskUrl,
			buildGradientMaskUrl,
			buildShapeMaskUrl,
			hasMotionFlag,
			startLiveMaskUpdate
		}),
		Erode: window.createOniwireErodeNodeDef({ propagateMotionFlag, clamp }),
		Mirror: window.createOniwireKaleiNodeDef({ propagateMotionFlag, getCanvasSize }),
		Kalei: window.createOniwireKaleiNodeDef({ propagateMotionFlag, getCanvasSize }),
		Glow: window.createOniwireGlowNodeDef({ propagateMotionFlag, clamp, parseHexColor }),
		ColorCorrect: window.createOniwireColorCorrectNodeDef({ propagateMotionFlag, clamp }),
		Curves: window.createOniwireCurvesNodeDef({
			propagateMotionFlag,
			clamp,
			normalizeRampStops,
			resolveGradientMetaFromEl,
			resolveMaskMetaFromEl,
			buildRampMaskUrl,
			buildGradientMaskUrl,
			buildShapeMaskUrl,
			hasMotionFlag,
			startLiveMaskUpdate
		}),
		Stylize: window.createOniwireStylizeNodeDef({
			propagateMotionFlag,
			clamp,
			getCanvasSize,
			normalizeRampStops,
			resolveGradientMetaFromEl,
			resolveMaskMetaFromEl,
			buildRampMaskUrl,
			buildGradientMaskUrl,
			buildShapeMaskUrl,
			hasMotionFlag,
			startLiveMaskUpdate
		})
	};

	return {
		basicNodes,
		shapeTextNodes,
		motionGlowNodes
	};
};
