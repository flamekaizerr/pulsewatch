import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { PingLog, MonitorStatus } from '@shared/types.js';

let io: SocketServer | null = null;

export const initSocket = (server: HttpServer): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Clients join rooms matching monitor IDs to receive targeted live chart feeds
    socket.on('join_monitor', (monitorId: string) => {
      socket.join(`monitor:${monitorId}`);
    });

    socket.on('leave_monitor', (monitorId: string) => {
      socket.leave(`monitor:${monitorId}`);
    });
  });

  return io;
};

export const broadcastPingLog = (monitorId: string, log: PingLog) => {
  if (io) {
    // Send to specific monitor detail room
    io.to(`monitor:${monitorId}`).emit('ping_log', log);
    // Send to global monitors list room
    io.emit('global_ping_log', { monitorId, log });
  }
};

export const broadcastStatusChange = (monitorId: string, status: MonitorStatus) => {
  if (io) {
    io.emit('status_change', { monitorId, status });
  }
};
