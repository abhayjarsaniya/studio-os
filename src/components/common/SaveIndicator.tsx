import React, { useState, useEffect } from 'react';
import { firestoreService, SaveStatus } from '../../services/firestoreService';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

export const SaveIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const unsub = firestoreService.subscribeSaveStatus((newStatus, msg) => {
      setStatus(newStatus);
      if (msg) setMessage(msg);
    });
    return unsub;
  }, []);

  const handleRetry = () => {
    firestoreService.retryPendingQueue();
  };

  if (status === 'idle' || status === 'offline') {
    return null;
  }

  return (
    <div 
      onClick={status === 'error' ? handleRetry : undefined}
      title={status === 'error' ? 'Click to retry cloud synchronization' : message}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all animate-in fade-in duration-200 select-none ${
        status === 'saving' 
          ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : status === 'saved'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-rose-50 text-rose-800 border border-rose-200 cursor-pointer hover:bg-rose-100'
      } ${className}`}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
          <span>Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Saved</span>
        </>
      )}

      {status === 'error' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Sync failed — click to retry</span>
        </>
      )}
    </div>
  );
};
