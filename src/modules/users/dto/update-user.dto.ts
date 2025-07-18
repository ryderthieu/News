import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsOptional()
  @MinLength(8)
  password: string;

  @IsOptional()
  @MinLength(8)
  passwordConfirmation: string;

  @IsOptional()
  @IsString()
  image: string;

  @IsOptional()
  @IsString()
  bio: string;
}
