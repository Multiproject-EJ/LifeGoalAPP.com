import './KeyboardShortcutsHelp.css';

interface Shortcut {
  formatted: string;
  description?: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[];
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ shortcuts, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <div className="keyboard-shortcuts-help">
      <div className="keyboard-shortcuts-help__backdrop" onClick={onClose} />
      <div className="keyboard-shortcuts-help__modal">
        <div className="keyboard-shortcuts-help__header">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button className="keyboard-shortcuts-help__close" onClick={onClose}>×</button>
        </div>
        <div className="keyboard-shortcuts-help__content">
          <div className="keyboard-shortcuts-help__section">
            <h4>Navigation</h4>
            <ul>
              <li><kbd>↑</kbd> / <kbd>↓</kbd> Navigate actions</li>
              <li><kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> Switch category</li>
            </ul>
          </div>
          <div className="keyboard-shortcuts-help__section">
            <h4>Actions</h4>
            <ul>
              <li><kbd>N</kbd> New action</li>
              <li><kbd>Enter</kbd> Complete selected</li>
              <li><kbd>⌫</kbd> Delete selected</li>
              <li><kbd>⌘+Enter</kbd> Save</li>
              <li><kbd>Esc</kbd> Cancel / Clear</li>
            </ul>
          </div>
          <div className="keyboard-shortcuts-help__section">
            <h4>Selection</h4>
            <ul>
              <li><kbd>Space</kbd> Toggle selection</li>
              <li><kbd>⌘+A</kbd> Select all</li>
            </ul>
          </div>
        </div>
        <div className="keyboard-shortcuts-help__footer">
          <span className="keyboard-shortcuts-help__hint">Press <kbd>?</kbd> to toggle this help</span>
        </div>
      </div>
    </div>
  );
}
