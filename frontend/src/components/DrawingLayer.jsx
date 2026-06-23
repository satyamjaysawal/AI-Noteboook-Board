import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useViewport } from 'reactflow';
import { initSocket } from '../services/socket';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchDrawings, addDrawing, deleteDrawing, clearDrawings,
  addDrawingLocally, deleteDrawingLocally, clearDrawingsLocally,
} from '../store/drawingsSlice';

const socket = initSocket();

/* ── Shape tool IDs ───────────────────────────────────────────────── */
const SHAPE_TOOLS = new Set(['line', 'rect', 'circle', 'triangle', 'arrow', 'diamond', 'star']);

/* ── Smooth Bezier Path from raw points ─────────────────────────── */
function pointsToSmoothPath(pts) {
  if (pts.length < 2) return `M ${pts[0]?.x ?? 0} ${pts[0]?.y ?? 0}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
    const my = ((pts[i].y + pts[i + 1].y) / 2).toFixed(1);
    d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/* ── Shape path builder ──────────────────────────────────────────── */
function buildShapePath(tool, start, end) {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  if (Math.hypot(x2 - x1, y2 - y1) < 3) return null;

  switch (tool) {
    case 'line':
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;

    case 'rect':
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x1.toFixed(1)} ${y2.toFixed(1)} Z`;

    case 'circle': {
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      if (rx < 1 || ry < 1) return null;
      return `M ${(cx - rx).toFixed(1)} ${cy.toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx + rx).toFixed(1)} ${cy.toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx - rx).toFixed(1)} ${cy.toFixed(1)} Z`;
    }

    case 'triangle': {
      const mx = ((x1 + x2) / 2).toFixed(1);
      return `M ${mx} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x1.toFixed(1)} ${y2.toFixed(1)} Z`;
    }

    case 'arrow': {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const headLen = Math.min(len * 0.35, 28);
      const a = Math.PI / 6;
      const ax1 = (x2 - headLen * Math.cos(angle - a)).toFixed(1);
      const ay1 = (y2 - headLen * Math.sin(angle - a)).toFixed(1);
      const ax2 = (x2 - headLen * Math.cos(angle + a)).toFixed(1);
      const ay2 = (y2 - headLen * Math.sin(angle + a)).toFixed(1);
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ax1} ${ay1} M ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ax2} ${ay2}`;
    }

    case 'diamond': {
      const mx = ((x1 + x2) / 2).toFixed(1);
      const my = ((y1 + y2) / 2).toFixed(1);
      return `M ${mx} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${my} L ${mx} ${y2.toFixed(1)} L ${x1.toFixed(1)} ${my} Z`;
    }

    case 'star': {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const outerR = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
      if (outerR < 4) return null;
      const innerR = outerR * 0.42;
      let d = '';
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = (cx + r * Math.cos(ang)).toFixed(1);
        const y = (cy + r * Math.sin(ang)).toFixed(1);
        d += (i === 0 ? 'M' : 'L') + ` ${x} ${y} `;
      }
      return d.trim() + ' Z';
    }

    default: return null;
  }
}

/* ── Spray dots → compound SVG path ─────────────────────────────── */
function buildSprayPath(dots) {
  if (!dots || dots.length === 0) return null;
  return dots.map(d => {
    const r = Math.max(d.r, 0.4).toFixed(2);
    const dr = (d.r * 2).toFixed(2);
    const ndr = (-d.r * 2).toFixed(2);
    return `M ${(d.x - d.r).toFixed(1)} ${d.y.toFixed(1)} a ${r} ${r} 0 1 0 ${dr} 0 a ${r} ${r} 0 1 0 ${ndr} 0`;
  }).join(' ');
}

/* ── Shape points generator for hit-testing ──────────────────────── */
function generateShapePoints(tool, start, end) {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  switch (tool) {
    case 'line':
      return [start, end];

    case 'rect':
      return [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
        { x: x1, y: y1 }
      ];

    case 'circle': {
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const ang = (i * 2 * Math.PI) / 16;
        pts.push({ x: cx + rx * Math.cos(ang), y: cy + ry * Math.sin(ang) });
      }
      return pts;
    }

    case 'triangle':
      return [
        { x: mx, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
        { x: mx, y: y1 }
      ];

    case 'arrow': {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const headLen = Math.min(len * 0.35, 28);
      const a = Math.PI / 6;
      const ax1 = x2 - headLen * Math.cos(angle - a);
      const ay1 = y2 - headLen * Math.sin(angle - a);
      const ax2 = x2 - headLen * Math.cos(angle + a);
      const ay2 = y2 - headLen * Math.sin(angle + a);
      return [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        { x: ax1, y: ay1 },
        { x: x2, y: y2 },
        { x: ax2, y: ay2 }
      ];
    }

    case 'diamond':
      return [
        { x: mx, y: y1 },
        { x: x2, y: my },
        { x: mx, y: y2 },
        { x: x1, y: my },
        { x: mx, y: y1 }
      ];

    case 'star': {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const outerR = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
      const innerR = outerR * 0.42;
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
      }
      pts.push(pts[0]);
      return pts;
    }

    default:
      return [];
  }
}

/* ── Eraser hit-testing helpers ─────────────────────────────────── */
function distanceToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function strokeHitsCircle(drawing, cx, cy, r) {
  const pts = drawing.points;
  if (!pts || pts.length === 0) return false;

  const isSplatter = drawing.path && drawing.path.includes(' a ');
  if (isSplatter) {
    const dotRadius = 1.5;
    for (let i = 0; i < pts.length; i++) {
      const dot = pts[i];
      if (Math.hypot(dot.x - cx, dot.y - cy) < (r + dotRadius)) return true;
    }
    return false;
  }

  if (pts.length === 1) return Math.hypot(pts[0].x - cx, pts[0].y - cy) < r;
  for (let i = 0; i < pts.length - 1; i++) {
    if (distanceToSegment({ x: cx, y: cy }, pts[i], pts[i + 1]) < r) return true;
  }
  return false;
}

/* ── Component ───────────────────────────────────────────────────── */
export default function DrawingLayer({
  isDrawingMode, drawingTool, drawingColor, drawingWidth,
  onUndo, registerUndoClear, boardBackground
}) {
  const viewport   = useViewport();
  const svgRef     = useRef(null);
  const dispatch   = useDispatch();

  const drawings    = useSelector(s => s.drawings.drawings);
  const drawingsRef = useRef(drawings);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);

  /* Always-fresh prop refs — used inside stable callbacks */
  const drawingColorRef = useRef(drawingColor);
  const drawingWidthRef = useRef(drawingWidth);
  const drawingToolRef  = useRef(drawingTool);
  useEffect(() => { drawingColorRef.current = drawingColor; }, [drawingColor]);
  useEffect(() => { drawingWidthRef.current = drawingWidth; }, [drawingWidth]);
  useEffect(() => { drawingToolRef.current  = drawingTool;  }, [drawingTool]);

  /* Freehand state */
  const [currentPoints, setCurrentPoints] = useState([]);
  const isDrawingRef      = useRef(false);
  const currentPointsRef  = useRef([]);
  useEffect(() => { currentPointsRef.current = currentPoints; }, [currentPoints]);

  /* Laser */
  const [fadingStrokes, setFadingStrokes] = useState([]);

  /* Eraser */
  const [mouseCoords, setMouseCoords] = useState(null);
  const [isMouseOver, setIsMouseOver]  = useState(false);
  const erasedIdsRef = useRef(new Set());

  /* Shape drawing */
  const shapeStartRef      = useRef(null);
  const [shapePreview, setShapePreview] = useState(null);

  /* Spray paint */
  const sprayDotsRef        = useRef([]);
  const sprayPosRef         = useRef(null);
  const sprayIntervalRef    = useRef(null);
  const [sprayPreviewPath, setSprayPreviewPath] = useState(null);

  /* Undo tracking */
  const deletedTmpIdsRef = useRef(new Set());

  /* ── rAF fading loop (laser pen) ─────────────────────────────── */
  useEffect(() => {
    let animId;
    const tick = () => {
      const now = Date.now();
      if (isDrawingRef.current && drawingToolRef.current === 'laser') {
        const before = currentPointsRef.current.length;
        currentPointsRef.current = currentPointsRef.current.filter(p => now - p.time < 1200);
        if (currentPointsRef.current.length !== before) setCurrentPoints([...currentPointsRef.current]);
      }
      setFadingStrokes(prev => {
        if (prev.length === 0) return prev;
        const up = prev.map(s => ({ ...s, points: s.points.filter(p => now - p.time < 1200) })).filter(s => s.points.length > 0);
        const ca = prev.reduce((a, s) => a + s.points.length, 0);
        const cb = up.reduce((a, s)   => a + s.points.length, 0);
        return (ca === cb && prev.length === up.length) ? prev : up;
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  /* Spray interval cleanup on unmount */
  useEffect(() => () => clearInterval(sprayIntervalRef.current), []);

  /* ── Load drawings ────────────────────────────────────────────── */
  useEffect(() => { dispatch(fetchDrawings()); }, [dispatch]);

  /* ── Socket real-time sync ────────────────────────────────────── */
  useEffect(() => {
    const onAdded   = d       => dispatch(addDrawingLocally(d));
    const onDeleted = ({ id }) => dispatch(deleteDrawingLocally(id));
    const onCleared = ()       => dispatch(clearDrawingsLocally());
    socket.on('drawing-added',    onAdded);
    socket.on('drawing-deleted',  onDeleted);
    socket.on('drawings-cleared', onCleared);
    return () => {
      socket.off('drawing-added',    onAdded);
      socket.off('drawing-deleted',  onDeleted);
      socket.off('drawings-cleared', onCleared);
    };
  }, [dispatch]);

  /* ── Undo / Clear ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!registerUndoClear) return;
    registerUndoClear({
      undo: () => {
        const cur  = drawingsRef.current;
        const last = cur[cur.length - 1];
        if (!last) return;
        if (last.id.toString().startsWith('tmp-')) deletedTmpIdsRef.current.add(last.id);
        else dispatch(deleteDrawing(last.id));
        dispatch(deleteDrawingLocally(last.id));
      },
      clear: () => { dispatch(clearDrawings()); setFadingStrokes([]); }
    });
  }, [registerUndoClear, dispatch]);

  /* ── Coordinate projection ────────────────────────────────────── */
  const getCoords = useCallback(e => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    return {
      x: (cx - rect.left - viewport.x) / viewport.zoom,
      y: (cy - rect.top  - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  /* ── Eraser (collect-then-flush pattern) ─────────────────────── */
  const eraseAt = useCallback(coords => {
    const r = Math.max((drawingWidthRef.current || 30) / 2, 8);
    drawingsRef.current
      .filter(d => !erasedIdsRef.current.has(d.id) && strokeHitsCircle(d, coords.x, coords.y, r))
      .forEach(d => {
        erasedIdsRef.current.add(d.id);
        if (d.id.toString().startsWith('tmp-')) {
          deletedTmpIdsRef.current.add(d.id);
        }
        dispatch(deleteDrawingLocally(d.id));
      });
  }, [dispatch]);

  /* ── Spray: add dots around current cursor ───────────────────── */
  const addSprayDots = useCallback(coords => {
    const r       = Math.max((drawingWidthRef.current || 40) / 2, 12);
    const density = Math.max(Math.floor(r * 0.5), 4);
    const newDots = [];
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const dist  = Math.random() * r;
      newDots.push({ x: coords.x + dist * Math.cos(angle), y: coords.y + dist * Math.sin(angle), r: Math.random() * 1.8 + 0.4 });
    }
    sprayDotsRef.current = [...sprayDotsRef.current, ...newDots];
    setSprayPreviewPath(buildSprayPath(sprayDotsRef.current));
  }, []);

  /* ── Save a completed stroke / shape to Redux + DB ───────────── */
  const saveDrawing = useCallback(async (pathStr, points) => {
    const color  = drawingColorRef.current;
    const width  = drawingWidthRef.current;
    const tool   = drawingToolRef.current;
    const tempId = 'tmp-' + Date.now();
    dispatch(addDrawingLocally({ id: tempId, path: pathStr, color, width, toolType: tool, points }));
    try {
      const result = await dispatch(addDrawing({ drawingData: { path: pathStr, color, width }, tempId })).unwrap();
      const saved  = result.saved;
      if (deletedTmpIdsRef.current.has(tempId)) {
        deletedTmpIdsRef.current.delete(tempId);
        dispatch(deleteDrawing(saved.id));
        dispatch(deleteDrawingLocally(saved.id));
      }
      // addDrawing.fulfilled reducer handles tempId → saved swap
    } catch {
      deletedTmpIdsRef.current.delete(tempId);
      dispatch(deleteDrawingLocally(tempId));
    }
  }, [dispatch]);

  /* ── Pointer handlers ─────────────────────────────────────────── */
  const onPointerDown = useCallback(e => {
    if (!isDrawingMode) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const c = getCoords(e);

    if (drawingToolRef.current === 'eraser') {
      erasedIdsRef.current = new Set();
      eraseAt(c);
      return;
    }

    if (SHAPE_TOOLS.has(drawingToolRef.current)) {
      shapeStartRef.current = c;
      setShapePreview(null);
      return;
    }

    if (drawingToolRef.current === 'splatter') {
      sprayDotsRef.current = [];
      sprayPosRef.current  = c;
      addSprayDots(c);
      sprayIntervalRef.current = setInterval(() => {
        if (sprayPosRef.current) addSprayDots(sprayPosRef.current);
      }, 50);
      return;
    }

    const pt = { ...c, time: Date.now() };
    currentPointsRef.current = [pt];
    setCurrentPoints([pt]);
  }, [isDrawingMode, getCoords, eraseAt, addSprayDots]);

  const onPointerMove = useCallback(e => {
    const c = getCoords(e);
    setMouseCoords(c);
    setIsMouseOver(true);
    if (!isDrawingMode || !isDrawingRef.current) return;

    const tool = drawingToolRef.current;

    if (tool === 'eraser') { eraseAt(c); return; }

    if (SHAPE_TOOLS.has(tool)) {
      if (shapeStartRef.current) setShapePreview(buildShapePath(tool, shapeStartRef.current, c));
      return;
    }

    if (tool === 'splatter') {
      sprayPosRef.current = c;
      addSprayDots(c);
      return;
    }

    /* Freehand interpolation */
    const prevPt = currentPointsRef.current[currentPointsRef.current.length - 1];
    let newPts = [];
    if (prevPt) {
      const dist  = Math.hypot(c.x - prevPt.x, c.y - prevPt.y);
      const steps = Math.floor(dist / 8);
      for (let i = 1; i < steps; i++) {
        const r = i / steps;
        newPts.push({
          x:    prevPt.x + (c.x - prevPt.x) * r,
          y:    prevPt.y + (c.y - prevPt.y) * r,
          time: prevPt.time + (Date.now() - prevPt.time) * r,
        });
      }
    }
    const pts = [...currentPointsRef.current, ...newPts, { ...c, time: Date.now() }];
    currentPointsRef.current = pts;
    setCurrentPoints([...pts]);
  }, [isDrawingMode, getCoords, eraseAt, addSprayDots]);

  const onPointerUp = useCallback(async e => {
    if (!isDrawingMode || !isDrawingRef.current) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    isDrawingRef.current = false;
    const tool = drawingToolRef.current;

    /* Eraser: batch-flush to DB */
    if (tool === 'eraser') {
      [...erasedIdsRef.current]
        .filter(id => !id.toString().startsWith('tmp-'))
        .forEach(id => dispatch(deleteDrawing(id)));
      erasedIdsRef.current = new Set();
      return;
    }

    /* Shape: finalize on release */
    if (SHAPE_TOOLS.has(tool)) {
      const start = shapeStartRef.current;
      shapeStartRef.current = null;
      setShapePreview(null);
      if (!start) return;
      const end = getCoords(e);
      const pathStr = buildShapePath(tool, start, end);
      if (pathStr) {
        const pts = generateShapePoints(tool, start, end);
        const ptsStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        await saveDrawing(`${pathStr}|${ptsStr}`, pts);
      }
      return;
    }

    /* Spray paint: build compound path */
    if (tool === 'splatter') {
      clearInterval(sprayIntervalRef.current);
      sprayIntervalRef.current = null;
      sprayPosRef.current      = null;
      const dots = sprayDotsRef.current;
      sprayDotsRef.current = [];
      setSprayPreviewPath(null);
      if (dots.length === 0) return;
      const pathStr = buildSprayPath(dots);
      if (pathStr) {
        const ptsStr = dots.map(d => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(' ');
        await saveDrawing(`${pathStr}|${ptsStr}`, dots);
      }
      return;
    }

    /* Laser: local-only fading */
    if (tool === 'laser') {
      const pts = currentPointsRef.current;
      if (pts.length >= 2) {
        setFadingStrokes(prev => [...prev, {
          id: 'laser-' + Date.now() + '-' + Math.random(),
          points: pts,
          color: drawingColorRef.current,
          width: drawingWidthRef.current,
        }]);
      }
      setCurrentPoints([]);
      currentPointsRef.current = [];
      return;
    }

    /* Freehand stroke */
    const pts = currentPointsRef.current;
    setCurrentPoints([]);
    currentPointsRef.current = [];
    if (pts.length < 2) return;
    await saveDrawing(pointsToSmoothPath(pts), pts);
  }, [isDrawingMode, dispatch, getCoords, saveDrawing]);

  /* ── Stroke style helper ──────────────────────────────────────── */
  const strokeStyle = d => {
    const tool  = d.toolType || 'pen';
    const color = d.color === 'rainbow' ? '#ff0000' : d.color;
    const w     = d.width;

    switch (tool) {
      case 'highlighter':  return { stroke: color, strokeWidth: w, opacity: 0.35, strokeLinecap: 'square', strokeLinejoin: 'miter',  fill: 'none' };
      case 'pencil':       return { stroke: color, strokeWidth: w, opacity: 0.75, strokeLinecap: 'round',  strokeLinejoin: 'round',  fill: 'none', strokeDasharray: '1 1.5' };
      case 'marker':       return { stroke: color, strokeWidth: w, opacity: 0.92, strokeLinecap: 'square', strokeLinejoin: 'miter',  fill: 'none' };
      case 'glow':         return { stroke: color, strokeWidth: w, opacity: 1,    strokeLinecap: 'round',  strokeLinejoin: 'round',  fill: 'none', filter: 'url(#neon-glow)' };
      case 'laser':        return { stroke: color, strokeWidth: w, opacity: 0.95, strokeLinecap: 'round',  strokeLinejoin: 'round',  fill: 'none', filter: 'url(#neon-glow)' };
      case 'calligraphy':  return { stroke: color, strokeWidth: w, opacity: 0.9,  strokeLinecap: 'butt',   strokeLinejoin: 'miter',  fill: 'none' };
      case 'splatter':     return { fill: color, stroke: 'none', opacity: 0.78 };
      // Shape tools — clean outline
      case 'line':
      case 'rect':
      case 'circle':
      case 'triangle':
      case 'arrow':
      case 'diamond':
      case 'star':         return { stroke: color, strokeWidth: w, opacity: 1,    strokeLinecap: 'round',  strokeLinejoin: 'round',  fill: 'none' };
      default:             return { stroke: color, strokeWidth: w, opacity: 1,    strokeLinecap: 'round',  strokeLinejoin: 'round',  fill: 'none' };
    }
  };

  const activePath = currentPoints.length > 1 ? pointsToSmoothPath(currentPoints) : null;
  const isEraser   = drawingTool === 'eraser';
  const isSpray    = drawingTool === 'splatter';

  return (
    <svg
      ref={svgRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerEnter={() => setIsMouseOver(true)}
      onPointerLeave={() => { setIsMouseOver(false); setMouseCoords(null); }}
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: isDrawingMode ? 'all' : 'none',
        zIndex: 5,
        cursor: isDrawingMode ? (isEraser ? 'none' : 'crosshair') : 'default',
      }}
    >
      <defs>
        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur1" />
          <feGaussianBlur stdDeviation="6" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g style={{ transform: `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}>

        {/* ── Persistent drawings ──────────────────────────────── */}
        {drawings.map(d => (
          <path key={d.id} d={d.path}
            className={d.color === 'rainbow' ? 'rainbow-path' : ''}
            {...strokeStyle(d)}
          />
        ))}

        {/* ── Laser fading strokes ─────────────────────────────── */}
        {fadingStrokes.map(s =>
          s.points.length < 2 ? null : (
            <path key={s.id}
              d={pointsToSmoothPath(s.points)} fill="none"
              className={s.color === 'rainbow' ? 'rainbow-path' : ''}
              {...strokeStyle({ toolType: 'laser', color: s.color, width: s.width })}
            />
          )
        )}

        {/* ── Active freehand stroke ───────────────────────────── */}
        {activePath && (
          <path d={activePath}
            className={drawingColor === 'rainbow' ? 'rainbow-path' : ''}
            {...strokeStyle({ toolType: drawingTool, color: drawingColor, width: drawingWidth })}
          />
        )}

        {/* ── Spray paint live preview ─────────────────────────── */}
        {sprayPreviewPath && (
          <path d={sprayPreviewPath}
            className={drawingColor === 'rainbow' ? 'rainbow-path' : ''}
            {...strokeStyle({ toolType: 'splatter', color: drawingColor, width: drawingWidth })}
          />
        )}

        {/* ── Shape drag preview (dashed ghost) ───────────────── */}
        {shapePreview && (
          <path d={shapePreview}
            className={drawingColor === 'rainbow' ? 'rainbow-path' : ''}
            stroke={drawingColor === 'rainbow' ? '#ff0000' : drawingColor}
            strokeWidth={drawingWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="7 4"
            fill="none"
            opacity={0.65}
          />
        )}

        {/* ── Eraser cursor ────────────────────────────────────── */}
        {isDrawingMode && isMouseOver && mouseCoords && isEraser && (
          <>
            <circle
              cx={mouseCoords.x} cy={mouseCoords.y}
              r={Math.max((drawingWidth || 30) / 2, 8)}
              fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.9)"
              strokeWidth={1.5 / viewport.zoom}
              strokeDasharray={`${5 / viewport.zoom} ${3 / viewport.zoom}`}
              pointerEvents="none"
            />
            <line x1={mouseCoords.x - 5/viewport.zoom} y1={mouseCoords.y} x2={mouseCoords.x + 5/viewport.zoom} y2={mouseCoords.y}
              stroke="rgba(239,68,68,0.8)" strokeWidth={1/viewport.zoom} pointerEvents="none" />
            <line x1={mouseCoords.x} y1={mouseCoords.y - 5/viewport.zoom} x2={mouseCoords.x} y2={mouseCoords.y + 5/viewport.zoom}
              stroke="rgba(239,68,68,0.8)" strokeWidth={1/viewport.zoom} pointerEvents="none" />
          </>
        )}

        {/* ── Spray paint cursor ───────────────────────────────── */}
        {isDrawingMode && isMouseOver && mouseCoords && isSpray && (
          <circle
            cx={mouseCoords.x} cy={mouseCoords.y}
            r={Math.max((drawingWidth || 40) / 2, 12)}
            fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.55)"
            strokeWidth={1.2 / viewport.zoom}
            strokeDasharray={`${4/viewport.zoom} ${2/viewport.zoom}`}
            pointerEvents="none"
          />
        )}

      </g>
    </svg>
  );
}
