import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CraftNest ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#FFF9F3]">
          <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#B84242]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="font-serif text-2xl font-bold text-[#2B2523] mb-2">
              Something went wrong
            </h1>

            <p className="text-xs sm:text-sm text-[#6F625D] mb-6 leading-relaxed">
              We encountered an unexpected issue while loading this page. Our artisans are already looking into it.
            </p>

            {import.meta.env?.DEV && this.state.error && (
              <div className="mb-6 p-3 rounded-xl bg-neutral-100 text-left overflow-auto max-h-36 text-[11px] font-mono text-neutral-800">
                <span className="font-bold block text-red-600 mb-1">{this.state.error.toString()}</span>
                {this.state.errorInfo?.componentStack}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#F4E8DC] text-[#2B2523] hover:bg-[#E6D8CC] text-xs font-semibold transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
