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
import { CreatePostDto } from './dto/create-post.dto';
import { GetFeedDto } from './dto/get-feed.dto';
import { PostsService } from './posts.service';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post('/')
  async createPost(
    @CurrentUser() user: AuthUser,
    @Body() payload: CreatePostDto,
  ) {
    const post = await this.postsService.createPost(user, payload);

    return successResponse('Post created successfully', post);
  }

  @Patch(':postId')
  async updatePost(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() payload: UpdatePostDto,
  ) {
    const post = await this.postsService.updatePost(
      user,
      Number(postId),
      payload,
    );

    return successResponse('Post updated successfully', post);
  }

  @Delete(':postId')
  async deletePost(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
  ) {
    await this.postsService.deletePost(user, Number(postId));

    return successResponse('Post deleted successfully');
  }

  @Get('feed')
  async getFeed(@CurrentUser() user: AuthUser, @Query() query: GetFeedDto) {
    const feed = await this.postsService.getFeed(user, query);

    return successResponse('Feed fetched successfully', feed);
  }

  @Get('me')
  async getMyPosts(@CurrentUser() user: AuthUser, @Query() query: GetFeedDto) {
    const feed = await this.postsService.getMyPosts(user, query);

    return successResponse('Own posts fetched successfully', feed);
  }

  @Get('public')
  async getPublicFeed(
    @CurrentUser() user: AuthUser,
    @Query() query: GetFeedDto,
  ) {
    const feed = await this.postsService.getPublicFeed(user, query);

    return successResponse('Public posts fetched successfully', feed);
  }
}
