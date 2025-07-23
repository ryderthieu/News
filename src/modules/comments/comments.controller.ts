import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsService } from './comments.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { OptionalAuth } from 'src/common/decorators/optional-auth.decorator';

@Controller('/articles/:slug/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body('comment') createCommentDto: CreateCommentDto,
    @Param('slug') slug: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.commentsService.create(currentUser, createCommentDto, slug);
  }

  @Get()
  @OptionalAuth()
  async getComments(
    @CurrentUser() currentUser: User,
    @Param('slug') slug: string,
  ) {
    return this.commentsService.getComments(currentUser, slug);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async delete(
    @CurrentUser() currentUser: User,
    @Param('slug') slug: string,
    @Param('id') id: number,
  ) {
    return this.commentsService.delete(currentUser, slug, id);
  }
}
