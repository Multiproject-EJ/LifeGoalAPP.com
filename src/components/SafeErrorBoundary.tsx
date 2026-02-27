import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SafeErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface SafeErrorBoundaryState {
  hasError: boolean;
}

export class SafeErrorBoundary extends Component<SafeErrorBoundaryProps, SafeErrorBoundaryState> {
  state: SafeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SafeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
