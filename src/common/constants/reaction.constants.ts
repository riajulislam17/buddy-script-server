export const REACTION_TARGET_TYPE = {
  POST: 'post',
  COMMENT: 'comment',
} as const;

export const REACTION_TYPE = {
  LIKE: 'like',
  HAHA: 'haha',
  LOVE: 'love',
} as const;

export type ReactionTargetType =
  (typeof REACTION_TARGET_TYPE)[keyof typeof REACTION_TARGET_TYPE];

export type ReactionType = (typeof REACTION_TYPE)[keyof typeof REACTION_TYPE];
