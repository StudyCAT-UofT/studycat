import {
  feedbackLevels,
  type DetailedQuestionReview,
  type Feedback,
  type FeedbackLevel,
  type QuizItem,
} from '@/types'

/**
 * Server-side enforcement of a quiz's feedbackVisibility setting.
 *
 * The quiz UI only renders what each level allows, but API responses are visible to
 * students in their browser's developer tools, so the routes strip anything the level
 * hides before responding:
 *
 *   full     correctness, correct answer, justifications and references
 *   no-just  correctness and correct answer; no justifications (nor the reference while
 *            answering)
 *   none     nothing about whether an answer was right; the results screen shows only
 *            the overall score and module performance
 */

const knownLevels = new Set<string>(Object.values(feedbackLevels))

/** Unknown values fail closed to the most restrictive level. */
export const toFeedbackLevel = (value: string | null | undefined): FeedbackLevel =>
  value && knownLevels.has(value) ? (value as FeedbackLevel) : (feedbackLevels.NONE as FeedbackLevel)

export const showsCorrectness = (level: FeedbackLevel) =>
  level === feedbackLevels.FULL || level === feedbackLevels.NO_JUST

export const showsJustifications = (level: FeedbackLevel) => level === feedbackLevels.FULL

/** Feedback returned right after answering a question. */
export function answerFeedbackFor(level: FeedbackLevel, feedback: Feedback): Feedback {
  return {
    selectedAnswerIndex: feedback.selectedAnswerIndex,
    correctAnswerIndex: showsCorrectness(level) ? feedback.correctAnswerIndex : null,
    isCorrect: showsCorrectness(level) ? feedback.isCorrect : null,
    justification: showsJustifications(level) ? feedback.justification : null,
  }
}

/**
 * An item about to be presented. Its reference is only displayed with full feedback, after
 * answering, so it is not sent otherwise.
 */
export function presentedItemFor<T extends Pick<QuizItem, 'reference'>>(level: FeedbackLevel, item: T): T
export function presentedItemFor<T extends Pick<QuizItem, 'reference'>>(level: FeedbackLevel, item: T | undefined): T | undefined
export function presentedItemFor<T extends Pick<QuizItem, 'reference'>>(level: FeedbackLevel, item: T | undefined) {
  if (!item || showsJustifications(level)) return item
  return { ...item, reference: null }
}

/** The question-by-question review on the results screen. */
export function reviewQuestionsFor(level: FeedbackLevel, questions: DetailedQuestionReview[]): DetailedQuestionReview[] {
  if (!showsCorrectness(level)) return []
  if (showsJustifications(level)) return questions
  return questions.map((question) => ({
    ...question,
    options: question.options.map((option) => ({ ...option, justification: null })),
  }))
}
