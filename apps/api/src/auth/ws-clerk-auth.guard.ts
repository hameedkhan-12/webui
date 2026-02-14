// apps/api/src/auth/ws-clerk-auth.guard.ts

import { verifyToken } from '@clerk/backend';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class WsClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake?.auth?.token || client.handshake?.query?.token;

    if (!token) {
      return false;
    }

    try {
      const session = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      
      client.data.user = {
        clerkId: session.sub,
      };
      
      return true;
    } catch (error) {
      return false;
    }
  }
}