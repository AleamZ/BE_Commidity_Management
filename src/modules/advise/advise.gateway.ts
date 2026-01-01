import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { Inject } from '@nestjs/common';
import { AdviseService } from './advise.service';

@WebSocketGateway({ cors: true })
export class AdviseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(AdviseService) private readonly adviseService: AdviseService,
  ) {}

  connectedClients = new Map<string, Socket>(); // lưu client.id và socket

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('request_advise')
  handleRequestTuvan(
    client: Socket,
    payload: { name: string; phone: string; message: string },
  ) {
    const { name, phone, message } = payload;

    const requestId = client.id;

    // Gửi đến tất cả staff yêu cầu tư vấn mới
    this.server.emit('new_advise_request', {
      requestId,
      name,
      phone,
      message,
    });
  }

  @SubscribeMessage('accept_advise')
  handleAcceptTuvan(
    staff: Socket,
    payload: {
      requestId: string;
      staffName: string;
      name: string;
      phone: string;
      message: string;
    },
  ) {
    const { requestId, staffName, name, phone, message } = payload;

    const customer = this.connectedClients.get(requestId);
    if (!customer) {
      return staff.emit('error', 'Client không còn online');
    }

    // Gửi cho tất cả staff khác là đã có người nhận
    this.server.emit('advise_taken', { requestId });

    // Tạo phòng chat
    const roomId = `advise-${requestId}`;
    staff.join(roomId);
    customer.join(roomId);

    // Gửi cho cả 2 người bắt đầu cuộc tư vấn
    this.server.to(roomId).emit('start_chat', {
      roomId,
      staffName,
    });

    // Gán roomId vào socket để sau này dùng khi chat
    staff.data.roomId = roomId;
    customer.data.roomId = roomId;

    // Lưu lại thông tin người tư vấn để lưu vào DB sau này
    staff.data.adviseInfo = {
      staffName,
      name,
      phone,
      message,
      customerSocketId: requestId,
    };
  }

  @SubscribeMessage('chat_message')
  handleChatMessage(sender: Socket, payload: { text: string }) {
    const { text } = payload;
    const roomId = sender.data.roomId;
    if (!roomId) {
      return sender.emit('error', 'Bạn chưa tham gia phòng chat');
    }

    // Xác định vai trò người gửi (staff hay customer)
    const senderRole = sender.data.adviseInfo ? 'staff' : 'customer';

    // Gửi message đến những người trong phòng trừ người gửi
    sender.to(roomId).emit('chat_message', {
      sender: senderRole,
      text: text,
    });
  }

  @SubscribeMessage('end_chat')
  async handleEndChat(staff: Socket) {
    const { roomId, adviseInfo } = staff.data;
    const customer = this.connectedClients.get(adviseInfo?.customerSocketId);

    if (roomId) {
      this.server.to(roomId).emit('advise_closed');

      // Rời phòng
      staff.leave(roomId);
      customer?.leave(roomId);
    }

    // Lưu tư vấn vào DB
    await this.adviseService.saveAdvise({
      name: adviseInfo.name,
      phone: adviseInfo.phone,
      initialMessage: adviseInfo.message,
      assignedStaffName: adviseInfo.staffName,
    });
  }
}
