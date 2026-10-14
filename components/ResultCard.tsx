
import React, { ReactNode } from 'react';

interface ResultCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  extraActions?: ReactNode;
  className?: string;
}

const ResultCard: React.FC<ResultCardProps> = ({ title, icon, children, extraActions, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-all duration-300 ease-in-out ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            {icon}
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        {extraActions && (
          <div className="flex items-center shrink-0">
            {extraActions}
          </div>
        )}
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </div>
    </div>
  );
};

export default ResultCard;
