import React from 'react';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App render error caught by boundary:', error, info);
    if (typeof window !== 'undefined') {
      window.__LifeGoalAppDebugger?.error('App render error caught by boundary.', {
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          background: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
          color: '#0f172a',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ marginBottom: '0.75rem' }}>Something went wrong</h1>
          <p style={{ marginBottom: '1rem' }}>
            The app hit a rendering error and recovered to a safe screen.
          </p>
          {this.state.errorMessage ? (
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>{this.state.errorMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: 10,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f8fafc',
              cursor: 'pointer',
            }}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
