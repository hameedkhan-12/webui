import { Injectable } from '@nestjs/common';
import { User as ClerkUser } from '@clerk/backend';
import { UserRole } from '@webra/database';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async syncUser(clerkUser: ClerkUser) {
    const email = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress;

    if (!email) throw new Error('Email not found');
    const userData = {
      clerkId: clerkUser.id,
      email,
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName}`.trim(),
      avatar: clerkUser.imageUrl || null,
    };

    return this.prisma.user.upsert({
      where: {
        clerkId: userData.clerkId,
      },
      update: userData,
      create: {
        ...userData,
        role: UserRole.USER,
      },
    });
  }

  async getUserByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: {
        clerkId,
      },
      include: {
        ownedProjects: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async getUserByEmail(email: string) {
    await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUserRole(clerkId: string, role: UserRole) {
    return this.prisma.user.update({
      where: {
        clerkId,
      },
      data: {
        role,
      },
    });
  }

  async updateUserProfile(
    clerkId: string,
    data: { name?: string; avatar?: string },
  ) {
    return this.prisma.user.update({
      where: { clerkId },
      data,
    });
  }

  async getAllUsers(skip = 0, take = 20) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              ownedProjects: true,
            },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }
}
