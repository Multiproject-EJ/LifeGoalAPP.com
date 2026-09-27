export type ControllerSunlight = 'full_sun' | 'fair' | 'none';
export declare const CONTROLLER_SUNLIGHT: Record<number, ControllerSunlight>;
export declare const CONTROLLER_SHINE_HOLD_S: number;
export declare const CONTROLLER_SHINE_FADE_S: number;
export declare const CONTROLLER_SUNBEAM_SWEEP_S: number;
export declare function controllerSunlight(islandNumber: number | undefined): ControllerSunlight;
export declare function controllerShineLevel(sunlight: ControllerSunlight, age: number): number;
export declare function controllerSunbeam(sunlight: ControllerSunlight, age: number, reduced: boolean): number;
