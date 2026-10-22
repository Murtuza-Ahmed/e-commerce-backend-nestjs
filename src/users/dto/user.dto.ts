import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/** Super admin / admin jab naya user banaye (role samet). */
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsPhoneNumber('PK')
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'Password kam az kam 8 characters ka ho' })
  password!: string;

  @IsUUID()
  roleId!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsPhoneNumber('PK')
  phone?: string;
}

export class SetRoleDto {
  @IsUUID()
  roleId!: string;
}

export class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Naya password kam az kam 8 characters ka ho' })
  newPassword!: string;
}
