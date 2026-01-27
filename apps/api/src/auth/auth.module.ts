// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { ClerkStrategy } from './clerk.strategy';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { ClerkClientProvider } from 'src/providers/clerk-client.provider';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [PassportModule, ConfigModule, UsersModule],
  controllers: [AuthController],
  providers: [ClerkStrategy, ClerkClientProvider],
  exports: [PassportModule],
})
export class AuthModule {}