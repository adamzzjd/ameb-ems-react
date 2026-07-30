import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from '../useToast';

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('adds a toast via the toast function (sonner handles rendering)', () => {
    function TestComponent() {
      const { toast } = useToast();
      return <button onClick={() => toast('Hello!')}>Show Toast</button>;
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // The toast function should not throw when called
    expect(() => {
      act(() => {
        screen.getByText('Show Toast').click();
      });
    }).not.toThrow();
  });

  it('adds error toast without throwing', () => {
    function TestComponent() {
      const { toast } = useToast();
      return <button onClick={() => toast('Error!', true)}>Show Error</button>;
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(() => {
      act(() => {
        screen.getByText('Show Error').click();
      });
    }).not.toThrow();
  });

  it('can call toast multiple times without throwing', () => {
    function TestComponent() {
      const { toast } = useToast();
      return <button onClick={() => { toast('First'); toast('Second'); }}>Show</button>;
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(() => {
      act(() => {
        screen.getByText('Show').click();
      });
    }).not.toThrow();
  });

  it('throws when useToast is used outside provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');
  });
});
