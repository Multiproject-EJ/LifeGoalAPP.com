/** Every AI task the app can run. Kept dependency-free so tests can import it. */
export type AiTaskKey =
  | 'habit_title_rewrite'
  | 'habit_suggestion_structured'
  | 'habit_rationale_rewrite'
  | 'habit_chain_suggestion'
  | 'habit_tip_of_day'
  | 'environment_idea_generation'
  | 'conflict_inner_reflection'
  | 'conflict_shared_mediation';
