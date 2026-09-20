import React from 'react';
import { createRoot } from 'react-dom/client';
import CreatureSystemLab from './CreatureSystemLab';
// Separate entry avoids booting auth, sync executors or production gameplay while reviewing fixtures.
createRoot(document.getElementById('root')!).render(<React.StrictMode><CreatureSystemLab /></React.StrictMode>);
