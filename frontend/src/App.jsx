import React from 'react';
import NoteFlow from './components/NoteFlow';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white font-sans">
          <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <p className="text-slate-400 mb-6">An unexpected error occurred in the canvas. Please refresh the page to try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl font-medium shadow-lg transition-all duration-300"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950">
      <ErrorBoundary>
        <NoteFlow />
      </ErrorBoundary>
    </div>
  );
}

export default App;