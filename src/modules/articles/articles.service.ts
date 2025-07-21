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

  async create(currentUser: User, createArticleDto: CreateArticleDto) {
    let slug = slugify(createArticleDto.title, { lower: true });

    if (await this.prisma.article.findUnique({ where: { slug } })) {
      throw new ConflictException('Title already exists');
    }
    const article = await this.prisma.article.create({
      data: {
        title: createArticleDto.title,
        description: createArticleDto.description,
        body: createArticleDto.body,
        authorId: currentUser.id,
        slug,
      },
    });

    if (
      Array.isArray(createArticleDto.tags) &&
      createArticleDto.tags.length > 0
    ) {
      for (const tagName of createArticleDto.tags) {
        const tag = await this.prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });

        await this.prisma.articleTag.create({
          data: {
            articleId: article.id,
            tagId: tag.id,
          },
        });
      }
    }

    const formattedArticle = {
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      tags: createArticleDto.tags,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
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
      if (await this.prisma.article.findUnique({ where: { slug: newSlug } })) {
        throw new ConflictException('Title already exists');
      }
    }

    const updatedArticle = await this.prisma.article.update({
      where: { slug },
      data: {
        title: updateArticleDto.title,
        description: updateArticleDto.description,
        body: updateArticleDto.body,
        slug: newSlug,
      },
    });

    if (Array.isArray(updateArticleDto.tags)) {
      await this.prisma.articleTag.deleteMany({
        where: { articleId: article.id },
      });

      if (updateArticleDto.tags.length > 0) {
        for (const tagName of updateArticleDto.tags) {
          const tag = await this.prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });

          await this.prisma.articleTag.create({
            data: {
              articleId: article.id,
              tagId: tag.id,
            },
          });
        }
      }
    }

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
      favorited: favorited ? true : false,
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
