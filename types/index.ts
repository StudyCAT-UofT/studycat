export interface Item {
    id: string
    externalQuestionId: string
    moduleId: string
    module: {
        id: string
        name: string
    }
    bloom: string
    stem: string
    reference: string | null
    figureUrl: string | null
    ptBi: number | null
    average: number | null
    attemptsCount: number | null
    irtA: number
    irtB: number
    irtC: number
    active: boolean
    createdAt: string
    options: Array<{
        id: string
        label: string
        text: string
        justification: string | null
        isCorrect: boolean
    }>
}

export interface Quiz {
    id: string
    title: string
    description: string | null
    modules: string[]
    module: string // Primary module for display
    fixedLength: number
    timeLimit: number | null // Not in schema but kept for compatibility
    maxAttempts: number | null // Not in schema but kept for compatibility
    isActive: boolean
    dueDate: string | null // Not in schema but kept for compatibility
    createdAt: string
    updatedAt: string
    createdBy: string
    stats: {
        totalAttempts: number
        averageScore: number | null
        completionRate: number | null
    }
    includedModules: string[]
    includedBlooms: string[]
}

export interface QuizItem {
    item_id: string
    skill: string
    stem: string
    options: string[]
}