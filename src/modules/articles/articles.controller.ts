import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

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

  @Get(':slug')
  async getArticle(@Param('slug') slug: string) {
    return this.articlesService.getArticle(slug);
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
}
