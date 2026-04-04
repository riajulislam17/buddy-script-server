import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { POST_VISIBILITY } from '../../../common/constants/post.constant';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsIn([POST_VISIBILITY.PUBLIC, POST_VISIBILITY.PRIVATE])
  visibility?: 'public' | 'private';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  imageUrls?: string[];
}
