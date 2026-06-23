import React, { useMemo } from 'react';

/**
 * Digital Board Background — fills the full screen when drawing mode is active.
 * Renders a canvas-style background (blackboard, whiteboard, grid, lined, blueprint, etc.)
 */
export default function DigitalBoard({ boardBackground }) {
  const board = boardBackground || { id: 'blackboard', bg: '#0f1117', grid: false };

  const gridPattern = useMemo(() => {
    const { id, bg, grid } = board;

    if (!grid) return { background: bg };

    if (grid === 'grid') {
      return {
        background: bg,
        backgroundImage: [
          'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '32px 32px',
      };
    }

    if (grid === 'dark-grid') {
      return {
        background: bg,
        backgroundImage: [
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '32px 32px',
      };
    }

    if (grid === 'lines') {
      return {
        background: bg,
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px)',
        backgroundSize: '100% 32px',
      };
    }

    if (grid === 'blueprint') {
      return {
        background: bg,
        backgroundImage: [
          `linear-gradient(rgba(100,180,255,0.12) 1px, transparent 1px)`,
          `linear-gradient(90deg, rgba(100,180,255,0.12) 1px, transparent 1px)`,
          `linear-gradient(rgba(100,180,255,0.05) 1px, transparent 1px)`,
          `linear-gradient(90deg, rgba(100,180,255,0.05) 1px, transparent 1px)`,
        ].join(', '),
        backgroundSize: '128px 128px, 128px 128px, 32px 32px, 32px 32px',
      };
    }

    return { background: bg };
  }, [board]);

  return (
    <div
      className="absolute inset-0 z-0 transition-all duration-700"
      style={gridPattern}
    >
      {/* Subtle vignette for blackboard feel */}
      {(board.id === 'blackboard' || board.id === 'dark-grid') && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.45) 100%)',
          }}
        />
      )}
      {/* Paper texture for whiteboard/grid */}
      {(board.id === 'whiteboard' || board.id === 'grid' || board.id === 'lined') && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0) 50%, rgba(200,210,230,0.18) 100%)',
          }}
        />
      )}
    </div>
  );
}
