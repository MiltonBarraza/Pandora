import type { ComponentType, CSSProperties, ReactNode, SVGProps } from 'react';

import { AddCircleIcon, AddIcon, CloseCircleIcon, CloseIcon, CopyFilesIcon, DeleteFileIcon, DeleteTrashIcon, DownloadFileIcon, DownloadIcon, DuplicateFileIcon, DuplicateIcon, DuplicatePlusIcon, EditBoxIcon, EditBoxIcon2, EditBoxIcon3, EditBoxIcon4, EditSquareIcon, EditSquareIcon1, EditSquareIcon3, EditSquareIcon4, ErrorCircleIcon, ErrorOctagonIcon, ExportIcon, ExportTableIcon, ImportExcelIcon, ImportTableIcon, InfoCircleIcon, InfoMessageIcon, LightningCircleIcon, LightningIcon, LightningIcon2, LightningIcon3, ReadyBadgeIcon, ReadyCheckIcon, RemoveCircleIcon, SaveCheckIcon, SaveIcon, SettingsGearIcon, SettingsSlidersIcon, UploadFileIcon, UploadIcon, WarningCircleIcon, WarningTriangleIcon } from './icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const iconItems: Array<{ title: string; Icon: IconComponent }> = [
  { title: 'DeleteTrashIcon', Icon: DeleteTrashIcon },
  { title: 'RemoveCircleIcon', Icon: RemoveCircleIcon },
  { title: 'DeleteFileIcon', Icon: DeleteFileIcon },

  { title: 'DuplicateIcon', Icon: DuplicateIcon },
  { title: 'DuplicatePlusIcon', Icon: DuplicatePlusIcon },
  { title: 'SaveIcon', Icon: SaveIcon },
  { title: 'SaveCheckIcon', Icon: SaveCheckIcon },
  { title: 'AddIcon', Icon: AddIcon },
  { title: 'AddCircleIcon', Icon: AddCircleIcon },

  { title: 'ImportExcelIcon', Icon: ImportExcelIcon },
  { title: 'ImportTableIcon', Icon: ImportTableIcon },
  { title: 'ExportIcon', Icon: ExportIcon },
  { title: 'ExportTableIcon', Icon: ExportTableIcon },
  { title: 'DownloadIcon', Icon: DownloadIcon },
  { title: 'DownloadFileIcon', Icon: DownloadFileIcon },
  { title: 'UploadIcon', Icon: UploadIcon },
  { title: 'UploadFileIcon', Icon: UploadFileIcon },

  { title: 'ReadyCheckIcon', Icon: ReadyCheckIcon },
  { title: 'ReadyBadgeIcon', Icon: ReadyBadgeIcon },
  { title: 'ErrorCircleIcon', Icon: ErrorCircleIcon },
  { title: 'ErrorOctagonIcon', Icon: ErrorOctagonIcon },
  { title: 'WarningTriangleIcon', Icon: WarningTriangleIcon },
  { title: 'WarningCircleIcon', Icon: WarningCircleIcon },

  { title: 'InfoCircleIcon', Icon: InfoCircleIcon },
  { title: 'InfoMessageIcon', Icon: InfoMessageIcon },
  { title: 'SettingsGearIcon', Icon: SettingsGearIcon },
  { title: 'SettingsSlidersIcon', Icon: SettingsSlidersIcon },

  { title: 'LightningIcon', Icon: LightningIcon },
  { title: 'LightningIcon', Icon: LightningIcon2 },
  { title: 'LightningIcon', Icon: LightningIcon3 },
  { title: 'LightningCircleIcon', Icon: LightningCircleIcon },

  { title: 'EditSquareIcon', Icon: EditSquareIcon1 },
  { title: 'EditBoxIcon', Icon: EditBoxIcon2 },
  { title: 'EditSquareIcon', Icon: EditSquareIcon3 },
  { title: 'EditBoxIcon', Icon: EditBoxIcon3 },
  { title: 'EditSquareIcon', Icon: EditSquareIcon4 },
  { title: 'EditBoxIcon', Icon: EditBoxIcon4 },
  { title: 'EditSquareIcon', Icon: EditSquareIcon },
  { title: 'EditBoxIcon', Icon: EditBoxIcon },

  { title: 'DuplicateFileIcon', Icon: DuplicateFileIcon },
  { title: 'CopyFilesIcon', Icon: CopyFilesIcon },

  { title: 'CloseIcon', Icon: CloseIcon },
  { title: 'CloseCircleIcon', Icon: CloseCircleIcon },
];

const sizeVariants = [16, 24, 32, 48];

const colorVariants = [
  { label: 'Verde', color: 'var(--color-success-text)', background: 'var(--color-bg-surface)' },
  { label: 'Rojo', color: 'var(--color-danger-text)', background: 'var(--color-danger-bg)' },
  { label: 'Azul', color: 'var(--color-primary-bg)', background: 'var(--color-accent-bg-soft)' },
  { label: 'Oscuro', color: 'var(--color-bg-surface)', background: 'var(--color-text-primary)' },
];

export function IconsPreview() {
  return (
    <main style={pageStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>Iconos</h2>
        <p style={hintStyle}>
          Preview interno para probar SVG React con <code>currentColor</code>, <code>1em</code> y{' '}
          <code>fontSize</code>.
        </p>
      </div>

      <section style={gridStyle}>
        {iconItems.map(({ title, Icon }) => (
          <IconCard key={title} title={title}>
            <div style={sizeRowStyle}>
              {sizeVariants.map((size) => (
                <div key={size} style={sampleStyle}>
                  <span style={{ color: 'var(--color-primary-bg)', fontSize: size, lineHeight: 1 }}>
                    <Icon />
                  </span>
                  <small style={smallTextStyle}>{size}px</small>
                </div>
              ))}
            </div>

            <div style={colorRowStyle}>
              {colorVariants.map((variant) => (
                <div
                  key={variant.label}
                  title={`${variant.label}: ${variant.color}`}
                  style={{
                    ...colorSampleStyle,
                    background: variant.background,
                    color: variant.color,
                  }}
                >
                  <Icon />
                </div>
              ))}
            </div>
          </IconCard>
        ))}
      </section>
    </main>
  );
}

function IconCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article style={cardStyle}>
      <strong style={titleStyle}>{title}</strong>
      {children}
    </article>
  );
}

const pageStyle = {
  minHeight: '100vh',
  padding: 32,
} satisfies CSSProperties;

const headerStyle = {
  display: 'grid',
  gap: 8,
  marginBottom: 24,
} satisfies CSSProperties;

const hintStyle = {
  color: 'var(--color-text-muted)',
  margin: 0,
  maxWidth: 720,
} satisfies CSSProperties;

const gridStyle = {
  alignItems: 'stretch',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 18,
} satisfies CSSProperties;

const cardStyle = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 8,
  display: 'grid',
  gap: 16,
  minHeight: 190,
  padding: 16,
  width: 280,
} satisfies CSSProperties;

const titleStyle = {
  color: 'var(--color-text-primary)',
  fontSize: 14,
} satisfies CSSProperties;

const sizeRowStyle = {
  alignItems: 'end',
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
} satisfies CSSProperties;

const sampleStyle = {
  alignItems: 'center',
  display: 'grid',
  gap: 6,
  justifyItems: 'center',
  minHeight: 62,
} satisfies CSSProperties;

const smallTextStyle = {
  color: 'var(--color-text-muted)',
  fontSize: 11,
} satisfies CSSProperties;

const colorRowStyle = {
  display: 'grid',
  gap: 8,
  gridTemplateColumns: 'repeat(4, 40px)',
} satisfies CSSProperties;

const colorSampleStyle = {
  alignItems: 'center',
  border: '1px solid var(--color-border-default)',
  borderRadius: 8,
  display: 'inline-flex',
  fontSize: 24,
  height: 40,
  justifyContent: 'center',
  width: 40,
} satisfies CSSProperties;
