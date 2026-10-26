import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export class CreateUserDto {
  @ApiProperty({ example: 'María Fernández' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'maria@unior.edu.bo' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(180)
  email!: string;

  @ApiProperty({ example: 'Unior2026*' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message: 'La contraseña debe incluir mayúscula, minúscula y número.',
  })
  password!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role, { message: 'Rol inválido.' })
  role!: Role;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((value) => value.departmentId !== null && value.departmentId !== undefined)
  @IsUUID('4', { message: 'departmentId debe ser un UUID válido.' })
  departmentId?: string | null;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'Rol inválido.' })
  role?: Role;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((value) => value.departmentId !== null && value.departmentId !== undefined)
  @IsUUID('4', { message: 'departmentId debe ser un UUID válido.' })
  departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'NuevaClave2026*' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message: 'La contraseña debe incluir mayúscula, minúscula y número.',
  })
  password!: string;
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  active?: boolean;
}
