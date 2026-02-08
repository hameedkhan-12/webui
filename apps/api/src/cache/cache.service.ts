import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private enabled: boolean;

  constructor(private configSerivce: ConfigService) {
    this.enabled = this.configSerivce.get('CACHE_ENABLED', 'false') === 'true';

    if (this.enabled) {
      this.initRedis();
    }
  }
  private initRedis() {
    try {
      this.redis = new Redis({
        host: this.configSerivce.get('REDIS_HOST', 'localhost'),
        port: this.configSerivce.get('REDIS_PORT', 6379),
        db: this.configSerivce.get('REDIS_DB', 0),
        password: this.configSerivce.get('REDIS_PASSWORD', ''),
        retryStrategy: (times) => {
          return Math.min(times * 50, 2000);
        },
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis Successfully!');
      });
      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error', error);
      });
    } catch (error) {
      this.logger.error('Redis connection error', error);
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) return null;

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error('Error getting value from Redis', error);
      return null;
    }
  }
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error setting value in Redis ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      if (Array.isArray(key)) {
        await this.redis.del(...key);
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      this.logger.error(`Error deleting value in Redis ${key}`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting value in Redis ${pattern}`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence in Redis ${key}`, error);
      return false;
    }
  }

  async flush(): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      await this.redis.flushdb();
      this.logger.log('Redis flushed successfully!');
    } catch (error) {
      this.logger.error('Error flushing Redis', error);
    }
  }

  async ping(): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;

    try {
      const result = await this.redis.ping();
      this.logger.log('Redis pinged successfully!');
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Error pinging Redis', error);
      return false;
    }
  }
}
