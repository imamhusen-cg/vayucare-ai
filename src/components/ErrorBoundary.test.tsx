import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Simulated component failure');
  }
  return <div>Safe Content</div>;
}

describe('ErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Healthy Application</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Healthy Application')).toBeDefined();
  });

  it('gracefully catches runtime exceptions and presents an accessible recovery alert', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Simulated component failure')).toBeDefined();
    expect(screen.getByText('Try Again')).toBeDefined();
    errorSpy.mockRestore();
  });
});
