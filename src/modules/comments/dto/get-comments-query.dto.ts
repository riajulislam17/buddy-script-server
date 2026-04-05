import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max } from 'class-validator';

export class GetCommentsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(20)
  limit?: number;
}
