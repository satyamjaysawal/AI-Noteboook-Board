import { create } from 'zustand';
import {
  fetchAllNotes,
  createNote,
  updateNoteById,
  deleteNoteById,
  toggleNotePin,
  fetchAllConnections,
  createConnection,
  deleteConnectionById,
} from '../services/api';

const buildNotePayload = (noteData) => ({
  title: noteData.title || 'Untitled',
  content: noteData.content || '',
  position: noteData.position || { x: 100, y: 100 },
  styling: {
    backgroundColor: noteData.styling?.backgroundColor || '#ffffff',
    fontSize: noteData.styling?.fontSize || 16,
  },
  imageUrl: noteData.imageUrl || '',
  tags: noteData.tags || [],
  isPinned: noteData.isPinned || false,
});

export const useNoteStore = create((set) => ({
  notes: [],
  connections: [],
  loading: false,
  error: null,

  fetchNotes: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const notes = await fetchAllNotes(filters);
      set({ notes, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addNote: async (noteData) => {
    set({ loading: true, error: null });
    try {
      const newNote = await createNote(noteData);
      set((state) => ({
        notes: [...state.notes, newNote],
        loading: false,
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  updateNote: async (id, noteData) => {
    set({ loading: true, error: null });
    try {
      const updatedNote = await updateNoteById(id, buildNotePayload(noteData));
      set((state) => ({
        notes: state.notes.map((note) => (note._id === id ? updatedNote : note)),
        loading: false,
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteNote: async (id) => {
    // Capture original state for rollback on error
    const originalNotes = useNoteStore.getState().notes;
    const originalConnections = useNoteStore.getState().connections;

    // Optimistically update the UI immediately
    set((state) => ({
      notes: state.notes.filter((note) => note._id !== id),
      connections: state.connections.filter(
        (conn) => conn.source !== id && conn.target !== id
      ),
      error: null
    }));

    try {
      await deleteNoteById(id);
    } catch (error) {
      // Rollback to original state on failure
      set({
        notes: originalNotes,
        connections: originalConnections,
        error: error.message
      });
    }
  },

  togglePin: async (id) => {
    set({ loading: true, error: null });
    try {
      const updatedNote = await toggleNotePin(id);
      set((state) => ({
        notes: state.notes.map((note) => (note._id === id ? updatedNote : note)),
        loading: false,
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchConnections: async () => {
    set({ loading: true, error: null });
    try {
      const connections = await fetchAllConnections();
      set({ connections, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addConnection: async (connectionData) => {
    set({ loading: true, error: null });
    try {
      const newConnection = await createConnection(connectionData);
      set((state) => ({
        connections: [...state.connections, newConnection],
        loading: false,
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  deleteConnection: async (id) => {
    // Capture original state for rollback on error
    const originalConnections = useNoteStore.getState().connections;

    // Optimistically update the UI immediately
    set((state) => ({
      connections: state.connections.filter((connection) => connection._id !== id),
      error: null
    }));

    try {
      await deleteConnectionById(id);
    } catch (error) {
      // Rollback to original state on failure
      set({
        connections: originalConnections,
        error: error.message
      });
    }
  },

  addNoteLocally: (newNote) => set((state) => {
    if (state.notes.some((n) => n._id === newNote._id)) return state;
    return { notes: [...state.notes, newNote] };
  }),

  updateNoteLocally: (updatedNote) => set((state) => ({
    notes: state.notes.map((n) => n._id === updatedNote._id ? updatedNote : n)
  })),

  deleteNoteLocally: (id) => set((state) => ({
    notes: state.notes.filter((n) => n._id !== id),
    connections: state.connections.filter((c) => c.source !== id && c.target !== id)
  })),

  addConnectionLocally: (newConnection) => set((state) => {
    if (state.connections.some((c) => c._id === newConnection._id)) return state;
    return { connections: [...state.connections, newConnection] };
  }),

  deleteConnectionLocally: (id) => set((state) => ({
    connections: state.connections.filter((c) => c._id !== id)
  })),
}));