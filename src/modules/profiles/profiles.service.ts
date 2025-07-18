import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async get(currentUser: User | null, targetUser: User) {
    let following = false;

    if (currentUser && currentUser.id !== targetUser.id) {
      const relationship = await this.prisma.relationship.findFirst({
        where: {
          followerId: currentUser.id,
          followingId: targetUser.id,
        },
      });

      following = !!relationship;
    }

    const profile = {
      username: targetUser.username,
      bio: targetUser.bio,
      image: targetUser.image,
      following,
    };

    return { profile };
  }

  async follow(currentUser: User, targetUser: User) {
    if (currentUser.username === targetUser.username) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const relationship = await this.prisma.relationship.findFirst({
      where: {
        followerId: currentUser.id,
        followingId: targetUser.id,
      },
    });

    if (relationship) {
      throw new BadRequestException('You are already following this user');
    }

    await this.prisma.relationship.create({
      data: {
        followerId: currentUser.id,
        followingId: targetUser.id,
      },
    });

    return {
      profile: {
        username: targetUser.username,
        bio: targetUser.bio,
        image: targetUser.image,
        following: true,
      },
    };
  }

  async unfollow(currentUser: User, targetUser: User) {
    if (currentUser.username === targetUser.username) {
      throw new BadRequestException('You cannot unfollow yourself');
    }

    const relationship = await this.prisma.relationship.findFirst({
      where: {
        followerId: currentUser.id,
        followingId: targetUser.id,
      },
    });

    if (!relationship) {
      throw new BadRequestException('You are not following this user');
    }

    await this.prisma.relationship.delete({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUser.id,
        },
      },
    });

    return {
      profile: {
        username: targetUser.username,
        bio: targetUser.bio,
        image: targetUser.image,
        following: false,
      },
    };
  }
}
