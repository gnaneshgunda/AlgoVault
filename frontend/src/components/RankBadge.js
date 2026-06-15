import React from 'react';

const TIER_COLORS = {
  'Scripter': '#808080',
  'Explorer': '#22c55e',
  'Curator': '#3b82f6',
  'Architect': '#a855f7',
  'Algorithmist': '#f97316',
  'Master': '#ef4444',
  'Grandmaster': '#eab308',
};

const RankBadge = ({ tier, large = false }) => {
  const color = TIER_COLORS[tier] || '#808080';

  return (
    <span
      className={`rank-badge ${large ? 'rank-badge-lg' : ''}`}
      style={{
        background: `${color}15`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span style={{
        width: large ? 10 : 7,
        height: large ? 10 : 7,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        boxShadow: `0 0 6px ${color}80`,
      }} />
      {tier}
    </span>
  );
};

export default RankBadge;
export { TIER_COLORS };
