// apps/api/src/modules/canvas/canvas.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsClerkAuthGuard } from 'src/auth/ws-clerk-auth.guard';

interface CollaboratorCursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
  selectedElementId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/canvas',
})
export class CanvasGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CanvasGateway.name);
  private projectRooms = new Map<string, Set<string>>();
  private collaborators = new Map<string, CollaboratorCursor>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from all rooms
    this.projectRooms.forEach((sockets, projectId) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);

        // Notify others in the room
        this.server.to(projectId).emit('collaborator:left', {
          userId: this.collaborators.get(client.id)?.userId,
          socketId: client.id,
        });
      }
    });

    // Remove collaborator data
    this.collaborators.delete(client.id);
  }

  @UseGuards(WsClerkAuthGuard)
  @SubscribeMessage('join:project')
  handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { projectId: string; userName: string; userId: string },
  ) {
    const { projectId, userName, userId } = data;
    console.log(projectId)

    // Leave previous rooms
    Array.from(client.rooms).forEach((room) => {
      if (room !== client.id) {
        client.leave(room);
      }
    });

    client.join(projectId);

    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId)!.add(client.id);

    // Initialize collaborator
    this.collaborators.set(client.id, {
      userId,
      userName,
      color: this.generateColor(userId),
      position: { x: 0, y: 0 },
    });

    // Notify others
    this.server.to(projectId).emit('collaborator:joined', {
      userId,
      userName,
      socketId: client.id,
      color: this.collaborators.get(client.id)!.color,
    });

    // Send current collaborators to the new user
    const currentCollaborators = Array.from(this.collaborators.entries())
      .filter(([socketId]) => {
        return (
          this.projectRooms.get(projectId)?.has(socketId) &&
          socketId !== client.id
        );
      })
      .map(([socketId, data]) => ({ socketId, ...data }));

    client.emit('collaborators:list', currentCollaborators);

    this.logger.log(`User ${userId} joined project ${projectId}`);
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { projectId: string; position: { x: number; y: number } },
  ) {
    const collaborator = this.collaborators.get(client.id);
    console.log(collaborator)
    if (!collaborator) return;

    collaborator.position = data.position;

    // Broadcast to others in the room
    client.to(data.projectId).emit('cursor:update', {
      socketId: client.id,
      userId: collaborator.userId,
      userName: collaborator.userName,
      color: collaborator.color,
      position: data.position,
    });
  }

  @SubscribeMessage('element:select')
  handleElementSelect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; elementId?: string },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    collaborator.selectedElementId = data.elementId;

    client.to(data.projectId).emit('element:selected', {
      socketId: client.id,
      userId: collaborator.userId,
      userName: collaborator.userName,
      elementId: data.elementId,
    });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; elementId: string },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    client.to(data.projectId).emit('user:typing', {
      userId: collaborator.userId,
      userName: collaborator.userName,
      elementId: data.elementId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; elementId: string },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    client.to(data.projectId).emit('user:stopped-typing', {
      userId: collaborator.userId,
      elementId: data.elementId,
    });
  }

  // Event listeners for canvas changes
  @OnEvent('canvas.element.created')
  handleElementCreated(payload: any) {
    this.server.to(payload.projectId).emit('element:created', {
      elementId: payload.elementId,
      userId: payload.userId,
      sessionId: payload.sessionId,
    });
  }

  @OnEvent('canvas.element.updated')
  handleElementUpdated(payload: any) {
    this.server.to(payload.projectId).emit('element:updated', {
      elementId: payload.elementId,
      userId: payload.userId,
      sessionId: payload.sessionId,
    });
  }

  @OnEvent('canvas.element.deleted')
  handleElementDeleted(payload: any) {
    this.server.to(payload.projectId).emit('element:deleted', {
      elementId: payload.elementId,
      userId: payload.userId,
      sessionId: payload.sessionId,
    });
  }

  @OnEvent('canvas.element.locked')
  handleElementLocked(payload: any) {
    this.server.to(payload.projectId).emit('element:locked', {
      elementId: payload.elementId,
      userId: payload.userId,
      expiresAt: payload.expiresAt,
    });
  }

  @OnEvent('canvas.element.unlocked')
  handleElementUnlocked(payload: any) {
    this.server.to(payload.projectId).emit('element:unlocked', {
      elementId: payload.elementId,
      userId: payload.userId,
    });
  }

  @OnEvent('canvas.bulk.updated')
  handleBulkUpdated(payload: any) {
    this.server.to(payload.projectId).emit('canvas:bulk-updated', {
      userId: payload.userId,
      sessionId: payload.sessionId,
      operationCount: payload.operationCount,
    });
  }

  private generateColor(userId: string): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
      '#F8B739',
      '#52B788',
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  getProjectCollaborators(projectId: string): CollaboratorCursor[] {
    const sockets = this.projectRooms.get(projectId);
    if (!sockets) return [];

    return Array.from(sockets)
      .map((socketId) => this.collaborators.get(socketId))
      .filter((c) => c !== undefined) as CollaboratorCursor[];
  }
}
