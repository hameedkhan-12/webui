// apps/api/src/modules/inngest/inngest.service.ts

import { Injectable } from '@nestjs/common';
import { Inngest } from 'inngest';
import { getConfig } from '@repo/shared';

@Injectable()
export class InngestService {
  private client: Inngest;

  constructor() {
    const config = getConfig();
    this.client = new Inngest({
      id: 'website-builder',
      eventKey: config.inngest?.eventKey,
    });
  }

  async send(event: { name: string; data: any; user?: any }) {
    return this.client.send(event);
  }

  getClient() {
    return this.client;
  }
}