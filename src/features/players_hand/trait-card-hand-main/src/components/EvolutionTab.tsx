import React, { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Trait } from '@/types/trait';
import { ArchetypeEvolution, ARCHETYPES, Archetype } from '@/types/archetype';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Minus, TrendUp, TrendDown, ArrowRight, Sparkle } from '@phosphor-icons/react';
import * as Icons from '@phosphor-icons/react';
import { toast } from 'sonner';

interface EvolutionTabProps {
  isOpen: boolean;
  onClose: () => void;
  traits: Trait[];
  allTraits: Trait[];
  onTraitsUpdate: (newTraits: Trait[]) => void;
}

export function EvolutionTab({ isOpen, onClose, traits, allTraits, onTraitsUpdate }: EvolutionTabProps) {
  const [evolutionHistory, setEvolutionHistory] = useKV<ArchetypeEvolution[]>('archetype-evolution-history', []);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolutionReason, setEvolutionReason] = useState('');
  const [traitsToGain, setTraitsToGain] = useState<string[]>([]);
  const [traitsToLose, setTraitsToLose] = useState<string[]>([]);
  const [traitsToAmplify, setTraitsToAmplify] = useState<string[]>([]);
  const [traitsToMute, setTraitsToMute] = useState<string[]>([]);

  const currentArchetype = determineArchetype(traits);

  function determineArchetype(currentTraits: Trait[]): Archetype {
    if (!currentTraits || currentTraits.length === 0) {
      return ARCHETYPES[0];
    }

    const traitIds = currentTraits.map(t => t.id);
    
    const archetypeScores = ARCHETYPES.map(archetype => {
      const matchCount = archetype.dominantTraits.filter(dt => 
        traitIds.includes(dt)
      ).length;
      
      return {
        archetype,
        score: matchCount,
      };
    });

    archetypeScores.sort((a, b) => b.score - a.score);
    
    return archetypeScores[0].archetype;
  }

  const toggleTraitGain = (traitId: string) => {
    setTraitsToGain(prev => 
      prev.includes(traitId) ? prev.filter(id => id !== traitId) : [...prev, traitId]
    );
  };

  const toggleTraitLose = (traitId: string) => {
    setTraitsToLose(prev => 
      prev.includes(traitId) ? prev.filter(id => id !== traitId) : [...prev, traitId]
    );
  };

  const toggleTraitAmplify = (traitId: string) => {
    setTraitsToAmplify(prev => 
      prev.includes(traitId) ? prev.filter(id => id !== traitId) : [...prev, traitId]
    );
  };

  const toggleTraitMute = (traitId: string) => {
    setTraitsToMute(prev => 
      prev.includes(traitId) ? prev.filter(id => id !== traitId) : [...prev, traitId]
    );
  };

  const handleEvolve = () => {
    if (!evolutionReason.trim()) {
      toast.error('Please describe your evolution');
      return;
    }

    let newTraits = [...traits];

    traitsToLose.forEach(id => {
      newTraits = newTraits.filter(t => t.id !== id);
    });

    traitsToGain.forEach(id => {
      const trait = allTraits.find(t => t.id === id);
      if (trait && !newTraits.find(t => t.id === id)) {
        newTraits.push(trait);
      }
    });

    traitsToAmplify.forEach(id => {
      const index = newTraits.findIndex(t => t.id === id);
      if (index !== -1 && newTraits[index].level < 10) {
        newTraits[index] = { ...newTraits[index], level: Math.min(10, newTraits[index].level + 1) };
      }
    });

    traitsToMute.forEach(id => {
      const index = newTraits.findIndex(t => t.id === id);
      if (index !== -1 && newTraits[index].level > 1) {
        newTraits[index] = { ...newTraits[index], level: Math.max(1, newTraits[index].level - 1) };
      }
    });

    const newArchetype = determineArchetype(newTraits);

    const evolution: ArchetypeEvolution = {
      timestamp: Date.now(),
      archetypeId: newArchetype.id,
      archetypeName: newArchetype.name,
      reason: evolutionReason,
      traitsGained: traitsToGain,
      traitsLost: traitsToLose,
      traitsAmplified: traitsToAmplify,
      traitsMuted: traitsToMute,
    };

    setEvolutionHistory(prev => [evolution, ...(prev || [])]);
    onTraitsUpdate(newTraits);

    setEvolutionReason('');
    setTraitsToGain([]);
    setTraitsToLose([]);
    setTraitsToAmplify([]);
    setTraitsToMute([]);
    setIsEvolving(false);

    toast.success('Evolution complete!', {
      description: currentArchetype.id !== newArchetype.id 
        ? `You've transformed into ${newArchetype.name}`
        : 'Your archetype has been refined',
    });
  };

  const availableTraitsToGain = allTraits.filter(t => !traits.find(ct => ct.id === t.id));
  const CurrentArchetypeIcon = (Icons as any)[currentArchetype.icon] || Icons.Sparkle;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0"
        style={{
          background: `linear-gradient(135deg, ${currentArchetype.color}15, oklch(0.18 0.02 260))`,
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border/50 backdrop-blur-sm bg-card/80">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: currentArchetype.color,
              }}
            >
              <CurrentArchetypeIcon weight="bold" size={24} className="text-white" />
            </div>
            <div>
              <h2 
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-orbitron)' }}
              >
                Evolution Path
              </h2>
              <p className="text-sm text-muted-foreground">Shape your personality journey</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <X weight="bold" size={20} />
          </Button>
        </div>

        <div className="p-8 space-y-8">
          {!isEvolving ? (
            <>
              <div className="flex justify-center">
                <Button
                  onClick={() => setIsEvolving(true)}
                  size="lg"
                  className="gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${currentArchetype.color}, ${currentArchetype.color}CC)`,
                    fontFamily: 'var(--font-orbitron)',
                  }}
                >
                  <TrendUp weight="bold" size={20} />
                  Begin Evolution
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  <Sparkle weight="fill" size={20} style={{ color: currentArchetype.color }} />
                  Evolution History
                </h3>
                
                {!evolutionHistory || evolutionHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No evolution history yet. Begin your journey!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evolutionHistory.map((evolution, index) => {
                      const archetype = ARCHETYPES.find(a => a.id === evolution.archetypeId) || ARCHETYPES[0];
                      const ArchIcon = (Icons as any)[archetype.icon] || Icons.Sparkle;
                      
                      return (
                        <motion.div
                          key={evolution.timestamp}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: archetype.color }}
                              >
                                <ArchIcon weight="bold" size={20} className="text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold" style={{ fontFamily: 'var(--font-orbitron)' }}>
                                  {evolution.archetypeName}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(evolution.timestamp).toLocaleDateString()} at {new Date(evolution.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-foreground/80 italic">{evolution.reason}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {evolution.traitsGained.length > 0 && (
                              <Badge variant="secondary" className="gap-1" style={{ background: 'oklch(0.60 0.15 140)30', borderColor: 'oklch(0.60 0.15 140)' }}>
                                <Plus size={14} /> {evolution.traitsGained.length} gained
                              </Badge>
                            )}
                            {evolution.traitsLost.length > 0 && (
                              <Badge variant="secondary" className="gap-1" style={{ background: 'oklch(0.577 0.245 27.325)30', borderColor: 'oklch(0.577 0.245 27.325)' }}>
                                <Minus size={14} /> {evolution.traitsLost.length} lost
                              </Badge>
                            )}
                            {evolution.traitsAmplified.length > 0 && (
                              <Badge variant="secondary" className="gap-1" style={{ background: 'oklch(0.65 0.20 200)30', borderColor: 'oklch(0.65 0.20 200)' }}>
                                <TrendUp size={14} /> {evolution.traitsAmplified.length} amplified
                              </Badge>
                            )}
                            {evolution.traitsMuted.length > 0 && (
                              <Badge variant="secondary" className="gap-1" style={{ background: 'oklch(0.556 0 0)30', borderColor: 'oklch(0.556 0 0)' }}>
                                <TrendDown size={14} /> {evolution.traitsMuted.length} muted
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  What's driving this evolution?
                </label>
                <Textarea
                  placeholder="Describe your personal growth, new experiences, or changing priorities..."
                  value={evolutionReason}
                  onChange={(e) => setEvolutionReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
                    <Plus weight="bold" size={16} style={{ color: 'oklch(0.60 0.15 140)' }} />
                    Gain New Traits
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {availableTraitsToGain.map(trait => {
                      const TraitIcon = (Icons as any)[trait.icon] || Icons.Sparkle;
                      return (
                        <Button
                          key={trait.id}
                          variant={traitsToGain.includes(trait.id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleTraitGain(trait.id)}
                          className="w-full justify-start gap-2"
                        >
                          <TraitIcon size={16} />
                          {trait.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
                    <Minus weight="bold" size={16} style={{ color: 'oklch(0.577 0.245 27.325)' }} />
                    Release Traits
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {traits.map(trait => {
                      const TraitIcon = (Icons as any)[trait.icon] || Icons.Sparkle;
                      return (
                        <Button
                          key={trait.id}
                          variant={traitsToLose.includes(trait.id) ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => toggleTraitLose(trait.id)}
                          className="w-full justify-start gap-2"
                        >
                          <TraitIcon size={16} />
                          {trait.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
                    <TrendUp weight="bold" size={16} style={{ color: 'oklch(0.65 0.20 200)' }} />
                    Amplify Traits
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {traits.map(trait => {
                      const TraitIcon = (Icons as any)[trait.icon] || Icons.Sparkle;
                      return (
                        <Button
                          key={trait.id}
                          variant={traitsToAmplify.includes(trait.id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleTraitAmplify(trait.id)}
                          className="w-full justify-start gap-2"
                          disabled={trait.level >= 10}
                        >
                          <TraitIcon size={16} />
                          {trait.name} (Lv {trait.level})
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
                    <TrendDown weight="bold" size={16} style={{ color: 'oklch(0.556 0 0)' }} />
                    Mute Traits
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {traits.map(trait => {
                      const TraitIcon = (Icons as any)[trait.icon] || Icons.Sparkle;
                      return (
                        <Button
                          key={trait.id}
                          variant={traitsToMute.includes(trait.id) ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => toggleTraitMute(trait.id)}
                          className="w-full justify-start gap-2"
                          disabled={trait.level <= 1}
                        >
                          <TraitIcon size={16} />
                          {trait.name} (Lv {trait.level})
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEvolving(false);
                    setEvolutionReason('');
                    setTraitsToGain([]);
                    setTraitsToLose([]);
                    setTraitsToAmplify([]);
                    setTraitsToMute([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEvolve}
                  className="gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${currentArchetype.color}, ${currentArchetype.color}CC)`,
                    fontFamily: 'var(--font-orbitron)',
                  }}
                >
                  <ArrowRight weight="bold" size={20} />
                  Complete Evolution
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
