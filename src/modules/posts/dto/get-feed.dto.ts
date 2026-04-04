import { IsInt, IsOptional, IsString, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetFeedDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(20)
  limit?: number;
}
