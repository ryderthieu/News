import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserByUsernamePipe implements PipeTransform {
  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async transform(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        bio: true,
        image: true,
      },
    });

    if (!user) {
      const message = this.i18n.translate('profiles.user_not_found', {
        args: { username },
      });
      throw new NotFoundException(message);
    }

    return user;
  }
}
