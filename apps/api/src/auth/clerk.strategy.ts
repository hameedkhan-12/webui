// apps/backend/src/auth/clerk.strategy.ts
import { verifyToken } from '@clerk/backend';
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
    const authHeader = req.headers.authorization;

    // ── Guard: header shape ────────────────────────────────────────────────
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException('Empty token');
    }

    // ── Guard: secret key present ──────────────────────────────────────────
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      // This is a server misconfiguration, not a user error
      throw new Error('CLERK_SECRET_KEY is not set in environment');
    }

    // ── Verify ────────────────────────────────────────────────────────────
    try {
      const tokenPayload = await verifyToken(token, {
        secretKey,
        // Prevents "invalid-claims" errors when your frontend origin
        // isn't listed — add your frontend URLs here
        authorizedParties: [
          this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000',
        ],
      });

      const clerkUser = await this.clerkClient.users.getUser(tokenPayload.sub);
      const dbUser    = await this.usersService.syncUser(clerkUser);

      return dbUser;

    } catch (error: any) {
      // ── Surfaced error reasons from @clerk/backend ─────────────────────
      // token-expired | token-not-active-yet | invalid-signature |
      // invalid-claims | jwks-fetch-failed | jwks-remote-failed | ...
      const reason: string = error?.reason ?? error?.message ?? 'unknown';

      console.error('[ClerkStrategy] verifyToken failed:', {
        reason,
        tokenPrefix: token.slice(0, 20) + '…',
        secretKeyPrefix: secretKey.slice(0, 8) + '…',
      });

      switch (reason) {
        case 'token-expired':
          throw new UnauthorizedException('Session expired — please sign in again');
        case 'token-not-active-yet':
          throw new UnauthorizedException('Token not yet active — check server clock');
        case 'invalid-signature':
          throw new UnauthorizedException('Token signature invalid — wrong secret key?');
        case 'invalid-claims':
          throw new UnauthorizedException('Token claims invalid — check frontend origin');
        default:
          throw new UnauthorizedException('Token verification failed');
      }
    }
  }
}