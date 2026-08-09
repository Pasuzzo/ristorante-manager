import React from 'react';
import { money } from '@/lib/partita';
import { Icon } from './icons';

export function PixelButton({ children, onClick, variant = '', disabled, type = 'button', className = '', full, ...rest }) {
  const v = variant ? `rm-btn-${variant}` : '';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rm-btn ${v} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Chip({ children, color = 'bg-rm-bg2', className = '' }) {
  return <span className={`rm-chip ${color} ${className}`}>{children}</span>;
}

export function SectionTitle({ children, icon }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon && <Icon name={icon} size={16} color="#f2e5bc" />}
      <h3 className="rm-pixel text-[12px] text-rm-cream">{children}</h3>
      <div className="flex-1 border-b-[3px] border-rm-wood-dark ml-1" />
    </div>
  );
}

export function PixelPanel({ children, title, icon, className = '', titleColor }) {
  return (
    <div className={`rm-wood rm-no-radius ${className}`}>
      {title && (
        <div className={`rm-tovaglia-red ${titleColor ?? ''} border-b-[4px] border-rm-wood-dark px-2 py-1 flex items-center gap-2`}>
          {icon && <Icon name={icon} size={14} color="#2b2233" />}
          <span className="rm-pixel text-[11px] text-rm-bg">{title}</span>
        </div>
      )}
      <div className="p-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, icon, accent }) {
  return (
    <div className="rm-card rm-no-radius p-2 rm-shadow">
      <div className="flex items-center gap-1 text-rm-bg2">
        {icon && <Icon name={icon} size={12} color="#5a3825" />}
        <span className="rm-pixel text-[8px] uppercase text-rm-wood-dark">{label}</span>
      </div>
      <div className={`rm-pixel text-[14px] mt-1 ${accent ?? 'text-rm-bg'}`}>{value}</div>
    </div>
  );
}

export function SegmentedBar({ value, max = 20, segments = 20, color = '#5a8c46', emptyColor = '#5a3825', className = '', size = 12 }) {
  const filled = Math.max(0, Math.min(segments, Math.round((value / max) * segments)));
  const segW = size;
  const segH = Math.round(size * 1.1);
  return (
    <div className={`flex gap-[2px] ${className}`} style={{ height: segH }}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="pixelated"
          style={{ width: segW, height: segH, backgroundColor: i < filled ? color : emptyColor }}
        />
      ))}
    </div>
  );
}

export function StarRating({ reputazione = 0, size = 18 }) {
  const stars = Math.round(reputazione * 5 * 2) / 2; // mezzo voto
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.min(1, Math.max(0, stars - (n - 1)));
        const half = fill === 0.5;
        const full = fill === 1;
        const color = full ? '#e8b84b' : half ? '#e8b84b' : '#5a3825';
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <Icon name="star" size={size} color="#5a3825" />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Icon name="star" size={size} color="#e8b84b" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function Money({ value, className = '', accent }) {
  const neg = typeof value === 'number' && value < 0;
  return <span className={`rm-pixel ${accent ? accent : neg ? 'text-rm-red' : ''} ${className}`}>{money(value)}</span>;
}

export function MoraleFace({ morale = 50 }) {
  const face = morale >= 70 ? '😄' : morale >= 55 ? '🙂' : morale >= 40 ? '😐' : morale >= 25 ? '😟' : '😡';
  const color = morale >= 55 ? '#5a8c46' : morale >= 40 ? '#e8b84b' : '#c8443c';
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 18 }}>{face}</span>
      <SegmentedBar value={morale} max={100} segments={10} color={color} size={9} />
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="rm-card-dark rm-no-radius p-6 text-center rm-text text-[18px] text-rm-cream/70">{children}</div>;
}