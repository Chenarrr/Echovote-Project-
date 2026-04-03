import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

const useSocket = (venueId, handlers = {}) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = connectSocket();

    if (venueId) {
      socket.emit('join_venue', { venueId });
    }

    const boundHandlers = {};
    Object.entries(handlersRef.current).forEach(([event, fn]) => {
      const bound = (...args) => fn(...args);
      boundHandlers[event] = bound;
      socket.on(event, bound);
    });

    return () => {
      Object.entries(boundHandlers).forEach(([event, fn]) => {
        socket.off(event, fn);
      });
    };
  }, [venueId]);

  return getSocket();
};

export default useSocket;
