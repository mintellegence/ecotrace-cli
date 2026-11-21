import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmissionAuditResult } from '../../../../foundation/types/index.ts';

const PRECISION_TEXT: Record<string, string> = {
  city_hub: 'Distance uses the city centre, not the exact address.',
  country_centroid: 'Destination city was not recognised; distance uses the country centre and may be far off.',
  unknown: 'Location could not be resolved; distance is a rough placeholder.',
};

/** Shows when an audit relied on estimated inputs, so a guess is never presented as exact. */
export const DataQualityNotice: React.FC<{ audit: EmissionAuditResult }> = ({ audit }) => {
  const q = audit.dataQuality;
  if (!q) return null;
  const notes: string[] = [];
  if (q.weightEstimated) notes.push('Weight was estimated because the store sent no product weights.');
  if (PRECISION_TEXT[q.distancePrecision]) notes.push(PRECISION_TEXT[q.distancePrecision]);
  if (notes.length === 0) return null;

  return (
    <div role="note" className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] space-y-1">
      <span className="font-bold flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Estimated inputs
      </span>
      {notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
    </div>
  );
};
