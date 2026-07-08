import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API status info', () => {
      const res = appController.getHello();
      expect(res.status).toBe('ok');
      expect(res.message).toBe('API is running');
      expect(res.version).toBe('1.0.0');
    });
  });
});
