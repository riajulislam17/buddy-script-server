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
import { Comment } from './comment.model';

@Table({
  tableName: 'posts',
  timestamps: true,
  indexes: [
    {
      fields: ['visibility'],
      name: 'idx_posts_visibility',
    },
    {
      fields: ['userId'],
      name: 'idx_posts_user_id',
    },
    {
      fields: ['createdAt', 'id'],
      name: 'idx_posts_created_at_id',
    },
  ],
})
export class Post extends Model<Post> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => User)
  @Index
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

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  declare imageUrls: string[] | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'public',
  })
  declare visibility: 'public' | 'private';

  @BelongsTo(() => User)
  declare user: User;

  @HasMany(() => Comment)
  declare comments: Comment[];
}
