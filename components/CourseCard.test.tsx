import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { CourseCard } from './CourseCard'
import { renderWithProviders, makeCourseOffering } from '@/test-utils'

describe('CourseCard', () => {
  it('renders the course display code', () => {
    const offering = makeCourseOffering({ display: 'CSC494 F24' })
    renderWithProviders(<CourseCard courseOffering={offering} onClick={vi.fn()} />)
    expect(screen.getByText('CSC494 F24')).toBeInTheDocument()
  })

  it('renders the course title', () => {
    const offering = makeCourseOffering({
      course: { id: 'c-1', code: 'CSC494', title: 'Topics in Computer Science' },
    })
    renderWithProviders(<CourseCard courseOffering={offering} onClick={vi.fn()} />)
    expect(screen.getByText('Topics in Computer Science')).toBeInTheDocument()
  })

  it('renders the role badge with formatted role text', () => {
    const offering = makeCourseOffering({ role: 'INSTRUCTOR' })
    renderWithProviders(<CourseCard courseOffering={offering} onClick={vi.fn()} />)
    expect(screen.getByText('Instructor')).toBeInTheDocument()
  })

  it('formats STUDENT role correctly', () => {
    const offering = makeCourseOffering({ role: 'STUDENT' })
    renderWithProviders(<CourseCard courseOffering={offering} onClick={vi.fn()} />)
    expect(screen.getByText('Student')).toBeInTheDocument()
  })

  it('formats TA role correctly', () => {
    const offering = makeCourseOffering({ role: 'TA' })
    renderWithProviders(<CourseCard courseOffering={offering} onClick={vi.fn()} />)
    expect(screen.getByText('Ta')).toBeInTheDocument()
  })

  it('calls onClick when the card is clicked', () => {
    const handleClick = vi.fn()
    const offering = makeCourseOffering()
    renderWithProviders(<CourseCard courseOffering={offering} onClick={handleClick} />)

    fireEvent.click(screen.getByText('CSC494 F24'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
