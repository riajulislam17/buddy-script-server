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
    {
      fields: ['parentId'],
      name: 'idx_comments_parent_id',
    },
    {
      fields: ['postId', 'parentId', 'createdAt', 'id'],
      name: 'idx_comments_post_parent_created_at_id',
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

  @ForeignKey(() => Comment)
  @Index
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  declare parentId: number | null;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare content: string;

  @BelongsTo(() => Post)
  declare post: Post;

  @BelongsTo(() => User)
  declare user: User;

  @BelongsTo(() => Comment, {
    foreignKey: 'parentId',
    as: 'parent',
  })
  declare parent?: Comment | null;

  @HasMany(() => Comment, {
    foreignKey: 'parentId',
    as: 'replies',
  })
  declare replies: Comment[];
}
