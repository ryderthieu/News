import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { ProfilesModule } from '../profiles/profiles.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ProfilesModule, PrismaModule],
  providers: [ArticlesService],
  controllers: [ArticlesController],
})
export class ArticlesModule {}
