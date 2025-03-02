// File: src/services/api.js
import axios from 'axios';
// require('dotenv').config();

// const API_URL = 'http://localhost:5000/api';
// const API_URL = 'https://ai-noteboook-board-backend.vercel.app/api';
const API_URL =  import.meta.env.VITE_API_URL;
console.log('API_URL: api.js=================', API_URL);

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// === NOTES API ===

// Get all notes
export const fetchAllNotes = async () => {
  try {
    const response = await api.get('/notes');
    return response.data;
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
};

// Create a new note
export const createNote = async (noteData) => {
  try {
    const response = await api.post('/notes', noteData);
    return response.data;
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
};

// Update a note by id
export const updateNoteById = async (id, noteData) => {
  try {
    const response = await api.put(`/notes/${id}`, noteData);
    return response.data;
  } catch (error) {
    console.error(`Error updating note ${id}:`, error);
    throw error;
  }
};

// Delete a note by id
export const deleteNoteById = async (id) => {
  try {
    await api.delete(`/notes/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting note ${id}:`, error);
    throw error;
  }
};

// === CONNECTIONS API ===

// Get all connections
export const fetchAllConnections = async () => {
  try {
    const response = await api.get('/connections');
    return response.data;
  } catch (error) {
    console.error('Error fetching connections:', error);
    throw error;
  }
};

// Create a new connection
export const createConnection = async (connectionData) => {
  try {
    const response = await api.post('/connections', connectionData);
    return response.data;
  } catch (error) {
    console.error('Error creating connection:', error);
    throw error;
  }
};

// Delete a connection by id
export const deleteConnectionById = async (id) => {
  try {
    await api.delete(`/connections/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting connection ${id}:`, error);
    throw error;
  }
};