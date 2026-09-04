import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export type Column = { header: string; key: string; width?: number };

/** Builds a single-sheet .xlsx from column defs + plain row objects and
 * returns it as a downloadable Response. Every export route uses this so
 * the file format stays consistent across datasets. */
export async function buildXlsxResponse(
  filename: string,
  sheetName: string,
  columns: Column[],
  rows: Record<string, unknown>[]
): Promise<NextResponse> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
