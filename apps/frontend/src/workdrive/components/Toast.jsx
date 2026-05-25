import React, { useEffect } from 'react';
import { useStore } from '../store.jsx';
import { IconCheck } from './Icons.jsx';

export default function Toast() {
  const { state, dispatch } = useStore();
  const toast = state.toast;

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 2600);
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="wd-toast pointer-events-auto flex items-center gap-2.5 rounded-xl bg-wd-navy px-4 py-3 text-sm font-medium text-white shadow-pop">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-wd-navy">
          <IconCheck size={14} stroke={3} />
        </span>
        {toast.msg}
      </div>
    </div>
  );
}
