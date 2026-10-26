import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CorrespondenceStatus, Direction } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class RouteRecipientInputDto {
  @ApiPropertyOptional({
    description: 'Usuario destinatario (tiene prioridad sobre el departamento).',
  })
  @IsOptional()
  @IsUUID('4', { message: 'userId debe ser un UUID válido.' })
  userId?: string;

  @ApiPropertyOptional({ description: 'Departamento destinatario.' })
  @IsOptional()
  @IsUUID('4', { message: 'departmentId debe ser un UUID válido.' })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Nota interna visible solo para usuarios internos autorizados.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNotes?: string;
}

export class CreateCorrespondenceDto {
  @ApiProperty({ enum: Direction })
  @IsEnum(Direction, { message: 'El tipo de correspondencia debe ser INTERNA o EXTERNA.' })
  direction!: Direction;

  @ApiProperty({ example: 'Solicitud de constancia de estudios' })
  @IsString()
  @MinLength(5, { message: 'El asunto debe tener al menos 5 caracteres.' })
  @MaxLength(200, { message: 'El asunto no puede superar 200 caracteres.' })
  subject!: string;

  @ApiPropertyOptional({ example: 'Detalle breve del documento recibido.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @ApiProperty({ example: 'Juan Pérez Mamani' })
  @IsString()
  @MinLength(3, { message: 'El remitente debe tener al menos 3 caracteres.' })
  @MaxLength(120)
  senderName!: string;

  @ApiPropertyOptional({ example: 'Ministerio de Educación' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  senderOrganization?: string;

  @ApiPropertyOptional({ example: 'CITE: MINEDU-2026-0451' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  senderReference?: string;

  @ApiProperty({
    type: [RouteRecipientInputDto],
    description: 'Uno a tres destinatarios en el orden de la hoja de ruta.',
  })
  @ArrayMinSize(1, { message: 'Debe registrar entre 1 y 3 destinatarios.' })
  @ArrayMaxSize(3, { message: 'La hoja de ruta admite como máximo 3 destinatarios.' })
  @ValidateNested({ each: true })
  @Type(() => RouteRecipientInputDto)
  recipients!: RouteRecipientInputDto[];
}

export class ListCorrespondencesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: CorrespondenceStatus })
  @IsOptional()
  @IsEnum(CorrespondenceStatus)
  status?: CorrespondenceStatus;

  @ApiPropertyOptional({ enum: Direction })
  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from debe tener formato YYYY-MM-DD.' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to debe tener formato YYYY-MM-DD.' })
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ description: 'Solo correspondencias asignadas al usuario.' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  mine?: boolean;
}

export class ArchiveCorrespondenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
