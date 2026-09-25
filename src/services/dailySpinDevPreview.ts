import {SPIN_PRIZES, type SpinResult} from '../types/gamification';
import {selectDailySpinPrize} from './dailySpinPrizePool';
import {resolveDailySpinAwards} from './dailySpinRewardPolicy';

export function canPreviewDailySpin():boolean {
 try{return import.meta.env.DEV || localStorage.getItem('dev_mode')==='true';}catch{return false;}
}
/** Repeatable visual rehearsal. Never changes eligibility, history, or wallets. */
export function previewDailySpin():SpinResult {
 if(!canPreviewDailySpin())throw new Error('Developer mode is required');
 const prize=selectDailySpinPrize(SPIN_PRIZES);
 return {prize,spinsRemaining:1,awardedRewards:resolveDailySpinAwards(prize)};
}
