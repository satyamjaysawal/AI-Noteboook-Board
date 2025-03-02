// App.jsx
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
      return <h1>Something went wrong. Please refresh the page.</h1>;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-800 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">Note Flow</h1>
      </header>
      <main className="flex-1 relative">
        <ErrorBoundary>
          <NoteFlow />
        </ErrorBoundary>
      </main>
      <footer className="bg-gray-100 p-2 text-center text-sm text-gray-600">
        <p>Drag and drop notes anywhere on the canvas. Connect notes by dragging from handles.</p>
      </footer>
    </div>
  );
}

export default App;