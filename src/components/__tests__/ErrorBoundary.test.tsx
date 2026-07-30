import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Suppress console.error from React during error tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function Bomb({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('💥 Test error');
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders error fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('🔄 Try Again')).toBeInTheDocument();
    expect(screen.getByText('💥 Test error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('recovers after retry when error condition is resolved', () => {
    let shouldThrow = true;
    function ToggleBomb() {
      if (shouldThrow) throw new Error('💥');
      return <div>Recovered</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ToggleBomb />
      </ErrorBoundary>
    );
    // Should show error
    expect(screen.getByText('🔄 Try Again')).toBeInTheDocument();

    // Resolve the error condition
    shouldThrow = false;

    // Click retry to reset error boundary state
    fireEvent.click(screen.getByText('🔄 Try Again'));

    // Rerender to trigger component re-render
    rerender(
      <ErrorBoundary>
        <ToggleBomb />
      </ErrorBoundary>
    );

    // After retry, should show recovered content
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});
