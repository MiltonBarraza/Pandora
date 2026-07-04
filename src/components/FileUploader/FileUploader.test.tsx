// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileUploader } from './FileUploader';

afterEach(cleanup);

describe('FileUploader', () => {
  it('shows processing feedback and disables file actions', () => {
    const { container } = render(
      <FileUploader
        fileName=""
        isProcessing
        onFileSelected={vi.fn()}
        onFileRemoved={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Elegir archivo/ }).getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Procesando archivo...')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(true);
  });
});
