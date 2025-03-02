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
  RefreshCw
} from 'lucide-react';

const nodeTypes = { noteNode: NoteNode };

const connectionLineStyle = {
  strokeWidth: 3,
  stroke: '#a78bfa',
  strokeDasharray: '8, 4',
  animation: 'flowAnimation 1.5s infinite ease-in-out',
  filter: 'drop-shadow(0 0 3px rgba(167, 139, 250, 0.5))'
};

const edgeTypesOptions = [
  { name: 'Smooth Arrow', type: 'smoothstep', style: { strokeWidth: 2, stroke: '#a78bfa' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' }, animated: true },
  { name: 'Straight Line', type: 'straight', style: { strokeWidth: 2, stroke: '#8b5cf6' }, markerEnd: { type: MarkerType.Arrow, color: '#8b5cf6' } },
  { name: 'Dashed Arrow', type: 'step', style: { strokeWidth: 2, stroke: '#9333ea', strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#9333ea' } },
  { name: 'Curved Glow', type: 'bezier', style: { strokeWidth: 2, stroke: '#c084fc', filter: 'drop-shadow(0 0 2px rgba(192, 132, 252, 0.6))' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#c084fc' }, animated: true },
  { name: 'Bold Arrow', type: 'smoothstep', style: { strokeWidth: 4, stroke: '#7c3aed' }, markerEnd: { type: MarkerType.ArrowClosed, width: 30, height: 30, color: '#7c3aed' } },
  { name: 'Double Arrow', type: 'bezier', style: { strokeWidth: 2, stroke: '#ec4899' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' }, markerStart: { type: MarkerType.ArrowClosed, color: '#ec4899' }, animated: true },
  { name: 'Thick Dashed', type: 'step', style: { strokeWidth: 3, stroke: '#10b981', strokeDasharray: '10,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } }
];

const NoteFlow = () => {
  const {
    notes,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    connections,
    addConnection,
    deleteConnection,
    fetchConnections
  } = useNoteStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [socket, setSocket] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [backgroundStyle, setBackgroundStyle] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEdgeDropdownOpen, setIsEdgeDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [selectedEdgeType, setSelectedEdgeType] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketStatus, setSocketStatus] = useState('disconnected');

  // Define callbacks first
  const handleUpdateNote = useCallback((id, { title, content, bgColor, fontSize, imageUrl, position }) => {
    updateNote(id, {
      title: title || 'Untitled',
      content: content || '',
      styling: {
        backgroundColor: bgColor || '#ffffff',
        fontSize: fontSize || 16
      },
      imageUrl: imageUrl || '',
      position
    });
  }, [updateNote]);

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
      styling: { backgroundColor: '#ffffff', fontSize: 16 }
    });
  }, [reactFlowInstance, addNote]);

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
      setNodes((nds) => [...nds, {
        id: newNote._id,
        type: 'noteNode',
        position: newNote.position || { x: 150, y: 150 },
        data: {
          title: newNote.title || 'Untitled',
          content: newNote.content || '',
          bgColor: newNote.styling?.backgroundColor || '#ffffff',
          fontSize: newNote.styling?.fontSize || 16,
          imageUrl: newNote.imageUrl || '',
          onSave: (updatedData) => handleUpdateNote(newNote._id, updatedData),
          onDelete: () => handleDeleteNote(newNote._id),
          isDarkMode,
          showAnimation
        }
      }]);
    };

    const handleNoteUpdated = (updatedNote) => {
      setNodes((nds) => nds.map((node) =>
        node.id === updatedNote._id
          ? { ...node, data: { ...node.data, ...updatedNote }, position: updatedNote.position }
          : node
      ));
    };

    const handleNoteDeleted = (deletedNoteId) => {
      setNodes((nds) => nds.filter((n) => n.id !== deletedNoteId));
    };

    const handleConnectionAdded = (newConnection) => {
      setEdges((eds) => [...eds, {
        id: newConnection._id,
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle,
        targetHandle: newConnection.targetHandle,
        ...edgeTypesOptions[selectedEdgeType],
        data: { label: newConnection.label || '' }
      }]);
    };

    const handleConnectionDeleted = (connectionId) => {
      setEdges((eds) => eds.filter((e) => e.id !== connectionId));
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
        bgColor: note.styling?.backgroundColor || '#ffffff',
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
      const newZoom = Math.min(zoomLevel + 0.2, 2);
      setZoomLevel(newZoom);
      reactFlowInstance.zoomTo(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (reactFlowInstance) {
      const newZoom = Math.max(zoomLevel - 0.2, 0.5);
      setZoomLevel(newZoom);
      reactFlowInstance.zoomTo(newZoom);
    }
  };

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
    ? 'bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900'
    : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50';

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto" />
          <p className="mt-4 text-lg text-red-500">{error}</p>
          <button
            onClick={handleReconnect}
            className="mt-4 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={20} />
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={reactFlowWrapper}
      className={`w-full h-screen ${themeClass} overflow-hidden relative transition-colors duration-700`}
    >
      <style jsx="true">{`
        @keyframes flowAnimation {
          0% { stroke-dashoffset: 12; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes backgroundFlow {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        @keyframes rotateSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes bounceSoft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        @keyframes spinSave {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .react-flow__panel {
          transition: all 0.3s ease-in-out;
        }
        .react-flow__controls {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 0.75rem;
          gap: 0.75rem;
        }
        .react-flow__controls button {
          background: linear-gradient(135deg, #a78bfa, #7c3aed);
          border: none;
          padding: 0.5rem;
          border-radius: 0.75rem;
          transition: transform 0.2s;
        }
        .react-flow__controls button:hover {
          transform: scale(1.1);
        }
        .dropdown-menu, .edge-dropdown {
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          border-radius: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          backdrop-filter: blur(10px);
          max-height: 300px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #a78bfa transparent;
        }
        .dropdown-menu::-webkit-scrollbar, .edge-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .dropdown-menu::-webkit-scrollbar-track, .edge-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .dropdown-menu::-webkit-scrollbar-thumb, .edge-dropdown::-webkit-scrollbar-thumb {
          background-color: #a78bfa;
          border-radius: 6px;
        }
        .dropdown-item, .edge-item {
          transition: all 0.2s ease-in-out;
          color: ${isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(31, 41, 55, 0.9)'};
        }
        .dropdown-item:hover, .edge-item:hover {
          background: linear-gradient(135deg, #a78bfa, #7c3aed);
          color: white;
        }
        .animate-pulse-slow { animation: pulseSlow 3s infinite ease-in-out; }
        .animate-spin-slow { animation: rotateSlow 15s infinite linear; }
        .animate-bounce-subtle { animation: bounceSoft 3s infinite ease-in-out; }
        .animate-twinkle { animation: twinkle 4s infinite ease-in-out; }
        .animate-fade-in-out { animation: fadeInOut 5s infinite ease-in-out; }
        .animate-gradient-shift { animation: gradientShift 8s infinite ease-in-out; }
        .animate-background-flow { animation: backgroundFlow 15s infinite linear; }
        .animate-save { animation: spinSave 1s linear infinite; }
        .btn-glow { box-shadow: 0 0 15px rgba(167, 139, 250, 0.5); }
        .btn-glow:hover { box-shadow: 0 0 25px rgba(167, 139, 250, 0.7); }
        .react-flow__minimap {
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)'};
          border-radius: 0.75rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
        }
        .status-dot.connected { background-color: #10b981; }
        .status-dot.disconnected { background-color: #ef4444; }
      `}</style>

      <div className={`absolute inset-0 ${backgroundDesigns[backgroundStyle].overlay} transition-opacity duration-700`}></div>

      <div className="w-full h-full p-6">
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
          className={`rounded-3xl shadow-2xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-white/20'} backdrop-blur-xl ${isDarkMode ? 'bg-black/5' : 'bg-white/5'} transition-all duration-700`}
        >
          <Background
            variant={backgroundDesigns[backgroundStyle].variant}
            color={backgroundDesigns[backgroundStyle].color}
            gap={backgroundDesigns[backgroundStyle].gap}
            size={backgroundDesigns[backgroundStyle].size}
            className={`${backgroundDesigns[backgroundStyle].className} transition-all duration-700`}
          />
          <Controls className="m-8" />
          <MiniMap
            nodeColor={(node) => (isDarkMode ? '#a78bfa' : '#7c3aed')}
            nodeStrokeWidth={3}
            className="m-8"
          />

          <Panel position="top-left" className="m-8">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <span className={`status-dot ${socketStatus === 'connected' ? 'connected' : 'disconnected'}`}></span>
              <span>Socket: {socketStatus}</span>
            </div>
          </Panel>

          <Panel position="top-right" className="m-8 flex flex-wrap gap-4">
            <button
              onClick={handleAddNote}
              className="relative bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"></div>
              <PlusIcon size={20} className="relative z-10" />
              <span className="relative z-10">Add Note</span>
            </button>

            <button
              onClick={toggleDarkMode}
              className="relative bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"></div>
              {isDarkMode ? <Sun size={20} className="relative z-10" /> : <Moon size={20} className="relative z-10" />}
              <span className="relative z-10">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              onClick={toggleAnimation}
              className="relative bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"></div>
              <Sparkles size={20} className={`relative z-10 ${showAnimation ? 'animate-pulse' : ''}`} />
              <span className="relative z-10">{showAnimation ? 'Reduce Motion' : 'Enable Effects'}</span>
            </button>

            <button
              onClick={handleZoomIn}
              className="relative bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"></div>
              <ZoomIn size={20} className="relative z-10" />
              <span className="relative z-10">Zoom In</span>
            </button>

            <button
              onClick={handleZoomOut}
              className="relative bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"></div>
              <ZoomOut size={20} className="relative z-10" />
              <span className="relative z-10">Zoom Out</span>
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`relative bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"></div>
              <Save size={20} className={`relative z-10 ${isSaving ? 'animate-save' : ''}`} />
              <span className="relative z-10">{isSaving ? 'Saving...' : 'Save All'}</span>
            </button>

            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="relative bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"></div>
                <Settings size={20} className={`relative z-10 ${isDropdownOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
                <span className="relative z-10">Background</span>
                <ChevronDown size={20} className={`relative z-10 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 dropdown-menu z-50">
                  <div className="py-2 px-3 border-b border-purple-200/20 mb-1">
                    <p className={`text-xs font-semibold ${isDarkMode ? 'text-white/70' : 'text-gray-500'}`}>SELECT BACKGROUND</p>
                  </div>
                  {backgroundDesigns.map((bg, index) => (
                    <button
                      key={index}
                      onClick={() => selectBackground(index)}
                      className={`dropdown-item w-full text-left px-4 py-2 text-sm font-medium ${backgroundStyle === index ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}`}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={toggleEdgeDropdown}
                className="relative bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group overflow-hidden btn-glow"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"></div>
                <ArrowRightCircle size={20} className={`relative z-10 ${isEdgeDropdownOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
                <span className="relative z-10">Arrow Style</span>
                <ChevronDown size={20} className={`relative z-10 transition-transform duration-300 ${isEdgeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isEdgeDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 edge-dropdown z-50">
                  <div className="py-2 px-3 border-b border-purple-200/20 mb-1">
                    <p className={`text-xs font-semibold ${isDarkMode ? 'text-white/70' : 'text-gray-500'}`}>SELECT ARROW STYLE</p>
                  </div>
                  {edgeTypesOptions.map((edgeType, index) => (
                    <button
                      key={index}
                      onClick={() => selectEdgeType(index)}
                      className={`edge-item w-full text-left px-4 py-2 text-sm font-medium ${selectedEdgeType === index ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}`}
                    >
                      {edgeType.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <button
        className="fixed bottom-12 right-12 w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group overflow-hidden border border-white/30 btn-glow"
        onClick={handleAddNote}
        aria-label="Add new note"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform rotate-45 scale-150 group-hover:scale-100"></div>
        <PlusIcon size={28} className="relative z-10 animate-pulse-slow" />
        <span className="absolute w-full h-full rounded-full bg-white/30 scale-0 group-hover:scale-150 opacity-0 group-hover:opacity-0 transition-all duration-700"></span>
      </button>
    </div>
  );
};

export default NoteFlow;