import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import NoteNode from './NoteNode';
import { useNoteStore } from '../store/noteStore';
import { initSocket, isSocketConnected, reconnectSocket } from '../services/socket';
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
  BookOpen,
} from 'lucide-react';
import debounce from 'lodash/debounce';

const nodeTypes = { noteNode: NoteNode };

const connectionLineStyle = {
  strokeWidth: 3,
  stroke: '#a78bfa',
  strokeDasharray: '8, 4',
  animation: 'flowAnimation 1.5s infinite ease-in-out',
  filter: 'drop-shadow(0 0 4px rgba(167, 139, 250, 0.7))',
};

const edgeTypesOptions = [
  { name: 'Smooth Arrow', type: 'smoothstep', style: { strokeWidth: 2, stroke: '#a78bfa' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' }, animated: true },
  { name: 'Straight Line', type: 'straight', style: { strokeWidth: 2, stroke: '#8b5cf6' }, markerEnd: { type: MarkerType.Arrow, color: '#8b5cf6' } },
  { name: 'Dashed Arrow', type: 'step', style: { strokeWidth: 2, stroke: '#9333ea', strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#9333ea' } },
  { name: 'Curved Glow', type: 'bezier', style: { strokeWidth: 2, stroke: '#c084fc', filter: 'drop-shadow(0 0 3px rgba(192, 132, 252, 0.8))' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#c084fc' }, animated: true },
  { name: 'Bold Arrow', type: 'smoothstep', style: { strokeWidth: 4, stroke: '#7c3aed' }, markerEnd: { type: MarkerType.ArrowClosed, width: 30, height: 30, color: '#7c3aed' } },
  { name: 'Double Arrow', type: 'bezier', style: { strokeWidth: 2, stroke: '#ec4899' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' }, markerStart: { type: MarkerType.ArrowClosed, color: '#ec4899' }, animated: true },
  { name: 'Thick Dashed', type: 'step', style: { strokeWidth: 3, stroke: '#10b981', strokeDasharray: '10,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
];

const NoteFlow = () => {
  const { notes, fetchNotes, addNote, updateNote, deleteNote, connections, addConnection, deleteConnection, fetchConnections } = useNoteStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [socket, setSocket] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [backgroundStyle, setBackgroundStyle] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEdgeDropdownOpen, setIsEdgeDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [showAnimation, setShowAnimation] = useState(true);
  const [selectedEdgeType, setSelectedEdgeType] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0); // New: Loading progress
  const [error, setError] = useState(null);
  const [socketStatus, setSocketStatus] = useState('disconnected');

  // Update note in the store
  const handleUpdateNote = useCallback((id, { title, content, bgColor, fontSize, imageUrl, position }) => {
    updateNote(id, {
      title: title || 'Untitled',
      content: content || '',
      styling: { backgroundColor: bgColor || '#ffffff', fontSize: fontSize || 14 },
      imageUrl: imageUrl || '',
      position,
    });
  }, [updateNote]);

  // Delete note from the store
  const handleDeleteNote = useCallback((id) => deleteNote(id), [deleteNote]);

  // Add a new note with randomized position
  const handleAddNote = useCallback(() => {
    const position = reactFlowInstance
      ? reactFlowInstance.project({
          x: reactFlowWrapper.current.offsetWidth / 2,
          y: reactFlowWrapper.current.offsetHeight / 2,
        })
      : { x: 150, y: 150 };

    const randomizedPosition = {
      x: position.x + (Math.random() * 100 - 50),
      y: position.y + (Math.random() * 100 - 50),
    };

    addNote({
      content: "New Note",
      position: randomizedPosition,
      styling: { backgroundColor: '#ffffff', fontSize: 14 },
    });
  }, [reactFlowInstance, addNote]);

  // Handle node drag stop
  const onNodeDragStop = useCallback((event, node) => {
    const note = notes.find((n) => n._id === node.id);
    if (note) {
      handleUpdateNote(node.id, {
        title: note.title,
        content: note.content,
        bgColor: note.styling?.backgroundColor,
        fontSize: note.styling?.fontSize,
        imageUrl: note.imageUrl,
        position: node.position,
      });
    }
  }, [notes, handleUpdateNote]);

  // Connect nodes with debounced action
  const debouncedConnect = useCallback(debounce((params) => addConnection(params), 300), [addConnection]);
  const onConnect = useCallback((params) => debouncedConnect(params), [debouncedConnect]);

  // Delete edge with fade-out animation
  const onEdgeClick = useCallback((event, edge) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      setEdges((eds) => eds.map((e) => (e.id === edge.id ? { ...e, style: { ...e.style, opacity: 0, transition: 'opacity 0.3s' } } : e)));
      setTimeout(() => deleteConnection(edge.id), 300);
    }
  }, [deleteConnection, setEdges]);

  // Save all notes with progress feedback
  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      await Promise.all(notes.map((note) =>
        updateNote(note._id, {
          title: note.title,
          content: note.content,
          styling: note.styling,
          imageUrl: note.imageUrl,
          position: note.position,
        })
      ));
      console.log('All notes saved successfully'); // Replace with toast notification if available
    } catch (error) {
      setError('Error saving notes: ' + error.message);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [notes, updateNote]);

  // Reconnect to socket
  const handleReconnect = useCallback(() => {
    setError(null);
    reconnectSocket();
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = initSocket();
    setSocket(socketInstance);
    socketInstance.connect();

    const updateSocketStatus = () => setSocketStatus(isSocketConnected() ? 'connected' : 'disconnected');
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

    const handlers = {
      'note-added': (newNote) => setNodes((nds) => [...nds, createNode(newNote)]),
      'note-updated': (updatedNote) => setNodes((nds) => nds.map((n) => (n.id === updatedNote._id ? { ...n, data: { ...n.data, ...updatedNote }, position: updatedNote.position } : n))),
      'note-deleted': (id) => setNodes((nds) => nds.filter((n) => n.id !== id)),
      'connection-added': (conn) => setEdges((eds) => [...eds, { id: conn._id, ...conn, ...edgeTypesOptions[selectedEdgeType], data: { label: conn.label || '' } }]),
      'connection-deleted': (id) => setEdges((eds) => eds.filter((e) => e.id !== id)),
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => Object.keys(handlers).forEach((event) => socket.off(event));
  }, [socket, setNodes, setEdges, selectedEdgeType, isDarkMode, showAnimation]);

  // Create a new node object
  const createNode = (note) => ({
    id: note._id,
    type: 'noteNode',
    position: note.position || { x: 150, y: 150 },
    data: {
      title: note.title || 'Untitled',
      content: note.content || '',
      bgColor: note.styling?.backgroundColor || '#ffffff',
      fontSize: note.styling?.fontSize || 14,
      imageUrl: note.imageUrl || '',
      onSave: (updatedData) => handleUpdateNote(note._id, updatedData),
      onDelete: () => handleDeleteNote(note._id),
      isDarkMode,
      showAnimation,
    },
  });

  // Load initial data with progress simulation
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      const interval = setInterval(() => setLoadProgress((prev) => Math.min(prev + 10, 90)), 200);
      try {
        await Promise.all([fetchNotes(), fetchConnections()]);
        setLoadProgress(100);
      } catch (err) {
        setError('Failed to load initial data: ' + err.message);
      } finally {
        clearInterval(interval);
        setTimeout(() => setIsLoading(false), 300);
      }
    };
    loadInitialData();
  }, [fetchNotes, fetchConnections]);

  // Sync nodes with store
  useEffect(() => {
    if (!notes || isLoading) return;
    setNodes(notes.map(createNode));
  }, [notes, setNodes, isDarkMode, showAnimation, isLoading]);

  // Sync edges with store
  useEffect(() => {
    if (!connections || isLoading) return;
    setEdges(connections.map((conn) => ({
      id: conn._id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle,
      targetHandle: conn.targetHandle,
      ...edgeTypesOptions[selectedEdgeType],
      data: { label: conn.label || '' },
    })));
  }, [connections, setEdges, selectedEdgeType, isLoading]);

  // Toggle UI states
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      localStorage.setItem('darkMode', !prev);
      return !prev;
    });
  };
  const toggleAnimation = () => setShowAnimation((prev) => !prev);
  const selectBackground = (index) => {
    setBackgroundStyle(index);
    setIsDropdownOpen(false);
  };
  const selectEdgeType = (index) => {
    setSelectedEdgeType(index);
    setEdges((eds) => eds.map((edge) => ({ ...edge, ...edgeTypesOptions[index] })));
    setIsEdgeDropdownOpen(false);
  };
  const handleZoom = (direction) => {
    if (reactFlowInstance) {
      const newZoom = direction === 'in' ? Math.min(zoomLevel + 0.2, 2) : Math.max(zoomLevel - 0.2, 0.5);
      setZoomLevel(newZoom);
      reactFlowInstance.zoomTo(newZoom);
    }
  };

  // Keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveAll]);

  // Background design options
  const backgroundDesigns = [
    { name: 'Cross Fade (Light)', variant: 'cross', color: '#d8b4fe', gap: 24, size: 1, className: 'bg-opacity-10 animate-pulse-slow', overlay: 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-100/20 via-transparent to-transparent' },
    { name: 'Flowing Dots (Light)', variant: 'dots', color: '#a78bfa', gap: 16, size: 2, className: 'bg-opacity-20 animate-spin-slow', overlay: 'bg-[linear-gradient(45deg,_#f3e8ff_25%,_#ede9fe_50%,_#f3e8ff_75%)] bg-[length:200%_200%] animate-background-flow' },
    { name: 'Rotating Lines (Light)', variant: 'lines', color: '#c4b5fd', gap: 32, size: 1, className: 'bg-opacity-15 animate-fade-in-out', overlay: 'bg-[conic-gradient(from_45deg_at_50%_50%,_#ddd6fe,_#e9d5ff,_#ddd6fe)] animate-rotate-slow' },
    { name: 'Ellipse Cross (Light)', variant: 'cross', color: '#e9d5ff', gap: 20, size: 1.5, className: 'bg-opacity-25 animate-bounce-subtle', overlay: 'bg-[radial-gradient(ellipse_at_top_right,_#f5f3ff_0%,_#ede9fe_50%,_transparent_100%)] animate-pulse' },
    { name: 'Twinkling Dots (Light)', variant: 'dots', color: '#d8b4fe', gap: 12, size: 3, className: 'bg-opacity-30 animate-twinkle', overlay: 'bg-[linear-gradient(135deg,_#e9d5ff_0%,_#c4b5fd_50%,_#a78bfa_100%)] bg-[length:300%_300%] animate-gradient-shift' },
    { name: 'Starry Night (Dark)', variant: 'dots', color: '#8b5cf6', gap: 20, size: 2, className: 'bg-opacity-40 animate-twinkle', overlay: 'bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_70%,_transparent_100%)] animate-pulse-slow' },
    { name: 'Midnight Cross (Dark)', variant: 'cross', color: '#a78bfa', gap: 28, size: 1, className: 'bg-opacity-30 animate-fade-in-out', overlay: 'bg-[linear-gradient(135deg,_#334155_0%,_#1e293b_50%,_#0f172a_100%)] bg-[length:200%_200%] animate-gradient-shift' },
    { name: 'Cosmic Lines (Dark)', variant: 'lines', color: '#7c3aed', gap: 24, size: 1.5, className: 'bg-opacity-25 animate-rotate-slow', overlay: 'bg-[conic-gradient(from_90deg_at_50%_50%,_#4b5563,_#1e293b,_#0f172a)] animate-spin-slow' },
    { name: 'Nebula Glow (Dark)', variant: 'cross', color: '#9333ea', gap: 16, size: 2, className: 'bg-opacity-35 animate-bounce-subtle', overlay: 'bg-[radial-gradient(ellipse_at_bottom_left,_#6b7280_0%,_#1e293b_50%,_transparent_100%)] animate-pulse' },
    { name: 'Shadow Dots (Dark)', variant: 'dots', color: '#c084fc', gap: 14, size: 3, className: 'bg-opacity-45 animate-twinkle', overlay: 'bg-[linear-gradient(45deg,_#475569_25%,_#1e293b_50%,_#0f172a_75%)] bg-[length:200%_200%] animate-background-flow' },
    { name: 'Aurora Borealis', variant: 'lines', color: '#4ade80', gap: 22, size: 1.5, className: 'bg-opacity-30 animate-pulse-slow', overlay: 'bg-[linear-gradient(135deg,_#3b82f6_0%,_#8b5cf6_25%,_#ec4899_50%,_#10b981_75%,_#3b82f6_100%)] bg-[length:400%_400%] animate-gradient-shift' },
    { name: 'Quantum Field', variant: 'dots', color: '#60a5fa', gap: 18, size: 2, className: 'bg-opacity-35 animate-twinkle', overlay: 'bg-[radial-gradient(circle_at_center,_#312e81_0%,_#1e3a8a_50%,_#0c4a6e_100%)] animate-pulse' },
    { name: 'Zen Garden', variant: 'lines', color: '#a3e635', gap: 30, size: 1, className: 'bg-opacity-20 animate-fade-in-out', overlay: 'bg-[linear-gradient(45deg,_#ecfccb_0%,_#d9f99d_25%,_#bef264_50%,_#a3e635_75%,_#84cc16_100%)] bg-[length:200%_200%] animate-background-flow' }
  ];


  const themeClass = isDarkMode
    ? 'bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-900'
    : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50';

  if (isLoading) {
    return (
      <div className={`w-full h-screen flex items-center justify-center ${themeClass}`}>
        <div className="text-center p-6 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg animate-fade-in">
          <div className="relative w-24 h-24 mx-auto">
            <div className="animate-spin rounded-full h-full w-full border-t-4 border-b-4 border-purple-600"></div>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-medium text-gray-700 dark:text-gray-200">{loadProgress}%</span>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-200">Loading NoteFlow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full h-screen flex items-center justify-center ${themeClass}`}>
        <div className="text-center p-6 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg animate-fade-in">
          <AlertTriangle size={48} className="text-red-500 mx-auto animate-bounce" />
          <p className="mt-4 text-lg font-medium text-red-500">{error}</p>
          <button
            onClick={handleReconnect}
            className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-all duration-300 hover:scale-105 btn-glow"
          >
            <RefreshCw size={18} /> Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className={`w-full h-screen ${themeClass} overflow-hidden relative transition-all duration-500`}>
      <style jsx>{`
        @keyframes flowAnimation { 0% { stroke-dashoffset: 12; } 100% { stroke-dashoffset: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseSlow { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes twinkle { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        @keyframes gradientShift { 0% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }
        .btn-glow { box-shadow: 0 0 15px rgba(167, 139, 250, 0.5); transition: box-shadow 0.3s; }
        .btn-glow:hover { box-shadow: 0 0 25px rgba(167, 139, 250, 0.8); }
        .dropdown-menu, .edge-dropdown { 
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'}; 
          border-radius: 1rem; 
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2); 
          backdrop-filter: blur(12px); 
          max-height: 320px; 
          overflow-y: auto; 
          scrollbar-width: thin; 
          scrollbar-color: #a78bfa transparent; 
        }
        .dropdown-menu::-webkit-scrollbar, .edge-dropdown::-webkit-scrollbar { width: 8px; }
        .dropdown-menu::-webkit-scrollbar-thumb, .edge-dropdown::-webkit-scrollbar-thumb { background: #a78bfa; border-radius: 4px; }
        .dropdown-item, .edge-item { transition: all 0.2s; }
        .dropdown-item:hover, .edge-item:hover { background: linear-gradient(135deg, #a78bfa, #7c3aed); color: white; transform: scale(1.02); }
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
        .animate-pulse-slow { animation: pulseSlow 3s infinite ease-in-out; }
        .animate-twinkle { animation: twinkle 4s infinite ease-in-out; }
        .animate-gradient-shift { animation: gradientShift 10s infinite ease-in-out; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; }
        .connected { background: #10b981; animation: pulseSlow 2s infinite; }
        .disconnected { background: #ef4444; animation: pulseSlow 2s infinite; }
      `}</style>

      <div className={`absolute inset-0 ${backgroundDesigns[backgroundStyle].overlay} opacity-60 transition-opacity duration-700`}></div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeTypesOptions[selectedEdgeType]}
        connectionLineStyle={connectionLineStyle}
        onInit={setReactFlowInstance}
        fitView
        minZoom={0.5}
        maxZoom={2}
        className={`rounded-2xl shadow-2xl border ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} backdrop-blur-md`}
      >
        <Background
          variant={backgroundDesigns[backgroundStyle].variant}
          color={backgroundDesigns[backgroundStyle].color}
          gap={backgroundDesigns[backgroundStyle].gap}
          size={backgroundDesigns[backgroundStyle].size}
          className={backgroundDesigns[backgroundStyle].className}
        />
        <Controls className="m-6 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-2" />
        <MiniMap nodeColor={() => (isDarkMode ? '#c084fc' : '#7c3aed')} className="m-6 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg" />

        <Panel position="top-left" className="m-6 flex items-center gap-3 bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-full shadow-lg animate-fade-in">
          <BookOpen size={22} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>NoteFlow</span>
          <span className={`status-dot ${socketStatus === 'connected' ? 'connected' : 'disconnected'}`}></span>
        </Panel>

        <Panel position="top-right" className="m-6 flex flex-wrap gap-3">
          {[
            { onClick: handleAddNote, icon: PlusIcon, text: 'Add Note', gradient: 'from-purple-600 to-indigo-600' },
            { onClick: toggleDarkMode, icon: isDarkMode ? Sun : Moon, text: isDarkMode ? 'Light Mode' : 'Dark Mode', gradient: 'from-indigo-600 to-blue-600' },
            { onClick: toggleAnimation, icon: Sparkles, text: showAnimation ? 'Reduce Effects' : 'Enhance Effects', gradient: 'from-fuchsia-600 to-pink-600' },
            { onClick: () => handleZoom('in'), icon: ZoomIn, text: 'Zoom In', gradient: 'from-teal-600 to-cyan-600' },
            { onClick: () => handleZoom('out'), icon: ZoomOut, text: 'Zoom Out', gradient: 'from-teal-600 to-cyan-600' },
            { onClick: handleSaveAll, icon: Save, text: isSaving ? 'Saving...' : 'Save All', gradient: 'from-green-600 to-emerald-600', disabled: isSaving },
          ].map(({ onClick, icon: Icon, text, gradient, disabled }, idx) => (
            <button
              key={idx}
              onClick={onClick}
              disabled={disabled}
              className={`relative bg-gradient-to-r ${gradient} hover:${gradient.replace('from-', 'hover:from-').replace('to-', 'hover:to-')} text-white py-2 px-4 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Icon size={18} className={`relative z-10 ${isSaving && text === 'Saving...' ? 'animate-spin' : ''}`} />
              <span className="relative z-10 text-sm">{text}</span>
            </button>
          ))}

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2 px-4 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow hover:scale-105"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Settings size={18} className="relative z-10" />
              <span className="relative z-10 text-sm">Background</span>
              <ChevronDown size={18} className={`relative z-10 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 dropdown-menu z-50 animate-fade-in">
                {backgroundDesigns.map((bg, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectBackground(idx)}
                    className={`dropdown-item w-full text-left px-4 py-2 text-sm ${backgroundStyle === idx ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} transition-all duration-200`}
                  >
                    {bg.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsEdgeDropdownOpen((prev) => !prev)}
              className="relative bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white py-2 px-4 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow hover:scale-105"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <ArrowRightCircle size={18} className="relative z-10" />
              <span className="relative z-10 text-sm">Edge Style</span>
              <ChevronDown size={18} className={`relative z-10 transition-transform duration-300 ${isEdgeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isEdgeDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 edge-dropdown z-50 animate-fade-in">
                {edgeTypesOptions.map((edge, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectEdgeType(idx)}
                    className={`edge-item w-full text-left px-4 py-2 text-sm ${selectedEdgeType === idx ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} transition-all duration-200`}
                  >
                    {edge.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>

      <button
        onClick={handleAddNote}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group overflow-hidden btn-glow border border-white/20 animate-pulse-slow"
        aria-label="Add new note"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform rotate-45 scale-150 group-hover:scale-100"></div>
        <PlusIcon size={28} className="relative z-10" />
      </button>
    </div>
  );
};

export default NoteFlow;