import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @Type(() => Number)
  @IsInt()
  postId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
