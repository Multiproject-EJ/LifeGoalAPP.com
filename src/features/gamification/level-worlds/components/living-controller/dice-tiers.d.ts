export declare const DICE_TIER_THRESHOLDS: number[];
export declare function diceTier(dice: number): number;
export declare function diceTierStyle(level: number): { rings: number; glow: number; pulse: boolean; sparks: number; band: boolean; warm: number };
export declare function autoRollHover(now: number, autoRolling: boolean, reduced: boolean): { thrust: number; bobY: number; swayZ: number };
