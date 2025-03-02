import { io } from 'socket.io-client';

// require('dotenv').config();
// const SOCKET_URL ='https://ai-noteboook-board-backend.vercel.app';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
console.log('SOCKET_URL: socket.js=================', SOCKET_URL);

let socket;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false, // Manual connection control
      reconnection: true, // Enable reconnection
      reconnectionAttempts: 5, // Retry 5 times
      reconnectionDelay: 1000, // Wait 1s between retries
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socket.on('reconnect', (attempt) => {
      console.log('Reconnected to WebSocket server after', attempt, 'attempts');
    });

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to WebSocket server after maximum attempts');
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
    });
  }

  return socket;
};

// Utility to check connection status
export const isSocketConnected = () => socket?.connected || false;

// Force reconnect if disconnected
export const reconnectSocket = () => {
  if (socket && !socket.connected) {
    socket.connect();
  }
};