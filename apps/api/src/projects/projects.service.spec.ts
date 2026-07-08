import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectVersion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockProject = {
        id: 'proj_1',
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        ownerId: 'user_1',
      };

      mockPrismaService.project.findUnique.mockResolvedValue(null);
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.createProject('user_1', {
        name: 'Test Project',
        description: 'A test project',
      });

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.create).toHaveBeenCalled();
    });

    it('should handle slug collisions by appending timestamp', async () => {
      mockPrismaService.project.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // First check finds collision
        .mockResolvedValueOnce(null); // Second check passes

      mockPrismaService.project.create.mockImplementation(({ data }) => ({
        id: 'proj_new',
        name: data.name,
        slug: data.slug,
        ownerId: data.ownerId,
      }));

      const result = await service.createProject('user_1', {
        name: 'Test Project',
      });

      expect(result.slug).toMatch(/^test-project-\d+$/);
    });
  });
});
