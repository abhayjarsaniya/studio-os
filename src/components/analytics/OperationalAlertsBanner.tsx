import React from 'react';
import { OperationalAlert } from '../../types/schema';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';

interface OperationalAlertsBannerProps {
  alerts: OperationalAlert[];
  onActionClick?: (alert: OperationalAlert) => void;
}

export const OperationalAlertsBanner: React.FC<OperationalAlertsBannerProps> = ({
  alerts,
  onActionClick
}) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Operational Action Items ({alerts.length})
        </h3>
        <span className="text-xs text-slate-500">Real-time studio bottlenecks & risks</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map(alert => {
          const isCritical = alert.severity === 'critical';
          const isWarning = alert.severity === 'warning';

          const bgClass = isCritical
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : isWarning
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-blue-50 border-blue-200 text-blue-900';

          const icon = isCritical ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          ) : isWarning ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          );

          const btnClass = isCritical
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : isWarning
            ? 'bg-amber-600 hover:bg-amber-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white';

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between shadow-xs ${bgClass}`}
            >
              <div>
                <div className="flex items-start gap-2">
                  {icon}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold leading-snug">{alert.title}</h4>
                    <p className="text-xs opacity-90 mt-1 line-clamp-2 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-black/5 flex justify-end">
                <a
                  href={`#${alert.actionUrl}`}
                  onClick={(e) => {
                    if (onActionClick) {
                      e.preventDefault();
                      onActionClick(alert);
                    }
                  }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md inline-flex items-center gap-1 transition-colors ${btnClass}`}
                >
                  {alert.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
