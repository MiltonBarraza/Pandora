// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MultipleFileUploader } from './MultipleFileUploader';

afterEach(cleanup);

describe('MultipleFileUploader', () => {
  it('shows processing feedback and disables selection', () => {
    const { container } = render(
      <MultipleFileUploader
        disabled
        statusText="Procesando 3 archivos..."
        onFilesSelected={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Leyendo archivos/ }).getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Procesando 3 archivos...')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(true);
  });
});
