export declare const ICON_BACKLIGHT_IDLE_MS: number;
export declare const ICON_BACKLIGHT_IDLE_FADE_MS: number;
export declare const ICON_BACKLIGHT_TAP_DECAY_S: number;
export declare const ICON_BACKLIGHT_BUILD_READY: string;
export declare function iconBacklight(options: {
  now: number; pressAt: number; lastInteractionAt: number; isBuild: boolean; buildReady: boolean; baseColor: string; reduced: boolean;
}): { intensity: number; color: string; blur: number; alpha: number };
