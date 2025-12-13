/**
 * Guided meditation content library
 */

import type { MeditationContent } from '../types/meditation';

export const GUIDED_MEDITATIONS: MeditationContent[] = [
  {
    id: 'attempting-breath',
    title: 'Attempting to Stay With the Breath',
    theme: 'Simple focus · presence · returning',
    isPlaceholder: false,
    content: `Let's begin by finding a comfortable position. You might close your eyes, or soften your gaze downward.

Notice where you feel your breath most clearly. Perhaps in your belly, rising and falling. Perhaps at your nostrils, cool air entering, warm air leaving. Perhaps in your chest.

There's no need to change your breathing. Just notice it as it is. Natural. Effortless.

When your mind wanders—and it will—this is not a mistake. This is what minds do. Simply notice where it went, without judgment.

And gently, kindly, return your attention to the breath. Again. And again.

Each return is the practice. Each return is a moment of choice. To begin again. To try.

You don't need to be perfect at this. You don't need to achieve anything. Just this gentle attempt. This kind return.

Breathing in, you might notice: I am breathing in. Breathing out, you might notice: I am breathing out.

Let the breath be an anchor. A place to return to. A reminder that this moment, right now, is enough.

If thoughts arise—plans, worries, memories—let them be clouds passing through the sky of your awareness. You don't need to push them away. You don't need to follow them.

Just notice. And return to the breath.

Each moment is a new beginning. Each breath, a fresh start.

As we come toward the end of this practice, take a moment to appreciate yourself. For showing up. For trying.

When you're ready, gently open your eyes, and bring this quality of gentle attention with you.`,
  },
  {
    id: 'body-awareness',
    title: 'Body Scan: Gentle Awareness',
    theme: 'Embodiment · sensation · releasing',
    isPlaceholder: false,
    content: `Settle into a comfortable position. Let your body be supported, whether sitting or lying down.

Begin by noticing your body as a whole. The weight of it. The temperature. The contact with whatever is supporting you.

Now, bring your attention to your feet. Notice any sensations there. Warmth or coolness. Tingling. Heaviness. Or perhaps very little sensation at all.

Whatever you find, there's no need to change it. Just notice with curiosity.

Gradually move your attention up to your ankles, your calves. Notice the quality of sensation in your lower legs.

Let your awareness travel up to your knees, your thighs. Heavy or light. Tense or relaxed. Simply observing.

Bring attention to your hips and pelvis. The connection to your seat or the ground beneath you.

Notice your lower back, your belly. Is there tightness? Softness? Movement with your breath?

Your chest and upper back. Feel the gentle rise and fall of breathing. The expansion and release.

Your shoulders. Often a place of holding. See if you can soften here, just a little. Not forcing. Just inviting.

Down your arms, to your elbows, your forearms, your wrists. Your hands. Notice your fingers, maybe feeling the air touching your skin.

Your neck and throat. Gently aware of any tension, any ease.

Your jaw, which may be holding more than you realized. Can it soften, even slightly?

Your face. Forehead, eyes, cheeks. Let the muscles of your face release.

The crown of your head. Your whole body, breathing.

Take a moment now to sense your entire body at once. Whole, breathing, alive in this moment.

As this practice comes to a close, thank yourself for this time of presence. When you're ready, gently transition back.`,
  },
  {
    id: 'loving-kindness-short',
    title: 'Brief Loving-Kindness Practice',
    theme: 'Compassion · warmth · connection',
    isPlaceholder: false,
    content: `Find a comfortable position and let yourself settle.

Begin by placing your hand on your heart, if that feels comfortable. Feel the warmth there.

Bring to mind someone who naturally makes you smile. Maybe a loved one, a pet, a friend. Let yourself feel the warmth of that connection.

Now, gently direct some of that warmth toward yourself. Silently offer yourself these words, or similar ones that resonate:

May I be safe. May I be healthy. May I be at ease. May I be happy.

You might not feel anything special. That's okay. The intention itself is the practice.

May I be safe. May I be healthy. May I be at ease. May I be happy.

Now, bring to mind that person or being who makes you smile. Offer these wishes to them:

May you be safe. May you be healthy. May you be at ease. May you be happy.

Let the feeling of care expand. Perhaps to someone neutral—someone you see regularly but don't know well.

May you be safe. May you be healthy. May you be at ease. May you be happy.

And if it feels right, you might even extend these wishes toward someone you find difficult. Not forcing, but trying.

May you be safe. May you be healthy. May you be at ease. May you be happy.

Finally, expand your awareness to all beings. Everyone, everywhere, just trying to be happy, just trying to be free from suffering.

May all beings be safe. May all beings be healthy. May all beings be at ease. May all beings be happy.

Rest in this quality of universal care for a moment.

When you're ready, gently open your eyes, carrying this warmth with you.`,
  },
  {
    id: 'present-moment',
    title: 'Arriving in the Present Moment',
    theme: 'Grounding · awareness · simplicity',
    isPlaceholder: false,
    content: `Let's take this moment to arrive fully where we are.

Notice the sounds around you. Near and far. No need to label them, just hearing.

Notice the temperature of the air on your skin. Cool or warm. Still or moving.

Feel the ground beneath you, supporting you. Solid. Reliable.

Notice your breathing. Not changing it, just feeling it. The rhythm of life, happening on its own.

This is what's here, right now. Not yesterday. Not tomorrow. Just this.

Your mind might pull you to plans or memories. That's natural. When you notice, gently return to now.

What can you sense right now? Sound. Temperature. Touch. Breath.

This moment doesn't require anything from you. You don't need to fix anything. You don't need to be anywhere else.

Just here. Just breathing. Just being.

The present moment is always available. It's always enough.

When thoughts come—and they will—notice them like weather passing through. They don't need to pull you away.

Here. Now. Breathing.

As we conclude, take one more full breath. Feeling the beginning, the middle, the end.

Thank you for this time. For arriving. For being here.

Gently open your eyes when you're ready.`,
  },
  {
    id: 'placeholder-mountain',
    title: 'Mountain Meditation',
    theme: 'Stability · strength · perspective',
    isPlaceholder: true,
    placeholderMessage: 'This meditation will be added later.',
    content: '',
  },
  {
    id: 'placeholder-walking',
    title: 'Walking Meditation',
    theme: 'Movement · rhythm · grounding',
    isPlaceholder: true,
    placeholderMessage: 'This meditation will be added later.',
    content: '',
  },
  {
    id: 'placeholder-sounds',
    title: 'Sound Meditation',
    theme: 'Listening · space · presence',
    isPlaceholder: true,
    placeholderMessage: 'This meditation will be added later.',
    content: '',
  },
  {
    id: 'placeholder-gratitude',
    title: 'Gratitude Practice',
    theme: 'Appreciation · warmth · perspective',
    isPlaceholder: true,
    placeholderMessage: 'This meditation will be added later.',
    content: '',
  },
];

/**
 * Get meditation by ID
 */
export function getMeditationById(id: string): MeditationContent | undefined {
  return GUIDED_MEDITATIONS.find((m) => m.id === id);
}

/**
 * Split meditation content into chunks based on reveal mode
 */
export function splitIntoChunks(content: string, mode: 'word' | 'sentence' | 'paragraph'): string[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  switch (mode) {
    case 'word':
      // Split by whitespace and filter out empty strings
      return content.split(/\s+/).filter((word) => word.length > 0);

    case 'sentence':
      // Split by sentence boundaries (., !, ?) while preserving the punctuation
      // This regex looks for sentence-ending punctuation followed by whitespace
      const sentences = content
        .split(/([.!?]+\s+)/)
        .reduce((acc: string[], part, i, arr) => {
          if (i % 2 === 0 && part.trim()) {
            // Combine sentence with its punctuation
            const punctuation = arr[i + 1] || '';
            acc.push((part + punctuation).trim());
          }
          return acc;
        }, []);
      return sentences.filter((s) => s.length > 0);

    case 'paragraph':
      // Split by double newlines (paragraph breaks)
      return content
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    default:
      return [content];
  }
}
