import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import type {
  ReactionTargetType,
  ReactionType,
} from '../common/constants/reaction.constants';
import { User } from './user.model';

@Table({
  tableName: 'reactions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'targetType', 'targetId'],
      name: 'unique_user_target_reaction',
    },
    {
      fields: ['targetType', 'targetId'],
      name: 'idx_target_type_target_id',
    },
    {
      fields: ['userId'],
      name: 'idx_reactions_user_id',
    },
  ],
})
export class Reaction extends Model<Reaction> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  declare userId: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  declare targetType: ReactionTargetType;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  declare targetId: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'like',
  })
  declare reactionType: ReactionType;

  @BelongsTo(() => User)
  declare user: User;
}
