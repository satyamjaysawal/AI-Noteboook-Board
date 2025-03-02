import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Edit2, Trash2, Save, X, Palette, Brain, PlusCircle, Type, Image as ImageIcon } from 'lucide-react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');

const NoteNode = ({ data, theme = 'light' }) => {
  const [title, setTitle] = useState(data.title || 'Untitled');
  const [content, setContent] = useState(data.content || '');
  const [bgColor, setBgColor] = useState(data.bgColor || '#ffffff');
  const [fontSize, setFontSize] = useState(data.fontSize || 16); // New: Adjustable font size
  const [imageUrl, setImageUrl] = useState(data.imageUrl || ''); // New: Image support
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false); // New: Font size picker
  const [aiTask, setAiTask] = useState('correct_sentence');
  const [aiResponse, setAiResponse] = useState(null);
  const titleRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);

  const colorOptions = [
    '#ffffff', '#f3e8ff', '#e0f2fe', '#dcfce7',
    '#fef9c3', '#ffedd5', '#fee2e2', '#f3f4f6',
    '#d1d5db', '#e5e7eb' // Added more subtle shades
  ];

  const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28]; // New: Font size options

  const aiTasks = [
    { value: 'correct_sentence', label: 'Correct Sentence' },
    { value: 'word_suggestions', label: 'Word Suggestions' },
    { value: 'summarize', label: 'Summarize' },
    { value: 'generate', label: 'Generate Text' },
    { value: 'expand', label: 'Expand Text' } // New: Expand text AI task
  ];

  useEffect(() => {
    setTitle(data.title || 'Untitled');
    setContent(data.content || '');
    setBgColor(data.bgColor || '#ffffff');
    setFontSize(data.fontSize || 16);
    setImageUrl(data.imageUrl || '');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    socket.on('ai-response', (response) => {
      if (response.success) {
        setAiResponse(response.result);
      } else {
        setAiResponse({ error: response.error });
      }
    });

    return () => socket.off('ai-response');
  }, [data.title, data.content, data.bgColor, data.fontSize, data.imageUrl]);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const handleSave = () => {
    data.onSave({ title, content, bgColor, fontSize, imageUrl });
    setIsEditing(false);
    setShowColorPicker(false);
    setShowFontPicker(false);
    setAiResponse(null);
  };

  const handleCancel = () => {
    setTitle(data.title || 'Untitled');
    setContent(data.content || '');
    setBgColor(data.bgColor || '#ffffff');
    setFontSize(data.fontSize || 16);
    setImageUrl(data.imageUrl || '');
    setIsEditing(false);
    setShowColorPicker(false);
    setShowFontPicker(false);
    setAiResponse(null);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      data.onDelete();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const handleColorChange = (color) => {
    setBgColor(color);
    setShowColorPicker(false);
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    setShowFontPicker(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAiProcess = () => {
    if (!content.trim()) {
      setAiResponse({ error: 'Please enter some text to process.' });
      return;
    }
    socket.emit('ai-process', { task: aiTask, prompt: content });
  };

  const handleAddAiResponse = () => {
    if (aiResponse && aiTask !== 'word_suggestions' && aiResponse.response) {
      setContent(aiResponse.response);
      setAiResponse(null);
    }
  };

  const getTextColor = (bgHex) => {
    const r = parseInt(bgHex.slice(1, 3), 16);
    const g = parseInt(bgHex.slice(3, 5), 16);
    const b = parseInt(bgHex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 125 ? 'text-gray-800' : 'text-gray-100';
  };

  const textColorClass = getTextColor(bgColor);

  return (
    <div
      className={`relative min-w-[300px] max-w-[450px] border rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 group ${data.isDarkMode ? 'dark:border-gray-700' : 'border-gray-200'}`}
      style={{ backgroundColor: bgColor }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isEditing) {
          setShowColorPicker(false);
          setShowFontPicker(false);
        }
      }}
    >
      {/* Connection Handles */}
      {['top', 'bottom', 'left', 'right'].map((pos) => (
        <React.Fragment key={pos}>
          <Handle
            type="target"
            position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
            id={`${pos}-target`}
            className="!h-2.5 !w-2.5 !bg-purple-500 hover:!bg-purple-600 transition-all duration-200 rounded-full shadow-md ring-2 ring-gray-100/50"
          />
          <Handle
            type="source"
            position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
            id={`${pos}-source`}
            className="!h-2.5 !w-2.5 !bg-indigo-500 hover:!bg-indigo-600 transition-all duration-200 rounded-full shadow-md ring-2 ring-gray-100/50"
          />
        </React.Fragment>
      ))}

      {/* Title and Content Area */}
      <div className="relative z-10 mb-6">
        {isEditing ? (
          <>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Note Title"
              className={`w-full mb-2 p-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-sans text-lg font-semibold focus:ring-2 focus:ring-purple-300 outline-none transition-all duration-200`}
            />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Start typing your thoughts..."
              className="w-full min-h-[120px] resize-none rounded-lg p-4 border border-gray-300 bg-white text-gray-800 font-sans focus:ring-2 focus:ring-purple-300 outline-none transition-all duration-200 shadow-inner"
              style={{ fontSize: `${fontSize}px` }}
            />
            {imageUrl && (
              <div className="mt-2">
                <img src={imageUrl} alt="Note Image" className="max-w-full h-auto rounded-lg shadow-sm" />
                <button
                  onClick={() => setImageUrl('')}
                  className="mt-1 text-sm text-red-500 hover:text-red-700 transition-colors duration-200"
                >
                  Remove Image
                </button>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <select
                value={aiTask}
                onChange={(e) => setAiTask(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm"
              >
                {aiTasks.map((task) => (
                  <option key={task.value} value={task.value}>{task.label}</option>
                ))}
              </select>
              <button
                onClick={handleAiProcess}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
              >
                <Brain size={16} />
                <span className="text-sm font-medium">AI Process</span>
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
              >
                <ImageIcon size={16} />
                <span className="text-sm font-medium">Add Image</span>
              </button>
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {aiResponse && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-gray-800 max-h-40 overflow-y-auto">
                {aiResponse.error ? (
                  <p className="text-red-500">{aiResponse.error}</p>
                ) : aiTask === 'word_suggestions' ? (
                  <ul className="list-disc pl-5">
                    {Array.isArray(aiResponse.suggestions) && aiResponse.suggestions.length > 0 ? (
                      aiResponse.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm">{suggestion}</li>
                      ))
                    ) : (
                      <li className="text-sm">No suggestions available</li>
                    )}
                  </ul>
                ) : (
                  <div>
                    <p className="text-sm">{aiResponse.response}</p>
                    <button
                      onClick={handleAddAiResponse}
                      className="mt-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
                    >
                      <PlusCircle size={16} />
                      <span className="text-sm font-medium">Add to Note</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div onClick={handleEdit} className="cursor-text">
            <h3 className={`font-semibold text-lg mb-2 transition-colors duration-200 ${textColorClass}`}>
              {title}
            </h3>
            <div
              className={`whitespace-pre-wrap p-4 rounded-lg hover:bg-white/20 transition-all duration-200 font-sans leading-relaxed ${textColorClass}`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {content || <span className={`italic ${textColorClass === 'text-gray-800' ? 'text-gray-500' : 'text-gray-300'}`}>Click to add your thoughts...</span>}
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="Note Image" className="mt-2 max-w-full h-auto rounded-lg shadow-sm" />
            )}
          </div>
        )}
      </div>

      {/* Color Picker */}
      {showColorPicker && (
        <div className="absolute bottom-16 right-6 p-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
          <div className="grid grid-cols-5 gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={`h-6 w-6 rounded-full border border-gray-300 hover:scale-110 transition-transform ${bgColor === color ? 'ring-2 ring-purple-500 scale-110' : ''}`}
                style={{ backgroundColor: color }}
                aria-label={`Select ${color} background`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Font Size Picker */}
      {showFontPicker && (
        <div className="absolute bottom-16 right-6 p-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
          <div className="flex flex-col gap-1">
            {fontSizeOptions.map((size) => (
              <button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className={`px-3 py-1 text-sm text-gray-800 hover:bg-gray-100 rounded ${fontSize === size ? 'bg-purple-100 text-purple-700' : ''}`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={`flex justify-end gap-2.5 transition-all duration-300 transform ${isHovered || isEditing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {isEditing ? (
          <>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="group relative px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
            >
              <Palette size={16} />
              <span className="text-sm font-medium">Color</span>
            </button>
            <button
              onClick={() => setShowFontPicker(!showFontPicker)}
              className="group relative px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
            >
              <Type size={16} />
              <span className="text-sm font-medium">Font</span>
            </button>
            <button
              onClick={handleSave}
              className="group relative px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
            >
              <Save size={16} />
              <span className="text-sm font-medium">Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="group relative px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
            >
              <X size={16} />
              <span className="text-sm font-medium">Cancel</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              className="group relative px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
            >
              <Edit2 size={16} />
              <span className="text-sm font-medium">Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="group relative px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
            >
              <Trash2 size={16} />
              <span className="text-sm font-medium">Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NoteNode;