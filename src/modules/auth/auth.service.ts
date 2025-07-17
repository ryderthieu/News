import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from '../users/dto/login.dto';
import { comparePassword } from 'src/common/utils/hash.utils';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: loginDto.email } });
    if (!user) throw new UnauthorizedException('Email is not existed');

    const isValidPassword = await comparePassword(loginDto.password, user.password);
    if (!isValidPassword) throw new UnauthorizedException('Password is incorrect');

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
