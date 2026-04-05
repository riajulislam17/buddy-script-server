import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, col, fn, WhereOptions } from 'sequelize';
import { POST_VISIBILITY } from '../../common/constants/post.constant';
import { REACTION_TARGET_TYPE } from '../../common/constants/reaction.constants';
import { buildReactionSummaryMaps } from '../../common/helpers/reaction-summary.helper';
import {
  decodeCursor,
  getNextCursor,
  normalizeLimit,
} from '../../common/utils/pagination.util';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Comment } from '../../model/comment.model';
import { Post } from '../../model/post.model';
import { Reaction } from '../../model/reaction.model';
import { User } from '../../model/user.model';
import { CreatePostDto } from './dto/create-post.dto';
import { GetFeedDto } from './dto/get-feed.dto';
import { UpdatePostDto } from './dto/update-post.dto';

interface CountRow {
  postId: number;
  count: string;
}

interface ReactionCountRow {
  targetId: number;
  count: string;
}

interface LikedRow {
  targetId: number;
  reactionType: string;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Comment) private readonly commentModel: typeof Comment,
    @InjectModel(Reaction) private readonly reactionModel: typeof Reaction,
  ) {}

  async createPost(user: AuthUser, payload: CreatePostDto) {
    const imageUrls = payload.imageUrls?.filter((url) => url.trim()) ?? [];

    if (imageUrls.length === 0 && payload.imageUrl?.trim()) {
      imageUrls.push(payload.imageUrl.trim());
    }

    const post = await this.postModel.create({
      userId: user.id,
      content: payload.content.trim(),
      imageUrls: imageUrls.length > 0 ? imageUrls : null,
      visibility: payload.visibility,
    } as unknown as Post);

    const createdPost = await this.postModel.findByPk(post.id, {
      include: [
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
    });

    return this.serializePost(createdPost ?? post, {
      commentsCount: 0,
      likesCount: 0,
      isLiked: false,
      currentReactionType: null,
      reactionUsers: [],
    });
  }

  async updatePost(user: AuthUser, postId: number, payload: UpdatePostDto) {
    const post = await this.postModel.findByPk(postId, {
      include: [
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    if (typeof payload.content === 'string') {
      post.content = payload.content.trim();
    }

    if (payload.visibility) {
      post.visibility = payload.visibility;
    }

    if (payload.imageUrls) {
      const imageUrls = payload.imageUrls
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 4);
      post.imageUrls = imageUrls.length > 0 ? imageUrls : null;
    }

    await post.save();

    return this.serializePost(post, {
      commentsCount: 0,
      likesCount: 0,
      isLiked: false,
      currentReactionType: null,
      reactionUsers: [],
    });
  }

  async deletePost(user: AuthUser, postId: number) {
    const post = await this.postModel.findByPk(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await post.destroy();
  }

  async getFeed(user: AuthUser, query: GetFeedDto) {
    return this.getPostsByVisibility(user, query, {
      [Op.or]: [
        { visibility: POST_VISIBILITY.PUBLIC },
        {
          visibility: POST_VISIBILITY.PRIVATE,
          userId: user.id,
        },
      ],
    });
  }

  async getPublicFeed(user: AuthUser, query: GetFeedDto) {
    return this.getPostsByVisibility(user, query, {
      visibility: POST_VISIBILITY.PUBLIC,
    });
  }

  async getMyPosts(user: AuthUser, query: GetFeedDto) {
    return this.getPostsByVisibility(user, query, {
      userId: user.id,
    });
  }

  private async getPostsByVisibility(
    user: AuthUser,
    query: GetFeedDto,
    visibilityWhere: WhereOptions,
  ) {
    const limit = normalizeLimit(query.limit);
    const decodedCursor = decodeCursor(query.cursor);

    const cursorWhere = decodedCursor
      ? {
          [Op.or]: [
            {
              createdAt: {
                [Op.lt]: new Date(decodedCursor.createdAt),
              },
            },
            {
              createdAt: new Date(decodedCursor.createdAt),
              id: {
                [Op.lt]: decodedCursor.id,
              },
            },
          ],
        }
      : {};

    const posts = await this.postModel.findAll({
      where: {
        [Op.and]: [visibilityWhere, cursorWhere],
      },
      include: [
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit,
    });

    const postIds = posts.map((post) => post.id);

    if (postIds.length === 0) {
      return {
        items: [],
        nextCursor: null,
      };
    }

    const [commentCounts, reactionCounts, likedRows, reactionUsers] =
      await Promise.all([
        this.getCommentCounts(postIds),
        this.getReactionCounts(postIds),
        this.getLikedRows(user.id, postIds),
        this.getReactionUsers(postIds),
      ]);

    const commentsCountMap = new Map(
      commentCounts.map((item) => [Number(item.postId), Number(item.count)]),
    );
    const { likesCountMap, currentReactionMap, reactionUsersMap } =
      buildReactionSummaryMaps(
        reactionCounts,
        likedRows,
        reactionUsers,
        this.serializeReactionUser,
      );

    const cursorItems = posts.map((post) => ({
      id: post.id,
      createdAt: this.normalizeDate(post.createdAt as unknown),
    }));

    return {
      items: posts.map((post) => {
        const postId = Number(post.id);

        return this.serializePost(post, {
          commentsCount: commentsCountMap.get(postId) ?? 0,
          likesCount: likesCountMap.get(postId) ?? 0,
          isLiked: currentReactionMap.has(postId),
          currentReactionType: currentReactionMap.get(postId) ?? null,
          reactionUsers: reactionUsersMap.get(postId) ?? [],
        });
      }),
      nextCursor: getNextCursor(cursorItems, limit),
    };
  }

  private serializePost(
    post: Post,
    extras: {
      commentsCount: number;
      likesCount: number;
      isLiked: boolean;
      currentReactionType: string | null;
      reactionUsers: ReturnType<typeof this.serializeReactionUser>[];
    },
  ) {
    const createdAt = this.normalizeDate(post.createdAt as unknown);
    const updatedAt = this.normalizeDate(post.updatedAt as unknown, createdAt);

    return {
      id: Number(post.id),
      userId: Number(post.userId),
      content: post.content,
      imageUrl: post.imageUrls?.[0] ?? null,
      imageUrls: post.imageUrls ?? [],
      visibility: post.visibility,
      createdAt,
      updatedAt,
      user: post.user
        ? {
            id: Number(post.user.id),
            firstName: post.user.firstName,
            lastName: post.user.lastName,
            email: post.user.email,
            avatarUrl: post.user.avatarUrl ?? null,
          }
        : null,
      commentsCount: extras.commentsCount,
      likesCount: extras.likesCount,
      isLiked: extras.isLiked,
      currentReactionType: extras.currentReactionType,
      reactionUsers: extras.reactionUsers,
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

  private async getCommentCounts(postIds: number[]): Promise<CountRow[]> {
    try {
      return (await this.commentModel.findAll({
        attributes: ['postId', [fn('COUNT', col('id')), 'count']],
        where: {
          postId: {
            [Op.in]: postIds,
          },
        },
        group: ['postId'],
        raw: true,
      })) as unknown as CountRow[];
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }

      throw error;
    }
  }

  private async getReactionCounts(
    postIds: number[],
  ): Promise<ReactionCountRow[]> {
    try {
      return (await this.reactionModel.findAll({
        attributes: ['targetId', [fn('COUNT', col('id')), 'count']],
        where: {
          targetType: REACTION_TARGET_TYPE.POST,
          targetId: {
            [Op.in]: postIds,
          },
        },
        group: ['targetId'],
        raw: true,
      })) as unknown as ReactionCountRow[];
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }

      throw error;
    }
  }

  private async getLikedRows(
    userId: number,
    postIds: number[],
  ): Promise<LikedRow[]> {
    try {
      return (await this.reactionModel.findAll({
        attributes: ['targetId', 'reactionType'],
        where: {
          userId,
          targetType: REACTION_TARGET_TYPE.POST,
          targetId: {
            [Op.in]: postIds,
          },
        },
        raw: true,
      })) as unknown as LikedRow[];
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }

      throw error;
    }
  }

  private async getReactionUsers(postIds: number[]) {
    try {
      return await this.reactionModel.findAll({
        where: {
          targetType: REACTION_TARGET_TYPE.POST,
          targetId: {
            [Op.in]: postIds,
          },
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
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }

      throw error;
    }
  }

  private isMissingRelationError(error: unknown) {
    return (
      error instanceof Error &&
      error.message.toLowerCase().includes('relation') &&
      error.message.toLowerCase().includes('does not exist')
    );
  }
}
