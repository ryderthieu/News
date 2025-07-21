import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserByUsernamePipe implements PipeTransform {
  constructor(private prisma: PrismaService) {}

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
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return user;
  }
}
