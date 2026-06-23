import { configureStore } from '@reduxjs/toolkit';
import notesReducer from './notesSlice';
import drawingsReducer from './drawingsSlice';

export const store = configureStore({
  reducer: {
    notes: notesReducer,
    drawings: drawingsReducer,
  },
});
