import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RecipientAction } from '@prisma/client';

export class ClassifyActionDto {
  @ApiProperty({ enum: RecipientAction })
  @IsEnum(RecipientAction, {
    message: 'La acción debe ser URGENTE, ARCHIVAR o PREPARAR_RESPUESTA.',
  })
  action!: RecipientAction;
}

export class DispatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNotes?: string;
}
