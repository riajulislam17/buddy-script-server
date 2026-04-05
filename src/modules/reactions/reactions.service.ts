import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  REACTION_TARGET_TYPE,
  type ReactionTargetType,
  type ReactionType,
} from '../../common/constants/reaction.constants';
import {
  getAccessibleCommentOrThrow,
  getAccessiblePostOrThrow,
} from '../../common/helpers/content-access.helper';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Comment } from '../../model/comment.model';
import { Post } from '../../model/post.model';
import { Reaction } from '../../model/reaction.model';
import { User } from '../../model/user.model';
import { GetReactionUsersDto } from './dto/get-reaction-users.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectModel(Reaction) private readonly reactionModel: typeof Reaction,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(Comment) private readonly commentModel: typeof Comment,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {}

  async toggleReaction(user: AuthUser, payload: ToggleReactionDto) {
    await this.assertTargetAccess(user, payload.targetType, payload.targetId);

    const existingReaction = await this.reactionModel.findOne({
      where: {
        userId: user.id,
        targetType: payload.targetType,
        targetId: payload.targetId,
      },
    });

    let currentReactionType: ReactionType | null = payload.reactionType;

    if (existingReaction?.reactionType === payload.reactionType) {
      await existingReaction.destroy();
      currentReactionType = null;
    } else if (existingReaction) {
      existingReaction.reactionType = payload.reactionType;
      await existingReaction.save();
    } else {
      await this.reactionModel.create({
        userId: user.id,
        targetType: payload.targetType,
        targetId: payload.targetId,
        reactionType: payload.reactionType,
      } as Reaction);
    }

    const likesCount = await this.reactionModel.count({
      where: {
        targetType: payload.targetType,
        targetId: payload.targetId,
      },
    });

    const reactionUsers = await this.getReactionUsersInternal(
      payload.targetType,
      payload.targetId,
      4,
    );

    return {
      targetType: payload.targetType,
      targetId: payload.targetId,
      currentReactionType,
      isLiked: Boolean(currentReactionType),
      likesCount,
      reactionUsers,
    };
  }

  async getReactionUsers(user: AuthUser, query: GetReactionUsersDto) {
    await this.assertTargetAccess(user, query.targetType, query.targetId);

    return this.getReactionUsersInternal(query.targetType, query.targetId);
  }

  private async assertTargetAccess(
    user: AuthUser,
    targetType: ReactionTargetType,
    targetId: number,
  ) {
    if (targetType === REACTION_TARGET_TYPE.POST) {
      await getAccessiblePostOrThrow(this.postModel, user, targetId);
      return;
    }

    if (targetType === REACTION_TARGET_TYPE.COMMENT) {
      await getAccessibleCommentOrThrow(
        this.commentModel,
        this.postModel,
        user,
        targetId,
      );
      return;
    }

    throw new BadRequestException('This reaction target is not supported yet');
  }

  private async getReactionUsersInternal(
    targetType: ReactionTargetType,
    targetId: number,
    limit?: number,
  ) {
    const reactions = await this.reactionModel.findAll({
      where: {
        targetType,
        targetId,
      },
      include: [
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC'],
      ],
      ...(typeof limit === 'number' ? { limit } : {}),
    });

    return reactions
      .filter((reaction) => reaction.user)
      .map((reaction) => ({
        id: reaction.user.id,
        firstName: reaction.user.firstName,
        lastName: reaction.user.lastName,
        email: reaction.user.email,
        avatarUrl: reaction.user.avatarUrl ?? null,
        reactionType: reaction.reactionType,
      }));
  }
}
