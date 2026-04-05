import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TemplateService } from './templates.service';
import type { TemplateQuery } from '@repo/shared';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplateService) {}

  @Get()
  findAll(@Query() query: TemplateQuery) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Query('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @Post(':id/use')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkAuthGuard)
  useTemplate(
    @CurrentUser() user: { id: string },
    @Param('id') templateId: string,
    @Body('projectId') projectId: string,
  ) {
    return this.service.useTemplate(templateId, projectId, user.id);
  }
}
