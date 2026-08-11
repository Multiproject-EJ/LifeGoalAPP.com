import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CompassBookThreeLab from '../features/compass-book/dev/CompassBookThreeLab';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CompassBookThreeLab />
  </StrictMode>,
);
