// apps/api/src/modules/inngest/inngest.module.ts

import { Module, Global } from '@nestjs/common';
import { InngestService } from './inngest.service';

@Global()
@Module({
  providers: [InngestService],
  exports: [InngestService],
})
export class InngestModule {}