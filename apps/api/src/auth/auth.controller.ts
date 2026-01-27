// src/auth/auth.controller.ts

import { type User } from '@clerk/backend';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Controller('auth')
@UseGuards(ClerkAuthGuard)
export class AuthController {
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    return user;
  }
}