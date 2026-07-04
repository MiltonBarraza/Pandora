// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { FileNameSettings as FileNameSettingsType } from '../../types/import';
import { FileNameSettings } from './FileNameSettings';

afterEach(cleanup);

describe('FileNameSettings', () => {
  it('explains disabled time option until date is enabled', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect((screen.getByLabelText('Incluir hora actual') as HTMLInputElement).disabled).toBe(true);
    await user.hover(screen.getByText('Incluir hora actual'));
    expect(await screen.findByText('Primero activá ‘Incluir fecha actual’.')).not.toBeNull();

    await user.click(screen.getByLabelText('Incluir fecha actual'));

    expect((screen.getByLabelText('Incluir hora actual') as HTMLInputElement).disabled).toBe(false);
  });
});

function Harness() {
  const [settings, setSettings] = useState<FileNameSettingsType>({
    mode: 'default',
    customName: '',
    baseText: 'Lista limpia',
    includeBaseText: true,
    includeOriginalName: false,
    includeSheetName: false,
    includeDate: false,
    includeTime: false,
  });

  return (
    <FileNameSettings
      settings={settings}
      sourceFileName="origen.xlsx"
      sheetName="Datos"
      onChange={setSettings}
    />
  );
}
