import ReactDOM from 'react-dom/client';
import CaretakerCharacterLab from './CaretakerCharacterLab';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Caretaker Character Lab root is missing.');
}

// This dedicated visual-proof entry intentionally avoids StrictMode's
// development-only double mount. Constructing the high-LOD Three.js scene
// twice makes repeatable screenshot gates needlessly slow and can exhaust a
// mobile WebGL context; the normal app route retains its existing behaviour.
ReactDOM.createRoot(root).render(<CaretakerCharacterLab />);
