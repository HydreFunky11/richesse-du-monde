export const SERVER_URL =
  import.meta.env.VITE_WS_SERVER_URL ||
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://richesse-du-monde-server.onrender.com'
    : 'http://localhost:3001');
