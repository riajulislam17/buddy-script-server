import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Post } from './post.model';
import { Reply } from './reply.model';

@Table({
  tableName: 'comments',
  timestamps: true,
  indexes: [
    {
      fields: ['postId'],
      name: 'idx_comments_post_id',
    },
    {
      fields: ['userId'],
      name: 'idx_comments_user_id',
    },
  ],
})
export class Comment extends Model<Comment> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => Post)
  @Index
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  declare postId: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  declare userId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare content: string;

  @BelongsTo(() => Post)
  declare post: Post;

  @BelongsTo(() => User)
  declare user: User;

  @HasMany(() => Reply)
  declare replies: Reply[];
}
