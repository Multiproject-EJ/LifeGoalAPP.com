import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EggBatchReveal } from '../../src/features/gamification/level-worlds/components/EggBatchReveal';
import { CREATURE_CATALOG } from '../../src/features/gamification/level-worlds/services/creatureCatalog';
import '../../src/features/gamification/level-worlds/LevelWorlds.css';
function Review() {
  const [open, setOpen] = useState(false);
  return <><h1>Egg batch · presentation only</h1><p>No account, eggs or rewards are changed.</p>
    <button onClick={() => setOpen(true)}>Preview three eggs</button>
    {open ? <EggBatchReveal creatureIds={CREATURE_CATALOG.slice(1, 4).map(c => c.id)} onClose={() => setOpen(false)} /> : null}</>;
}
createRoot(document.getElementById('root')!).render(<Review />);
