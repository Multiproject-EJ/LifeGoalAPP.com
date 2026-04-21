"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWrappedTokenIndex = resolveWrappedTokenIndex;
function resolveWrappedTokenIndex(currentIndex, stepDelta, tileCount) {
    const safeTileCount = Math.max(1, Math.floor(tileCount));
    const baseIndex = Math.max(0, Math.floor(currentIndex));
    const safeStepDelta = Math.floor(stepDelta);
    const nextIndex = baseIndex + safeStepDelta;
    return ((nextIndex % safeTileCount) + safeTileCount) % safeTileCount;
}
