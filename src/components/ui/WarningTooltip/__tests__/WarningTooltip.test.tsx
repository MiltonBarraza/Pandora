import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WarningTooltip } from '../WarningTooltip';

describe('WarningTooltip', () => {
  it('renders an accessible warning trigger without a native title', () => {
    vi.stubGlobal('document', { body: {} });
    const markup = renderToStaticMarkup(
      <WarningTooltip content="Este valor no parece una fecha válida. Valor guardado: 23" />,
    );

    expect(markup).toContain('warningTooltipTrigger');
    expect(markup).toContain('aria-label="Este valor no parece una fecha válida. Valor guardado: 23"');
    expect(markup).toContain('warningTooltipIcon');
    expect(markup).not.toContain('title=');
  });
});
