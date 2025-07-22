import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ArticlesModule } from './modules/articles/articles.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ProfilesModule, ArticlesModule],
})
export class AppModule {}
