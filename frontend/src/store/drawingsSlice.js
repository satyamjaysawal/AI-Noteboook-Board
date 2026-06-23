import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchAllDrawings,
  createDrawing,
  deleteDrawingById,
  clearAllDrawings,
} from '../services/api';

const parsePathPoints = (pathStr) => {
  const points = [];
  if (!pathStr) return points;
  
  let targetStr = pathStr;
  if (pathStr.includes('|')) {
    targetStr = pathStr.split('|')[1];
  }
  
  const regex = /[-+]?[0-9]*\.?[0-9]+/g;
  const matches = targetStr.match(regex) || [];
  for (let i = 0; i + 1 < matches.length; i += 2) {
    points.push({ x: parseFloat(matches[i]), y: parseFloat(matches[i + 1]) });
  }
  return points;
};

export const fetchDrawings = createAsyncThunk(
  'drawings/fetchDrawings',
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchAllDrawings();
      return data.map((d) => ({ ...d, points: parsePathPoints(d.path) }));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addDrawing = createAsyncThunk(
  'drawings/addDrawing',
  async ({ drawingData, tempId }, { rejectWithValue }) => {
    try {
      const data = await createDrawing(drawingData);
      return { saved: { ...data, points: parsePathPoints(data.path) }, tempId };
    } catch (error) {
      return rejectWithValue({ error: error.message, tempId });
    }
  }
);

export const deleteDrawing = createAsyncThunk(
  'drawings/deleteDrawing',
  async (id, { rejectWithValue }) => {
    try {
      await deleteDrawingById(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const clearDrawings = createAsyncThunk(
  'drawings/clearDrawings',
  async (_, { rejectWithValue }) => {
    try {
      await clearAllDrawings();
      return [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  drawings: [],
  loading: false,
  error: null,
};

const drawingsSlice = createSlice({
  name: 'drawings',
  initialState,
  reducers: {
    setDrawings: (state, action) => {
      state.drawings = action.payload;
    },
    addDrawingLocally: (state, action) => {
      if (!state.drawings.some((d) => d.id === action.payload.id)) {
        state.drawings.push({
          ...action.payload,
          points: parsePathPoints(action.payload.path),
        });
      }
    },
    deleteDrawingLocally: (state, action) => {
      state.drawings = state.drawings.filter((d) => d.id !== action.payload);
    },
    clearDrawingsLocally: (state) => {
      state.drawings = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Drawings
      .addCase(fetchDrawings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDrawings.fulfilled, (state, action) => {
        state.drawings = action.payload;
        state.loading = false;
      })
      .addCase(fetchDrawings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Drawing
      .addCase(addDrawing.fulfilled, (state, action) => {
        const { saved, tempId } = action.payload;
        const idx = state.drawings.findIndex((d) => d.id === tempId);
        if (idx !== -1) {
          state.drawings[idx] = saved;
        } else if (!state.drawings.some((d) => d.id === saved.id)) {
          state.drawings.push(saved);
        }
      })
      .addCase(addDrawing.rejected, (state, action) => {
        const tempId = action.meta.arg.tempId;
        if (tempId) {
          state.drawings = state.drawings.filter((d) => d.id !== tempId);
        }
        state.error = action.payload?.error || action.error.message;
      })
      // Delete Drawing
      .addCase(deleteDrawing.fulfilled, (state, action) => {
        state.drawings = state.drawings.filter((d) => d.id !== action.payload);
      })
      // Clear Drawings
      .addCase(clearDrawings.fulfilled, (state) => {
        state.drawings = [];
      });
  },
});

export const {
  setDrawings,
  addDrawingLocally,
  deleteDrawingLocally,
  clearDrawingsLocally,
} = drawingsSlice.actions;

export default drawingsSlice.reducer;
