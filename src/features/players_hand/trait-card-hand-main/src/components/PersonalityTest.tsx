import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Sparkle } from '@phosphor-icons/react';
import { Trait } from '@/types/trait';
import { Progress } from '@/components/ui/progress';

interface Question {
  id: string;
  text: string;
  options: {
    text: string;
    traits: { [key: string]: number };
  }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'When faced with a complex problem, you tend to...',
    options: [
      { text: 'Think outside the box and explore creative solutions', traits: { 'creativity-1': 2 } },
      { text: 'Break it down systematically and analyze each part', traits: { 'focus-1': 2 } },
      { text: 'Seek input from others and collaborate', traits: { 'empathy-1': 1, 'empathy-2': 1 } },
      { text: 'Push through with determination until solved', traits: { 'determination-1': 2 } },
    ],
  },
  {
    id: 'q2',
    text: 'In social situations, you typically...',
    options: [
      { text: 'Read the room and adjust to others\' moods', traits: { 'empathy-1': 2 } },
      { text: 'Stay focused on your own goals', traits: { 'focus-1': 1, 'determination-1': 1 } },
      { text: 'Bring fresh perspectives and energy', traits: { 'creativity-1': 1, 'openness-1': 1 } },
      { text: 'Adapt quickly to changing dynamics', traits: { 'adaptability-1': 2 } },
    ],
  },
  {
    id: 'q3',
    text: 'When starting a new project, you...',
    options: [
      { text: 'Dive in with enthusiasm and see where it goes', traits: { 'openness-1': 2 } },
      { text: 'Plan carefully before taking action', traits: { 'focus-1': 2 } },
      { text: 'Consider how it will affect others', traits: { 'empathy-2': 2 } },
      { text: 'Commit fully and push through obstacles', traits: { 'determination-1': 2 } },
    ],
  },
  {
    id: 'q4',
    text: 'Under pressure, you...',
    options: [
      { text: 'Stay calm and find innovative solutions', traits: { 'creativity-1': 1, 'adaptability-1': 1 } },
      { text: 'Double down and work harder', traits: { 'determination-1': 2 } },
      { text: 'Feel the stress but use it to stay alert', traits: { 'neuroticism-1': 2 } },
      { text: 'Maintain laser focus on what matters', traits: { 'focus-1': 2 } },
    ],
  },
  {
    id: 'q5',
    text: 'Your ideal work environment is...',
    options: [
      { text: 'Dynamic and ever-changing', traits: { 'adaptability-1': 1, 'openness-1': 1 } },
      { text: 'Quiet and focused', traits: { 'focus-1': 2 } },
      { text: 'Collaborative and people-oriented', traits: { 'empathy-2': 1, 'empathy-1': 1 } },
      { text: 'Challenging and demanding', traits: { 'determination-1': 2 } },
    ],
  },
  {
    id: 'q6',
    text: 'When learning something new, you prefer to...',
    options: [
      { text: 'Experiment and discover on your own', traits: { 'creativity-1': 1, 'openness-1': 1 } },
      { text: 'Study it thoroughly before trying', traits: { 'focus-1': 2 } },
      { text: 'Learn from others\' experiences', traits: { 'empathy-2': 1, 'openness-1': 1 } },
      { text: 'Practice relentlessly until mastered', traits: { 'determination-1': 2 } },
    ],
  },
  {
    id: 'q7',
    text: 'Your approach to change is...',
    options: [
      { text: 'Embrace it with curiosity', traits: { 'openness-1': 2 } },
      { text: 'Adapt and flow with it', traits: { 'adaptability-1': 2 } },
      { text: 'Feel anxious but prepared', traits: { 'neuroticism-1': 2 } },
      { text: 'Overcome it through persistence', traits: { 'determination-1': 2 } },
    ],
  },
  {
    id: 'q8',
    text: 'What motivates you most?',
    options: [
      { text: 'Creating something unique and original', traits: { 'creativity-1': 2 } },
      { text: 'Achieving difficult goals', traits: { 'determination-1': 2 } },
      { text: 'Helping and connecting with others', traits: { 'empathy-1': 1, 'empathy-2': 1 } },
      { text: 'Growing and experiencing new things', traits: { 'openness-1': 2 } },
    ],
  },
];

interface PersonalityTestProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (traits: Trait[]) => void;
  allTraits: Trait[];
}

export function PersonalityTest({ isOpen, onClose, onComplete, allTraits }: PersonalityTestProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const progress = ((currentQuestion + (selectedOption !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  const handleAnswer = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedOption(answers[currentQuestion - 1] ?? null);
      setAnswers(answers.slice(0, -1));
    }
  };

  const calculateResults = (finalAnswers: number[]) => {
    setIsCalculating(true);

    const traitScores: { [key: string]: number } = {};

    finalAnswers.forEach((answerIndex, questionIndex) => {
      const question = QUESTIONS[questionIndex];
      const selectedAnswer = question.options[answerIndex];

      Object.entries(selectedAnswer.traits).forEach(([traitId, score]) => {
        traitScores[traitId] = (traitScores[traitId] || 0) + score;
      });
    });

    const sortedTraits = Object.entries(traitScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const selectedTraits = sortedTraits
      .map((id) => allTraits.find((t) => t.id === id))
      .filter((t): t is Trait => t !== undefined);

    setTimeout(() => {
      setIsCalculating(false);
      onComplete(selectedTraits);
      resetTest();
    }, 2000);
  };

  const resetTest = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedOption(null);
  };

  const handleClose = () => {
    resetTest();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl my-8 max-h-[calc(100vh-4rem)] flex flex-col"
          style={{
            border: '1px solid oklch(0.25 0.03 260)',
            boxShadow: '0 0 40px -10px oklch(0.65 0.20 300 / 0.3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `
                radial-gradient(circle at 30% 20%, oklch(0.65 0.20 300) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, oklch(0.65 0.15 240) 0%, transparent 50%)
              `,
            }}
          />

          <div className="relative flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <div>
                <h2
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: 'var(--font-orbitron)',
                    background: 'linear-gradient(135deg, oklch(0.65 0.20 300), oklch(0.75 0.15 280))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Personality Test
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Discover your unique trait cards
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-full"
              >
                <X size={24} />
              </Button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <Progress value={progress} className="mb-8" />

              {!isCalculating ? (
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8">
                    <span className="text-sm text-muted-foreground font-medium">
                      Question {currentQuestion + 1} of {QUESTIONS.length}
                    </span>
                    <h3 className="text-xl font-semibold mt-2 leading-relaxed">
                      {QUESTIONS[currentQuestion].text}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {QUESTIONS[currentQuestion].options.map((option, index) => (
                      <motion.button
                        key={index}
                        className="w-full text-left p-4 rounded-xl transition-all duration-200"
                        style={{
                          background:
                            selectedOption === index
                              ? 'oklch(0.25 0.05 270)'
                              : 'oklch(0.18 0.02 260)',
                          border:
                            selectedOption === index
                              ? '2px solid oklch(0.65 0.20 300)'
                              : '2px solid transparent',
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswer(index)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor:
                                selectedOption === index
                                  ? 'oklch(0.65 0.20 300)'
                                  : 'oklch(0.35 0.03 260)',
                            }}
                          >
                            {selectedOption === index && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-3 h-3 rounded-full"
                                style={{ background: 'oklch(0.65 0.20 300)' }}
                              />
                            )}
                          </div>
                          <span className="text-sm leading-relaxed">{option.text}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
                    }}
                  >
                    <Sparkle size={64} weight="fill" style={{ color: 'oklch(0.65 0.20 300)' }} />
                  </motion.div>
                  <p className="mt-6 text-lg font-medium" style={{ fontFamily: 'var(--font-orbitron)' }}>
                    Analyzing Your Traits...
                  </p>
                </motion.div>
              )}
            </div>

            {!isCalculating && (
              <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentQuestion === 0}
                  className="gap-2"
                >
                  <ArrowLeft size={20} />
                  Back
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={selectedOption === null}
                  className="gap-2"
                  style={{
                    background:
                      selectedOption !== null
                        ? 'linear-gradient(135deg, oklch(0.65 0.20 300), oklch(0.55 0.25 320))'
                        : undefined,
                    fontFamily: 'var(--font-orbitron)',
                  }}
                >
                  {currentQuestion === QUESTIONS.length - 1 ? 'Finish' : 'Next'}
                  <ArrowRight size={20} />
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
