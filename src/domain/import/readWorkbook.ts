import * as XLSX from 'xlsx';

export async function readWorkbook(data: ArrayBuffer): Promise<XLSX.WorkBook> {
  return XLSX.read(data, { type: 'array', cellDates: true, cellStyles: true });
}
