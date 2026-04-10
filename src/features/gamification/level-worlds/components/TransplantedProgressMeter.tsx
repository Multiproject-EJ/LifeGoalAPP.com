import type { BoardRendererContractV1Intent } from '../services/islandRunBoardRendererContractV1';

interface TransplantedProgressMeterProps {
  rewardBar: {
    progress: number;
    nextThreshold: number;
    isClaimable: boolean;
  };
  islandName: string;
  onIntent: (intent: BoardRendererContractV1Intent) => void;
  busyClaim: boolean;
}

export function TransplantedProgressMeter({ rewardBar, islandName, onIntent, busyClaim }: TransplantedProgressMeterProps) {
  const progressPercent = rewardBar.nextThreshold > 0 ? Math.min(100, (rewardBar.progress / rewardBar.nextThreshold) * 100) : 0;

  return (
    <div className="relative">
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap z-10 text-white font-bold text-xs">{islandName}</div>
      <div className="relative bg-gradient-to-r from-blue-500 via-purple-600 to-purple-700 rounded-full px-3 py-2 border-[3px] border-white/60 flex items-center gap-2 min-w-[220px]">
        <div className="bg-white/20 rounded-full w-9 h-9 flex items-center justify-center border-[2px] border-white/40">⭐</div>
        <div className="flex-1 relative h-6 bg-white/20 rounded-full overflow-hidden border-2 border-white/30">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-400 via-pink-500 to-rose-500 rounded-full" style={{ width: `${progressPercent}%` }} />
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">{rewardBar.progress}/{rewardBar.nextThreshold}</div>
        </div>
        {rewardBar.isClaimable && (
          <button className="bg-white/25 rounded-full w-9 h-9 flex items-center justify-center border-[2px] border-yellow-300/80" disabled={busyClaim} onClick={() => onIntent({ type: 'claim_reward_requested' })}>🎁</button>
        )}
      </div>
    </div>
  );
}
