export enum MessageType {
  TASK_CREATED = 'TASK_CREATED',
}

export type MessageContext = {
  requestId?: string;
  userId?: string;
  sessionId?: string;
};

export type MessagePayload = Record<string, unknown>;

export type Message = {
  type: MessageType;
  sourceAgent: string;
  targetAgent: string;
  payload: MessagePayload;
  context?: MessageContext;
};

class MessageBus {
  async publish(_message: Message): Promise<void> {
    return;
  }
}

export const messageBus = new MessageBus();
