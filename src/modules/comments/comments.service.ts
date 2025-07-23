import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    currentUser: User,
    createCommentDto: CreateCommentDto,
    slug: string,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
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
      throw new NotFoundException('Article not found');
    }

    const comments = await this.prisma.comment.findMany({
      where: {
        articleId: article.id,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            bio: true,
            image: true,
          },
        },
      },
    });

    return {
      comments: await Promise.all(
        comments.map(async (comment) => {
          const following = currentUser
            ? await this.prisma.relationship.findUnique({
                where: {
                  followerId_followingId: {
                    followerId: currentUser.id,
                    followingId: comment.authorId,
                  },
                },
              })
            : false;
          return {
            id: comment.id,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            body: comment.body,
            author: {
              username: comment.author.username,
              bio: comment.author.bio,
              image: comment.author.image,
              following: !!following,
            },
          };
        }),
      ),
    };
  }

  async delete(currentUser: User, slug: string, commentId: number) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== currentUser.id) {
      throw new ForbiddenException(
        'You are not allowed to delete this comment',
      );
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return {
      message: 'Comment deleted',
    };
  }
}
