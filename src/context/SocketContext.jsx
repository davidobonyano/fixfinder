import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to Socket.IO server (with reconnection enabled)
      const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', {
        auth: {
          token: localStorage.getItem('token'),
          userId: user.id,
          userType: user.role
        },
        reconnection: true
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected', reason ? `Reason: ${reason}` : '');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else if (!isAuthenticated && !isLoading) {
      // Only disconnect if NOT authenticated and NOT loading (prevents disconnects on fast reloads)
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, isLoading, user]);

  const value = {
    socket,
    isConnected,
    emit: (event, data) => {
      if (socket && isConnected) {
        socket.emit(event, data);
      }
    },
    on: (event, callback) => {
      if (socket) {
        socket.on(event, callback);
      }
    },
    off: (event, callback) => {
      if (socket) {
        socket.off(event, callback);
      }
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};






