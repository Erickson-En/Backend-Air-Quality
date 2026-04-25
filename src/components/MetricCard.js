// src/components/MetricCard.js
import React, { memo, useMemo } from 'react';

const SEVERITY_CONFIG = {
  GOOD:      { glow: 'rgba(16, 185, 129, 0.35)',  grad: 'linear-gradient(180deg, #10b981, #06b6d4)' },
  MODERATE:  { glow: 'rgba(245, 158, 11, 0.35)',  grad: 'linear-gradient(180deg, #f59e0b, #f97316)' },
  BAD:       { glow: 'rgba(249, 115, 22, 0.35)',  grad: 'linear-gradient(180deg, #f97316, #ef4444)' },
  HAZARDOUS: { glow: 'rgba(239, 68, 68, 0.40)',   grad: 'linear-gradient(180deg, #ef4444, #991b1b)' },
  DEFAULT:   { glow: 'rgba(0, 229, 160, 0.25)',   grad: 'linear-gradient(180deg, #00e5a0, #06b6d4)' },
};

const MetricCard = memo(function MetricCard({
  title,
  value = null,
  unit = '',
  color,       // gradient string from FullDashboard severity
  trend,       // numeric trend direction
}) {
  const severity = useMemo(() => {
    if (!color) return 'DEFAULT';
    if (color.includes('#10b981') || color.includes('#00ff8a')) return 'GOOD';
    if (color.includes('#fbc02d') || color.includes('#fff176')) return 'MODERATE';
    if (color.includes('#ff9800') || color.includes('#f57c00')) return 'BAD';
    if (color.includes('#ff5252') || color.includes('#c62828')) return 'HAZARDOUS';
    return 'DEFAULT';
  }, [color]);

  const cfg = SEVERITY_CONFIG[severity];

  const fillPercent = useMemo(() => {
    if (value == null || typeof value !== 'number') return 0;
    if (unit.includes('%')) return Math.max(0, Math.min(100, value));
    let max = 200;
    if (/temp/i.test(title)) max = 50;
    if (/humidity/i.test(title)) max = 100;
    if (/co2/i.test(title)) max = 2000;
    if (/co\b/i.test(title)) max = 20;
    if (/voc|nox/i.test(title)) max = 500;
    return Math.max(0, Math.min(100, (value / max) * 100));
  }, [value, unit, title]);

  const trendIcon = trend == null ? null : trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
  const trendColor = trend == null ? 'transparent' : trend > 0 ? '#f59e0b' : trend < 0 ? '#10b981' : 'rgba(255,255,255,0.4)';

  return (
    <div
      className="metric-card"
      style={{ '--card-glow': cfg.glow }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div className="metric-title">{title}</div>
        {trendIcon && (
          <span style={{ fontSize: 13, color: trendColor, fontWeight: 700 }}>
            {trendIcon}
          </span>
        )}
      </div>

      {/* Gauge */}
      <div className="metric-gauge">
        <div
          className="metric-fill"
          style={{
            height: `${fillPercent}%`,
            background: color || cfg.grad,
            boxShadow: `0 -6px 20px ${cfg.glow}`,
          }}
        />
      </div>

      {/* Value */}
      <div className="metric-value">
        {value != null && typeof value === 'number'
          ? value.toFixed(value < 10 ? 2 : 1)
          : '—'}
      </div>

      {/* Unit badge */}
      {unit && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {unit}
        </span>
      )}

      {/* Severity indicator dot */}
      {severity !== 'DEFAULT' && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: cfg.glow.replace('rgba', 'rgb').replace(/, 0\.\d+\)/, ')'),
            boxShadow: `0 0 8px ${cfg.glow}`,
          }}
        />
      )}
    </div>
  );
});

export default MetricCard;
