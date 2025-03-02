import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Edit2, Trash2, Save, X, Palette, Brain, PlusCircle, Type, Image as ImageIcon, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import io from 'socket.io-client';
import debounce from 'lodash/debounce';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const socket = io(SOCKET_URL, { reconnectionAttempts: 5, timeout: 15000 });

const NoteNode = memo(({ id, data }) => {
  const [title, setTitle] = useState(data.title || 'Untitled');
  const [content, setContent] = useState(data.content || '');
  const [bgColor, setBgColor] = useState(data.bgColor || '#ffffff');
  const [fontSize, setFontSize] = useState(data.fontSize || 14);
  const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [aiTask, setAiTask] = useState('correct_sentence');
  const [aiResponse, setAiResponse] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [error, setError] = useState(null);
  const [useGradient, setUseGradient] = useState(false);

  const titleRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const containerRef = useRef(null);

  const colorOptions = [
    { value: '#ffffff', label: 'White' },
    { value: '#f3e8ff', label: 'Lavender' },
    { value: '#e0f2fe', label: 'Sky Blue' },
    { value: '#dcfce7', label: 'Mint' },
    { value: '#fef9c3', label: 'Sunshine' },
    { value: '#ffedd5', label: 'Peach' },
    { value: '#fee2e2', label: 'Blush' },
    { value: '#f3f4f6', label: 'Silver' },
  ];

  const gradientOptions = [
    { value: 'linear-gradient(135deg, #a78bfa, #ec4899)', label: 'Purple-Pink' },
    { value: 'linear-gradient(135deg, #10b981, #06b6d4)', label: 'Emerald-Cyan' },
    { value: 'linear-gradient(135deg, #f97316, #facc15)', label: 'Orange-Yellow' },
  ];

  const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32, 36];

  const aiTasks = [
    { value: 'correct_sentence', label: 'Correct Grammar' },
    { value: 'word_suggestions', label: 'Find Synonyms' },
    { value: 'summarize', label: 'Summarize' },
    { value: 'generate', label: 'Generate Text' },
    { value: 'expand', label: 'Expand Text' },
    { value: 'translate', label: 'Translate (EN-ES)' },
  ];

  // Sync state with incoming data
  useEffect(() => {
    const updateState = () => {
      setTitle(data.title || 'Untitled');
      setContent(data.content || '');
      setBgColor(data.bgColor || '#ffffff');
      setFontSize(data.fontSize || 14);
      setImageUrl(data.imageUrl || '');
    };
    updateState();

    const handleAiResponse = (response) => {
      setIsLoadingAI(false);
      if (response.success) {
        setAiResponse(response.result);
      } else {
        setError(response.error || 'AI Task Failed');
      }
    };

    socket.on('ai-response', handleAiResponse);
    socket.on('connect_error', () => setError('AI Service Unavailable'));

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    return () => {
      socket.off('ai-response', handleAiResponse);
      socket.off('connect_error');
    };
  }, [data.title, data.content, data.bgColor, data.fontSize, data.imageUrl]);

  // Enter edit mode
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  }, []);

  // Debounced save function
  const debouncedSave = useCallback(debounce((noteData) => data.onSave(noteData), 500), [data.onSave]);

  // Save note changes
  const handleSave = useCallback(() => {
    const noteData = { title, content, bgColor, fontSize, imageUrl };
    debouncedSave(noteData);
    setIsEditing(false);
    setShowColorPicker(false);
    setShowFontPicker(false);
    setAiResponse(null);
    setError(null);
    console.log('Note saved'); // Replace with toast notification if available
  }, [title, content, bgColor, fontSize, imageUrl, debouncedSave]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setTitle(data.title || 'Untitled');
    setContent(data.content || '');
    setBgColor(data.bgColor || '#ffffff');
    setFontSize(data.fontSize || 14);
    setImageUrl(data.imageUrl || '');
    setIsEditing(false);
    setShowColorPicker(false);
    setShowFontPicker(false);
    setAiResponse(null);
    setError(null);
  }, [data]);

  // Handle image upload
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        setError(null);
      };
      reader.onerror = () => setError('Image Load Failed');
      reader.readAsDataURL(file);
    }
  }, []);

  // Process AI task
  const handleAiProcess = useCallback(() => {
    if (!content.trim()) {
      setError('Please enter text to process');
      return;
    }
    setIsLoadingAI(true);
    setError(null);
    socket.emit('ai-process', { task: aiTask, prompt: content });
  }, [content, aiTask]);

  // Determine text color based on background
  const getTextColor = useCallback((bgHex) => {
    if (useGradient) return 'text-white';
    const r = parseInt(bgHex.slice(1, 3), 16);
    const g = parseInt(bgHex.slice(3, 5), 16);
    const b = parseInt(bgHex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 125 ? 'text-gray-800' : 'text-gray-100';
  }, [useGradient]);

  const textColorClass = getTextColor(bgColor);

  return (
    <div
      ref={containerRef}
      className={`relative ${isExpanded ? 'w-[700px]' : 'min-w-[340px] max-w-[500px]'} border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out group backdrop-blur-sm ${data.isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'}`}
      style={{ background: useGradient ? gradientOptions.find(g => g.value === bgColor)?.value || bgColor : bgColor }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(isEditing)}
    >
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        .btn-glow { box-shadow: 0 0 10px rgba(167, 139, 250, 0.5); transition: box-shadow 0.3s; }
        .btn-glow:hover { box-shadow: 0 0 20px rgba(167, 139, 250, 0.8); }
      `}</style>

      {/* Connection handles */}
      {['top', 'bottom', 'left', 'right'].map((pos) => (
        <React.Fragment key={pos}>
          <Handle
            type="target"
            position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
            id={`${pos}-target`}
            className="!h-3 !w-3 !bg-purple-600 hover:!bg-purple-700 transition-all duration-200"
          />
          <Handle
            type="source"
            position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
            id={`${pos}-source`}
            className="!h-3 !w-3 !bg-indigo-600 hover:!bg-indigo-700 transition-all duration-200"
          />
        </React.Fragment>
      ))}

      <div className="relative z-10 mb-6 space-y-4">
        {isEditing ? (
          <>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSave(); if (e.key === 'Escape') handleCancel(); }}
              placeholder="Note Title"
              className="w-full p-3 rounded-lg border border-gray-300 bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-200 font-semibold focus:ring-2 focus:ring-purple-400 shadow-sm transition-all duration-200"
            />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 450)}px`;
              }}
              placeholder="Start typing..."
              className="w-full min-h-[140px] resize-none rounded-lg p-4 border border-gray-300 bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-400 shadow-sm transition-all duration-200"
              style={{ fontSize: `${fontSize}px` }}
            />
            {imageUrl && (
              <div className="relative group">
                <img src={imageUrl} alt="Note" className="max-w-full h-auto rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <select
                value={aiTask}
                onChange={(e) => setAiTask(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 bg-white/95 dark:bg-gray-800/95 text-sm text-gray-800 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-purple-400"
              >
                {aiTasks.map((task) => (
                  <option key={task.value} value={task.value}>{task.label}</option>
                ))}
              </select>
              <button
                onClick={handleAiProcess}
                disabled={isLoadingAI}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md disabled:opacity-50 flex items-center gap-2 transition-all duration-300 hover:scale-105 btn-glow"
              >
                {isLoadingAI ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
                <span>AI Process</span>
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg shadow-md flex items-center gap-2 transition-all duration-300 hover:scale-105 btn-glow"
              >
                <ImageIcon size={16} />
                <span>Add Image</span>
              </button>
            </div>
            <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
            {aiResponse && (
              <div className="p-4 bg-gray-100/90 dark:bg-gray-900/90 rounded-lg shadow-md max-h-48 overflow-y-auto animate-fade-in">
                {aiResponse.error ? (
                  <p className="text-red-500">{aiResponse.error}</p>
                ) : aiTask === 'word_suggestions' ? (
                  <ul className="list-disc pl-5 text-gray-800 dark:text-gray-200">
                    {Array.isArray(aiResponse.suggestions) ? aiResponse.suggestions.map((s, i) => <li key={i}>{s}</li>) : 'No suggestions available'}
                  </ul>
                ) : (
                  <div>
                    <p className="text-gray-800 dark:text-gray-200">{aiResponse.response}</p>
                    <button
                      onClick={() => setContent(aiResponse.response)}
                      className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-md flex items-center gap-2 transition-all duration-300 hover:scale-105 btn-glow"
                    >
                      <PlusCircle size={16} />
                      <span>Use This</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {error && <p className="text-red-500 text-sm mt-2 animate-fade-in">{error}</p>}
          </>
        ) : (
          <div onClick={handleEdit} className="cursor-text space-y-3">
            <div className="flex justify-between items-center">
              <h3 className={`font-semibold text-lg ${textColorClass} tracking-tight truncate`}>{title}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full transition-colors duration-200"
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
            <div
              className={`whitespace-pre-wrap p-4 rounded-lg hover:bg-white/20 dark:hover:bg-gray-800/20 ${textColorClass} transition-colors duration-200`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {content || <span className={`italic ${textColorClass === 'text-gray-800' ? 'text-gray-500' : 'text-gray-300'}`}>Click to edit...</span>}
            </div>
            {imageUrl && <img src={imageUrl} alt="Note" className="max-w-full h-auto rounded-lg shadow-md transition-transform duration-300 hover:scale-105" />}
          </div>
        )}
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div className="absolute bottom-16 right-6 p-3 bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 animate-fade-in">
          <div className="grid grid-cols-4 gap-2">
            {colorOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setBgColor(value); setUseGradient(false); setShowColorPicker(false); }}
                className={`h-7 w-7 rounded-full border hover:scale-110 transition-all duration-200 ${bgColor === value && !useGradient ? 'ring-2 ring-purple-500' : ''}`}
                style={{ backgroundColor: value }}
                title={label}
              />
            ))}
            {gradientOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setBgColor(value); setUseGradient(true); setShowColorPicker(false); }}
                className={`h-7 w-7 rounded-full border hover:scale-110 transition-all duration-200 ${bgColor === value && useGradient ? 'ring-2 ring-purple-500' : ''}`}
                style={{ background: value }}
                title={label}
              />
            ))}
          </div>
        </div>
      )}

      {/* Font size picker */}
      {showFontPicker && (
        <div className="absolute bottom-16 right-6 p-3 bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 max-h-48 overflow-y-auto animate-fade-in">
          {fontSizeOptions.map((size) => (
            <button
              key={size}
              onClick={() => { setFontSize(size); setShowFontPicker(false); }}
              className={`w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${fontSize === size ? 'bg-purple-100 dark:bg-purple-700 text-purple-700 dark:text-white' : ''} transition-all duration-200`}
            >
              {size}px
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className={`flex justify-end gap-2 transition-all duration-300 ${isHovered || isEditing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {isEditing ? (
          <>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg shadow-md flex items-center gap-1 transition-all duration-300 hover:scale-105 btn-glow"
            >
              <Palette size={16} /> Color
            </button>
            <button
              onClick={() => setShowFontPicker(!showFontPicker)}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-lg shadow-md flex items-center gap-1 transition-all duration-300 hover:scale-105 btn-glow"
            >
              <Type size={16} /> Font
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg shadow-md flex items-center gap-1 transition-all duration-300 hover:scale-105 btn-glow"
            >
              <Save size={16} /> Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg shadow-md flex items-center gap-1 transition-all duration-300 hover:scale-105 btn-glow"
            >
              <X size={16} /> Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-md flex items-center gap-1 transition-all duration-300 hover:scale-105 btn-glow"
            >
              <Edit2 size={16} /> Edit
            </button>
            <button
              onClick={() => data.onDelete()}
              className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg shadow-md flex items-center gap-1 transition-all duration-300 hover:scale-105 btn-glow"
            >
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
});

NoteNode.displayName = 'NoteNode';
export default NoteNode;