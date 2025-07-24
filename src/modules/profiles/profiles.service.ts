import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

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
      const message = this.i18n.translate('profiles.cannot_follow_yourself');
      throw new BadRequestException(message);
    }

    const relationship = await this.prisma.relationship.findFirst({
      where: {
        followerId: currentUser.id,
        followingId: targetUser.id,
      },
    });

    if (relationship) {
      const message = this.i18n.translate('profiles.already_following');
      throw new BadRequestException(message);
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
      const message = this.i18n.translate('profiles.cannot_unfollow_yourself');
      throw new BadRequestException(message);
    }

    const relationship = await this.prisma.relationship.findFirst({
      where: {
        followerId: currentUser.id,
        followingId: targetUser.id,
      },
    });

    if (!relationship) {
      const message = this.i18n.translate('profiles.not_following');
      throw new BadRequestException(message);
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
