import { useState, useEffect, useCallback } from 'react';
import {
  loadCurrencyBalance,
  saveCurrencyBalance,
  awardDice,
  deductDice,
  awardGameTokens,
  deductGameTokens,
  awardHearts,
  deductHearts,
  purchaseDicePack,
  type GameCurrencyBalance,
  type GameSource,
} from './gameRewards';
import type { DicePackId } from '../constants/economy';

const CURRENCY_UPDATE_EVENT = 'gol-currency-update';

export function useGameCurrencies(userId: string) {
  const [balance, setBalance] = useState<GameCurrencyBalance>(() => loadCurrencyBalance(userId));

  const refreshBalance = useCallback(() => {
    const newBalance = loadCurrencyBalance(userId);
    setBalance(newBalance);
  }, [userId]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    const handleCurrencyUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId: string }>;
      if (customEvent.detail?.userId === userId) {
        refreshBalance();
      }
    };

    window.addEventListener(CURRENCY_UPDATE_EVENT, handleCurrencyUpdate);

    return () => {
      window.removeEventListener(CURRENCY_UPDATE_EVENT, handleCurrencyUpdate);
    };
  }, [userId, refreshBalance]);

  const dispatchUpdate = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(CURRENCY_UPDATE_EVENT, {
        detail: { userId },
      })
    );
  }, [userId]);

  const awardDiceWrapper = useCallback(
    (amount: number, source: GameSource, context: string) => {
      const newBalance = awardDice(userId, amount, source, context);
      setBalance(newBalance);
      dispatchUpdate();
      return newBalance;
    },
    [userId, dispatchUpdate]
  );

  const deductDiceWrapper = useCallback(
    (amount: number, context: string) => {
      const newBalance = deductDice(userId, amount, context);
      setBalance(newBalance);
      dispatchUpdate();
      return newBalance;
    },
    [userId, dispatchUpdate]
  );

  const awardGameTokensWrapper = useCallback(
    (amount: number, source: GameSource, context: string) => {
      const newBalance = awardGameTokens(userId, amount, source, context);
      setBalance(newBalance);
      dispatchUpdate();
      return newBalance;
    },
    [userId, dispatchUpdate]
  );

  const deductGameTokensWrapper = useCallback(
    (amount: number, context: string) => {
      const newBalance = deductGameTokens(userId, amount, context);
      setBalance(newBalance);
      dispatchUpdate();
      return newBalance;
    },
    [userId, dispatchUpdate]
  );

  const awardHeartsWrapper = useCallback(
    (amount: number, source: GameSource, context: string) => {
      const newBalance = awardHearts(userId, amount, source, context);
      setBalance(newBalance);
      dispatchUpdate();
      return newBalance;
    },
    [userId, dispatchUpdate]
  );

  const deductHeartsWrapper = useCallback(
    (amount: number, context: string) => {
      const newBalance = deductHearts(userId, amount, context);
      setBalance(newBalance);
      dispatchUpdate();
      return newBalance;
    },
    [userId, dispatchUpdate]
  );

  const purchasePack = useCallback(
    (packId: DicePackId) => {
      const result = purchaseDicePack(userId, packId);
      if (result.success) {
        setBalance(result.balance);
        dispatchUpdate();
      }
      return result;
    },
    [userId, dispatchUpdate]
  );

  return {
    balance,
    awardDice: awardDiceWrapper,
    deductDice: deductDiceWrapper,
    awardGameTokens: awardGameTokensWrapper,
    deductGameTokens: deductGameTokensWrapper,
    awardHearts: awardHeartsWrapper,
    deductHearts: deductHeartsWrapper,
    purchasePack,
    refreshBalance,
  };
}
