import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { OptionalAuth } from 'src/common/decorators/optional-auth.decorator';
import { UserByUsernamePipe } from 'src/common/pipe/user-by-username.pipe';
import { AuthGuard } from '@nestjs/passport';

@Controller('profiles')
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Get(':username')
  @OptionalAuth()
  async get(
    @CurrentUser() currentUser: User,
    @Param('username', UserByUsernamePipe) targetUser: User,
  ) {
    return this.profilesService.get(currentUser, targetUser);
  }

  @Post(':username/follow')
  @UseGuards(AuthGuard('jwt'))
  async follow(
    @CurrentUser() currentUser: User,
    @Param('username', UserByUsernamePipe) targetUser: User,
  ) {
    return this.profilesService.follow(currentUser, targetUser);
  }

  @Delete(':username/follow')
  @UseGuards(AuthGuard('jwt'))
  async unfollow(
    @CurrentUser() currentUser: User,
    @Param('username', UserByUsernamePipe) targetUser: User,
  ) {
    return this.profilesService.unfollow(currentUser, targetUser);
  }
}
