import { Reaction } from '../../model/reaction.model';

interface ReactionCountRow {
  targetId: number;
  count: string;
}

interface LikedRow {
  targetId: number;
  reactionType: string;
}

export function buildReactionSummaryMaps(
  reactionCounts: ReactionCountRow[],
  likedRows: LikedRow[],
  reactions: Reaction[],
  serializeReactionUser: (reaction: Reaction) => {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    reactionType: string;
  },
) {
  const likesCountMap = new Map(
    reactionCounts.map((item) => [Number(item.targetId), Number(item.count)]),
  );
  const currentReactionMap = new Map(
    likedRows.map((item) => [Number(item.targetId), item.reactionType]),
  );
  const reactionUsersMap = new Map<
    number,
    ReturnType<typeof serializeReactionUser>[]
  >();

  for (const reaction of reactions) {
    const targetId = Number(reaction.targetId);
    const users = reactionUsersMap.get(targetId) ?? [];

    if (users.length >= 4 || !reaction.user) {
      continue;
    }

    users.push(serializeReactionUser(reaction));
    reactionUsersMap.set(targetId, users);
  }

  return {
    likesCountMap,
    currentReactionMap,
    reactionUsersMap,
  };
}
