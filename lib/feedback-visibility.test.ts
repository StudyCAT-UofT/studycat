// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  answerFeedbackFor,
  presentedItemFor,
  reviewQuestionsFor,
  showsCorrectness,
  showsJustifications,
  toFeedbackLevel,
} from './feedback-visibility'
import type { DetailedQuestionReview, FeedbackLevel } from '@/types'

const feedback = { selectedAnswerIndex: 1, correctAnswerIndex: 0, isCorrect: false, justification: 'Because' }

const question = {
  questionNumber: 1,
  itemId: 'item-1',
  options: [
    { label: 'A', text: '4', justification: 'Right', isCorrect: true },
    { label: 'B', text: '3', justification: 'Wrong', isCorrect: false },
  ],
} as DetailedQuestionReview

describe('toFeedbackLevel', () => {
  it.each(['full', 'no-just', 'none'])('keeps %s', (level) => {
    expect(toFeedbackLevel(level)).toBe(level)
  })

  it.each([undefined, null, '', 'FULL', 'partial'])('fails closed to none for %j', (value) => {
    expect(toFeedbackLevel(value)).toBe('none')
  })
})

describe('level capabilities', () => {
  it.each<[FeedbackLevel, boolean, boolean]>([
    ['full', true, true],
    ['no-just', true, false],
    ['none', false, false],
  ])('%s: correctness %s, justifications %s', (level, correctness, justifications) => {
    expect(showsCorrectness(level)).toBe(correctness)
    expect(showsJustifications(level)).toBe(justifications)
  })
})

describe('answerFeedbackFor', () => {
  it('keeps everything for full', () => {
    expect(answerFeedbackFor('full', feedback)).toEqual(feedback)
  })

  it('drops the justification for no-just', () => {
    expect(answerFeedbackFor('no-just', feedback)).toEqual({ ...feedback, justification: null })
  })

  it('keeps only the selected answer for none', () => {
    expect(answerFeedbackFor('none', feedback)).toEqual({
      selectedAnswerIndex: 1,
      correctAnswerIndex: null,
      isCorrect: null,
      justification: null,
    })
  })
})

describe('presentedItemFor', () => {
  const item = { item_id: 'i', reference: 'Chapter 3' }

  it('keeps the reference for full', () => {
    expect(presentedItemFor('full', item)).toEqual(item)
  })

  it.each<FeedbackLevel>(['no-just', 'none'])('drops the reference for %s without mutating the item', (level) => {
    expect(presentedItemFor(level, item)).toEqual({ item_id: 'i', reference: null })
    expect(item.reference).toBe('Chapter 3')
  })

  it('passes through a missing item', () => {
    expect(presentedItemFor('none', undefined)).toBeUndefined()
  })
})

describe('reviewQuestionsFor', () => {
  it('keeps everything for full', () => {
    expect(reviewQuestionsFor('full', [question])).toEqual([question])
  })

  it('drops option justifications for no-just', () => {
    const [reviewed] = reviewQuestionsFor('no-just', [question])
    expect(reviewed.options.map((o) => o.justification)).toEqual([null, null])
    expect(reviewed.options.map((o) => o.isCorrect)).toEqual([true, false])
    expect(question.options[0].justification).toBe('Right')
  })

  it('returns no review for none', () => {
    expect(reviewQuestionsFor('none', [question])).toEqual([])
  })
})
