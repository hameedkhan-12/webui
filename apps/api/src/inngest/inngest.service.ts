// apps/api/src/modules/inngest/inngest.service.ts

import { Injectable } from '@nestjs/common';
import { Inngest } from 'inngest';

@Injectable()
export class InngestService {
  private client: Inngest;

  constructor() {
    this.client = new Inngest({
      id: 'website-builder',
      eventKey: process.env.INNGEST_EVENT_KEY,
    });
  }

  async send(event: { name: string; data: any; user?: any }) {
    return this.client.send(event);
  }

  getClient() {
    return this.client;
  }
}