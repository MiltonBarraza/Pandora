import { writeFileSync } from 'node:fs';

export const invalidXlsxBytes = Buffer.from([
  0x50, 0x4b, 0x03, 0x04, 0x14,
  0x00, 0x00, 0x00, 0x00, 0x00,
]);

export function writeInvalidXlsx(filePath: string) {
  writeFileSync(filePath, invalidXlsxBytes);
}
