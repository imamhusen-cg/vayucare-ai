import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VayuCare Uncaught Error Boundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          role="alert" 
          aria-live="assertive"
          className="min-h-[280px] p-6 rounded-2xl bg-ink-900 border border-rose-500/30 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto my-8 shadow-2xl"
        >
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink-100">Something went wrong</h2>
            <p className="text-xs text-ink-400 max-w-sm">
              An unexpected error occurred while rendering atmospheric telemetry.
            </p>
          </div>
          {this.state.error?.message && (
            <p className="text-[11px] font-mono text-rose-400/90 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-500/15 max-w-xs truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-ink-950 font-medium text-xs hover:bg-accent/90 transition-colors focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
