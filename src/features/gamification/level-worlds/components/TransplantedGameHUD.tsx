import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BoardRendererContractV1,
  BoardRendererContractV1Intent,
} from '../services/islandRunBoardRendererContractV1';
import { TransplantedDice3D } from './TransplantedDice3D';
import { TransplantedProgressMeter } from './TransplantedProgressMeter';

interface TransplantedGameHUDProps {
  contract: BoardRendererContractV1;
  onIntent: (intent: BoardRendererContractV1Intent) => void;
  islandNumber: number;
}

export function TransplantedGameHUD({ contract, onIntent, islandNumber }: TransplantedGameHUDProps) {
  const [dice1Value, setDice1Value] = useState(1);
  const [dice2Value, setDice2Value] = useState(1);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isAutoRollActive, setIsAutoRollActive] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdProgressRef = useRef<number | null>(null);
  const autoRollTimerRef = useRef<number | null>(null);
  const rollingTickRef = useRef<number | null>(null);

  const isRolling = contract.ui.busy.roll;
  const isMoving = contract.token.isMoving;
  const canRoll = contract.ui.flags.canRoll;

  useEffect(() => {
    if (isRolling) {
      if (rollingTickRef.current) window.clearInterval(rollingTickRef.current);
      rollingTickRef.current = window.setInterval(() => {
        setDice1Value(Math.floor(Math.random() * 6) + 1);
        setDice2Value(Math.floor(Math.random() * 6) + 1);
      }, 60);
      return () => {
        if (rollingTickRef.current) window.clearInterval(rollingTickRef.current);
      };
    }

    if (rollingTickRef.current) {
      window.clearInterval(rollingTickRef.current);
      rollingTickRef.current = null;
    }

    if (contract.lastRolled?.dice.length === 2) {
      setDice1Value(contract.lastRolled.dice[0] ?? 1);
      setDice2Value(contract.lastRolled.dice[1] ?? 1);
    }
  }, [isRolling, contract.lastRolled]);

  const requestRoll = useCallback(() => {
    if (!canRoll || isRolling || isMoving) return;
    onIntent({ type: 'roll_requested' });
  }, [canRoll, isRolling, isMoving, onIntent]);

  const stopAutoRoll = useCallback(() => {
    if (autoRollTimerRef.current) {
      window.clearInterval(autoRollTimerRef.current);
      autoRollTimerRef.current = null;
    }
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdProgressRef.current) {
      window.clearInterval(holdProgressRef.current);
      holdProgressRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
    setIsAutoRollActive(false);
  }, []);

  const startAutoRoll = useCallback(() => {
    setIsAutoRollActive(true);
    requestRoll();
    autoRollTimerRef.current = window.setInterval(() => requestRoll(), 2500);
  }, [requestRoll]);

  useEffect(() => () => stopAutoRoll(), [stopAutoRoll]);

  const handlePointerDown = () => {
    if (!canRoll || isMoving || isRolling || isAutoRollActive) return;

    setIsHolding(true);
    setHoldProgress(0);
    const startTime = Date.now();
    const holdDuration = 2000;

    holdProgressRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setHoldProgress(Math.min(elapsed / holdDuration, 1));
    }, 16);

    holdTimerRef.current = window.setTimeout(() => {
      startAutoRoll();
      setIsHolding(false);
    }, holdDuration);
  };

  const handlePointerUp = () => {
    if (isAutoRollActive) {
      stopAutoRoll();
      return;
    }

    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdProgressRef.current) {
      window.clearInterval(holdProgressRef.current);
      holdProgressRef.current = null;
    }

    if (!isRolling && !isMoving && holdProgress < 1) requestRoll();

    setIsHolding(false);
    setHoldProgress(0);
  };

  return (
    <>
      <div className="absolute top-0 left-0 right-0 p-1.5 z-30 pointer-events-none">
        <div className="pointer-events-auto max-w-4xl mx-auto">
          <div className="bg-gradient-to-b from-white via-white/98 to-white/95 rounded-full px-2 py-1 border-[2px] border-white/80 flex items-center justify-between gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-black flex items-center justify-center">P</div>
            <div className="flex items-center gap-1.5 flex-1">
              <div className="bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full px-2 py-0.5 border-[1.5px] border-amber-200/80 flex items-center gap-1.5 min-w-[100px]">
                <span>🪙</span><span className="font-black text-white text-sm">{contract.resources.coins.toLocaleString()}</span>
              </div>
              <div className="bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 rounded-full px-2 py-0.5 border-[1.5px] border-green-200/80 flex items-center gap-1.5 min-w-[60px]">
                <span>💎</span><span className="font-black text-white text-sm">{contract.cosmetics.stickerFragments}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-30 pointer-events-none w-full px-4 flex justify-center">
        <div className="pointer-events-auto">
          <TransplantedProgressMeter rewardBar={contract.rewardBar} islandName={`Island ${islandNumber}`} onIntent={onIntent} busyClaim={contract.ui.busy.claim} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 z-30 pointer-events-none pb-safe">
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={!canRoll || isMoving || isRolling}
            className="pointer-events-auto relative transition-colors duration-300 group rounded-full"
            style={{ transform: `translateY(${isHolding ? -holdProgress * 30 : isAutoRollActive ? -10 : 0}px) scale(${isAutoRollActive ? 1.05 : 1})` }}
          >
            <div className={`${isAutoRollActive ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700' : 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600'} rounded-full px-6 py-4 border-[3px] border-white/90 flex items-center justify-center gap-3`}>
              {isHolding && !isAutoRollActive && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 rounded-full" style={{ height: `${holdProgress * 100}%` }} />}
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <span className="font-black text-white text-sm uppercase tracking-wide text-center leading-tight">{isAutoRollActive ? 'Auto' : isRolling ? 'Rolling' : isMoving ? 'Moving!' : 'Roll'}</span>
                <div className="relative bg-white/20 rounded-2xl p-2 border-2 border-white/40 flex gap-2">
                  <TransplantedDice3D value={dice1Value} isRolling={isRolling} />
                  <TransplantedDice3D value={dice2Value} isRolling={isRolling} />
                </div>
                <div className="bg-white/30 rounded-full px-2 py-0.5"><span className="font-semibold text-white text-[9px] whitespace-nowrap">{isAutoRollActive ? 'Tap to stop' : 'Hold 2s'}</span></div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
