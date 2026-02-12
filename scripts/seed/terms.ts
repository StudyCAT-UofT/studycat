import { PrismaClient, Term } from '@prisma/client'

export const TERM_DEFS = [
  {
    name: 'Fall 2024',
    startDate: new Date('2024-09-03'),
    endDate: new Date('2024-12-15'),
  },
  {
    name: 'Winter 2025',
    startDate: new Date('2025-01-06'),
    endDate: new Date('2025-04-15'),
  },
]

export async function seedTerms(prisma: PrismaClient): Promise<Map<string, Term>> {
  console.log('📅 Seeding terms...')
  const terms = new Map<string, Term>()
  for (const def of TERM_DEFS) {
    const term = await prisma.term.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    })
    terms.set(term.name, term)
  }
  console.log(`  Created ${terms.size} terms`)
  return terms
}
