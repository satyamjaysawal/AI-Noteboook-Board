import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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

export const fetchNotes = createAsyncThunk(
  'notes/fetchNotes',
  async (filters, { rejectWithValue }) => {
    try {
      const data = await fetchAllNotes(filters);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addNote = createAsyncThunk(
  'notes/addNote',
  async (noteData, { rejectWithValue }) => {
    try {
      const data = await createNote(noteData);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, noteData }, { rejectWithValue }) => {
    try {
      const data = await updateNoteById(id, buildNotePayload(noteData));
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update note');
    }
  }
);

export const deleteNote = createAsyncThunk(
  'notes/deleteNote',
  async (id, { dispatch, getState, rejectWithValue }) => {
    const { notes, connections } = getState().notes;
    // Dispatch optimistic delete
    dispatch(notesSlice.actions.optimisticDeleteNote(id));
    try {
      await deleteNoteById(id);
      return id;
    } catch (error) {
      // Rollback on database failure
      dispatch(notesSlice.actions.rollbackDeleteNote({ notes, connections, error: error.message }));
      return rejectWithValue(error.message);
    }
  }
);

export const togglePin = createAsyncThunk(
  'notes/togglePin',
  async (id, { rejectWithValue }) => {
    try {
      const data = await toggleNotePin(id);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchConnections = createAsyncThunk(
  'notes/fetchConnections',
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchAllConnections();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addConnection = createAsyncThunk(
  'notes/addConnection',
  async (connectionData, { rejectWithValue }) => {
    try {
      const data = await createConnection(connectionData);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteConnection = createAsyncThunk(
  'notes/deleteConnection',
  async (id, { dispatch, getState, rejectWithValue }) => {
    const { connections } = getState().notes;
    // Dispatch optimistic delete
    dispatch(notesSlice.actions.optimisticDeleteConnection(id));
    try {
      await deleteConnectionById(id);
      return id;
    } catch (error) {
      // Rollback on database failure
      dispatch(notesSlice.actions.rollbackDeleteConnection({ connections, error: error.message }));
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  notes: [],
  connections: [],
  loading: false,
  error: null,
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    addNoteLocally: (state, action) => {
      if (!state.notes.some((n) => n._id === action.payload._id)) {
        state.notes.push(action.payload);
      }
    },
    updateNoteLocally: (state, action) => {
      state.notes = state.notes.map((n) => n._id === action.payload._id ? action.payload : n);
    },
    deleteNoteLocally: (state, action) => {
      state.notes = state.notes.filter((n) => n._id !== action.payload);
      state.connections = state.connections.filter((c) => c.source !== action.payload && c.target !== action.payload);
    },
    addConnectionLocally: (state, action) => {
      if (!state.connections.some((c) => c._id === action.payload._id)) {
        state.connections.push(action.payload);
      }
    },
    deleteConnectionLocally: (state, action) => {
      state.connections = state.connections.filter((c) => c._id !== action.payload);
    },
    deleteConnectionsByNoteIdLocally: (state, action) => {
      state.connections = state.connections.filter(
        (c) => c.source !== action.payload && c.target !== action.payload
      );
    },
    optimisticDeleteNote: (state, action) => {
      state.notes = state.notes.filter((note) => note._id !== action.payload);
      state.connections = state.connections.filter(
        (conn) => conn.source !== action.payload && conn.target !== action.payload
      );
      state.error = null;
    },
    rollbackDeleteNote: (state, action) => {
      state.notes = action.payload.notes;
      state.connections = action.payload.connections;
      state.error = action.payload.error;
    },
    optimisticDeleteConnection: (state, action) => {
      state.connections = state.connections.filter((conn) => conn._id !== action.payload);
      state.error = null;
    },
    rollbackDeleteConnection: (state, action) => {
      state.connections = action.payload.connections;
      state.error = action.payload.error;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notes
      .addCase(fetchNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.notes = action.payload;
        state.loading = false;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Note
      .addCase(addNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNote.fulfilled, (state, action) => {
        state.notes.push(action.payload);
        state.loading = false;
      })
      .addCase(addNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Note
      .addCase(updateNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        state.notes = state.notes.map((note) => (note._id === action.payload._id ? action.payload : note));
        state.loading = false;
      })
      .addCase(updateNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Toggle Pin
      .addCase(togglePin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(togglePin.fulfilled, (state, action) => {
        state.notes = state.notes.map((note) => (note._id === action.payload._id ? action.payload : note));
        state.loading = false;
      })
      .addCase(togglePin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Connections
      .addCase(fetchConnections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.connections = action.payload;
        state.loading = false;
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Connection
      .addCase(addConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addConnection.fulfilled, (state, action) => {
        state.connections.push(action.payload);
        state.loading = false;
      })
      .addCase(addConnection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  addNoteLocally,
  updateNoteLocally,
  deleteNoteLocally,
  addConnectionLocally,
  deleteConnectionLocally,
  deleteConnectionsByNoteIdLocally,
} = notesSlice.actions;

export default notesSlice.reducer;
