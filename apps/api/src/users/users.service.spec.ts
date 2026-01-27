// apps/backend/src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@webra/database';
import { User as ClerkUser } from '@clerk/backend';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUser', () => {
    it('creates new user', async () => {
      const mockUser = {
        id: 'user_123',
        clerkId: 'c1',
        email: 'john@test.com',
        name: 'John Doe',
        avatar: 'avatar.png',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.upsert.mockResolvedValue(mockUser);

      const clerkUser = {
        id: 'c1',
        firstName: 'John',
        lastName: 'Doe',
        imageUrl: 'avatar.png',
        primaryEmailAddressId: 'e1',
        emailAddresses: [{ id: 'e1', emailAddress: 'john@test.com' }],
      } as ClerkUser;

      const result = await service.syncUser(clerkUser);

      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('throws when email missing', async () => {
      const clerkUser = {
        id: 'c1',
        primaryEmailAddressId: 'e1',
        emailAddresses: [],
      } as unknown as ClerkUser;

      await expect(service.syncUser(clerkUser)).rejects.toThrow('Email not found');
    });
  });

  describe('getUserByClerkId', () => {
    it('returns user by clerkId', async () => {
      const mockUser = { id: 'u1', clerkId: 'c1' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserByClerkId('c1');

      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUserRole', () => {
    it('updates user role', async () => {
      const mockUser = { id: 'u1', role: UserRole.ADMIN };
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.updateUserRole('c1', UserRole.ADMIN);

      expect(result.role).toBe(UserRole.ADMIN);
    });
  });

  describe('getAllUsers', () => {
    it('returns paginated users', async () => {
      const mockUsers = [{ id: 'u1' }];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(21);

      const result = await service.getAllUsers(0, 10);

      expect(result).toEqual({
        users: mockUsers,
        total: 21,
        page: 1,
        totalPages: 3,
      });
    });
  });
});