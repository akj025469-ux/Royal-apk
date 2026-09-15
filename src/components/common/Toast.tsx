import React from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Toast: React.FC = () => {
  const { toast } = useApp();
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    info: <Info className="w-4 h-4 text-sky-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  };

  const bgColors = {
    success: 'bg-slate-900/95 border-emerald-500/40 text-emerald-200',
    info: 'bg-slate-900/95 border-sky-500/40 text-sky-200',
    warning: 'bg-slate-900/95 border-amber-500/40 text-amber-200',
  };

  return (
    <div
      id="royal-toast-notification"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-2.5 max-w-sm text-xs font-semibold animate-slide-up"
    >
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${bgColors[toast.type]}`}>
        {icons[toast.type]}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
