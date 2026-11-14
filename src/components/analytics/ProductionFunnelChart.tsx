import React from 'react';
import { ProductionFunnelStage } from '../../types/schema';
import { Clock, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ProductionFunnelChartProps {
  stages: ProductionFunnelStage[];
  bottlenecks: ProductionFunnelStage[];
  onStageClick?: (stage: ProductionFunnelStage) => void;
}

export const ProductionFunnelChart: React.FC<ProductionFunnelChartProps> = ({
  stages,
  bottlenecks,
  onStageClick
}) => {
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const bottleneckKeys = new Set(bottlenecks.map(b => b.stageKey));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">10-Stage Production Pipeline Funnel</h3>
          <p className="text-xs text-slate-500">Live shoot-to-delivery stage volume and turnaround bottlenecks</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Top Bottlenecks
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {stages.map((stage) => {
          const isBottleneck = bottleneckKeys.has(stage.stageKey);
          const widthPct = Math.max(12, Math.round((stage.count / maxCount) * 100));

          return (
            <div
              key={stage.stageKey}
              onClick={() => onStageClick && onStageClick(stage)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isBottleneck
                  ? 'bg-amber-50/50 border-amber-300 hover:bg-amber-100/50'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                    {stage.order}
                  </span>
                  <span className="font-semibold text-slate-800">{stage.stageName}</span>
                  {isBottleneck && (
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                      Bottleneck
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    ~{stage.avgDaysInStage}d avg
                  </span>
                  {stage.delayedCount > 0 && (
                    <span className="text-rose-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {stage.delayedCount} delayed
                    </span>
                  )}
                  {stage.revisionCount > 0 && (
                    <span className="text-indigo-600 font-medium flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      {stage.revisionCount} revisions
                    </span>
                  )}
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {stage.count} items
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isBottleneck ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
