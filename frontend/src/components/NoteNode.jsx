import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Edit2, Trash2, Save, X, Palette, Brain, PlusCircle, Type, Image as ImageIcon, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import debounce from 'lodash.debounce';
import { processAi } from '../services/api';

const extractTitleFromText = (text) => {
  if (!text) return '';
  const firstLine = text.trim().split('\n')[0];
  let cleaned = firstLine.replace(/[\*#_`~:]/g, '').trim();
  if (cleaned.length > 35) {
    const words = cleaned.split(' ');
    let shortTitle = '';
    for (let word of words) {
      if ((shortTitle + ' ' + word).length > 35) break;
      shortTitle += (shortTitle ? ' ' : '') + word;
    }
    cleaned = shortTitle || cleaned.substring(0, 35);
    cleaned = cleaned.trim();
    cleaned += '...';
  }
  return cleaned || 'Untitled';
};

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
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e) => {
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0]?.clientY);
    startPos.current = { x: clientX, y: clientY };
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) {
      return;
    }
    const clientX = e.clientX !== undefined ? e.clientX : (e.changedTouches && e.changedTouches[0]?.clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.changedTouches && e.changedTouches[0]?.clientY);
    if (clientX === undefined || clientY === undefined) return;
    const dx = Math.abs(clientX - startPos.current.x);
    const dy = Math.abs(clientY - startPos.current.y);
    if (dx < 6 && dy < 6) {
      handleEdit();
    }
  }, [handleEdit]);


  const colorOptions = [
    { value: '#ffffff', label: 'White' },
    { value: '#faf5ff', label: 'Lavender' },
    { value: '#f0f9ff', label: 'Sky' },
    { value: '#f0fdf4', label: 'Mint' },
    { value: '#fefce8', label: 'Sunshine' },
    { value: '#fff7ed', label: 'Peach' },
    { value: '#fef2f2', label: 'Blush' },
    { value: '#f8fafc', label: 'Slate' },
  ];

  const darkColorOptions = [
    { value: '#1e293b', label: 'Slate' },
    { value: '#2e1065', label: 'Indigo' },
    { value: '#0c4a6e', label: 'Deep Sky' },
    { value: '#064e3b', label: 'Emerald' },
    { value: '#713f12', label: 'Bronze' },
    { value: '#7c2d12', label: 'Rust' },
    { value: '#4c0519', label: 'Rose' },
    { value: '#0f172a', label: 'Midnight' },
  ];

  const gradientOptions = [
    { value: 'linear-gradient(135deg, #818cf8, #ec4899)', label: 'Sunset Glow' },
    { value: 'linear-gradient(135deg, #10b981, #06b6d4)', label: 'Ocean Breeze' },
    { value: 'linear-gradient(135deg, #f97316, #eab308)', label: 'Summer Sunshine' },
    { value: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', label: 'Deep Cosmic' },
  ];

  const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32];

  const aiTasks = [
    { value: 'correct_sentence', label: 'Correct Grammar' },
    { value: 'word_suggestions', label: 'Find Synonyms' },
    { value: 'summarize', label: 'Summarize text' },
    { value: 'generate', label: 'Write with AI' },
    { value: 'expand', label: 'Expand ideas' },
    { value: 'translate', label: 'Translate (ES)' },
  ];

  // Determine if a color is a gradient
  useEffect(() => {
    if (bgColor.startsWith('linear-gradient')) {
      setUseGradient(true);
    } else {
      setUseGradient(false);
    }
  }, [bgColor]);

  useEffect(() => {
    const updateState = () => {
      setTitle(data.title || 'Untitled');
      setContent(data.content || '');
      setBgColor(data.bgColor || (data.isDarkMode ? '#1e293b' : '#ffffff'));
      setFontSize(data.fontSize || 14);
      setImageUrl(data.imageUrl || '');
    };

    updateState();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [data.title, data.content, data.bgColor, data.fontSize, data.imageUrl, data.isDarkMode]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => {
      if (titleRef.current) titleRef.current.focus();
    }, 50);
  }, []);

  const debouncedSave = useCallback(debounce((noteData) => data.onSave(noteData), 500), [data.onSave]);

  const handleSave = useCallback(() => {
    const noteData = { title, content, bgColor, fontSize, imageUrl };
    debouncedSave(noteData);
    setIsEditing(false);
    setShowColorPicker(false);
    setShowFontPicker(false);
    setAiResponse(null);
    setError(null);
  }, [title, content, bgColor, fontSize, imageUrl, debouncedSave]);

  const handleCancel = useCallback(() => {
    setTitle(data.title || 'Untitled');
    setContent(data.content || '');
    setBgColor(data.bgColor || (data.isDarkMode ? '#1e293b' : '#ffffff'));
    setFontSize(data.fontSize || 14);
    setImageUrl(data.imageUrl || '');
    setIsEditing(false);
    setShowColorPicker(false);
    setShowFontPicker(false);
    setAiResponse(null);
    setError(null);
  }, [data]);

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

  const handleAiProcess = useCallback(async () => {
    if (!content.trim()) {
      setError('Please write some content first');
      return;
    }
    setIsLoadingAI(true);
    setError(null);
    try {
      const response = await processAi({ task: aiTask, prompt: content });
      setIsLoadingAI(false);
      if (response.success) {
        const result = response.result || response;
        setAiResponse(result);
        if (result.response && (title === 'Untitled' || title === 'New Note' || !title.trim())) {
          setTitle(extractTitleFromText(result.response));
        }
      } else {
        setError(response.error || 'AI Task Failed');
      }
    } catch (err) {
      setIsLoadingAI(false);
      setError(err.response?.data?.detail || err.message || 'Failed to generate AI response');
    }
  }, [content, aiTask, title]);

  const getBgStyleValue = useCallback((color) => {
    if (color.startsWith('linear-gradient')) return color;
    const hex = color.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.75)`;
    }
    return color;
  }, []);

  const getCardTheme = useCallback((bgHex) => {
    if (bgHex.startsWith('linear-gradient')) {
      return {
        isDark: true,
        text: 'text-white',
        secondaryText: 'text-slate-200/70',
        inputBg: 'bg-white/10 border-white/10 focus:ring-white/20 text-white',
        placeholder: 'placeholder-white/40',
        aiDockBg: 'bg-white/10 border-white/10',
        buttonSecondary: 'bg-white/10 hover:bg-white/20 text-white',
        aiSelect: 'bg-white/20 border-white/10 text-white'
      };
    }
    
    const hex = bgHex.replace('#', '');
    let isDark = data.isDarkMode;
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      isDark = brightness <= 140;
    }
    
    if (isDark) {
      return {
        isDark: true,
        text: 'text-white',
        secondaryText: 'text-slate-300/75',
        inputBg: 'bg-black/35 border-white/10 focus:ring-indigo-500/30 text-white',
        placeholder: 'placeholder-slate-400/60',
        aiDockBg: 'bg-black/25 border-white/10',
        buttonSecondary: 'bg-white/10 hover:bg-white/15 text-white',
        aiSelect: 'bg-slate-900/60 border-white/10 text-white'
      };
    } else {
      return {
        isDark: false,
        text: 'text-slate-800',
        secondaryText: 'text-slate-500',
        inputBg: 'bg-white/40 border-black/10 focus:ring-indigo-500/20 text-slate-800',
        placeholder: 'placeholder-slate-500/50',
        aiDockBg: 'bg-black/5 border-black/10',
        buttonSecondary: 'bg-black/5 hover:bg-black/10 text-slate-700',
        aiSelect: 'bg-white/60 border-black/10 text-slate-800'
      };
    }
  }, [data.isDarkMode]);

  const cardTheme = getCardTheme(bgColor);
  const textColorClass = cardTheme.text;
  const activeColors = data.isDarkMode ? darkColorOptions : colorOptions;

  return (
    <div
      ref={containerRef}
      className={`relative ${isExpanded ? 'w-[600px]' : 'w-[320px]'} rounded-3xl p-5 shadow-xl hover:shadow-2xl border group glass-card`}
      style={{ 
        background: getBgStyleValue(bgColor),
        borderColor: data.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isEditing) {
          setShowColorPicker(false);
          setShowFontPicker(false);
        }
      }}
    >
      <style jsx="true">{`
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(4px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .note-scroll-container::-webkit-scrollbar {
          width: 5px;
        }
        .note-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .note-scroll-container::-webkit-scrollbar-thumb {
          background: ${cardTheme.isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'};
          border-radius: 10px;
        }
        .note-scroll-container::-webkit-scrollbar-thumb:hover {
          background: ${cardTheme.isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)'};
        }
      `}</style>

      {/* Handles */}
      {['top', 'bottom', 'left', 'right'].map((pos) => (
        <React.Fragment key={pos}>
          <Handle
            type="target"
            position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
            id={`${pos}-target`}
            style={{ 
              backgroundColor: useGradient ? '#ffffff' : '#6366f1',
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)'
            }}
          />
          <Handle
            type="source"
            position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
            id={`${pos}-source`}
            style={{ 
              backgroundColor: useGradient ? '#ffffff' : '#a855f7',
              boxShadow: '0 0 8px rgba(168, 85, 247, 0.4)'
            }}
          />
        </React.Fragment>
      ))}

      {/* Card Content Area */}
      <div className="relative z-10 space-y-3.5">
        {isEditing ? (
          <div className="space-y-3 animate-fade-in nodrag">
            <div className="flex gap-2 w-full items-center">
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && e.ctrlKey) handleSave(); 
                  if (e.key === 'Escape') handleCancel(); 
                }}
                placeholder="Note Title"
                className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 shadow-sm text-sm font-semibold transition-all duration-200 ${cardTheme.inputBg} ${cardTheme.placeholder} focus:ring-indigo-500/30 nodrag`}
              />
              <button
                type="button"
                onClick={() => {
                  if (content.trim()) {
                    setTitle(extractTitleFromText(content));
                  } else {
                    setError('Please write some content first to generate a title');
                  }
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${cardTheme.buttonSecondary} nodrag`}
                title="Auto-generate title from content"
              >
                <Brain size={13} className="text-indigo-500 dark:text-indigo-400" />
                <span>Auto</span>
              </button>
            </div>
            
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 350)}px`;
              }}
              placeholder="Write something..."
              className={`w-full min-h-[100px] resize-none rounded-xl p-3 border focus:outline-none focus:ring-2 shadow-sm focus:border-transparent transition-all duration-200 ${cardTheme.inputBg} ${cardTheme.placeholder} focus:ring-indigo-500/30 nodrag nowheel`}
              style={{ fontSize: `${fontSize}px` }}
            />

            {imageUrl && (
              <div className="relative rounded-xl overflow-hidden shadow-inner group/img border border-white/10 dark:border-black/10">
                <img src={imageUrl} alt="Uploaded attachment" className="w-full h-auto max-h-48 object-cover transition-transform duration-300" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1 bg-red-600/90 text-white rounded-lg hover:bg-red-600 shadow-md transition-all duration-200 active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* AI Control Dock */}
            <div className={`p-2.5 rounded-2xl border space-y-2 transition-all duration-200 ${cardTheme.aiDockBg}`}>
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold ${cardTheme.text}`}>
                  <Brain size={14} className="text-indigo-500 dark:text-indigo-400" />
                  <span>AI Copilot</span>
                </div>
                <select
                  value={aiTask}
                  onChange={(e) => setAiTask(e.target.value)}
                  className={`px-2 py-1 text-[11px] rounded-lg border font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/40 ${cardTheme.aiSelect}`}
                >
                  {aiTasks.map((task) => (
                    <option key={task.value} value={task.value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{task.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAiProcess}
                  disabled={isLoadingAI}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all duration-200 active:scale-95 shadow-md shadow-indigo-500/10"
                >
                  {isLoadingAI ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                  <span>Generate</span>
                </button>
                
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${cardTheme.buttonSecondary}`}
                  title="Upload Image Attachment"
                >
                  <ImageIcon size={13} />
                  <span>Image</span>
                </button>
              </div>
            </div>
            
            <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />

            {/* AI Response Display */}
            {aiResponse && (
              <div className="space-y-2 mt-2">
                <div className={`p-3 backdrop-blur-md rounded-2xl border shadow-md animate-fade-in text-xs ${cardTheme.aiDockBg} ${cardTheme.text}`}>
                  {aiResponse.error ? (
                    <p className="text-red-500 font-medium">{aiResponse.error}</p>
                  ) : aiTask === 'word_suggestions' ? (
                    <div className="space-y-1">
                      <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">AI Suggestions</p>
                      <ul className={`list-disc pl-4 font-medium space-y-0.5 ${cardTheme.secondaryText}`}>
                        {Array.isArray(aiResponse.suggestions) ? aiResponse.suggestions.map((s, i) => <li key={i}>{s}</li>) : 'No suggestions found'}
                      </ul>
                    </div>
                  ) : (
                    <p className={`font-medium leading-relaxed ${cardTheme.text}`}>{aiResponse.response}</p>
                  )}
                </div>

                {!aiResponse.error && aiTask !== 'word_suggestions' && aiResponse.response && (
                  <button
                    onClick={() => {
                      setContent(aiResponse.response);
                      if (title === 'Untitled' || title === 'New Note' || !title.trim()) {
                        setTitle(extractTitleFromText(aiResponse.response));
                      }
                    }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow font-semibold text-xs animate-fade-in nodrag"
                  >
                    <PlusCircle size={13} />
                    <span>Use suggestion</span>
                  </button>
                )}
              </div>
            )}
            
            {error && (
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold mt-2 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div 
            onMouseDown={handlePointerDown}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchEnd={handlePointerUp}
            className="cursor-pointer space-y-2.5 animate-fade-in"
          >
            <div className="flex justify-between items-center gap-2">
              <h3 className={`font-extrabold text-[15px] ${textColorClass} tracking-tight truncate flex-1`}>{title}</h3>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsExpanded(!isExpanded); 
                }}
                className={`p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${textColorClass}`}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
            
            <div
              className={`whitespace-pre-wrap ${textColorClass} font-medium leading-relaxed break-words overflow-y-auto pr-1 nodrag nowheel note-scroll-container`}
              style={{ 
                fontSize: `${fontSize}px`,
                maxHeight: isExpanded ? '450px' : '200px'
              }}
            >
              {content || <span className={`italic text-[13px] ${cardTheme.secondaryText}`}>Click to write note...</span>}
            </div>

            {imageUrl && (
              <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200/10">
                <img src={imageUrl} alt="Note Attachment" className="w-full h-auto object-cover max-h-60" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Color picker Overlay */}
      {showColorPicker && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800 z-50 animate-fade-in w-44">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2">Note Themes</p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {activeColors.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setBgColor(value); setShowColorPicker(false); }}
                className={`h-6 w-6 rounded-full border border-slate-200 dark:border-slate-800 hover:scale-110 active:scale-95 transition-all ${bgColor === value ? 'ring-2 ring-indigo-500 scale-105' : ''}`}
                style={{ backgroundColor: value }}
                title={label}
              />
            ))}
          </div>
          <div className="border-t border-slate-200/20 my-2"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2 font-sans">Gradients</p>
          <div className="grid grid-cols-4 gap-2">
            {gradientOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setBgColor(value); setShowColorPicker(false); }}
                className={`h-6 w-6 rounded-full border border-slate-200 dark:border-slate-800 hover:scale-110 active:scale-95 transition-all ${bgColor === value ? 'ring-2 ring-indigo-500 scale-105' : ''}`}
                style={{ background: value }}
                title={label}
              />
            ))}
          </div>
        </div>
      )}

      {/* Font sizing picker Overlay */}
      {showFontPicker && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-1.5 bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800 z-50 max-h-40 overflow-y-auto animate-fade-in w-28 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest py-1 border-b border-slate-200/20 mb-1">Font Size</p>
          {fontSizeOptions.map((size) => (
            <button
              key={size}
              onClick={() => { setFontSize(size); setShowFontPicker(false); }}
              className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 ${fontSize === size ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {size}px
            </button>
          ))}
        </div>
      )}

      {/* Floating Card Actions Bar (Triggered on hover or edit) */}
      <div 
        className={`absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 glass-panel rounded-xl shadow-lg border border-white/20 dark:border-slate-800/80 transition-all duration-300 pointer-events-auto z-40 ${isHovered || isEditing ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}
      >
        {isEditing ? (
          <>
            <button
              onClick={() => { 
                setShowColorPicker(!showColorPicker); 
                setShowFontPicker(false); 
              }}
              className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              title="Change Background Theme"
            >
              <Palette size={14} />
            </button>
            <button
              onClick={() => { 
                setShowFontPicker(!showFontPicker); 
                setShowColorPicker(false); 
              }}
              className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              title="Font Size"
            >
              <Type size={14} />
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-800 mx-0.5"></div>
            <button
              onClick={handleSave}
              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
              title="Save Changes"
            >
              <Save size={14} />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 rounded-lg transition-colors"
              title="Cancel Edits"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              className="px-2.5 py-1.5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold"
              title="Edit Card"
            >
              <Edit2 size={12} />
              <span>Edit</span>
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-800 mx-0.5"></div>
            <button
              onClick={() => data.onDelete()}
              className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
              title="Delete Card"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
});

NoteNode.displayName = 'NoteNode';
export default NoteNode;