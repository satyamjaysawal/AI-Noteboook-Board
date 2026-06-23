import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const fetchAllNotes = async (filters = {}) => {
  const response = await api.get('/notes', { params: filters });
  return response.data;
};

export const createNote = async (noteData) => {
  const response = await api.post('/notes', noteData);
  return response.data;
};

export const updateNoteById = async (id, noteData) => {
  const response = await api.put(`/notes/${id}`, noteData);
  return response.data;
};

export const deleteNoteById = async (id) => {
  await api.delete(`/notes/${id}`);
};

export const toggleNotePin = async (id) => {
  const response = await api.patch(`/notes/${id}/pin`);
  return response.data;
};

export const fetchAllConnections = async () => {
  const response = await api.get('/connections');
  return response.data;
};

export const createConnection = async (connectionData) => {
  const response = await api.post('/connections', connectionData);
  return response.data;
};

export const deleteConnectionById = async (id) => {
  await api.delete(`/connections/${id}`);
};

export const fetchAllDrawings = async () => {
  const response = await api.get('/drawings');
  return response.data;
};

export const createDrawing = async (drawingData) => {
  const response = await api.post('/drawings', drawingData);
  return response.data;
};

export const clearAllDrawings = async () => {
  const response = await api.delete('/drawings');
  return response.data;
};

export const deleteDrawingById = async (id) => {
  const response = await api.delete(`/drawings/${id}`);
  return response.data;
};

export const processAi = async (aiData) => {
  const response = await api.post('/ai/process', aiData);
  return response.data;
};