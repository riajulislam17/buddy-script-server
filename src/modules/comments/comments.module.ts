import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Comment } from '../../model/comment.model';
import { Post } from '../../model/post.model';
import { Reaction } from '../../model/reaction.model';
import { User } from '../../model/user.model';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [SequelizeModule.forFeature([Comment, Post, Reaction, User])],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
