import React, { useState, useRef } from 'react';
import {
  Pen, Pencil, Highlighter, Eraser, Undo2, Trash2,
  X, Monitor, ChevronRight, ChevronLeft,
  Maximize2, Minimize2, Sparkles, Zap, Eye, EyeOff, Layers,
  Feather, Droplets, Minus, Square, Circle, Triangle,
  ArrowUpRight, Diamond, Star
} from 'lucide-react';

/* ── Inline SVG icons ──────────────────────────────────────────── */
const MarkerIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="13" height="8" rx="2"/>
    <path d="M16 12h2a2 2 0 0 1 0 4h-2"/>
    <path d="M3 12h.01"/>
  </svg>
);

/* ── Tool groups ───────────────────────────────────────────────── */
const TOOL_GROUPS = [
  {
    label: 'Pens',
    tools: [
      { id: 'pen',         label: 'Pen',        Icon: Pen,        defaultWidth: 4,  description: 'Ballpoint pen' },
      { id: 'pencil',      label: 'Pencil',     Icon: Pencil,     defaultWidth: 3,  description: 'Sketchy pencil stroke' },
      { id: 'marker',      label: 'Marker',     Icon: MarkerIcon, defaultWidth: 14, description: 'Chisel-tip marker' },
      { id: 'highlighter', label: 'Highlight',  Icon: Highlighter,defaultWidth: 24, description: 'Transparent highlighter' },
      { id: 'calligraphy', label: 'Calligraphy',Icon: Feather,    defaultWidth: 8,  description: 'Flat calligraphy pen' },
      { id: 'glow',        label: 'Neon',       Icon: Sparkles,   defaultWidth: 6,  description: 'Glowing neon line' },
      { id: 'laser',       label: 'Laser',      Icon: Zap,        defaultWidth: 8,  description: 'Fading magic ink' },
      { id: 'splatter',    label: 'Spray',      Icon: Droplets,   defaultWidth: 40, description: 'Spray paint effect' },
    ]
  },
  {
    label: 'Shapes',
    tools: [
      { id: 'line',     label: 'Line',    Icon: Minus,       defaultWidth: 3, description: 'Straight line' },
      { id: 'rect',     label: 'Rect',    Icon: Square,      defaultWidth: 3, description: 'Rectangle' },
      { id: 'circle',   label: 'Ellipse', Icon: Circle,      defaultWidth: 3, description: 'Circle / Ellipse' },
      { id: 'triangle', label: 'Triangle',Icon: Triangle,    defaultWidth: 3, description: 'Triangle' },
      { id: 'arrow',    label: 'Arrow',   Icon: ArrowUpRight,defaultWidth: 3, description: 'Arrow' },
      { id: 'diamond',  label: 'Diamond', Icon: Diamond,     defaultWidth: 3, description: 'Diamond' },
      { id: 'star',     label: 'Star',    Icon: Star,        defaultWidth: 3, description: 'Star' },
    ]
  },
];

const ALL_TOOLS = TOOL_GROUPS.flatMap(g => g.tools);

/* ── MS-Paint color palette ──────────────────────────────────── */
const MS_PAINT_COLORS = [
  { hex: '#000000', label: 'Black' },
  { hex: '#7f7f7f', label: 'Dark Gray' },
  { hex: '#880015', label: 'Dark Red' },
  { hex: '#ed1c24', label: 'Red' },
  { hex: '#ff7f27', label: 'Orange' },
  { hex: '#fff200', label: 'Yellow' },
  { hex: '#22b14c', label: 'Green' },
  { hex: '#00a2e8', label: 'Turquoise' },
  { hex: '#3f48cc', label: 'Indigo' },
  { hex: '#a349a4', label: 'Purple' },
  { hex: '#ffffff', label: 'White' },
  { hex: '#c3c3c3', label: 'Light Gray' },
  { hex: '#b97a57', label: 'Brown' },
  { hex: '#ffaec9', label: 'Pink' },
  { hex: '#ffc90e', label: 'Gold' },
  { hex: '#efe4b0', label: 'Light Yellow' },
  { hex: '#b5e61d', label: 'Lime' },
  { hex: '#99d9ea', label: 'Sky Blue' },
  { hex: '#7092be', label: 'Slate Blue' },
  { hex: '#c8bfe7', label: 'Lavender' },
];

/* ── Stroke sizes per tool ──────────────────────────────────── */
const STROKE_SIZES = {
  pen:         [2, 4, 7, 12],
  pencil:      [1, 2, 4, 7],
  marker:      [8, 14, 20, 30],
  highlighter: [16, 24, 36, 48],
  calligraphy: [4, 8, 14, 22],
  glow:        [4, 8, 12, 20],
  laser:       [4, 8, 12, 20],
  splatter:    [20, 40, 65, 90],
  line:        [2, 4, 7, 12],
  rect:        [2, 4, 7, 12],
  circle:      [2, 4, 7, 12],
  triangle:    [2, 4, 7, 12],
  arrow:       [2, 4, 7, 12],
  diamond:     [2, 4, 7, 12],
  star:        [2, 4, 7, 12],
  eraser:      [20, 36, 52, 72],
};

const ERASER = { id: 'eraser', label: 'Eraser', Icon: Eraser, defaultWidth: 36, description: 'Erase strokes by dragging' };

/* ── Utility: visual size bar height ───────────────────────── */
function sizeBarH(sz, tool) {
  if (tool === 'splatter') return Math.min(sz * 0.12, 12);
  return Math.min(sz * 0.7, 16);
}

export default function DrawingToolbar({
  isDrawingMode, setIsDrawingMode,
  drawingTool, setDrawingTool,
  drawingColor, setDrawingColor,
  drawingWidth, setDrawingWidth,
  onUndo, onClear,
  boardBackground, setBoardBackground,
  zenMode, setZenMode,
  isFullscreen, toggleFullscreen,
  showNotesOnBoard, setShowNotesOnBoard,
}) {
  const [collapsed, setCollapsed]       = useState(false);
  const [activeFlyout, setActiveFlyout] = useState(null); // 'brush' | 'shape' | 'size' | 'color' | null
  const [customColors, setCustomColors]  = useState(Array(10).fill('#334155'));
  const [customColorIndex, setCustomColorIndex] = useState(0);
  const colorInputRef = useRef(null);

  const handleCustomColorAdd = (hex) => {
    setDrawingColor(hex);
    setCustomColors(prev => { const n = [...prev]; n[customColorIndex] = hex; return n; });
    setCustomColorIndex(prev => (prev + 1) % 10);
  };

  const handleToolClick = (tool) => {
    setDrawingTool(tool.id);
    setDrawingWidth(STROKE_SIZES[tool.id]?.[1] ?? tool.defaultWidth);
    setActiveFlyout(null);
  };

  const BOARDS = [
    { id: 'blackboard', label: 'Blackboard', bg: '#0f1117', grid: false },
    { id: 'whiteboard', label: 'Whiteboard', bg: '#f8fafc', grid: false },
    { id: 'grid',       label: 'Grid Paper', bg: '#fafafa', grid: 'grid' },
    { id: 'lined',      label: 'Lined',      bg: '#fafafa', grid: 'lines' },
    { id: 'dark-grid',  label: 'Dark Grid',  bg: '#0f172a', grid: 'dark-grid' },
    { id: 'blueprint',  label: 'Blueprint',  bg: '#0c2340', grid: 'blueprint' },
  ];

  const isEraser   = drawingTool === 'eraser';
  const isSplatter = drawingTool === 'splatter';
  const isShape    = ['line','rect','circle','triangle','arrow','diamond','star'].includes(drawingTool);
  const currentSizes = STROKE_SIZES[drawingTool] || [4];

  if (!isDrawingMode) {
    return (
      <button
        onClick={() => setIsDrawingMode(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 group flex items-center gap-2.5 px-5 py-3 rounded-2xl font-semibold text-sm text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)' }}
      >
        <Pen size={16} />
        <span>Digital Board</span>
        <Monitor size={15} className="opacity-60" />
      </button>
    );
  }
  const activeBrushTool = TOOL_GROUPS[0].tools.find(t => t.id === drawingTool) || TOOL_GROUPS[0].tools.find(t => t.id === 'pen') || TOOL_GROUPS[0].tools[0];
  const activeShapeTool = TOOL_GROUPS[1].tools.find(t => t.id === drawingTool) || TOOL_GROUPS[1].tools.find(t => t.id === 'line') || TOOL_GROUPS[1].tools[0];

  return (
    <>
      {/* ── Vertical Side Toolbar ─────────────────────────────────── */}
      <div
        className="fixed left-4 top-6 bottom-6 z-50 flex items-center pointer-events-none"
        style={{ transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Collapse toggle tab */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute pointer-events-auto z-10 w-6 h-12 flex items-center justify-center transition-all duration-300 rounded-r-xl border border-slate-700/50 text-slate-400 hover:text-indigo-400 active:scale-95 shadow-xl hover:scale-105"
          style={{
            left: collapsed ? '0px' : '84px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(20px)',
            boxShadow: '4px 0 15px rgba(0,0,0,0.3)',
            zIndex: 60,
          }}
        >
          {collapsed ? <ChevronRight size={14} className="animate-pulse" /> : <ChevronLeft size={14} />}
        </button>

        {/* Panel */}
        <div
          className="pointer-events-auto"
          style={{
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            width: collapsed ? '0px' : '84px',
            opacity: collapsed ? 0 : 1,
            overflow: collapsed ? 'hidden' : 'visible',
            maxHeight: '100%',
            transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s',
            flexShrink: 0,
          }}
        >
          {/* Inner content */}
          <div
            className="flex flex-col items-center gap-1.5 py-4"
            style={{
              width: '84px',
              overflow: 'visible',
            }}
          >

            {/* ── Active Brush Tool ─────────────────────────────────── */}
            <div className="relative flex flex-col items-center w-full">
              <button
                onClick={() => setActiveFlyout(activeFlyout === 'brush' ? null : 'brush')}
                className="relative group/tool flex flex-col items-center justify-center w-[70px] h-11 rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95 hover:scale-[1.05]"
                style={{
                  background: (!isEraser && !isShape)
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))'
                    : 'transparent',
                  border: (!isEraser && !isShape) ? '1px solid rgba(129, 140, 248, 0.4)' : '1px solid transparent',
                  boxShadow: (!isEraser && !isShape) ? '0 4px 12px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                }}
              >
                <activeBrushTool.Icon size={16} style={{ color: (!isEraser && !isShape) ? '#818cf8' : '#64748b' }} />
                <span className="text-[7.5px] font-bold mt-0.5 tracking-tight" style={{ color: (!isEraser && !isShape) ? '#818cf8' : '#475569' }}>
                  {activeBrushTool.label}
                </span>
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/tool:translate-x-0 border border-slate-800 shadow-2xl z-50">
                  Select brush (active: {activeBrushTool.label})
                </div>
              </button>

              {/* Brush Flyout Box */}
              {activeFlyout === 'brush' && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-4 p-3 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col gap-2 w-[180px]"
                  style={{
                    background: 'rgba(15,23,42,0.92)',
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                    zIndex: 100
                  }}
                >
                  <p className="text-[8px] font-black tracking-widest text-slate-500 uppercase px-1">
                    Select Brush
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TOOL_GROUPS[0].tools.map(tool => {
                      const isSelected = drawingTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            handleToolClick(tool);
                            setActiveFlyout(null);
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-left transition-all duration-150 active:scale-95 ${isSelected ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                          style={{ border: isSelected ? '1px solid rgba(129,140,248,0.3)' : '1px solid transparent' }}
                        >
                          <tool.Icon size={12} className={isSelected ? 'text-indigo-400' : 'text-slate-500'} />
                          <span className="text-[9.5px] font-semibold truncate">{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Active Shape Tool ─────────────────────────────────── */}
            <div className="relative flex flex-col items-center w-full">
              <button
                onClick={() => setActiveFlyout(activeFlyout === 'shape' ? null : 'shape')}
                className="relative group/tool flex flex-col items-center justify-center w-[70px] h-11 rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95 hover:scale-[1.05]"
                style={{
                  background: isShape
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))'
                    : 'transparent',
                  border: isShape ? '1px solid rgba(129, 140, 248, 0.4)' : '1px solid transparent',
                  boxShadow: isShape ? '0 4px 12px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                }}
              >
                <activeShapeTool.Icon size={16} style={{ color: isShape ? '#818cf8' : '#64748b' }} />
                <span className="text-[7.5px] font-bold mt-0.5 tracking-tight" style={{ color: isShape ? '#818cf8' : '#475569' }}>
                  {activeShapeTool.label}
                </span>
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/tool:translate-x-0 border border-slate-800 shadow-2xl z-50">
                  Select shape (active: {activeShapeTool.label})
                </div>
              </button>

              {/* Shapes Flyout Box */}
              {activeFlyout === 'shape' && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-4 p-3 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col gap-2 w-[180px]"
                  style={{
                    background: 'rgba(15,23,42,0.92)',
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                    zIndex: 100
                  }}
                >
                  <p className="text-[8px] font-black tracking-widest text-slate-500 uppercase px-1">
                    Select Shape
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TOOL_GROUPS[1].tools.map(tool => {
                      const isSelected = drawingTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            handleToolClick(tool);
                            setActiveFlyout(null);
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-left transition-all duration-150 active:scale-95 ${isSelected ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                          style={{ border: isSelected ? '1px solid rgba(129,140,248,0.3)' : '1px solid transparent' }}
                        >
                          <tool.Icon size={12} className={isSelected ? 'text-indigo-400' : 'text-slate-500'} />
                          <span className="text-[9.5px] font-semibold truncate">{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Eraser ──────────────────────────────────────────── */}
            <div className="relative flex flex-col items-center w-full">
              <button
                onClick={() => {
                  handleToolClick(ERASER);
                  setActiveFlyout(null);
                }}
                title={ERASER.description}
                className="relative group/tool flex flex-col items-center justify-center w-[70px] h-11 rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95 hover:scale-[1.05]"
                style={{
                  background: isEraser ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  border: isEraser ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                  boxShadow: isEraser ? '0 4px 12px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                }}
              >
                <ERASER.Icon size={16} style={{ color: isEraser ? '#f87171' : '#64748b' }} />
                <span className="text-[7.5px] font-bold mt-0.5" style={{ color: isEraser ? '#f87171' : '#475569' }}>Erase</span>
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/tool:translate-x-0 border border-slate-800 shadow-2xl z-50">
                  {ERASER.description}
                </div>
              </button>
            </div>

            {/* ── Stroke Size Button & Flyout ─────────────────────── */}
            <div className="relative flex flex-col items-center w-full">
              <div className="w-8 h-px bg-slate-800/60 my-1.5" />
              <button
                onClick={() => setActiveFlyout(activeFlyout === 'size' ? null : 'size')}
                className="relative group/tool flex flex-col items-center justify-center w-[70px] h-11 rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95 hover:scale-[1.05]"
                style={{
                  background: activeFlyout === 'size'
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))'
                    : 'transparent',
                  border: activeFlyout === 'size' ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid transparent',
                }}
              >
                {/* Visual indicator of width */}
                <div className="w-[18px] h-[18px] rounded-full border border-slate-500/60 flex items-center justify-center text-[8px] font-bold font-mono text-slate-400">
                  {drawingWidth}
                </div>
                <span className="text-[7.5px] font-bold mt-0.5 tracking-tight text-slate-500">
                  Size
                </span>
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/tool:translate-x-0 border border-slate-800 shadow-2xl z-50">
                  Select width (current: {drawingWidth}px)
                </div>
              </button>

              {/* Size Flyout Box */}
              {activeFlyout === 'size' && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-4 p-3 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col gap-2 w-[120px]"
                  style={{
                    background: 'rgba(15,23,42,0.92)',
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                    zIndex: 100
                  }}
                >
                  <p className="text-[8px] font-black tracking-widest text-slate-500 uppercase px-1">
                    Stroke Width
                  </p>
                  <div className="flex flex-col gap-1">
                    {currentSizes.map((sz, i) => {
                      const isActive = drawingWidth === sz;
                      const activeCol = isEraser ? '#f87171' : '#818cf8';
                      const inactiveCol = '#475569';
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setDrawingWidth(sz);
                            setActiveFlyout(null);
                          }}
                          className={`flex items-center justify-between w-full h-8 px-2 rounded-xl transition-all duration-250 hover:bg-white/5 active:scale-95 ${isActive ? 'bg-indigo-500/10' : ''}`}
                          style={{ border: isActive ? `1px solid ${activeCol}40` : '1px solid transparent' }}
                        >
                          <div className="w-6 h-6 flex items-center justify-start">
                            {isSplatter ? (
                              <div className="flex items-center gap-0.5" style={{ height: 16 }}>
                                {[...Array(Math.min(Math.max(Math.floor(sz / 12), 2), 5))].map((_, j) => (
                                  <div key={j} className="rounded-full flex-shrink-0"
                                    style={{ width: 3, height: 3, background: isActive ? activeCol : inactiveCol, opacity: 0.8 }} />
                                ))}
                              </div>
                            ) : (
                              <div
                                className="rounded-full flex-shrink-0"
                                style={{
                                  width: `${Math.max(3, Math.min(sz, 14))}px`,
                                  height: `${Math.max(3, Math.min(sz, 14))}px`,
                                  background: isActive ? activeCol : inactiveCol,
                                  opacity: drawingTool === 'highlighter' ? 0.45 : 1,
                                  transition: 'all 0.2s',
                                }}
                              />
                            )}
                          </div>
                          <span className="text-[9px] font-bold tabular-nums" style={{ color: isActive ? activeCol : '#64748b' }}>
                            {sz}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Color Swatch & Flyout ───────────────────────────── */}
            {!isEraser && (
              <div className="relative flex flex-col items-center w-full">
                <div className="w-8 h-px bg-slate-800/60 my-1.5" />
                <p className="text-[7px] font-black tracking-widest text-slate-500 uppercase mb-1.5">Color</p>

                {/* Active color swatch — click to open picker */}
                <button
                  onClick={() => setActiveFlyout(activeFlyout === 'color' ? null : 'color')}
                  className="w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg relative flex items-center justify-center"
                  style={{
                    background: drawingColor === 'rainbow'
                      ? 'linear-gradient(135deg, red, orange, yellow, green, blue, purple)'
                      : drawingColor,
                    borderColor: activeFlyout === 'color' ? '#818cf8' : 'rgba(255,255,255,0.15)',
                    boxShadow: `0 0 14px ${drawingColor === 'rainbow' ? '#ff007f' : drawingColor}44`,
                  }}
                >
                  {drawingColor === 'rainbow' && <Sparkles size={12} className="text-white animate-pulse" />}
                </button>

                {/* Color grid popout */}
                {activeFlyout === 'color' && (
                  <div
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-4 p-4 rounded-3xl shadow-2xl border border-slate-700/60 flex flex-col gap-3.5"
                    style={{
                      background: 'rgba(15,23,42,0.88)',
                      backdropFilter: 'blur(28px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                      width: '290px',
                      zIndex: 100
                    }}
                  >
                    <div className="flex gap-3">
                      {/* Left: preview + rainbow */}
                      <div className="flex flex-col items-center justify-between w-16 gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Active</span>
                          <div
                            className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-inner flex items-center justify-center"
                            style={{
                              background: drawingColor === 'rainbow'
                                ? 'linear-gradient(135deg, red, orange, yellow, green, blue, purple)'
                                : drawingColor,
                              boxShadow: drawingColor !== 'rainbow' ? `0 0 12px ${drawingColor}40` : 'none',
                            }}
                          >
                            {drawingColor === 'rainbow' && <Sparkles size={16} className="text-white animate-pulse" />}
                          </div>
                        </div>
                        <button
                          onClick={() => { setDrawingColor('rainbow'); setActiveFlyout(null); }}
                          className={`w-full py-2 rounded-xl text-[8px] font-extrabold border flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${drawingColor === 'rainbow' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'}`}
                        >
                          <Sparkles size={9} className={drawingColor === 'rainbow' ? 'animate-pulse text-indigo-400' : 'text-slate-500'} />
                          Rainbow
                        </button>
                      </div>

                      <div className="w-px bg-slate-800/60" />

                      {/* Right: color grids */}
                      <div className="flex-1 flex flex-col gap-2.5">
                        <div>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Standard Colors</span>
                          <div className="grid grid-cols-10 gap-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/50">
                            {MS_PAINT_COLORS.map(c => (
                              <button
                                key={c.hex}
                                onClick={() => { setDrawingColor(c.hex); setActiveFlyout(null); }}
                                title={c.label}
                                className="w-[18px] h-[18px] rounded-full border transition-all hover:scale-120 active:scale-90 flex items-center justify-center"
                                style={{
                                  background: c.hex,
                                  borderColor: drawingColor === c.hex ? '#818cf8' : 'rgba(255,255,255,0.1)',
                                  borderWidth: drawingColor === c.hex ? '2px' : '1px',
                                }}
                              >
                                {drawingColor === c.hex && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" style={{ mixBlendMode: 'difference' }} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Custom Colors</span>
                          <div className="grid grid-cols-10 gap-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/50">
                            {customColors.map((hex, i) => (
                              <button
                                key={i}
                                onClick={() => { setDrawingColor(hex); setActiveFlyout(null); }}
                                className="w-[18px] h-[18px] rounded-full border transition-all hover:scale-120 active:scale-90 flex items-center justify-center"
                                style={{
                                  background: hex,
                                  borderColor: drawingColor === hex ? '#818cf8' : 'rgba(255,255,255,0.1)',
                                  borderWidth: drawingColor === hex ? '2px' : '1px',
                                }}
                              >
                                {drawingColor === hex && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" style={{ mixBlendMode: 'difference' }} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-800/60" />
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-medium">
                        Hex: <span className="font-mono text-slate-300 select-all uppercase">{drawingColor === 'rainbow' ? 'RAINBOW' : drawingColor}</span>
                      </span>
                      <button
                        onClick={() => colorInputRef.current?.click()}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-1 active:scale-95"
                      >
                        <Monitor size={10} className="text-indigo-400" />
                        Edit Colors
                      </button>
                      <input
                        ref={colorInputRef}
                        type="color"
                        value={drawingColor === 'rainbow' ? '#ffffff' : drawingColor}
                        onChange={e => handleCustomColorAdd(e.target.value)}
                        className="opacity-0 absolute w-0 h-0 pointer-events-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Actions ──────────────────────────────────────────── */}
            <div className="w-8 h-px bg-slate-800/60 my-2" />
            <div className="flex flex-col items-center gap-1 w-full">
              <button
                onClick={onUndo}
                title="Undo last stroke"
                className="relative group/tool flex flex-col items-center justify-center w-[70px] h-10 rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95 text-slate-400 hover:text-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              >
                <Undo2 size={14} />
                <span className="text-[7.5px] mt-0.5 font-bold">Undo</span>
              </button>
              <button
                onClick={onClear}
                title="Clear board"
                className="relative group/tool flex flex-col items-center justify-center w-[70px] h-10 rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95 text-slate-400 hover:text-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              >
                <Trash2 size={14} />
                <span className="text-[7.5px] mt-0.5 font-bold">Clear</span>
              </button>
            </div>

            {/* ── View controls ─────────────────────────────────────── */}
            <div className="w-8 h-px bg-slate-800/60 my-2" />
            <div className="flex flex-col items-center gap-1 w-full">
              <button
                onClick={() => setShowNotesOnBoard(n => !n)}
                title={showNotesOnBoard ? 'Hide Notes' : 'Show Notes'}
                className={`relative group/tool flex flex-col items-center justify-center w-[70px] h-10 rounded-xl transition-all duration-200 active:scale-95 ${showNotesOnBoard ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/5'}`}
              >
                <Layers size={14} />
                <span className="text-[7.5px] mt-0.5 font-bold">Notes</span>
              </button>
              <button
                onClick={() => setZenMode(z => !z)}
                title={zenMode ? 'Show HUD' : 'Zen Mode'}
                className={`relative group/tool flex flex-col items-center justify-center w-[70px] h-10 rounded-xl transition-all duration-200 active:scale-95 ${zenMode ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/5'}`}
              >
                {zenMode ? <Eye size={14} /> : <EyeOff size={14} />}
                <span className="text-[7.5px] mt-0.5 font-bold">HUD</span>
              </button>
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                className={`relative group/tool flex flex-col items-center justify-center w-[70px] h-10 rounded-xl transition-all duration-200 active:scale-95 ${isFullscreen ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/5'}`}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="text-[7.5px] mt-0.5 font-bold">Full</span>
              </button>
            </div>

            {/* ── Exit ─────────────────────────────────────────────── */}
            <div className="w-8 h-px bg-slate-800/60 my-2" />
            <button
              onClick={() => setIsDrawingMode(false)}
              title="Exit board"
              className="relative group/tool flex flex-col items-center justify-center w-[70px] h-10 rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95 text-slate-400 hover:text-slate-200 mb-1"
            >
              <X size={14} />
              <span className="text-[7.5px] mt-0.5 font-bold">Exit</span>
            </button>
          </div>{/* end inner scrollable */}
        </div>{/* end panel */}
      </div>{/* end outer wrapper */}

      {/* ── Top HUD Status Bar ─────────────────────────────────────── */}
      {!collapsed && !zenMode && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 px-4.5 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl border border-slate-700/40 text-slate-300"
          style={{
            background: 'rgba(15,23,42,0.82)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          {/* Tool badge */}
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg capitalize font-bold" style={{ background: 'rgba(99,102,241,0.18)', color: '#818cf8' }}>
            {drawingTool}
          </span>

          {/* Color swatch */}
          {!isEraser && (
            <span className="w-4 h-4 rounded-full border border-white/20 shadow flex-shrink-0"
              style={{
                background: drawingColor === 'rainbow'
                  ? 'linear-gradient(135deg, red, orange, yellow, green, blue, purple)'
                  : drawingColor
              }}
            />
          )}

          {/* Width pill */}
          <span className="text-slate-400 font-mono text-[10px]">{drawingWidth}px</span>

          <div className="h-3 w-px bg-slate-800" />

          {/* Board selector */}
          <div className="flex items-center gap-1.5">
            {BOARDS.map(b => (
              <button
                key={b.id}
                onClick={() => setBoardBackground?.(b)}
                title={b.label}
                className="rounded-full border transition-all hover:scale-115 active:scale-90"
                style={{
                  background:   b.bg,
                  borderColor:  boardBackground?.id === b.id ? '#818cf8' : 'rgba(255,255,255,0.12)',
                  boxShadow:    boardBackground?.id === b.id ? '0 0 8px #818cf8' : 'none',
                  width: '18px', height: '18px',
                }}
              />
            ))}
          </div>

          <div className="h-3 w-px bg-slate-800" />
          <span className="text-slate-400 text-[10px] flex items-center gap-1">
            <Monitor size={10} className="text-indigo-400" />
            Digital Board
          </span>
        </div>
      )}
    </>
  );
}
