import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(
    currentUser: User,
    createCommentDto: CreateCommentDto,
    slug: string,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      const message = this.i18n.translate('comments.article_not_found');
      throw new NotFoundException(message);
    }

    const comment = await this.prisma.comment.create({
      data: {
        body: createCommentDto.body,
        authorId: currentUser.id,
        articleId: article.id,
      },
    });

    return {
      comment: {
        id: comment.id,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        body: comment.body,
        author: {
          username: currentUser.username,
          bio: currentUser.bio,
          image: currentUser.image,
          following: false,
        },
      },
    };
  }

  async getComments(currentUser: User, slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      const message = this.i18n.translate('comments.article_not_found');
      throw new NotFoundException(message);
    }

    const comments = await this.prisma.comment.findMany({
      where: { articleId: article.id },
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        author: {
          select: {
            username: true,
            bio: true,
            image: true,
          },
        },
      },
    });

    let followingIds = new Set<number>();
    if (currentUser) {
      const relationships = await this.prisma.relationship.findMany({
        where: {
          followerId: currentUser.id,
          followingId: {
            in: comments.map((c) => c.authorId),
          },
        },
        select: {
          followingId: true,
        },
      });
      followingIds = new Set(relationships.map((r) => r.followingId));
    }

    return {
      comments: comments.map((comment) => ({
        id: comment.id,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        body: comment.body,
        author: {
          username: comment.author.username,
          bio: comment.author.bio,
          image: comment.author.image,
          following: currentUser ? followingIds.has(comment.authorId) : false,
        },
      })),
    };
  }

  async delete(currentUser: User, slug: string, commentId: number) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      const message = this.i18n.translate('comments.article_not_found');
      throw new NotFoundException(message);
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      const message = this.i18n.translate('comments.not_found');
      throw new NotFoundException(message);
    }

    if (comment.authorId !== currentUser.id) {
      const message = this.i18n.translate('comments.delete_forbidden');
      throw new ForbiddenException(message);
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return {
      message: this.i18n.translate('comments.deleted_success'),
    };
  }
}
