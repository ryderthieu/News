import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { GetArticlesQueryDto } from './dto/get-articles-query.dto';
import { OptionalAuth } from 'src/common/decorators/optional-auth.decorator';

@Controller('articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @CurrentUser() currentUser: User,
    @Body('article') createArticleDto: CreateArticleDto,
  ) {
    console.log(createArticleDto);
    return this.articlesService.create(currentUser, createArticleDto);
  }

  @Get('feed')
  @UseGuards(AuthGuard('jwt'))
  async getFeed(
    @Query() query: GetArticlesQueryDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.articlesService.getFeed(query, currentUser);
  }

  @Get('drafts')
  @UseGuards(AuthGuard('jwt'))
  async getDrafts(
    @CurrentUser() currentUser: User,
    @Query() query: GetArticlesQueryDto,
  ) {
    return this.articlesService.getDrafts(currentUser, query);
  }

  @Get(':slug')
  @OptionalAuth()
  async getArticle(
    @Param('slug') slug: string,
    @CurrentUser() currentUser?: User,
  ) {
    return this.articlesService.getArticle(slug, currentUser);
  }

  @Put(':slug')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('slug') slug: string,
    @Body('article') updateArticleDto: UpdateArticleDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.articlesService.update(slug, updateArticleDto, currentUser);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard('jwt'))
  async delete(@Param('slug') slug: string, @CurrentUser() currentUser: User) {
    return this.articlesService.delete(slug, currentUser);
  }

  @Post(':slug/favorite')
  @UseGuards(AuthGuard('jwt'))
  async favorite(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.articlesService.favorite(slug, currentUser);
  }

  @Delete(':slug/favorite')
  @UseGuards(AuthGuard('jwt'))
  async unfavorite(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.articlesService.unfavorite(slug, currentUser);
  }

  @Get()
  @OptionalAuth()
  async getList(
    @Query() query: GetArticlesQueryDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.articlesService.getList(query, currentUser);
  }
}
