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
    figure_url?: string | null
    reference?: string | null
}

// Quiz Attempt Interfaces
export interface Feedback {
    correctAnswerIndex: number
    selectedAnswerIndex: number
    isCorrect: boolean
    justification: string | null
}

export interface InitAttemptRequest {
    quizId: string
    concepts?: string[]
    priorMu?: number
    priorSigma2?: number
}

export interface InitAttemptResponse {
    attemptId: string
    quizId: string
    enrollmentId: string
    theta: Record<string, number>
    nextItem?: QuizItem
    nextAction: string
    startedAt: string
}

export interface StepAttemptRequest {
    attemptId: string
    itemId: string
    answerIndex: number
    responseTimeMs?: number
}

export interface StepAttemptResponse {
    attemptId: string
    theta: Record<string, number>
    mastery: Record<string, boolean>
    nextAction: string
    nextItem?: QuizItem
    isFinished: boolean
    feedback?: Feedback
}

export interface AttemptResultsResponse {
    attemptId: string
    totalQuestions: number
    correctAnswers: number
    percentage: number
    responses: Array<{
        id: string
        itemId: string
        selectedLabel: string
        isCorrect: boolean
        answeredAt: string
    }>
}

export interface QuizResults {
    attemptId: string
    totalQuestions: number
    correctAnswers: number
    percentage: number
}

// Quiz Feedback Interfaces
export interface ModulePerformance {
    moduleId: string
    moduleName: string
    theta: number
    performanceLevel: 'Developing' | 'Proficient' | 'Advanced'
    performanceValue: number // 0-100 scale for visualization
    questionsAttempted: number
    questionsCorrect: number
}

export interface DetailedQuestionReview {
    questionNumber: number
    itemId: string
    moduleId: string
    moduleName: string
    bloomLevel: string
    stem: string
    figureUrl: string | null
    reference: string | null
    selectedAnswerIndex: number
    correctAnswerIndex: number
    isCorrect: boolean
    options: Array<{
        label: string
        text: string
        justification: string | null
        isCorrect: boolean
    }>
    answeredAt: string
    responseTimeMs: number
}

export interface FeedbackData {
    attemptId: string
    quizId: string
    quizTitle: string
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
    startedAt: string
    finishedAt: string | null
    totalTimeMs: number
    
    // Performance summary
    questionsAttempted: number
    questionsCorrect: number
    questionsIncorrect: number
    percentage: number
    fixedLength: number
    
    // Module performance for spiderweb plot
    modulePerformance: ModulePerformance[]
    
    // Detailed question review
    questions: DetailedQuestionReview[]
    
    // Continue quiz logic
    canContinue: boolean
    continueReason: 'not_started' | 'in_progress' | 'reached_limit' | 'completed' | null
}