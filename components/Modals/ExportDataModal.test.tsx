import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { ExportDataModal } from './ExportDataModal'

const defaultProps = {
  opened: true,
  onClose: vi.fn(),
  exportDataType: 'attempt' as const,
  quizTitle: 'My Test Quiz',
  includeIncomplete: false,
  onIncludeIncompleteChange: vi.fn(),
  onConfirm: vi.fn(),
  loading: false,
}

describe('ExportDataModal', () => {
  it('renders modal title "Confirm Data Export"', () => {
    renderWithProviders(<ExportDataModal {...defaultProps} />)
    expect(screen.getByText('Confirm Data Export')).toBeInTheDocument()
  })

  it('renders quiz title text', () => {
    renderWithProviders(<ExportDataModal {...defaultProps} />)
    expect(screen.getByText(/My Test Quiz/i)).toBeInTheDocument()
  })

  it('shows checkbox for attempt type', () => {
    renderWithProviders(
      <ExportDataModal {...defaultProps} exportDataType="attempt" />
    )
    expect(
      screen.getByText(/Include incomplete attempts/i)
    ).toBeInTheDocument()
  })

  it('shows checkbox for question type', () => {
    renderWithProviders(
      <ExportDataModal {...defaultProps} exportDataType="question" />
    )
    expect(
      screen.getByText(/Include incomplete attempts/i)
    ).toBeInTheDocument()
  })

  it('does NOT show checkbox for theta type', () => {
    renderWithProviders(
      <ExportDataModal {...defaultProps} exportDataType="theta" />
    )
    expect(
      screen.queryByText(/Include incomplete attempts/i)
    ).not.toBeInTheDocument()
  })

  it('calls onConfirm when Export button clicked', () => {
    const onConfirm = vi.fn()
    renderWithProviders(
      <ExportDataModal {...defaultProps} onConfirm={onConfirm} />
    )
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel button clicked', () => {
    const onClose = vi.fn()
    renderWithProviders(
      <ExportDataModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Export button shows loading state when loading=true', () => {
    renderWithProviders(
      <ExportDataModal {...defaultProps} loading={true} />
    )
    // When loading, the button should be in a loading/disabled state
    const exportButton = screen.getByRole('button', { name: /export/i })
    expect(exportButton).toBeDisabled()
  })
})
