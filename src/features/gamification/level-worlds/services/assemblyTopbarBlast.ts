/**
 * Island 001 Assembly — the big middle explosion hits the HUD.
 *
 * The blast sequence has three acts; act 2 (charges 8–9) is the biggest
 * (intensity 2.4). Its first blast rattles the top bar, knocks its power out,
 * cracks one panel and lets it sag; a helper robot flies up, welds the crack
 * and powers it back on — all inside the 5.4 s blast beat. Presentation only.
 */
import { FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET } from './islandRunSignatureMissions';

/** First charge of the big middle act. */
export const ASSEMBLY_TOPBAR_BLAST_CHARGE = 8;
/** Whole top-bar sequence; must end before the board's 5.4 s blast wait. */
export const ASSEMBLY_TOPBAR_BLAST_MS = 5_000;

export function shouldAssemblyBlastHitTopbar(sectorAfter: number): boolean {
  return sectorAfter === ASSEMBLY_TOPBAR_BLAST_CHARGE && sectorAfter < FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET;
}
