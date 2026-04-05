import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../decorators/current-user.decorator';
import { Comment } from '../../model/comment.model';
import { Post } from '../../model/post.model';

export async function getAccessiblePostOrThrow(
  postModel: typeof Post,
  user: AuthUser,
  postId: number,
) {
  const post = await postModel.findByPk(postId);

  if (!post) {
    throw new NotFoundException('Post not found');
  }

  if (post.visibility === 'private' && post.userId !== user.id) {
    throw new ForbiddenException('You cannot access another user private post');
  }

  return post;
}

export async function getAccessibleCommentOrThrow(
  commentModel: typeof Comment,
  postModel: typeof Post,
  user: AuthUser,
  commentId: number,
) {
  const comment = await commentModel.findByPk(commentId, {
    include: [{ model: postModel, attributes: ['id', 'userId', 'visibility'] }],
  });

  if (!comment) {
    throw new NotFoundException('Comment not found');
  }

  const post = comment.post;

  if (!post) {
    throw new NotFoundException('Post not found');
  }

  if (post.visibility === 'private' && post.userId !== user.id) {
    throw new ForbiddenException(
      'You cannot access another user private post comment',
    );
  }

  return comment;
}
