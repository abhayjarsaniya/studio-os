import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { errorMonitorService } from '../../services/errorMonitorService';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const captured = errorMonitorService.captureException(error, {
      componentStack: errorInfo.componentStack || undefined
    });

    this.setState({ errorId: captured.id });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const friendlyMessage = errorMonitorService.getUserFriendlyMessage(this.state.error);

      return (
        <div className="min-h-[360px] w-full flex items-center justify-center p-6 bg-zinc-50/70 border border-zinc-200/80 rounded-3xl m-2">
          <div className="max-w-md w-full bg-white p-7 rounded-2xl border border-zinc-200 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-zinc-900 font-display">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                {this.props.fallbackMessage || friendlyMessage}
              </p>
              {this.state.errorId && (
                <p className="text-xs font-mono text-zinc-400 bg-zinc-50 py-1 px-2 rounded-md inline-block border border-zinc-200/60">
                  Ref ID: {this.state.errorId}
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer min-h-[44px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white active:scale-95 transition-all cursor-pointer shadow-xs min-h-[44px]"
              >
                <Home className="w-3.5 h-3.5" />
                Reload Studio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
