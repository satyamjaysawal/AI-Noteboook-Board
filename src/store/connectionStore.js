// File: src/store/connectionStore.js
import { create } from 'zustand';
import { 
  fetchAllConnections, 
  createConnection, 
  updateConnectionById, 
  deleteConnectionById 
} from '../services/api';

export const useConnectionStore = create((set, get) => ({
  connections: [],
  loading: false,
  error: null,

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
      return newConnection;
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error adding connection:', error);
      throw error;
    }
  },

  updateConnection: async (id, connectionData) => {
    set({ loading: true });
    try {
      const updatedConnection = await updateConnectionById(id, connectionData);
      set((state) => ({
        connections: state.connections.map((connection) => 
          connection._id === id ? updatedConnection : connection
        ),
        loading: false
      }));
      return updatedConnection;
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error updating connection:', error);
      throw error;
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
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error deleting connection:', error);
      throw error;
    }
  }
}));