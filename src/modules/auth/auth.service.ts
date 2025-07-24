import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from '../users/dto/login.dto';
import { comparePassword } from 'src/common/utils/hash.utils';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private readonly i18n: I18nService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });
    if (!user) {
      const message = this.i18n.translate('auth.email_not_exist');
      throw new UnauthorizedException(message);
    }

    const isValidPassword = await comparePassword(
      loginDto.password,
      user.password,
    );
    if (!isValidPassword) {
      const message = this.i18n.translate('auth.password_incorrect');
      throw new UnauthorizedException(message);
    }

    return {
      user: {
        email: user.email,
        token: this.jwt.sign({ sub: user.id }),
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    };
  }
}
