import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { serve } from 'inngest/express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { InngestService } from './inngest/inngest.service';
import { inngestFunctions } from './inngest';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  app.useBodyParser('json', { limit: '10mb' });

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const inngestService = app.get(InngestService);

  app.use(
    '/api/inngest',
    serve({
      client: inngestService.getClient(),
      functions: inngestFunctions,
    }),
  );

  await app.listen(process.env.PORT ?? 3003);
  console.log(`API is running on portt ${process.env.PORT ?? 3003}`);
}

bootstrap();
