import React, { useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformFeatureService } from '../../services/platformFeatureService';
import { FeatureCatalogItem } from '../../types/schema';
import { Sliders, CheckCircle, XCircle, Info } from 'lucide-react';

export const PlatformFeaturesPage: React.FC = () => {
  const { triggerRefresh, refreshTrigger, canAdmin, currentAdmin } = usePlatform();

  const features = useMemo(() => {
    return platformFeatureService.listFeatures();
  }, [refreshTrigger]);

  const handleToggle = (f: FeatureCatalogItem) => {
    platformFeatureService.toggleGlobalFeature(f.key, !f.isGlobalEnabled, currentAdmin.name);
    triggerRefresh();
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-7 h-7 text-indigo-600" />
          Platform Feature Catalog & Global Kill Switches
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Control global availability of studio modules, plan feature assignments, and system-wide maintenance toggles.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Feature Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Global Availability</th>
                <th className="px-4 py-3 text-right">Kill Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {features.map(f => (
                <tr key={f.key} className="hover:bg-slate-50">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900 text-sm">{f.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{f.key}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {f.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-md">{f.description}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${
                      f.isGlobalEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {f.isGlobalEnabled ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                      {f.isGlobalEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {canAdmin('manage_settings') && (
                      <button
                        onClick={() => handleToggle(f)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                          f.isGlobalEnabled 
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100' 
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {f.isGlobalEnabled ? 'Kill Switch' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
