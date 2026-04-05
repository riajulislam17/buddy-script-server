import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { successResponse } from '../../common/constants/response.helper';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { GetCommentsQueryDto } from './dto/get-comments-query.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('/')
  async createComment(
    @CurrentUser() user: AuthUser,
    @Body() payload: CreateCommentDto,
  ) {
    const comment = await this.commentsService.createComment(user, payload);

    return successResponse('Comment created successfully', comment);
  }

  @Get('post/:postId')
  async getPostComments(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Query() query: GetCommentsQueryDto,
  ) {
    const comments = await this.commentsService.getPostComments(
      user,
      Number(postId),
      query,
    );

    return successResponse('Comments fetched successfully', comments);
  }

  @Get(':commentId/replies')
  async getCommentReplies(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
    @Query() query: GetCommentsQueryDto,
  ) {
    const comments = await this.commentsService.getCommentReplies(
      user,
      Number(commentId),
      query,
    );

    return successResponse('Replies fetched successfully', comments);
  }

  @Patch(':commentId')
  async updateComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
    @Body() payload: UpdateCommentDto,
  ) {
    const comment = await this.commentsService.updateComment(
      user,
      Number(commentId),
      payload,
    );

    return successResponse('Comment updated successfully', comment);
  }

  @Delete(':commentId')
  async deleteComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.commentsService.deleteComment(user, Number(commentId));

    return successResponse('Comment deleted successfully', result);
  }
}
