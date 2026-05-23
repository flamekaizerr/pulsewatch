import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './services/socket.js';

const PORT = process.env.PORT || 4000;
const server = createServer(app);

// Initialize WebSockets
initSocket(server);

server.listen(PORT, () => {
  console.log(`[PulseWatch Backend] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[PulseWatch Backend] Health check: http://localhost:${PORT}/health`);
});
