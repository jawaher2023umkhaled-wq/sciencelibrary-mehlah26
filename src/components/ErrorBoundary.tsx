import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  title?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Enterprise-grade Error Boundary component to protect the UI against unhandled
 * component crashes and blank screen issues.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleReload = () => {
    window.location.reload();
  };

  public handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error || new Error('Unknown error'), this.handleReset);
        }
        return this.props.fallback;
      }

      return (
        <div className="w-full min-h-[320px] p-6 sm:p-8 flex items-center justify-center bg-slate-50/90 font-['Cairo',sans-serif] text-slate-800 antialiased" dir="rtl">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-rose-200/80 shadow-xl p-6 sm:p-8 text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 inline-block">
                حماية الواجهة • Error Boundary Active
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                {this.props.title || 'حدث تنبيه أثناء عرض هذا الجزء من المنصة'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                تم احتواء الخطأ البرمجي بنجاح لحماية الموقع ومنع ظهور شاشة بيضاء (Blank Screen). يمكنك الاستمرار في استخدام باقي أقسام المنصة أو إعادة المحاولة.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث الصفحة</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>الصفحة الرئيسية</span>
              </button>
            </div>

            {/* Collapsible Error Debug Details */}
            {this.state.error && (
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline font-mono cursor-pointer"
                >
                  {this.state.showDetails ? 'إخفاء التفاصيل الفنية' : 'عرض التفاصيل الفنية للخطأ'}
                </button>
                {this.state.showDetails && (
                  <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono text-left overflow-x-auto max-h-40" dir="ltr">
                    <p className="font-bold text-rose-400">{this.state.error.name}: {this.state.error.message}</p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-[10px] text-slate-400 mt-1 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
