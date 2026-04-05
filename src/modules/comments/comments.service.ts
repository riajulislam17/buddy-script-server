import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, col, fn } from 'sequelize';
import { getAccessibleCommentOrThrow, getAccessiblePostOrThrow } from '../../common/helpers/content-access.helper';
import { buildReactionSummaryMaps } from '../../common/helpers/reaction-summary.helper';
import {
  decodeCursor,
  getNextCursor,
  normalizeLimit,
} from '../../common/utils/pagination.util';
import { REACTION_TARGET_TYPE } from '../../common/constants/reaction.constants';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Comment } from '../../model/comment.model';
import { Post } from '../../model/post.model';
import { Reaction } from '../../model/reaction.model';
import { User } from '../../model/user.model';
import { CreateCommentDto } from './dto/create-comment.dto';
import { GetCommentsQueryDto } from './dto/get-comments-query.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

interface ReactionCountRow {
  targetId: number;
  count: string;
}

interface LikedRow {
  targetId: number;
  reactionType: string;
}

interface ReplyCountRow {
  parentId: number;
  count: string;
}

const COMMENT_RATE_LIMIT_MS = 1500;

@Injectable()
export class CommentsService {
  private static readonly commentWriteTimestamps = new Map<string, number>();

  constructor(
    @InjectModel(Comment) private readonly commentModel: typeof Comment,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(Reaction) private readonly reactionModel: typeof Reaction,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {}

  async createComment(user: AuthUser, payload: CreateCommentDto) {
    this.assertWriteRateLimit(user.id, payload.postId);

    const post = await getAccessiblePostOrThrow(this.postModel, user, payload.postId);
    let parentId: number | null = null;

    if (typeof payload.parentId === 'number') {
      const parent = await getAccessibleCommentOrThrow(
        this.commentModel,
        this.postModel,
        user,
        payload.parentId,
      );

      if (Number(parent.postId) !== Number(post.id)) {
        throw new NotFoundException('Parent comment not found');
      }

      parentId = Number(parent.id);
    }

    const comment = await this.commentModel.create({
      postId: Number(post.id),
      userId: user.id,
      parentId,
      content: payload.content.trim(),
    } as Comment);

    const createdComment = await this.commentModel.findByPk(comment.id, {
      include: [
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
    });

    return this.serializeComment(createdComment ?? comment, {
      likesCount: 0,
      isLiked: false,
      currentReactionType: null,
      reactionUsers: [],
      repliesCount: 0,
      replies: [],
      nextRepliesCursor: null,
      canEdit: true,
      canDelete: true,
    });
  }

  async updateComment(user: AuthUser, commentId: number, payload: UpdateCommentDto) {
    const comment = await getAccessibleCommentOrThrow(
      this.commentModel,
      this.postModel,
      user,
      commentId,
    );

    if (Number(comment.userId) !== user.id) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = payload.content.trim();
    await comment.save();

    const updatedComment = await this.commentModel.findByPk(comment.id, {
      include: [
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
    });

    const [reactionCounts, likedRows, reactionUsers, replyCounts] = await Promise.all([
      this.getReactionCounts([Number(comment.id)]),
      this.getLikedRows(user.id, [Number(comment.id)]),
      this.getReactionUsers([Number(comment.id)]),
      this.getReplyCounts([Number(comment.id)]),
    ]);

    return this.serializeComments(user, [updatedComment ?? comment], {
      reactionCounts,
      likedRows,
      reactionUsers,
      replyCounts,
    })[0];
  }

  async deleteComment(user: AuthUser, commentId: number) {
    const comment = await getAccessibleCommentOrThrow(
      this.commentModel,
      this.postModel,
      user,
      commentId,
    );

    if (Number(comment.userId) !== user.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const descendants = await this.countCommentTreeSize(Number(comment.id));

    await comment.destroy();

    return {
      deletedId: Number(comment.id),
      deletedCount: descendants,
      parentId: comment.parentId ? Number(comment.parentId) : null,
    };
  }

  async getPostComments(
    user: AuthUser,
    postId: number,
    query: GetCommentsQueryDto,
  ) {
    await getAccessiblePostOrThrow(this.postModel, user, postId);

    const result = await this.getCommentsPage(user, {
      postId,
      parentId: null,
      query,
    });

    return {
      ...result,
      parentId: null,
      postId,
    };
  }

  async getCommentReplies(
    user: AuthUser,
    commentId: number,
    query: GetCommentsQueryDto,
  ) {
    const parent = await getAccessibleCommentOrThrow(
      this.commentModel,
      this.postModel,
      user,
      commentId,
    );

    const result = await this.getCommentsPage(user, {
      postId: Number(parent.postId),
      parentId: Number(parent.id),
      query,
    });

    return {
      ...result,
      parentId: Number(parent.id),
      postId: Number(parent.postId),
    };
  }

  private async getCommentsPage(
    user: AuthUser,
    options: {
      postId: number;
      parentId: number | null;
      query: GetCommentsQueryDto;
    },
  ) {
    const limit = normalizeLimit(options.query.limit);
    const decodedCursor = decodeCursor(options.query.cursor);

    const cursorWhere = decodedCursor
      ? {
          [Op.or]: [
            {
              createdAt: {
                [Op.gt]: new Date(decodedCursor.createdAt),
              },
            },
            {
              createdAt: new Date(decodedCursor.createdAt),
              id: {
                [Op.gt]: decodedCursor.id,
              },
            },
          ],
        }
      : {};

    const comments = await this.commentModel.findAll({
      where: {
        postId: options.postId,
        parentId: options.parentId,
        ...cursorWhere,
      },
      include: [
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      limit,
    });

    if (comments.length === 0) {
      return {
        items: [],
        nextCursor: null,
      };
    }

    const commentIds = comments.map((comment) => Number(comment.id));
    const [reactionCounts, likedRows, reactionUsers, replyCounts] = await Promise.all([
      this.getReactionCounts(commentIds),
      this.getLikedRows(user.id, commentIds),
      this.getReactionUsers(commentIds),
      this.getReplyCounts(commentIds),
    ]);

    const items = this.serializeComments(user, comments, {
      reactionCounts,
      likedRows,
      reactionUsers,
      replyCounts,
    });

    const cursorItems = comments.map((comment) => ({
      id: Number(comment.id),
      createdAt: this.normalizeDate(comment.createdAt as unknown),
    }));

    return {
      items,
      nextCursor: getNextCursor(cursorItems, limit),
    };
  }

  private serializeComments(
    user: AuthUser,
    comments: Comment[],
    extras: {
      reactionCounts: ReactionCountRow[];
      likedRows: LikedRow[];
      reactionUsers: Reaction[];
      replyCounts: ReplyCountRow[];
    },
  ) {
    const repliesCountMap = new Map(
      extras.replyCounts.map((item) => [Number(item.parentId), Number(item.count)]),
    );
    const { likesCountMap, currentReactionMap, reactionUsersMap } =
      buildReactionSummaryMaps(
        extras.reactionCounts,
        extras.likedRows,
        extras.reactionUsers,
        this.serializeReactionUser,
      );

    return comments.map((comment) =>
      this.serializeComment(comment, {
        likesCount: likesCountMap.get(Number(comment.id)) ?? 0,
        isLiked: currentReactionMap.has(Number(comment.id)),
        currentReactionType: currentReactionMap.get(Number(comment.id)) ?? null,
        reactionUsers: reactionUsersMap.get(Number(comment.id)) ?? [],
        repliesCount: repliesCountMap.get(Number(comment.id)) ?? 0,
        replies: [],
        nextRepliesCursor: null,
        canEdit: Number(comment.userId) === user.id,
        canDelete: Number(comment.userId) === user.id,
      }),
    );
  }

  private serializeComment(
    comment: Comment,
    extras: {
      likesCount: number;
      isLiked: boolean;
      currentReactionType: string | null;
      reactionUsers: ReturnType<typeof this.serializeReactionUser>[];
      repliesCount: number;
      replies: Array<ReturnType<typeof this.serializeComment>>;
      nextRepliesCursor: string | null;
      canEdit: boolean;
      canDelete: boolean;
    },
  ) {
    const createdAt = this.normalizeDate(comment.createdAt as unknown);
    const updatedAt = this.normalizeDate(comment.updatedAt as unknown, createdAt);

    return {
      id: Number(comment.id),
      postId: Number(comment.postId),
      userId: Number(comment.userId),
      parentId: comment.parentId ? Number(comment.parentId) : null,
      content: comment.content,
      createdAt,
      updatedAt,
      user: comment.user
        ? {
            id: Number(comment.user.id),
            firstName: comment.user.firstName,
            lastName: comment.user.lastName,
            email: comment.user.email,
            avatarUrl: comment.user.avatarUrl ?? null,
          }
        : null,
      likesCount: extras.likesCount,
      isLiked: extras.isLiked,
      currentReactionType: extras.currentReactionType,
      reactionUsers: extras.reactionUsers,
      repliesCount: extras.repliesCount,
      replies: extras.replies,
      nextRepliesCursor: extras.nextRepliesCursor,
      canEdit: extras.canEdit,
      canDelete: extras.canDelete,
    };
  }

  private serializeReactionUser(reaction: Reaction) {
    return {
      id: reaction.user.id,
      firstName: reaction.user.firstName,
      lastName: reaction.user.lastName,
      email: reaction.user.email,
      avatarUrl: reaction.user.avatarUrl ?? null,
      reactionType: reaction.reactionType,
    };
  }

  private normalizeDate(value: unknown, fallback = new Date()) {
    return value instanceof Date ? value : fallback;
  }

  private async getReactionCounts(commentIds: number[]): Promise<ReactionCountRow[]> {
    if (commentIds.length === 0) {
      return [];
    }

    return (await this.reactionModel.findAll({
      attributes: ['targetId', [fn('COUNT', col('id')), 'count']],
      where: {
        targetType: REACTION_TARGET_TYPE.COMMENT,
        targetId: { [Op.in]: commentIds },
      },
      group: ['targetId'],
      raw: true,
    })) as unknown as ReactionCountRow[];
  }

  private async getLikedRows(userId: number, commentIds: number[]): Promise<LikedRow[]> {
    if (commentIds.length === 0) {
      return [];
    }

    return (await this.reactionModel.findAll({
      attributes: ['targetId', 'reactionType'],
      where: {
        userId,
        targetType: REACTION_TARGET_TYPE.COMMENT,
        targetId: { [Op.in]: commentIds },
      },
      raw: true,
    })) as unknown as LikedRow[];
  }

  private async getReactionUsers(commentIds: number[]) {
    if (commentIds.length === 0) {
      return [];
    }

    return this.reactionModel.findAll({
      where: {
        targetType: REACTION_TARGET_TYPE.COMMENT,
        targetId: { [Op.in]: commentIds },
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
    });
  }

  private async getReplyCounts(parentIds: number[]): Promise<ReplyCountRow[]> {
    if (parentIds.length === 0) {
      return [];
    }

    return (await this.commentModel.findAll({
      attributes: ['parentId', [fn('COUNT', col('id')), 'count']],
      where: {
        parentId: { [Op.in]: parentIds },
      },
      group: ['parentId'],
      raw: true,
    })) as unknown as ReplyCountRow[];
  }

  private assertWriteRateLimit(userId: number, postId: number) {
    const key = `${userId}:${postId}`;
    const now = Date.now();
    const previous = CommentsService.commentWriteTimestamps.get(key);

    if (previous && now - previous < COMMENT_RATE_LIMIT_MS) {
      throw new HttpException(
        'You are commenting too quickly. Please wait a moment.',
        429,
      );
    }

    CommentsService.commentWriteTimestamps.set(key, now);
  }

  private async countCommentTreeSize(commentId: number) {
    let total = 0;
    let queue = [commentId];

    while (queue.length > 0) {
      total += queue.length;

      const children = await this.commentModel.findAll({
        attributes: ['id'],
        where: {
          parentId: {
            [Op.in]: queue,
          },
        },
        raw: true,
      });

      queue = children.map((item) => Number(item.id));
    }

    return total;
  }
}
