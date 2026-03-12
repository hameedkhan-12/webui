// apps/api/inngest/client.ts

import { Inngest, EventSchemas } from 'inngest';
import { getConfig } from '@repo/shared';

type Events = {
  'ai/generation': {
    data: {
      jobId: string;
      userId: string;
      projectId?: string;
      prompt: string;
      context: any;
    };
  };
  'ai/modification': {
    data: {
      jobId: string;
      userId: string;
      projectId: string;
      elementId: string;
      prompt: string;
      context: any;
    };
  };
  'ai/suggestions': {
    data: {
      jobId: string;
      userId: string;
      projectId: string;
      suggestionType: string;
      context: any;
    };
  };
  'ai/regeneration': {
    data: {
      jobId: string;
      originalJobId: string;
      userId: string;
      prompt: string;
      context: any;
    };
  };
  'ai/variation': {
    data: {
      jobId: string;
      userId: string;
      variationIndex: number;
      baseJobId?: string;
      context: any;
    };
  };
  'ai/generation.cancelled': {
    data: {
      jobId: string;
      userId: string;
    };
  };
  'notification/send': {
    data: {
      userId: string;
      type: string;
      message: string;
      jobId?: string;
    };
  };
};

const config = getConfig();

export const inngest = new Inngest({
  id: 'website-builder',
  eventKey: config.inngest?.eventKey,
  schemas: new EventSchemas().fromRecord<Events>(),
});
