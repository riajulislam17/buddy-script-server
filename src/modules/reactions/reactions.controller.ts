import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { successResponse } from '../../common/constants/response.helper';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetReactionUsersDto } from './dto/get-reaction-users.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { ReactionsService } from './reactions.service';

@Controller('reactions')
@UseGuards(JwtAuthGuard)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post('toggle')
  async toggleReaction(
    @CurrentUser() user: AuthUser,
    @Body() payload: ToggleReactionDto,
  ) {
    const reaction = await this.reactionsService.toggleReaction(user, payload);

    return successResponse('Reaction updated successfully', reaction);
  }

  @Get('users')
  async getReactionUsers(
    @CurrentUser() user: AuthUser,
    @Query() query: GetReactionUsersDto,
  ) {
    const users = await this.reactionsService.getReactionUsers(user, query);

    return successResponse('Reaction users fetched successfully', users);
  }
}
