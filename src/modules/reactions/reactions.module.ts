import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Post } from '../../model/post.model';
import { Reaction } from '../../model/reaction.model';
import { User } from '../../model/user.model';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [SequelizeModule.forFeature([Reaction, Post, User])],
  controllers: [ReactionsController],
  providers: [ReactionsService],
})
export class ReactionsModule {}
