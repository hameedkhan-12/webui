// apps/backend/src/auth/clerk.strategy.ts
import { User, verifyToken } from '@clerk/backend';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { type ClerkClient } from '@clerk/backend';
import { UsersService } from '../users/users.service';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  constructor(
    @Inject('ClerkClient')
    private readonly clerkClient: ClerkClient,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const token = req.headers.authorization?.split(' ').pop();

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const tokenPayload = await verifyToken(token, {
        secretKey: this.configService.get('CLERK_SECRET_KEY'),
      });

      const clerkUser = await this.clerkClient.users.getUser(tokenPayload.sub);
      
      // Sync user to database
      const dbUser = await this.usersService.syncUser(clerkUser);

      // ✅ Return only the database user (cleaner)
      return dbUser;
    } catch (error) {
      console.error('Auth error:', error);
      
      if (error.reason === 'token-expired') {
        throw new UnauthorizedException('Token expired. Please refresh your session.');
      }
      
      throw new UnauthorizedException('Invalid token');
    }
  }
}