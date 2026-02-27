import { Component, type ReactNode } from 'react';

interface RecoverableErrorBoundaryProps {
  fallback: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  children: ReactNode;
}

interface RecoverableErrorBoundaryState {
  hasError: boolean;
}

export class RecoverableErrorBoundary extends Component<
  RecoverableErrorBoundaryProps,
  RecoverableErrorBoundaryState
> {
  state: RecoverableErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RecoverableErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
