import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero.' })
  @Min(1, { message: 'page debe ser mayor o igual a 1.' })
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize debe ser un número entero.' })
  @Min(1, { message: 'pageSize debe ser mayor o igual a 1.' })
  @Max(100, { message: 'pageSize no puede superar 100.' })
  pageSize = 10;
}

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

export function paginationArgs(query: PaginationQueryDto): { skip: number; take: number } {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 10));
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginationMeta(total: number, query: PaginationQueryDto): PaginationMeta {
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 10));
  return {
    page: Math.max(1, query.page || 1),
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
