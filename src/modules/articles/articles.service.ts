import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateArticleDto } from './dto/create-article.dto';
import slugify from 'slugify';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  async create(currentUser: User, dto: CreateArticleDto) {
    let slug = slugify(dto.title, { lower: true });

    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Title already exists');

    const createdArticle = await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          title: dto.title,
          description: dto.description,
          body: dto.body,
          authorId: currentUser.id,
          slug,
        },
      });

      const tagList = dto.tags ?? [];

      for (const tagName of tagList) {
        const tag = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });

        await tx.articleTag.create({
          data: {
            articleId: article.id,
            tagId: tag.id,
          },
        });
      }

      return article;
    });

    const formattedArticle = {
      slug: createdArticle.slug,
      title: createdArticle.title,
      description: createdArticle.description,
      body: createdArticle.body,
      tags: dto.tags,
      createdAt: createdArticle.createdAt,
      updatedAt: createdArticle.updatedAt,
      favorited: false,
      favoritesCount: 0,
      author: {
        username: currentUser.username,
        bio: currentUser.bio,
        image: currentUser.image,
        following: false,
      },
    };

    return { article: formattedArticle };
  }

  async getArticle(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            username: true,
            bio: true,
            image: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return {
      article: { ...article, tags: article.tags.map((t) => t.tag.name) },
    };
  }

  async update(
    slug: string,
    updateArticleDto: UpdateArticleDto,
    currentUser: User,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.authorId !== currentUser.id) {
      throw new ForbiddenException(
        'You are not allowed to update this article',
      );
    }

    const newSlug = slugify(updateArticleDto.title, { lower: true });

    if (newSlug !== article.slug) {
      const existing = await this.prisma.article.findUnique({
        where: { slug: newSlug },
      });
      if (existing) {
        throw new ConflictException('Title already exists');
      }
    }

    const updatedArticle = await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.update({
        where: { slug },
        data: {
          title: updateArticleDto.title,
          description: updateArticleDto.description,
          body: updateArticleDto.body,
          slug: newSlug,
        },
      });

      if (Array.isArray(updateArticleDto.tags)) {
        await tx.articleTag.deleteMany({
          where: { articleId: article.id },
        });

        if (updateArticleDto.tags.length > 0) {
          for (const tagName of updateArticleDto.tags) {
            const tag = await tx.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName },
            });

            await tx.articleTag.create({
              data: {
                articleId: article.id,
                tagId: tag.id,
              },
            });
          }
        }
      }

      return article;
    });

    const currentArticle = await this.prisma.article.findUnique({
      where: { id: updatedArticle.id },
      include: {
        tags: {
          select: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!currentArticle) {
      throw new NotFoundException('Article not found');
    }

    const favorited = await this.prisma.favorite.findUnique({
      where: {
        userId_articleId: {
          userId: currentUser.id,
          articleId: currentArticle.id,
        },
      },
    });

    const formattedArticle = {
      slug: currentArticle.slug,
      title: currentArticle.title,
      description: currentArticle.description,
      body: currentArticle.body,
      tags: currentArticle.tags.map((t) => t.tag.name),
      createdAt: currentArticle.createdAt,
      updatedAt: currentArticle.updatedAt,
      favorited: !!favorited,
      favoritesCount: currentArticle.favoritesCount,
      author: {
        username: currentUser.username,
        bio: currentUser.bio,
        image: currentUser.image,
        following: false,
      },
    };

    return {
      article: formattedArticle,
    };
  }

  async delete(slug: string, currentUser: User) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.authorId !== currentUser.id) {
      throw new ForbiddenException(
        'You are not allowed to delete this article',
      );
    }

    await this.prisma.articleTag.deleteMany({
      where: { articleId: article.id },
    });

    await this.prisma.article.delete({
      where: { slug },
    });

    return { message: 'Article deleted successfully' };
  }
}
