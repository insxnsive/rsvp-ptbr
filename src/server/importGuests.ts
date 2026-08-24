import ExcelJS from "exceljs";
import { normalizeGuestGroup, normalizeHeader } from "../shared/normalize.js";
import type { ImportGuestError, ImportGuestRow, ImportPreview } from "../shared/types.js";

const NAME_HEADERS = new Set(["convidados", "convidado", "nome", "nomedoconvidado"]);
const GROUP_HEADERS = new Set(["grupo", "tipo", "categoria"]);
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 50;

type RawRow = Record<string, unknown>;
type ParsedRow = { rowNumber: number; values: RawRow };
type ParsedTable = { headers: string[]; rows: ParsedRow[] };

function asCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\0/g, "").trim();
}

function fileError(message: string): ImportPreview {
  return {
    validRows: [],
    errors: [{ rowNumber: 1, field: "Arquivo", message }]
  };
}

function parseCsvRows(buffer: Buffer): string[][] {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const headerLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = headerLine.split(";").length > headerLine.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (rows.length > MAX_ROWS) throw new Error("too-many-rows");
      continue;
    }
    cell += character;
  }

  if (quoted) throw new Error("unterminated-quote");
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function tableFromRows(rows: string[][]): ParsedTable {
  const headers = (rows[0] ?? []).map(asCell);
  if (headers.length > MAX_COLUMNS) throw new Error("too-many-columns");
  const parsedRows = rows.slice(1).map((values, index) => {
    const row: RawRow = {};
    headers.forEach((header, column) => {
      row[header] = values[column] ?? "";
    });
    return { rowNumber: index + 2, values: row };
  });
  return { headers, rows: parsedRows };
}

async function parseXlsx(buffer: Buffer): Promise<ParsedTable> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS declares an ArrayBuffer here, but its Node reader expects a Buffer at runtime.
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  if (sheet.rowCount > MAX_ROWS || sheet.columnCount > MAX_COLUMNS) {
    throw new Error("workbook-too-large");
  }

  const headerRow = sheet.getRow(1);
  const headers = Array.from({ length: sheet.columnCount }, (_, index) => asCell(headerRow.getCell(index + 1).text));
  const rows: ParsedRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const source = sheet.getRow(rowNumber);
    const values: RawRow = {};
    headers.forEach((header, index) => {
      values[header] = source.getCell(index + 1).text;
    });
    rows.push({ rowNumber, values });
  }
  return { headers, rows };
}

async function readTable(buffer: Buffer, filename: string): Promise<ParsedTable> {
  if (/\.csv$/i.test(filename)) return tableFromRows(parseCsvRows(buffer));
  if (/\.xlsx$/i.test(filename)) return parseXlsx(buffer);
  throw new Error("unsupported-file");
}

export async function parseGuestWorkbook(buffer: Buffer, filename: string): Promise<ImportPreview> {
  const errors: ImportGuestError[] = [];
  let table: ParsedTable;

  try {
    table = await readTable(buffer, filename);
  } catch {
    return fileError(`Nao foi possivel ler ${filename}. Use XLSX ou CSV.`);
  }

  if (table.headers.length === 0) {
    return fileError("Arquivo sem abas ou linhas.");
  }
  if (table.rows.length === 0) {
    return fileError("Arquivo sem convidados.");
  }

  const nameHeader = table.headers.find((header) => NAME_HEADERS.has(normalizeHeader(header)));
  const groupHeader = table.headers.find((header) => GROUP_HEADERS.has(normalizeHeader(header)));

  if (!nameHeader) {
    errors.push({ rowNumber: 1, field: "Convidados", message: "Coluna Convidados e obrigatoria." });
    return { validRows: [], errors };
  }

  const validRows: ImportGuestRow[] = [];
  table.rows.forEach(({ rowNumber, values }) => {
    const name = asCell(values[nameHeader]);
    const groupRaw = groupHeader ? asCell(values[groupHeader]) : "";
    const group = normalizeGuestGroup(groupRaw || "adulto");

    if (!name && !groupRaw) return;
    if (!name) {
      errors.push({ rowNumber, field: "Convidados", message: "Nome do convidado ausente." });
    }
    if (!group) {
      errors.push({ rowNumber, field: "Grupo", message: "Use Adulto ou Crianca." });
    }
    if (name && group) {
      validRows.push({ name, group, rowNumber });
    }
  });

  if (validRows.length === 0 && errors.length === 0) {
    errors.push({ rowNumber: 1, field: "Arquivo", message: "Nenhum convidado valido encontrado." });
  }

  return { validRows, errors };
}
