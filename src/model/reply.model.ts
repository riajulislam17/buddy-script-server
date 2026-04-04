import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Comment } from './comment.model';

@Table({
  tableName: 'replies',
  timestamps: true,
  indexes: [
    {
      fields: ['commentId'],
      name: 'idx_replies_comment_id',
    },
    {
      fields: ['userId'],
      name: 'idx_replies_user_id',
    },
  ],
})
export class Reply extends Model<Reply> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => Comment)
  @Index
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  declare commentId: number;

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

  @BelongsTo(() => Comment)
  declare comment: Comment;

  @BelongsTo(() => User)
  declare user: User;
}
