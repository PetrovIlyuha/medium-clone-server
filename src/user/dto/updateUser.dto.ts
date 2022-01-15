import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsString()
  @IsNotEmpty()
  password?: string;

  @IsString()
  @IsNotEmpty()
  image?: string;

  @IsString()
  @IsNotEmpty()
  bio?: string;
}
