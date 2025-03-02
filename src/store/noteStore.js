// File: src/store/noteStore.js
import { create } from 'zustand';
import { 
  fetchAllNotes, 
  createNote, 
  updateNoteById, 
  deleteNoteById,
  fetchAllConnections,
  createConnection,
  deleteConnectionById
} from '../services/api';

export const useNoteStore = create((set, get) => ({
  notes: [],
  connections: [],
  loading: false,
  error: null,

  fetchNotes: async (filters = {}) => {
    set({ loading: true });
    try {
      const notes = await fetchAllNotes(filters);
      set({ notes, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching notes:', error);
    }
  },

  addNote: async (noteData) => {
    set({ loading: true });
    try {
      const newNote = await createNote(noteData);
      set((state) => ({ 
        notes: [...state.notes, newNote],
        loading: false 
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error adding note:', error);
    }
  },

  updateNote: async (id, noteData) => {
    set({ loading: true });
    try {
      const payload = {
        title: noteData.title || 'Untitled',
        content: noteData.content || '',
        position: noteData.position || { x: 100, y: 100 },
        styling: {
          backgroundColor: noteData.styling?.backgroundColor || '#ffffff',
          fontSize: noteData.styling?.fontSize || 16
        },
        imageUrl: noteData.imageUrl || '',
        tags: noteData.tags || [],
        isPinned: noteData.isPinned || false
      };
      const updatedNote = await updateNoteById(id, payload);
      set((state) => ({
        notes: state.notes.map((note) => 
          note._id === id ? updatedNote : note
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error updating note:', {
        id,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  deleteNote: async (id) => {
    set({ loading: true });
    try {
      await deleteNoteById(id);
      set((state) => ({
        notes: state.notes.filter((note) => note._id !== id),
        connections: state.connections.filter(
          (conn) => conn.source !== id && conn.target !== id
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error deleting note:', error);
    }
  },

  togglePin: async (id) => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_URL}/notes/${id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const updatedNote = await response.json();
      set((state) => ({
        notes: state.notes.map((note) => 
          note._id === id ? updatedNote : note
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error toggling pin:', error);
    }
  },

  fetchConnections: async () => {
    set({ loading: true });
    try {
      const connections = await fetchAllConnections();
      set({ connections, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching connections:', error);
    }
  },

  addConnection: async (connectionData) => {
    set({ loading: true });
    try {
      const newConnection = await createConnection(connectionData);
      set((state) => ({ 
        connections: [...state.connections, newConnection],
        loading: false 
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error adding connection:', error);
    }
  },

  deleteConnection: async (id) => {
    set({ loading: true });
    try {
      await deleteConnectionById(id);
      set((state) => ({
        connections: state.connections.filter((connection) => connection._id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error deleting connection:', error);
    }
  }
}));