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

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const persistedUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });

    if (persistedUser) throw new BadRequestException('User already exists');

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
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: {
          AND: [{ id: { not: user.id } }, { email: updateUserDto.email }],
        },
      });

      if (emailTaken) {
        throw new BadRequestException('Email already exists');
      }
    }

    if (updateUserDto.username) {
      const usernameTaken = await this.prisma.user.findFirst({
        where: {
          AND: [{ id: { not: user.id } }, { username: updateUserDto.username }],
        },
      });

      if (usernameTaken) {
        throw new BadRequestException('Username already exists');
      }
    }

    const { passwordConfirmation, ...updateData } = updateUserDto;

    if (updateUserDto.password) {
      if (!updateUserDto.passwordConfirmation) {
        throw new BadRequestException('Password confirmation is required');
      }

      if (updateUserDto.password !== updateUserDto.passwordConfirmation) {
        throw new BadRequestException(
          'Password and password confirmation do not match',
        );
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
