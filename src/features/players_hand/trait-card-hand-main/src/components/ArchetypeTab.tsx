import { motion, AnimatePresence } from 'framer-motion';
import { Trait } from '@/types/trait';
import { Archetype, ARCHETYPES } from '@/types/archetype';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkle, TrendUp } from '@phosphor-icons/react';
import * as Icons from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface ArchetypeTabProps {
  isOpen: boolean;
  onClose: () => void;
  traits: Trait[];
  onOpenEvolution: () => void;
}

function determineArchetype(traits: Trait[]): Archetype {
  if (!traits || traits.length === 0) {
    return ARCHETYPES[0];
  }

  const traitIds = traits.map(t => t.id);
  
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

export function ArchetypeTab({ isOpen, onClose, traits, onOpenEvolution }: ArchetypeTabProps) {
  const archetype = determineArchetype(traits);
  
  const IconComponent = (Icons as any)[archetype.icon] || Icons.Sparkle;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0"
        style={{
          background: `linear-gradient(135deg, ${archetype.color}15, oklch(0.18 0.02 260))`,
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border/50 backdrop-blur-sm bg-card/80">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: archetype.color,
              }}
            >
              <IconComponent weight="bold" size={24} className="text-white" />
            </div>
            <div>
              <h2 
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-orbitron)' }}
              >
                Your Archetype
              </h2>
              <p className="text-sm text-muted-foreground">Based on your trait profile</p>
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
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              className="relative"
            >
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center relative"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${archetype.color}, ${archetype.color}CC)`,
                  boxShadow: `0 0 40px ${archetype.color}60`,
                }}
              >
                <IconComponent weight="bold" size={64} className="text-white" />
                
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: `2px solid ${archetype.color}40`,
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <h3 
                className="text-4xl font-bold"
                style={{ 
                  fontFamily: 'var(--font-orbitron)',
                  background: `linear-gradient(135deg, ${archetype.color}, oklch(0.75 0.15 280))`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {archetype.name}
              </h3>
              <p className="text-lg text-foreground/80 max-w-2xl mx-auto leading-relaxed">
                {archetype.description}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Sparkle weight="fill" size={20} style={{ color: archetype.color }} />
              <h4 className="font-semibold" style={{ fontFamily: 'var(--font-orbitron)' }}>
                Dominant Traits
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {traits.filter(t => archetype.dominantTraits.includes(t.id)).map(trait => {
                const TraitIcon = (Icons as any)[trait.icon] || Icons.Sparkle;
                return (
                  <Badge
                    key={trait.id}
                    variant="secondary"
                    className="px-3 py-2 text-sm flex items-center gap-2"
                    style={{
                      background: `${archetype.color}20`,
                      borderColor: `${archetype.color}40`,
                    }}
                  >
                    <TraitIcon size={16} />
                    {trait.name}
                  </Badge>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center"
          >
            <Button
              onClick={onOpenEvolution}
              size="lg"
              className="gap-2"
              style={{
                background: `linear-gradient(135deg, ${archetype.color}, ${archetype.color}CC)`,
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              <TrendUp weight="bold" size={20} />
              View Evolution Path
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
