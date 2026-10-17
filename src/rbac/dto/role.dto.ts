import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Hierarchy level — bara level = zyada ikhtiyar (default 0). */
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  /** true = har permission ka bypass (sirf super_admin jaisa role). */
  @IsOptional()
  @IsBoolean()
  grantsAll?: boolean;

  /** Masalan ['users:read', 'users:create']. Na do to khaali role. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionNames?: string[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class SetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
