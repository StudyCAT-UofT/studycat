export const BLOOM = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'] as const
export type BloomLevel = (typeof BLOOM)[number]

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const
export type OptionLabel = (typeof OPTION_LABELS)[number]

export type AbilityPersona = 'WEAK' | 'AVERAGE' | 'STRONG'

export const PERSONA_CORRECT_RATE: Record<AbilityPersona, number> = {
  WEAK: 0.40,
  AVERAGE: 0.60,
  STRONG: 0.80,
}

export const PERSONA_FINAL_THETA: Record<AbilityPersona, [number, number]> = {
  WEAK: [-0.8, -0.3],
  AVERAGE: [-0.1, 0.4],
  STRONG: [0.6, 1.2],
}

export interface ItemDef {
  moduleKey: string
  externalQuestionId: string
  bloom: BloomLevel
  stem: string
  reference?: string
  irtA: number
  irtB: number
  irtC: number
  options: {
    label: OptionLabel
    text: string
    justification?: string
    isCorrect: boolean
  }[]
}

/** Seeded user personas with their ability level */
export interface StudentDef {
  username: string
  givenName: string
  familyName: string
  persona: AbilityPersona
}

export function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function randInt(min: number, max: number): number {
  return Math.floor(randBetween(min, max + 1))
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
