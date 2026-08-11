import type { MajorArcanaId } from '../engine/types/tarot'

/** Plain-language summaries of what each Major Arcana actually does, for display wherever a card is shown. */
export const MAJOR_ARCANA_DESCRIPTIONS: Record<MajorArcanaId, string> = {
  FOOL: 'Hold, then play anytime to swap the A/B operands of a pending spell before it resolves.',
  MAGICIAN: 'Exchange one Logic card and one Effect card with a chosen opponent.',
  HIGH_PRIESTESS: 'Hold, then play with a build on your turn: the new structure enters at level 3 (2 for a Fortress).',
  EMPRESS: 'Hold, then play anytime to reinterpret one terrain as another for a pending spell.',
  EMPEROR: 'Hold, then play anytime to cancel a pending spell or Major Arcana action before it resolves.',
  HIEROPHANT: "Hold, then play in response to a Randomize effect to set one target's level directly instead.",
  LOVERS: 'You name a VP level, the clockwise opponent names a terrain; cast a spell using those as operands.',
  CHARIOT: 'Redistribute the levels of all structures on one unfortified hex, keeping the total the same.',
  STRENGTH: 'Downgrade one of your structures by 1; downgrade every unfortified opponent structure of that same type by 1.',
  HERMIT: 'Discard the whole tarot row and search the deck for 3 replacements.',
  WHEEL: 'Randomize the levels of 3 chosen unfortressed structures.',
  JUSTICE: 'You name a terrain, the clockwise opponent names a VP level; cast a spell using those as operands.',
  HANGED_MAN: 'You name a terrain, the counter-clockwise opponent names a structure type; cast a spell using those as operands.',
  DEATH: 'Destroy every structure at level 2 or below, everywhere — even inside fortresses. Fortresses themselves survive.',
  TEMPERANCE: 'Every player above the lowest VP must downgrade or destroy their own structures until they match it exactly.',
  DEVIL: 'Two opponents each name a different condition; destroys all matching structures using one of your Logic cards (no Effect card).',
  TOWER: 'Sacrifice one of your structures (level X); destroy opponent structures totaling exactly X.',
  STAR: 'Every player below the highest VP may upgrade or build until they match it exactly.',
  MOON: 'You name a structure type, the counter-clockwise opponent names a terrain; cast a spell using those as operands.',
  SUN: 'You name a VP level, the counter-clockwise opponent names a structure type; cast a spell using those as operands.',
  JUDGEMENT: 'Minimize every structure on the board, including those inside fortresses.',
  WORLD: 'No cards played: name two conditions and a Logic rule yourself. Always applies Upgrade 1.',
}
