import { useState } from 'react';
import type { CompassAnswerValue, CompassBlockDefinition } from '../types';
import {
  applyHelpToValue,
  buildCompassHelpRequest,
  requestCompassHelp,
  type CompassHelpResponse,
} from '../services/compassAi';

export type CompassAIHelperProps = {
  chapterId: string;
  block: CompassBlockDefinition;
  /** Current draft text for text blocks (used as optional context). */
  currentText?: string;
  /** Apply a suggestion to the draft — explicit, never automatic. */
  onApply: (value: CompassAnswerValue) => void;
};

type HelperState = 'idle' | 'loading' | 'result' | 'error';

/**
 * Optional per-question "Help me think". Calls the narrow `compass-help`
 * endpoint with ONLY this question, shows a tentative suggestion, and applies it
 * to the draft only when the player taps "Use this". Never saves or confirms.
 * Degrades silently to a short message on any failure.
 */
export function CompassAIHelper({ chapterId, block, currentText, onApply }: CompassAIHelperProps) {
  const [state, setState] = useState<HelperState>('idle');
  const [response, setResponse] = useState<CompassHelpResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAsk() {
    setState('loading');
    setMessage(null);
    const result = await requestCompassHelp(buildCompassHelpRequest(chapterId, block, currentText));
    if (result.data) {
      setResponse(result.data);
      setState('result');
    } else {
      setMessage(result.message ?? 'No suggestion available.');
      setState('error');
    }
  }

  function handleUse() {
    if (!response) return;
    const value = applyHelpToValue(block, response);
    if (value) onApply(value);
    setState('idle');
    setResponse(null);
  }

  if (state === 'idle') {
    return (
      <button type="button" className="compass-ai__ask" onClick={handleAsk}>
        ✦ Help me think
      </button>
    );
  }

  if (state === 'loading') {
    return <p className="compass-ai__status">Thinking…</p>;
  }

  if (state === 'error') {
    return (
      <div className="compass-ai">
        <p className="compass-ai__status">{message}</p>
        <button type="button" className="compass-ai__ask" onClick={() => setState('idle')}>
          Dismiss
        </button>
      </div>
    );
  }

  const canApply = response ? applyHelpToValue(block, response) !== null : false;

  return (
    <div className="compass-ai" role="status">
      <p className="compass-ai__label">One way to think about it — a suggestion, not an answer:</p>
      <p className="compass-ai__suggestion">{response?.suggestion}</p>
      <div className="compass-ai__actions">
        <button
          type="button"
          className="compass-ai__ask"
          onClick={() => {
            setState('idle');
            setResponse(null);
          }}
        >
          Dismiss
        </button>
        {canApply ? (
          <button type="button" className="compass-ai__use" onClick={handleUse}>
            Use this
          </button>
        ) : null}
      </div>
    </div>
  );
}
