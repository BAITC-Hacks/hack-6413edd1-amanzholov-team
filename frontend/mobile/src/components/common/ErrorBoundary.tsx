import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, LayoutDashboard, Gamepad2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught a rendering error during theme transition:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleResetToMode = (mode: 'classic' | 'rpg') => {
    try {
      localStorage.setItem('career_quest_ui_mode', mode);
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-screen h-[100dvh] flex items-center justify-center p-4 bg-[#191512] text-[#efe4d5] select-none font-sans">
          <div className="w-full max-w-md bg-[#251e18] border-2 border-[#8a5d33] rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Error Copy */}
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#fae5be] tracking-tight">
                Display Transition Recovery
              </h2>
              <p className="text-xs text-[#c9b7a4] leading-relaxed">
                A rendering issue occurred during view transition. Your career data, competencies, and quest progress are safe.
              </p>
            </div>

            {/* Error Message Details (collapsible / subtle) */}
            {this.state.error?.message && (
              <div className="p-2.5 rounded-lg bg-[#181310] border border-[#4a3424] text-[11px] font-mono text-amber-200/80 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Rendering</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => this.handleResetToMode('classic')}
                  className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reset Classic</span>
                </button>

                <button
                  onClick={() => this.handleResetToMode('rpg')}
                  className="py-2 px-3 rounded-xl bg-[#3b2a1a] hover:bg-[#4d3722] border border-[#a8742b] text-[#f7ca6f] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-[#f5c76c]" />
                  <span>Reset RPG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
