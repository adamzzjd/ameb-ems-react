import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with default variant and size', () => {
    render(<Button>Default</Button>);
    const btn = screen.getByText('Default');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.className).toContain('bg-primary');
  });

  it('renders with gold variant', () => {
    render(<Button variant="gold">Gold</Button>);
    const btn = screen.getByText('Gold');
    expect(btn.className).toContain('bg-gold');
  });

  it('renders with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByText('Delete');
    expect(btn.className).toContain('bg-destructive');
  });

  it('renders as disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByText('Disabled');
    expect(btn).toBeDisabled();
  });

  it('renders with custom className', () => {
    render(<Button className="custom-class">Styled</Button>);
    const btn = screen.getByText('Styled');
    expect(btn.className).toContain('custom-class');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByText('Small').className).toContain('h-9');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByText('Large').className).toContain('h-11');
  });
});
