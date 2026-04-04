import { Type } from 'class-transformer';
import { IsIn, IsInt } from 'class-validator';
import {
  REACTION_TARGET_TYPE,
  REACTION_TYPE,
} from '../../../common/constants/reaction.constants';

export class ToggleReactionDto {
  @IsIn(Object.values(REACTION_TARGET_TYPE))
  targetType!: 'post' | 'comment' | 'reply';

  @Type(() => Number)
  @IsInt()
  targetId!: number;

  @IsIn(Object.values(REACTION_TYPE))
  reactionType!: 'like' | 'haha' | 'love';
}
