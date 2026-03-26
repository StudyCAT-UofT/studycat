import React from 'react'
import { vi } from 'vitest'
import { render, type RenderOptions } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { User, CourseOffering } from '@/lib/client-auth'
import type { Quiz, QuizItem, Feedback, FeedbackData, FeedbackLevel, Item, QuestionData } from '@/types'

// ─── Mock data factories ──────────────────────────────────────────────────────

export const makeUser = (overrides: Partial<User> = {}): User => ({
  userId: 'user-1',
  username: 'testuser',
  ...overrides,
})

export const makeCourseOffering = (
  overrides: Partial<CourseOffering> = {}
): CourseOffering => ({
  id: 'offering-1',
  display: 'CSC494 F24',
  course: { id: 'course-1', code: 'CSC494', title: 'Topics in Computer Science' },
  term: { id: 'term-1', name: 'Fall 2024' },
  role: 'STUDENT',
  ...overrides,
})

export const makeQuiz = (overrides: Partial<Quiz> = {}): Quiz => ({
  id: 'quiz-1',
  title: 'Test Quiz',
  description: null,
  fixedLength: 10,
  timeLimit: null,
  maxAttempts: null,
  modules: ['Module 1'],
  isActive: true,
  shuffled: false,
  feedbackVisibility: 'full' as FeedbackLevel,
  dueDate: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'user-1',
  stats: { totalAttempts: 0, averageScore: null, completionRate: null },
  quizModules: [],
  includedBlooms: [],
  ...overrides,
})

export const makeQuizItem = (overrides: Partial<QuizItem> = {}): QuizItem => ({
  item_id: 'item-1',
  skill: 'Module 1',
  stem: 'What is 2 + 2?',
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  figure_url: null,
  reference: null,
  ...overrides,
})

export const makeFeedback = (overrides: Partial<Feedback> = {}): Feedback => ({
  correctAnswerIndex: 0,
  selectedAnswerIndex: 0,
  isCorrect: true,
  justification: 'This is the correct answer.',
  ...overrides,
})

export const makeFeedbackData = (
  overrides: Partial<FeedbackData> = {}
): FeedbackData => ({
  attemptId: 'attempt-1',
  quizId: 'quiz-1',
  quizTitle: 'Test Quiz',
  status: 'completed',
  startedAt: '2024-01-01T00:00:00.000Z',
  finishedAt: '2024-01-01T00:30:00.000Z',
  totalTimeMs: 1_800_000,
  feedbackVisibility: 'full',
  questionsAttempted: 10,
  questionsCorrect: 7,
  questionsIncorrect: 3,
  percentage: 70,
  fixedLength: 10,
  modulePerformance: [],
  questions: [],
  canContinue: false,
  continueReason: null,
  ...overrides,
})

// ─── Auth / Course default mock values ───────────────────────────────────────

export const makeDefaultAuthValue = (overrides = {}) => ({
  user: makeUser(),
  loading: false,
  isAuthenticated: true,
  isAdmin: false as boolean | null,
  refreshUser: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

export const makeDefaultCourseValue = (overrides = {}) => ({
  selectedCourseOffering: makeCourseOffering(),
  setSelectedCourseOffering: vi.fn(),
  courseOfferings: [makeCourseOffering()],
  loading: false,
  refreshCourseOfferings: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

// ─── renderWithProviders ──────────────────────────────────────────────────────

function AllProviders({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>
}

/**
 * Renders a component wrapped in MantineProvider.
 * Tests should set up vi.mock for auth-context and course-context
 * at module level, then call makeDefaultAuthValue/makeDefaultCourseValue
 * in beforeEach to configure the mock return values.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// ─── Phase 2 factories ───────────────────────────────────────────────────────

export interface Student {
  id: string
  userId: string
  username: string
  givenName: string
  familyName: string
  enrolledAt: string
  hidden: boolean
  totalAttempts: number
  averageScore: number | null
  lastActivity: string | null
}

export const makeStudent = (overrides: Partial<Student> = {}): Student => ({
  id: 'enrollment-1',
  userId: 'user-1',
  username: 'jdoe',
  givenName: 'Jane',
  familyName: 'Doe',
  enrolledAt: '2024-01-01T00:00:00.000Z',
  hidden: false,
  totalAttempts: 0,
  averageScore: null,
  lastActivity: null,
  ...overrides,
})

export const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  externalQuestionId: 'Q001',
  moduleId: 'module-1',
  module: { id: 'module-1', name: 'Arrays' },
  bloom: 'REMEMBER',
  stem: 'What is an array?',
  reference: null,
  figureUrl: null,
  ptBi: null,
  average: null,
  attemptsCount: null,
  irtA: 1.0,
  irtB: 0.0,
  irtC: 0.25,
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  options: [
    { id: 'opt-1', label: 'A', text: 'Option A text', justification: 'Justification A', isCorrect: true },
    { id: 'opt-2', label: 'B', text: 'Option B text', justification: 'Justification B', isCorrect: false },
    { id: 'opt-3', label: 'C', text: 'Option C text', justification: 'Justification C', isCorrect: false },
    { id: 'opt-4', label: 'D', text: 'Option D text', justification: 'Justification D', isCorrect: false },
  ],
  ...overrides,
})

export const makeModule = (overrides: Partial<{ id: string; name: string }> = {}) => ({
  id: 'module-1',
  name: 'Arrays',
  ...overrides,
})

export interface AttemptData {
  userId: string
  username: string
  score: number
  questions: Array<{ questionId: string; stem: string; isCorrect: boolean }>
  startedAt: string
}

export const makeAttemptData = (overrides: Partial<AttemptData> = {}): AttemptData => ({
  userId: 'user-1',
  username: 'jdoe',
  score: 80,
  questions: [
    { questionId: 'q-1', stem: 'Q1 stem?', isCorrect: true },
    { questionId: 'q-2', stem: 'Q2 stem?', isCorrect: false },
  ],
  startedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const makeQuestionData = (overrides: Partial<QuestionData> = {}): QuestionData => ({
  questionId: 'Q001',
  itemId: 'item-1',
  stem: 'What is an array?',
  moduleName: 'Arrays',
  average: 0.7,
  numAttempts: 100,
  averageA: 0.7,
  averageB: 0.1,
  averageC: 0.1,
  averageD: 0.1,
  options: [
    { id: 'opt-1', label: 'A', text: 'Correct option', isCorrect: true },
    { id: 'opt-2', label: 'B', text: 'Wrong option B', isCorrect: false },
    { id: 'opt-3', label: 'C', text: 'Wrong option C', isCorrect: false },
    { id: 'opt-4', label: 'D', text: 'Wrong option D', isCorrect: false },
  ],
  ...overrides,
})

// Re-export everything from RTL so tests can import from one place
export * from '@testing-library/react'
