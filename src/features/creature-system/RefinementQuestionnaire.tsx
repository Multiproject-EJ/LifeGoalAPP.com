import { useEffect, useRef, useState } from 'react';
import { CreatureModal } from './Modal';
import { MOTIVE_QUESTIONS, MOTIVE_RATINGS, scoreRefinement } from './refinement';

// Interleave the four orientations: do not make a whole page a single suit.
const groups = Array.from({ length: 8 }, (_, index) =>
  ['power', 'heart', 'mind', 'spirit'].map(suit => MOTIVE_QUESTIONS.filter(q => q.suit === suit)[index]));

export function RefinementQuestionnaire({ initial, onApply, onClose }: {
  initial: Record<string, number>; onApply: (answers: Record<string, number>) => void; onClose: () => void;
}) {
  const [answers, setAnswers] = useState(initial), [page, setPage] = useState(0);
  const result = scoreRefinement(answers);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [page]);
  return <CreatureModal title="What draws you?" onClose={onClose}>
    <div className="cs-refinement">
      <p>This is an experimental game-personality questionnaire, not a validated psychological test. Rate the motivation, not how skilled you are. There are no better answers.</p>
      <p>Your foundation answers and chosen trio stay unchanged. Ratings remain in this preview only; closing without applying discards edits.</p>
      <button type="button" onClick={()=>{setAnswers({});setPage(0);}}>Start with blank ratings</button>
      <p role="status">{result.answeredCount} / 32 rated · Page {page + 1} / 8</p>
      <progress value={result.answeredCount} max={32} aria-label="Motivation questionnaire completion" />
      <h3 ref={heading} tabIndex={-1} className="cs-refinement-page">Motivations · page {page + 1} of 8</h3>
      {groups[page].map(question => <fieldset key={question.id}>
        <legend>{question.statement}</legend>
        <div className="cs-rating-options">{MOTIVE_RATINGS.map(rating => <label key={rating.value}>
          <input type="radio" name={question.id} value={rating.value} checked={answers[question.id] === rating.value}
            onChange={() => setAnswers(previous => ({ ...previous, [question.id]: rating.value }))} />
          <span>{rating.value} · {rating.label}</span>
        </label>)}</div>
        <button type="button" onClick={() => setAnswers(previous => { const next = { ...previous }; delete next[question.id]; return next; })}>Clear / skip</button>
      </fieldset>)}
      <div className="cs-refinement-actions"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><button type="button" disabled={page === 7} onClick={() => setPage(page + 1)}>Next</button></div>
      <p>{result.status === 'ready' ? 'Your leading motivations: ' + result.archetypes.slice().sort((a,b) => b.score! - a.score!).slice(0,3).map(a => a.name).join(' · ') : result.status === 'undifferentiated' ? 'All ratings are equal. We will keep your answers without assigning a Kindred.' : 'All 32 ratings are needed for a fair comparison. Skipped answers never count as low motivation.'}</p>
      <button type="button" disabled={result.status === 'incomplete'} onClick={() => onApply(result.answers)}>Apply motivations to preview</button>
    </div>
  </CreatureModal>;
}
