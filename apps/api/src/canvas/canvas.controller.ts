import {
  Body,
  Controller,
  Delete,
  Get,
  Head,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CanvasService } from './canvas.service';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import {
  BulkElementOperationDto,
  CreateElementDto,
  GetCanvasQueryDto,
  LockElementDto,
  UpdateElementDto,
  UpdateStylesDto,
} from './dto/canvas.dto';

@Controller('canvas')
@UseGuards(ClerkAuthGuard)
export class CanvasController {
  constructor(private readonly canvasService: CanvasService) {}

  private getSessionId(headers: any): string {
    return headers['x-session-id'] || uuidv4;
  }

  @Version('1')
  @Get(':projectId')
  async getCanvas(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Query() query: GetCanvasQueryDto,
  ) {
    return this.canvasService.getCanvas(
      user.clerkId,
      projectId,
      query.includeHidden,
    );
  }

  @Version('1')
  @Post(':projectId/elements')
  @HttpCode(HttpStatus.CREATED)
  async createElement(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateElementDto,
    @Headers() headers: any,
  ) {
    const sessionId = this.getSessionId(headers);
    return this.canvasService.createElement(
      user.clerkId,
      projectId,
      dto,
      sessionId,
    );
  }

  @Version('1')
  @Put(':projectId/elements/:elementId')
  async updateElement(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Param('elementId') elementId: string,
    @Body() dto: UpdateElementDto,
    @Headers() headers: any,
  ) {
    const sessionId = this.getSessionId(headers);

    return this.canvasService.updateElement(
      user.clerkId,
      projectId,
      elementId,
      dto,
      sessionId,
    );
  }

  @Version('1')
  @Delete(':projectId/elements/:elementId')
  async deleteElement(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Param('elementId') elementId: string,
    @Headers() headers: any,
  ) {
    const sessionId = this.getSessionId(headers);
    return this.canvasService.deleteElement(
      user.clerkId,
      projectId,
      elementId,
      sessionId,
    );
  }

  @Version('1')
  @Post(':projectId/elements/bulk')
  async bulkOperations(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Body() dto: BulkElementOperationDto,
  ) {
    return this.canvasService.bulkOperations(user.clerkId, projectId, dto);
  }

  @Version('1')
  @Patch(':projectId/styles')
  async updateStyles(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Body() dto: UpdateStylesDto,
  ) {
    return this.canvasService.updateStyles(user.clerkId, projectId, dto);
  }

  @Version('1')
  @Post(':projectId/elements/:elementId/lock')
  async lockElement(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Param('elementId') elementId: string,
    @Body() dto: LockElementDto,
  ) {
    return this.canvasService.lockElement(
      user.clerkId,
      projectId,
      elementId,
      dto,
    );
  }

  @Version('1')
  @Delete(':projectId/elements/:elementId/lock')
  async unlockElement(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Param('elementId') elementId: string,
  ) {
    return this.canvasService.unlockElement(user.clerkId, projectId, elementId);
  }
  @Version('1')
  @Get(':projectId/history')
  async getChangeHistory(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.canvasService.getChangeHistory(
      user.clerkId,
      projectId,
      limitNum,
    );
  }

  @Version('1')
  @Post(':projectId/undo')
  async undo(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Headers() headers: any,
  ) {
    const sessionId = this.getSessionId(headers);
    return this.canvasService.undo(user.clerkId, projectId, sessionId);
  }
}
