import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Version } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { type User } from '@webra/database';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateVersionDto } from './dto/create-version.dto';

@Controller('projects')
@UseGuards(ClerkAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Version('1')
  @Post()
  createProject(@CurrentUser() user: User, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.createProject(user.id, createProjectDto);
  }

  @Version('1')
  @Get(':id')
  findOneProject(@Param('id') id: string, @CurrentUser() user: User){
    return this.projectsService.findOneProject(id, user.id);
  }

  @Version('1')
  @Patch(':id')
  updateProject(@Param('id') id: string, @CurrentUser() user: User, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.updateProject(id, user.id, updateProjectDto);
  }

  @Version('1')
  @Delete(':id')
  removeProject(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.removeProject(id, user.id);
  }

  @Version('1')
  @Post(':id/duplicate')
  duplicateProject(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.duplicateProject(id, user.id);
  }

  @Version('1')
  @Post(':id/versions')
  createVersion(@Param('id') id: string, @CurrentUser() user: User, @Body() createVersionDto: CreateVersionDto) {
    return this.projectsService.createVersion(id, user.id, user.clerkId, createVersionDto);
  }

  @Version('1')
  @Get(':id/versions')
  getVersions(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.getVersions(id, user.id);
  }
}
