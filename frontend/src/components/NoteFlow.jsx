import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import NoteNode from './NoteNode';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchNotes as fetchNotesThunk,
  addNote as addNoteThunk,
  updateNote as updateNoteThunk,
  deleteNote as deleteNoteThunk,
  fetchConnections as fetchConnectionsThunk,
  addConnection as addConnectionThunk,
  deleteConnection as deleteConnectionThunk,
  addNoteLocally as addNoteLocallyAction,
  updateNoteLocally as updateNoteLocallyAction,
  deleteNoteLocally as deleteNoteLocallyAction,
  addConnectionLocally as addConnectionLocallyAction,
  deleteConnectionLocally as deleteConnectionLocallyAction,
  deleteConnectionsByNoteIdLocally
} from '../store/notesSlice';
import { initSocket, isSocketConnected, reconnectSocket } from '../services/socket';
import DrawingLayer from './DrawingLayer';
import DrawingToolbar from './DrawingToolbar';
import DigitalBoard from './DigitalBoard';
import {
  PlusIcon,
  ChevronDown,
  Sparkles,
  Moon,
  Sun,
  Settings,
  ArrowRightCircle,
  ZoomIn,
  ZoomOut,
  Save,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Maximize
} from 'lucide-react';

const nodeTypes = { noteNode: NoteNode };

const connectionLineStyle = {
  strokeWidth: 3,
  stroke: '#6366f1',
  strokeDasharray: '8, 4',
  animation: 'flowAnimation 1.5s infinite ease-in-out',
  filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))'
};

const edgeTypesOptions = [
  { name: 'Smooth Arrow', type: 'smoothstep', style: { strokeWidth: 2.5, stroke: '#818cf8' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' }, animated: true },
  { name: 'Straight Line', type: 'straight', style: { strokeWidth: 2, stroke: '#6366f1' }, markerEnd: { type: MarkerType.Arrow, color: '#6366f1' } },
  { name: 'Dashed Arrow', type: 'step', style: { strokeWidth: 2, stroke: '#a855f7', strokeDasharray: '6,6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' } },
  { name: 'Curved Glow', type: 'bezier', style: { strokeWidth: 2.5, stroke: '#c084fc', filter: 'drop-shadow(0 0 3px rgba(192, 132, 252, 0.7))' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#c084fc' }, animated: true },
  { name: 'Bold Arrow', type: 'smoothstep', style: { strokeWidth: 4, stroke: '#4f46e5' }, markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: '#4f46e5' } },
  { name: 'Double Arrow', type: 'bezier', style: { strokeWidth: 2.5, stroke: '#ec4899' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' }, markerStart: { type: MarkerType.ArrowClosed, color: '#ec4899' }, animated: true },
  { name: 'Thick Dashed', type: 'step', style: { strokeWidth: 3.5, stroke: '#10b981', strokeDasharray: '10,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } }
];

const NoteFlow = () => {
  const dispatch = useDispatch();
  const notes = useSelector((state) => state.notes.notes);
  const connections = useSelector((state) => state.notes.connections);

  const fetchNotes = useCallback((filters) => dispatch(fetchNotesThunk(filters)), [dispatch]);
  const addNote = useCallback((noteData) => dispatch(addNoteThunk(noteData)), [dispatch]);
  const updateNote = useCallback((id, noteData) => dispatch(updateNoteThunk({ id, noteData })), [dispatch]);
  const deleteNote = useCallback((id) => dispatch(deleteNoteThunk(id)), [dispatch]);
  const fetchConnections = useCallback(() => dispatch(fetchConnectionsThunk()), [dispatch]);
  const addConnection = useCallback((connectionData) => dispatch(addConnectionThunk(connectionData)), [dispatch]);
  const deleteConnection = useCallback((id) => dispatch(deleteConnectionThunk(id)), [dispatch]);

  const addNoteLocally = useCallback((note) => dispatch(addNoteLocallyAction(note)), [dispatch]);
  const updateNoteLocally = useCallback((note) => dispatch(updateNoteLocallyAction(note)), [dispatch]);
  const deleteNoteLocally = useCallback((id) => dispatch(deleteNoteLocallyAction(id)), [dispatch]);
  const addConnectionLocally = useCallback((conn) => dispatch(addConnectionLocallyAction(conn)), [dispatch]);
  const deleteConnectionLocally = useCallback((id) => dispatch(deleteConnectionLocallyAction(id)), [dispatch]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [socket, setSocket] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [backgroundStyle, setBackgroundStyle] = useState(1); // Default to dots
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEdgeDropdownOpen, setIsEdgeDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark mode for premium feel
  const [showAnimation, setShowAnimation] = useState(true);
  const [selectedEdgeType, setSelectedEdgeType] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [showHelp, setShowHelp] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#ffffff');
  const [drawingWidth, setDrawingWidth] = useState(4);
  const [boardBackground, setBoardBackground] = useState({ id: 'blackboard', bg: '#0f1117', grid: false });
  const [zenMode, setZenMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotesOnBoard, setShowNotesOnBoard] = useState(false);
  const drawingActionsRef = useRef({ undo: () => {}, clear: async () => {} });

  const handleDrawingUndo = useCallback(() => drawingActionsRef.current.undo(), []);
  const handleDrawingClear = useCallback(() => {
    if (window.confirm('Clear all drawings from the board?')) drawingActionsRef.current.clear();
  }, []);
  const registerUndoClear = useCallback((actions) => { drawingActionsRef.current = actions; }, []);

  // Sync fullscreen state from browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  }, []);

  // Exit zen mode when leaving drawing mode, reset showNotesOnBoard to false when entering drawing mode
  useEffect(() => {
    if (!isDrawingMode) {
      setZenMode(false);
    } else {
      setShowNotesOnBoard(false);
    }
  }, [isDrawingMode]);

  // Set dark mode class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Define callbacks first
  const handleUpdateNote = useCallback((id, { title, content, bgColor, fontSize, imageUrl, position }) => {
    // If position is not provided (e.g. when updating content from NoteNode), retain the existing position
    const existingNote = notes.find((n) => n._id === id);
    const finalPosition = position !== undefined ? position : (existingNote?.position || { x: 150, y: 150 });

    updateNote(id, {
      title: title || 'Untitled',
      content: content || '',
      styling: {
        backgroundColor: bgColor || '#ffffff',
        fontSize: fontSize || 16
      },
      imageUrl: imageUrl || '',
      position: finalPosition
    });
  }, [updateNote, notes]);

  const handleDeleteNote = useCallback((id) => deleteNote(id), [deleteNote]);

  const handleAddNote = useCallback(() => {
    const position = reactFlowInstance
      ? reactFlowInstance.project({
          x: reactFlowWrapper.current.offsetWidth / 2,
          y: reactFlowWrapper.current.offsetHeight / 2
        })
      : { x: 150, y: 150 };

    const randomizedPosition = {
      x: position.x + (Math.random() * 100 - 50),
      y: position.y + (Math.random() * 100 - 50)
    };

    addNote({
      content: "New Note",
      position: randomizedPosition,
      styling: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', fontSize: 16 }
    });
  }, [reactFlowInstance, addNote, isDarkMode]);

  const onNodeDragStop = useCallback((event, node) => {
    const note = notes.find((n) => n._id === node.id);
    if (note) {
      handleUpdateNote(node.id, {
        title: note.title,
        content: note.content,
        bgColor: note.styling?.backgroundColor,
        fontSize: note.styling?.fontSize,
        imageUrl: note.imageUrl,
        position: node.position
      });
    }
  }, [notes, handleUpdateNote]);

  const onConnect = useCallback((params) => {
    addConnection({
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      label: ''
    });
  }, [addConnection]);

  const onEdgeClick = useCallback((event, edge) => {
    const confirmed = window.confirm('Delete this connection?');
    if (confirmed) {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id
            ? { ...e, style: { ...e.style, opacity: 0.5, strokeDasharray: '5,5' } }
            : e
        )
      );
      setTimeout(() => deleteConnection(edge.id), 300);
    }
  }, [deleteConnection, setEdges]);

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      await Promise.all(notes.map((note) =>
        updateNote(note._id, {
          title: note.title,
          content: note.content,
          styling: note.styling,
          imageUrl: note.imageUrl,
          position: note.position
        })
      ));
      console.log('All notes saved successfully');
    } catch (error) {
      setError('Error saving notes: ' + error.message);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [notes, updateNote]);

  const handleReconnect = useCallback(() => {
    setError(null);
    reconnectSocket();
  }, []);

  // Socket connection initialization
  useEffect(() => {
    const socketInstance = initSocket();
    setSocket(socketInstance);
    socketInstance.connect();

    const updateSocketStatus = () => {
      setSocketStatus(isSocketConnected() ? 'connected' : 'disconnected');
    };

    socketInstance.on('connect', updateSocketStatus);
    socketInstance.on('disconnect', updateSocketStatus);
    socketInstance.on('reconnect_failed', () => setError('Failed to reconnect to server'));

    return () => {
      socketInstance.off('connect', updateSocketStatus);
      socketInstance.off('disconnect', updateSocketStatus);
      socketInstance.off('reconnect_failed');
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNoteAdded = (newNote) => {
      addNoteLocally(newNote);
    };

    const handleNoteUpdated = (updatedNote) => {
      updateNoteLocally(updatedNote);
    };

    const handleNoteDeleted = (deletedNoteId) => {
      deleteNoteLocally(deletedNoteId);
    };

    const handleConnectionAdded = (newConnection) => {
      addConnectionLocally(newConnection);
    };

    const handleConnectionDeleted = (connectionData) => {
      if (typeof connectionData === 'object' && connectionData !== null && connectionData.noteId) {
        dispatch(deleteConnectionsByNoteIdLocally(connectionData.noteId));
      } else {
        deleteConnectionLocally(connectionData);
      }
    };

    socket.on('note-added', handleNoteAdded);
    socket.on('note-updated', handleNoteUpdated);
    socket.on('note-deleted', handleNoteDeleted);
    socket.on('connection-added', handleConnectionAdded);
    socket.on('connection-deleted', handleConnectionDeleted);

    return () => {
      socket.off('note-added', handleNoteAdded);
      socket.off('note-updated', handleNoteUpdated);
      socket.off('note-deleted', handleNoteDeleted);
      socket.off('connection-added', handleConnectionAdded);
      socket.off('connection-deleted', handleConnectionDeleted);
    };
  }, [socket, setNodes, setEdges, isDarkMode, showAnimation, selectedEdgeType, handleUpdateNote, handleDeleteNote]);

  // Initial data fetch with error handling
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchNotes(), fetchConnections()]);
      } catch (err) {
        setError('Failed to load initial data: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [fetchNotes, fetchConnections]);

  // Node mapping
  useEffect(() => {
    if (!notes || isLoading) return;

    setNodes(notes.map((note) => ({
      id: note._id,
      type: 'noteNode',
      position: note.position || { x: 150, y: 150 },
      data: {
        title: note.title || 'Untitled',
        content: note.content || '',
        bgColor: note.styling?.backgroundColor || (isDarkMode ? '#1e293b' : '#ffffff'),
        fontSize: note.styling?.fontSize || 16,
        imageUrl: note.imageUrl || '',
        onSave: (updatedData) => handleUpdateNote(note._id, updatedData),
        onDelete: () => handleDeleteNote(note._id),
        isDarkMode,
        showAnimation
      }
    })));
  }, [notes, setNodes, isDarkMode, showAnimation, isLoading, handleUpdateNote, handleDeleteNote]);

  // Edge mapping
  useEffect(() => {
    if (!connections || isLoading) return;

    setEdges(connections.map((connection) => ({
      id: connection._id,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      ...edgeTypesOptions[selectedEdgeType],
      data: { label: connection.label || '' }
    })));
  }, [connections, setEdges, selectedEdgeType, isLoading]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const toggleAnimation = () => setShowAnimation((prev) => !prev);
  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);
  const toggleEdgeDropdown = () => setIsEdgeDropdownOpen((prev) => !prev);

  const selectBackground = (index) => {
    setBackgroundStyle(index);
    setIsDropdownOpen(false);
  };

  const selectEdgeType = (index) => {
    setSelectedEdgeType(index);
    setIsEdgeDropdownOpen(false);
    setEdges((eds) => eds.map((edge) => ({
      ...edge,
      ...edgeTypesOptions[index]
    })));
  };

  const handleZoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut({ duration: 300 });
    }
  };

  const handleZoomReset = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomTo(1, { duration: 300 });
    }
  };

  const handleFitView = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }
  };

  const backgroundDesigns = [
    { name: 'Grid (Soft Purple)', variant: 'cross', color: '#c084fc', gap: 24, size: 1, className: 'opacity-20', overlay: 'bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.08)_0%,_transparent_70%)]' },
    { name: 'Matrix Dots (Indigo)', variant: 'dots', color: '#6366f1', gap: 20, size: 1.5, className: 'opacity-30', overlay: 'bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.05)_0%,_transparent_80%)]' },
    { name: 'Minimal Lines', variant: 'lines', color: '#94a3b8', gap: 30, size: 0.5, className: 'opacity-10', overlay: '' },
    { name: 'Neon Grid (Dark)', variant: 'cross', color: '#a855f7', gap: 28, size: 1.5, className: 'opacity-40', overlay: 'bg-[radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.1)_0%,_transparent_60%)]' },
    { name: 'Stardust Dots', variant: 'dots', color: '#ec4899', gap: 16, size: 2, className: 'opacity-25', overlay: 'bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.06)_0%,_transparent_75%)]' },
    { name: 'Ocean Lines', variant: 'lines', color: '#06b6d4', gap: 24, size: 1, className: 'opacity-20', overlay: 'bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.08)_0%,_transparent_70%)]' }
  ];

  const themeClass = isDarkMode
    ? 'bg-slate-950 text-slate-100'
    : 'bg-slate-50 text-slate-900';

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Sparkles size={20} className="text-indigo-400 animate-pulse" />
          </div>
          <p className="mt-6 text-sm font-semibold tracking-wider text-indigo-400 uppercase">Initializing Workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center p-8 glass-panel rounded-3xl max-w-md border border-red-500/20">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">Connection Problem</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={handleReconnect}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-500/25 active:scale-95"
          >
            <RefreshCw size={18} className="animate-spin-slow" />
            Reconnect Server
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={reactFlowWrapper}
      className={`w-full h-screen ${themeClass} overflow-hidden relative transition-colors duration-700 font-sans`}
    >
      <style jsx="true">{`
        @keyframes flowAnimation {
          0% { stroke-dashoffset: 16; }
          100% { stroke-dashoffset: 0; }
        }
        .react-flow__controls {
          background: rgba(255, 255, 255, 0.7) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          border-radius: 14px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
          overflow: hidden;
          padding: 3px !important;
        }
        .dark .react-flow__controls {
          background: rgba(15, 23, 42, 0.7) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
        }
        .react-flow__controls button {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
          background: transparent !important;
          color: #475569 !important;
          transition: all 0.2s !important;
          border-radius: 8px !important;
          margin: 2px !important;
        }
        .dark .react-flow__controls button {
          color: #94a3b8 !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        .react-flow__controls button:hover {
          background: rgba(99, 102, 241, 0.1) !important;
          color: #6366f1 !important;
        }
        .react-flow__minimap {
          background: rgba(255, 255, 255, 0.7) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          border-radius: 16px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05) !important;
        }
        .dark .react-flow__minimap {
          background: rgba(15, 23, 42, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3) !important;
        }
        .dropdown-menu, .edge-dropdown {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 16px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          max-height: 280px;
          overflow-y: auto;
        }
        .dark .dropdown-menu, .dark .edge-dropdown {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
        }
        .dropdown-item, .edge-item {
          transition: all 0.2s ease-in-out;
        }
        .dropdown-item:hover, .edge-item:hover {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
        }
        .animate-spin-slow { animation: spin 4s linear infinite; }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }
        .status-dot.connected { color: #10b981; background-color: #10b981; }
        .status-dot.disconnected { color: #ef4444; background-color: #ef4444; }
      `}</style>

      {/* Dynamic Background Shader (hidden when drawing mode active) */}
      {!isDrawingMode && (
        <div className={`absolute inset-0 ${backgroundDesigns[backgroundStyle].overlay} transition-opacity duration-700 pointer-events-none`}></div>
      )}

      {/* Digital Board Background — offset left when toolbar is open */}
      {isDrawingMode && (
        <div
          style={{
            position: 'absolute', inset: 0,
            paddingLeft: isDrawingMode ? '72px' : '0px',
            transition: 'padding-left 0.35s cubic-bezier(0.4,0,0.2,1)',
            pointerEvents: 'none',
          }}
        >
          <DigitalBoard boardBackground={boardBackground} />
        </div>
      )}

      <div
        className="w-full h-full p-4 md:p-6"
        style={{
          paddingLeft: isDrawingMode ? '100px' : undefined,
          transition: 'padding-left 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onMove={(event, viewport) => setZoomLevel(viewport.zoom)}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={edgeTypesOptions[selectedEdgeType]}
          connectionLineStyle={connectionLineStyle}
          onInit={setReactFlowInstance}
          fitView
          minZoom={0.2}
          maxZoom={2}
          panOnDrag={!isDrawingMode}
          zoomOnScroll={!isDrawingMode}
          zoomOnPinch={!isDrawingMode}
          zoomOnDoubleClick={!isDrawingMode}
          nodesDraggable={!isDrawingMode}
          nodesConnectable={!isDrawingMode}
          elementsSelectable={!isDrawingMode}
          className={`rounded-[28px] overflow-hidden border ${isDarkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-slate-50/20'} backdrop-blur-[1px] shadow-2xl transition-all duration-700 ${isDrawingMode && !showNotesOnBoard ? 'hide-notes' : ''}`}
        >
          <Background
            variant={backgroundDesigns[backgroundStyle].variant}
            color={backgroundDesigns[backgroundStyle].color}
            gap={backgroundDesigns[backgroundStyle].gap}
            size={backgroundDesigns[backgroundStyle].size}
            className={`${backgroundDesigns[backgroundStyle].className} transition-all duration-700`}
          />

          <DrawingLayer
            isDrawingMode={isDrawingMode}
            drawingTool={drawingTool}
            drawingColor={drawingColor}
            drawingWidth={drawingWidth}
            registerUndoClear={registerUndoClear}
            boardBackground={boardBackground}
          />
          
          {/* Custom Floating Zoom Controls Panel */}
          <Panel position="bottom-left" className="!m-6">
            <div className={`glass-panel p-1 rounded-2xl flex items-center gap-1 shadow-xl border border-white/20 dark:border-white/5 transition-all duration-500 ${zenMode ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <button
                onClick={handleZoomOut}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              
              <button
                onClick={handleZoomReset}
                className="px-2.5 py-1 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                title="Reset Zoom to 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>

              <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 mx-1"></div>

              <button
                onClick={handleFitView}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                title="Fit Canvas to View"
              >
                <Maximize size={15} />
              </button>
            </div>
          </Panel>
          
          <div className={`transition-all duration-500 ${zenMode ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <MiniMap
              nodeColor={(node) => (isDarkMode ? '#6366f1' : '#4f46e5')}
              nodeStrokeColor={() => '#ffffff'}
              nodeStrokeWidth={2}
              className="!m-6 !right-0 !bottom-0 !hidden md:!block"
              maskColor={isDarkMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.4)'}
            />
          </div>

          {/* Top Left Branding + Socket Panel */}
          <Panel position="top-left" className="!m-4 md:!m-6">
            <div className={`glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-3.5 shadow-xl border border-white/20 dark:border-white/5 transition-all duration-500 ${zenMode ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">NoteFlow</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-500/20">v1.1</span>
              </div>
              <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-800"></div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className={`status-dot ${socketStatus === 'connected' ? 'connected' : 'disconnected'}`}></span>
                <span className="capitalize">{socketStatus}</span>
              </div>
            </div>
          </Panel>

          {/* Top Right Actions Command Bar */}
          <Panel position="top-right" className="!m-4 md:!m-6">
            <div className={`glass-panel p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-xl border border-white/20 dark:border-white/5 transition-all duration-500 max-w-[90vw] md:max-w-none justify-end ${zenMode ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 translate-y-0'}`}>
              
              {/* Add Note Button */}
              <button
                onClick={handleAddNote}
                className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-1.5 text-xs tracking-tight active:scale-95"
              >
                <PlusIcon size={15} />
                <span>Add Note</span>
              </button>

              <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 hidden md:block"></div>

              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-colors duration-200"
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>


              {/* Dropdowns */}
              <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 hidden md:block"></div>

              {/* Background Dropdown */}
              <div className="relative">
                <button
                  onClick={toggleDropdown}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 border ${isDropdownOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-400' : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                >
                  <Settings size={14} className={isDropdownOpen ? 'rotate-45' : ''} />
                  <span className="hidden md:inline">Grid Style</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 dropdown-menu z-50 p-1">
                    <p className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-widest border-b border-slate-200/20 dark:border-slate-800/50 mb-1">Canvas Grid</p>
                    {backgroundDesigns.map((bg, index) => (
                      <button
                        key={index}
                        onClick={() => selectBackground(index)}
                        className={`dropdown-item w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between ${backgroundStyle === index ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        <span>{bg.name}</span>
                        {backgroundStyle === index && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Connection Style Dropdown */}
              <div className="relative">
                <button
                  onClick={toggleEdgeDropdown}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 border ${isEdgeDropdownOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-400' : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                >
                  <ArrowRightCircle size={14} />
                  <span className="hidden md:inline">Edge Style</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${isEdgeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isEdgeDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 edge-dropdown z-50 p-1">
                    <p className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-widest border-b border-slate-200/20 dark:border-slate-800/50 mb-1">Connection Lines</p>
                    {edgeTypesOptions.map((edgeType, index) => (
                      <button
                        key={index}
                        onClick={() => selectEdgeType(index)}
                        className={`edge-item w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between ${selectedEdgeType === index ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        <span>{edgeType.name}</span>
                        {selectedEdgeType === index && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-5 w-px bg-slate-300 dark:bg-slate-800"></div>

              {/* Save All Button */}
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className={`relative bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all duration-300 flex items-center gap-1.5 text-xs active:scale-95 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                title="Save current workspace layouts"
              >
                <Save size={15} className={isSaving ? 'animate-spin-slow' : ''} />
                <span>{isSaving ? 'Saving...' : 'Save All'}</span>
              </button>

              {/* Help Toggle */}
              <button
                onClick={() => setShowHelp((prev) => !prev)}
                className={`p-2 rounded-xl transition-colors ${showHelp ? 'text-indigo-500 bg-indigo-500/10' : 'text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                title="Workspace Help"
              >
                <HelpCircle size={16} />
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Floating Canvas Instructions/Help Panel */}
      {showHelp && (
        <div className="fixed bottom-24 left-6 max-w-sm glass-panel p-5 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/60 z-40 animate-fade-in-right">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <HelpCircle size={16} className="text-indigo-500" />
              Workspace Guide
            </h4>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">Close</button>
          </div>
          <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
            <li className="flex gap-2">
              <span className="text-indigo-500 font-bold">•</span>
              <span>Double-click handles to link notes together.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 font-bold">•</span>
              <span>Click connection lines to delete the link.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 font-bold">•</span>
              <span>Hover over a note card to show edit and delete tools.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 font-bold">•</span>
              <span>Use the built-in AI actions to process texts directly.</span>
            </li>
          </ul>
        </div>
      )}

      {/* Floating Action Button — hidden during drawing mode */}
      {!isDrawingMode && (
        <button
          className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:scale-105 hover:rotate-90 active:scale-95 transition-all duration-300 z-30 border border-white/20"
          onClick={handleAddNote}
          aria-label="Add new note"
          title="Add new note"
        >
          <PlusIcon size={22} />
        </button>
      )}

      <DrawingToolbar
        isDrawingMode={isDrawingMode}
        setIsDrawingMode={setIsDrawingMode}
        drawingTool={drawingTool}
        setDrawingTool={setDrawingTool}
        drawingColor={drawingColor}
        setDrawingColor={setDrawingColor}
        drawingWidth={drawingWidth}
        setDrawingWidth={setDrawingWidth}
        onUndo={handleDrawingUndo}
        onClear={handleDrawingClear}
        boardBackground={boardBackground}
        setBoardBackground={setBoardBackground}
        zenMode={zenMode}
        setZenMode={setZenMode}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        showNotesOnBoard={showNotesOnBoard}
        setShowNotesOnBoard={setShowNotesOnBoard}
      />
    </div>
  );
};

export default NoteFlow;