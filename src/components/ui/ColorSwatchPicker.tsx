import { useState, useRef, useEffect } from 'react';

const PALETTE = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7', 
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
  '#10b981', '#22c55e', '#84cc16', '#eab308',
  '#f59e0b', '#f97316', '#64748b', '#737373'
];

interface Props {
  label?: string;
  color: string;
  onChange: (color: string) => void;
  variant?: 'full' | 'icon';
  hiddenColors?: string[];
  slashedColors?: string[];
}

export function ColorSwatchPicker({ label, color, onChange, variant = 'full', hiddenColors = [], slashedColors = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={variant === 'icon' ? '' : 'inspector-field'} style={{ position: 'relative' }} ref={ref}>
      {variant !== 'icon' && label && <label>{label}</label>}
      <div 
        style={{ 
          display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center',
          background: variant === 'icon' ? 'transparent' : 'var(--btn-bg)', 
          border: variant === 'icon' ? 'none' : '1px solid var(--border-strong)', 
          padding: variant === 'icon' ? '0' : '4px 8px 4px 4px', 
          borderRadius: '6px', cursor: 'pointer',
          height: variant === 'icon' ? '36px' : 'auto',
          marginTop: '0' // relies on parent alignment
        }}
        onClick={() => setIsOpen(!isOpen)}
        title={label}
      >
        <div style={{ width: variant === 'icon' ? '32px' : '20px', height: variant === 'icon' ? '32px' : '20px', borderRadius: variant === 'icon' ? '6px' : '4px', background: color, border: '1px solid var(--border-subtle)', flexShrink: 0 }} />
        {variant !== 'icon' && <span style={{ fontSize: '0.9rem', flex: 1, fontFamily: 'monospace' }}>{color}</span>}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 'auto', marginTop: '4px', zIndex: 100,
          background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)',
          padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow)',
          width: '200px'
        }}>
          <h4 style={{ fontSize: '0.8rem', margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Harmonious Palette</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
            {PALETTE.filter(c => !hiddenColors.includes(c.toLowerCase())).map(c => {
              const isSlashed = slashedColors.includes(c.toLowerCase()) && color.toLowerCase() !== c;
              return (
                <button
                  key={c}
                  onClick={() => onChange(c)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: '4px', border: 'none',
                    background: c, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    boxShadow: color.toLowerCase() === c ? '0 0 0 2px var(--bg-canvas), 0 0 0 4px var(--text-primary)' : 'none'
                  }}
                  title={c}
                >
                  {isSlashed && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top right, transparent 45%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.4) 55%, transparent 55%)' }} />
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="color" 
              value={color} 
              onChange={e => onChange(e.target.value)}
              style={{ width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
            <input 
              type="text" 
              value={color} 
              onChange={e => onChange(e.target.value)}
              onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }}
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--text-primary)', width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
