"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIslandRunRollButtonMode = resolveIslandRunRollButtonMode;
exports.isIslandRunRollEnergyDepleted = isIslandRunRollEnergyDepleted;
exports.canRetryBossTrial = canRetryBossTrial;
exports.resolveIslandRunTimerLabel = resolveIslandRunTimerLabel;
function resolveIslandRunRollButtonMode(params) {
    const { isRolling, dicePool, dicePerRoll } = params;
    if (isRolling)
        return 'rolling';
    if (dicePool >= dicePerRoll)
        return 'roll';
    return 'no_dice';
}
function isIslandRunRollEnergyDepleted(params) {
    return params.dicePool < params.dicePerRoll;
}
function canRetryBossTrial() {
    return true;
}
function resolveIslandRunTimerLabel() {
    return 'Timer:';
}
