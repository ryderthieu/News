import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from 'src/common/utils/hash.utils';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const persistedUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });

    if (persistedUser) {
      const message = this.i18n.translate('users.already_exists');
      throw new BadRequestException(message);
    }

    const hashed = await hashPassword(createUserDto.password);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashed,
      },
    });

    return { user };
  }

  async update(user: User, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      const message = this.i18n.translate('users.not_found');
      throw new NotFoundException(message);
    }

    if (updateUserDto.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: {
          AND: [{ id: { not: user.id } }, { email: updateUserDto.email }],
        },
      });

      if (emailTaken) {
        const message = this.i18n.translate('users.email_already_exists');
        throw new BadRequestException(message);
      }
    }

    if (updateUserDto.username) {
      const usernameTaken = await this.prisma.user.findFirst({
        where: {
          AND: [{ id: { not: user.id } }, { username: updateUserDto.username }],
        },
      });

      if (usernameTaken) {
        const message = this.i18n.translate('users.username_already_exists');
        throw new BadRequestException(message);
      }
    }

    const { passwordConfirmation, ...updateData } = updateUserDto;

    if (updateUserDto.password) {
      if (!updateUserDto.passwordConfirmation) {
        const message = this.i18n.translate(
          'users.password_confirmation_required',
        );
        throw new BadRequestException(message);
      }

      if (updateUserDto.password !== updateUserDto.passwordConfirmation) {
        const message = this.i18n.translate('users.password_mismatch');
        throw new BadRequestException(message);
      }

      updateData.password = await hashPassword(updateUserDto.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        email: true,
        username: true,
        bio: true,
        image: true,
      },
    });

    return { user: updatedUser };
  }
}
