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
import { GetArticlesQueryDto } from './dto/get-articles-query.dto';
import {
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
} from 'src/common/constrants/pagination.constant';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(currentUser: User, createArticleDto: CreateArticleDto) {
    const slug = this.generateSlug(
      createArticleDto.title,
      createArticleDto.isDraft ?? false,
    );

    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (exists) {
      const message = this.i18n.translate('articles.title_already_exists');
      throw new ConflictException(message);
    }

    const createdArticle = await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          title: createArticleDto.title,
          description: createArticleDto.description,
          body: createArticleDto.body,
          authorId: currentUser.id,
          isDraft: createArticleDto.isDraft ?? false,
          slug,
        },
      });

      const tagList = createArticleDto.tags ?? [];

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
      tags: createArticleDto.tags,
      createdAt: createdArticle.createdAt,
      updatedAt: createdArticle.updatedAt,
      favorited: false,
      favoritesCount: 0,
      commentsCount: 0,
      isDraft: createdArticle.isDraft,
      author: {
        username: currentUser.username,
        bio: currentUser.bio,
        image: currentUser.image,
        following: false,
      },
    };

    return { article: formattedArticle };
  }

  async getArticle(slug: string, currentUser?: User) {
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
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    if (article.isDraft && article.authorId !== currentUser?.id) {
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    const commentsCount = await this.prisma.comment.count({
      where: {
        articleId: article.id,
      },
    });

    return {
      article: {
        ...article,
        tags: article.tags.map((t) => t.tag.name),
        commentsCount: commentsCount,
      },
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
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    if (article.isDraft && article.authorId !== currentUser.id) {
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    if (article.authorId !== currentUser.id) {
      const message = this.i18n.translate('articles.update_forbidden');
      throw new ForbiddenException(message);
    }

    let newSlug = article.slug;
    if (updateArticleDto.title) {
      newSlug = this.generateSlug(
        updateArticleDto.title,
        updateArticleDto.isDraft ?? false,
      );
    }

    if (
      article.isDraft &&
      !updateArticleDto.isDraft &&
      !updateArticleDto.title
    ) {
      newSlug = this.generateSlug(article.title, false);
    }

    if (newSlug !== article.slug) {
      const existing = await this.prisma.article.findUnique({
        where: { slug: newSlug },
      });
      if (existing) {
        const message = this.i18n.translate('articles.title_already_exists');
        throw new ConflictException(message);
      }
    }

    const updatedArticle = await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.update({
        where: { slug },
        data: {
          title: updateArticleDto.title,
          description: updateArticleDto.description,
          body: updateArticleDto.body,
          isDraft: updateArticleDto.isDraft,
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
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    const favorited = await this.prisma.favorite.findUnique({
      where: {
        userId_articleId: {
          userId: currentUser.id,
          articleId: currentArticle.id,
        },
      },
    });

    const commentsCount = await this.prisma.comment.count({
      where: {
        articleId: currentArticle.id,
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
      commentsCount: commentsCount,
      isDraft: currentArticle.isDraft,
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
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    if (article.authorId !== currentUser.id) {
      const message = this.i18n.translate('articles.delete_forbidden');
      throw new ForbiddenException(message);
    }

    await this.prisma.articleTag.deleteMany({
      where: { articleId: article.id },
    });

    await this.prisma.article.delete({
      where: { slug },
    });

    return { message: this.i18n.translate('articles.deleted_success') };
  }

  async favorite(slug: string, currentUser: User) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_articleId: {
          userId: currentUser.id,
          articleId: article.id,
        },
      },
    });

    if (favorite) {
      const message = this.i18n.translate('articles.already_favorited');
      throw new ConflictException(message);
    }

    const updatedArticle = await this.prisma.$transaction(async (tx) => {
      await tx.favorite.create({
        data: {
          userId: currentUser.id,
          articleId: article.id,
        },
      });

      const updated = await tx.article.update({
        where: { id: article.id },
        data: { favoritesCount: { increment: 1 } },
        include: {
          tags: {
            select: {
              tag: { select: { name: true } },
            },
          },
          author: {
            select: {
              username: true,
              bio: true,
              image: true,
            },
          },
        },
      });

      return updated;
    });

    const following = await this.prisma.relationship.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: article.authorId,
        },
      },
    });

    const commentsCount = await this.prisma.comment.count({
      where: {
        articleId: article.id,
      },
    });

    return {
      article: {
        slug: updatedArticle.slug,
        title: updatedArticle.title,
        description: updatedArticle.description,
        body: updatedArticle.body,
        tags: updatedArticle.tags.map((t) => t.tag.name),
        createdAt: updatedArticle.createdAt,
        updatedAt: updatedArticle.updatedAt,
        favorited: true,
        favoritesCount: updatedArticle.favoritesCount,
        commentsCount: commentsCount,
        author: {
          username: updatedArticle.author.username,
          bio: updatedArticle.author.bio,
          image: updatedArticle.author.image,
          following: !!following,
        },
      },
    };
  }

  async unfavorite(slug: string, currentUser: User) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_articleId: {
          userId: currentUser.id,
          articleId: article.id,
        },
      },
    });

    if (!favorite) {
      const message = this.i18n.translate('articles.not_favorited');
      throw new ConflictException(message);
    }

    const updatedArticle = await this.prisma.$transaction(async (tx) => {
      await tx.favorite.delete({
        where: {
          userId_articleId: {
            userId: currentUser.id,
            articleId: article.id,
          },
        },
      });

      const updated = await tx.article.update({
        where: { id: article.id },
        data: { favoritesCount: { decrement: 1 } },
        include: {
          tags: {
            select: {
              tag: { select: { name: true } },
            },
          },
          author: {
            select: {
              username: true,
              bio: true,
              image: true,
            },
          },
        },
      });
      return updated;
    });

    const following = await this.prisma.relationship.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: article.authorId,
        },
      },
    });

    const commentsCount = await this.prisma.comment.count({
      where: {
        articleId: article.id,
      },
    });

    return {
      article: {
        slug: updatedArticle.slug,
        title: updatedArticle.title,
        description: updatedArticle.description,
        body: updatedArticle.body,
        tags: updatedArticle.tags.map((t) => t.tag.name),
        createdAt: updatedArticle.createdAt,
        updatedAt: updatedArticle.updatedAt,
        favorited: false,
        favoritesCount: updatedArticle.favoritesCount,
        commentsCount: commentsCount,
        author: {
          username: updatedArticle.author.username,
          bio: updatedArticle.author.bio,
          image: updatedArticle.author.image,
          following: !!following,
        },
      },
    };
  }

  async getList(query: GetArticlesQueryDto, currentUser?: User) {
    const {
      tag,
      author,
      favorited,
      limit = DEFAULT_LIMIT,
      offset = DEFAULT_OFFSET,
    } = query;

    const where: any = { isDraft: false };

    if (tag) {
      where.tags = {
        some: {
          tag: {
            name: tag,
          },
        },
      };
    }

    if (author) {
      where.author = {
        username: author,
      };
    }

    if (favorited) {
      where.favorites = {
        some: {
          user: {
            username: favorited,
          },
        },
      };
    }

    const [articles, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          tags: {
            select: {
              tag: {
                select: { name: true },
              },
            },
          },
          author: {
            select: {
              username: true,
              bio: true,
              image: true,
            },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const formattedArticles = await Promise.all(
      articles.map(async (article) => {
        const favourited = currentUser
          ? await this.prisma.favorite.findUnique({
              where: {
                userId_articleId: {
                  userId: currentUser.id,
                  articleId: article.id,
                },
              },
            })
          : null;

        const following = currentUser
          ? await this.prisma.relationship.findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUser.id,
                  followingId: article.authorId,
                },
              },
            })
          : null;

        const commentsCount = await this.prisma.comment.count({
          where: {
            articleId: article.id,
          },
        });

        return {
          slug: article.slug,
          title: article.title,
          description: article.description,
          body: article.body,
          tags: article.tags.map((t) => t.tag.name),
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          favorited: !!favourited,
          favoritesCount: article.favoritesCount,
          commentsCount: commentsCount,
          isDraft: article.isDraft,
          author: {
            username: article.author.username,
            bio: article.author.bio,
            image: article.author.image,
            following: !!following,
          },
        };
      }),
    );

    return {
      articles: formattedArticles,
      articlesCount: total,
      offset,
      limit,
      totalOffset: Math.ceil(total / limit),
    };
  }

  async getFeed(query: GetArticlesQueryDto, currentUser: User) {
    const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = query;

    const [articles, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where: {
          isDraft: false,
          author: {
            followers: {
              some: {
                followerId: currentUser.id,
              },
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc',
        },
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
      }),
      this.prisma.article.count({
        where: {
          author: {
            followers: {
              some: {
                followerId: currentUser.id,
              },
            },
          },
        },
      }),
    ]);

    const formattedArticles = await Promise.all(
      articles.map(async (article) => {
        const favourited = await this.prisma.favorite.findUnique({
          where: {
            userId_articleId: {
              userId: currentUser.id,
              articleId: article.id,
            },
          },
        });

        const commentsCount = await this.prisma.comment.count({
          where: {
            articleId: article.id,
          },
        });

        return {
          slug: article.slug,
          title: article.title,
          description: article.description,
          body: article.body,
          tags: article.tags.map((t) => t.tag.name),
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          favorited: !!favourited,
          favoritesCount: article.favoritesCount,
          commentsCount: commentsCount,
          isDraft: article.isDraft,
          author: {
            username: article.author.username,
            bio: article.author.bio,
            image: article.author.image,
            following: true,
          },
        };
      }),
    );

    return {
      articles: formattedArticles,
      articlesCount: total,
      offset,
      limit,
      totalOffset: Math.ceil(total / limit),
    };
  }

  async getDrafts(currentUser: User, query: GetArticlesQueryDto) {
    const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = query;

    const [drafts, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where: {
          isDraft: true,
          authorId: currentUser.id,
        },
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          isDraft: true,
        },
      }),
      this.prisma.article.count({
        where: {
          isDraft: true,
          authorId: currentUser.id,
        },
      }),
    ]);
    if (!drafts) {
      const message = this.i18n.translate('articles.not_found');
      throw new NotFoundException(message);
    }

    return {
      articles: drafts,
      articlesCount: total,
      offset,
      limit,
      totalOffset: Math.ceil(total / limit),
    };
  }

  generateSlug(title: string, isDraft: boolean): string {
    let slug = slugify(title, { lower: true });
    if (isDraft) {
      slug = `${slug}-${Date.now()}-draft`;
    }
    return slug;
  }
}
