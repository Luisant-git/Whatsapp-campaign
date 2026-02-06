import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class LabelsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, Set<string>>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      if (!this.userSockets.has(+userId)) {
        this.userSockets.set(+userId, new Set());
      }
      const sockets = this.userSockets.get(+userId);
      if (sockets) {
        sockets.add(client.id);
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.userSockets.forEach((sockets) => {
      sockets.delete(client.id);
    });
  }

  emitLabelUpdate(userId: number, phone: string, labels: string[]) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('labelUpdate', { phone, labels });
      });
    }
  }

  emitManualEdit(userId: number, phone: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('manualEdit', { phone });
      });
    }
  }
}
