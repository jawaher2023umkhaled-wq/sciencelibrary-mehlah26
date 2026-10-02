import React from 'react';
import { useResources } from '../context/ResourceContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { toasts } = useResources();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transform transition-all duration-300 animate-in slide-in-from-bottom-4 ${
            toast.type === 'success'
              ? 'bg-emerald-500/95 text-white border-emerald-400'
              : toast.type === 'warning'
              ? 'bg-amber-500/95 text-white border-amber-400'
              : toast.type === 'error'
              ? 'bg-rose-500/95 text-white border-rose-400'
              : 'bg-cyan-600/95 text-white border-cyan-400'
          }`}
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
          </div>
          <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};
