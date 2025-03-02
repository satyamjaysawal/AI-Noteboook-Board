import { configureStore, createSlice } from "@reduxjs/toolkit";
import axios from "axios";


const API_URL = 'https://ai-noteboook-board-backend.vercel.app';

// Redux slice for notes
const noteSlice = createSlice({
  name: "notes",
  initialState: [],
  reducers: {
    setNotes: (state, action) => action.payload,
    addNote: (state, action) => { state.push(action.payload); },
    updateNote: (state, action) => {
      const index = state.findIndex((n) => n._id === action.payload._id);
      if (index !== -1) state[index] = action.payload;
    },
  },
});

export const { setNotes, addNote, updateNote } = noteSlice.actions;

// Fetch notes from MongoDB
export const fetchNotes = () => async (dispatch) => {
  const response = await axios.get(`${API_URL}/notes`);
  dispatch(setNotes(response.data));
};

// Create a new note
export const createNote = (text) => async (dispatch) => {
  const response = await axios.post(`${API_URL}/notes`, { text, x: 100, y: 100 });
  dispatch(addNote(response.data));
};

// Move note (Update in MongoDB)
export const moveNote = (id, x, y) => async (dispatch) => {
  const response = await axios.put(`${API_URL}/notes/${id}`, { x, y });
  dispatch(updateNote(response.data));
};

const store = configureStore({ reducer: { notes: noteSlice.reducer } });

export default store;