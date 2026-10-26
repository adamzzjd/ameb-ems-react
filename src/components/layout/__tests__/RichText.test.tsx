import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { RichText } from '../PublicShell';

function renderBody(text: string) {
  return render(
    <MemoryRouter>
      <RichText text={text} />
    </MemoryRouter>,
  );
}

describe('RichText', () => {
  it('renders paragraphs and bullets as before', () => {
    renderBody('First paragraph.\n\n- One\n- Two');
    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('turns [label](path) into an in-site link', () => {
    renderBody('Open the [PSN self-service portal](/self-service) to begin.');
    const link = screen.getByRole('link', { name: 'PSN self-service portal' });
    expect(link).toHaveAttribute('href', '/self-service');
    // The surrounding sentence stays in one paragraph with the link inside it.
    expect(link.closest('p')?.textContent).toBe('Open the PSN self-service portal to begin.');
  });

  it('links a bare URL as an external link, opening in a new tab', () => {
    renderBody('Visit https://asmeb.vercel.app/news for updates.');
    const link = screen.getByRole('link', { name: 'https://asmeb.vercel.app/news' });
    expect(link).toHaveAttribute('href', 'https://asmeb.vercel.app/news');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('links inside bullet points too', () => {
    renderBody('- Register at [a learning centre](/centres)\n- Call the board');
    expect(screen.getByRole('link', { name: 'a learning centre' })).toHaveAttribute('href', '/centres');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('never emits an anchor for an unsafe scheme', () => {
    renderBody('[click me](javascript:alert(1))');
    expect(screen.queryByRole('link')).toBeNull();
    // The words are shown as typed — no link, and nothing silently swallowed.
    expect(screen.getByText('[click me](javascript:alert(1))')).toBeInTheDocument();
  });

  it('leaves plain text untouched', () => {
    renderBody('No links here, just words.');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('No links here, just words.')).toBeInTheDocument();
  });
});
