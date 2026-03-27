import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ClerkAuthGuard } from "src/auth/clerk-auth.guard";
import { CollectionService } from "./collections.service";
import { CurrentUser } from "src/decorators/current-user.decorator";
import type { CreateCollectionDto, UpdateCollectionDto } from "@repo/shared";
import { ProjectGuard } from "src/guards/project.guard";

@Controller('cms/collections')
@UseGuards(ClerkAuthGuard, ProjectGuard)
export class CollectionsController {
    constructor(private readonly collectionService: CollectionService) {}

    @Get()
    findAll(
        @CurrentUser() user: {id: string; projectId: string},
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ){
        return this.collectionService.findAllCollections(user.projectId, page? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }

    @Get(':id')
    findOne(@CurrentUser() user: {id: string; projectId: string}, @Param('id') id: string){
        return this.collectionService.findOneCollection(id, user.projectId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@CurrentUser() user: {id: string; projectId: string}, @Body() dto: CreateCollectionDto){
        return this.collectionService.createCollection(user.projectId, user.id, dto);
    }

    @Patch(':id')
    update(@CurrentUser() user: {id: string; projectId: string}, @Param('id') id: string, @Body() dto: UpdateCollectionDto){
        return this.collectionService.updateCollection(id, user.projectId, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    delete(
        @CurrentUser() user: { id: string, projectId: string},
        @Param('id') id: string
    ){
        return this.collectionService.deleteCollection(id, user.projectId);
    }
}