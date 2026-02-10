window.createOniwireCloneCompositeNodeDefs = function createOniwireCloneCompositeNodeDefs(deps){
  const {
    normalizeRampStops,
    propagateMotionFlag,
    hasMotionFlag,
    resolveGradientMetaFromEl,
    resolveMaskMetaFromEl,
    buildRampMaskUrl,
    buildGradientMaskUrl,
    buildShapeMaskUrl,
    startLiveMaskUpdate
  } = deps;

  const cloneCompositeNodes = {
    Clone: window.createOniwireCloneNodeDef({ propagateMotionFlag }),
    Composite: window.createOniwireCompositeNodeDef({
      normalizeRampStops,
      hasMotionFlag,
      resolveGradientMetaFromEl,
      resolveMaskMetaFromEl,
      buildRampMaskUrl,
      buildGradientMaskUrl,
      buildShapeMaskUrl,
      startLiveMaskUpdate
    })
  };

  return {
    cloneCompositeNodes
  };
};
