import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { POST_VISIBILITY } from '../../../common/constants/post.constant';

export class CreatePostDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  imageUrls?: string[];

  @IsIn([POST_VISIBILITY.PUBLIC, POST_VISIBILITY.PRIVATE])
  visibility!: 'public' | 'private';
}
