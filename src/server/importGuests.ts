import * as XLSX from "xlsx";
import { normalizeGuestGroup, normalizeHeader } from "../shared/normalize.js";
import type { ImportGuestError, ImportGuestRow, ImportPreview } from "../shared/types.js";

const NAME_HEADERS = new Set(["convidados", "convidado", "nome", "nomedoconvidado"]);
const GROUP_HEADERS = new Set(["grupo", "tipo", "categoria"]);

type RawRow = Record<string, unknown>;

function asCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\0/g, "").trim();
}

export function parseGuestWorkbook(buffer: Buffer, filename: string): ImportPreview {
  const errors: ImportGuestError[] = [];
  let workbook: XLSX.WorkBook;

  const isCsv = /\.csv$/i.test(filename);

  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      raw: false,
      codepage: isCsv ? 65001 : undefined
    });
  } catch {
    return {
      validRows: [],
      errors: [{ rowNumber: 1, field: "Arquivo", message: `Nao foi possivel ler ${filename}.` }]
    };
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return {
      validRows: [],
      errors: [{ rowNumber: 1, field: "Arquivo", message: "Arquivo sem abas ou linhas." }]
    };
  }

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "", raw: false });
  if (rows.length === 0) {
    return {
      validRows: [],
      errors: [{ rowNumber: 1, field: "Arquivo", message: "Arquivo sem convidados." }]
    };
  }

  const headers = Object.keys(rows[0]);
  const nameHeader = headers.find((header) => NAME_HEADERS.has(normalizeHeader(header)));
  const groupHeader = headers.find((header) => GROUP_HEADERS.has(normalizeHeader(header)));

  if (!nameHeader) {
    errors.push({ rowNumber: 1, field: "Convidados", message: "Coluna Convidados e obrigatoria." });
  }
  if (!groupHeader) {
    errors.push({ rowNumber: 1, field: "Grupo", message: "Coluna Grupo e obrigatoria." });
  }
  if (!nameHeader || !groupHeader) {
    return { validRows: [], errors };
  }

  const validRows: ImportGuestRow[] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const name = asCell(row[nameHeader]);
    const groupRaw = asCell(row[groupHeader]);
    const group = normalizeGuestGroup(groupRaw);

    if (!name && !groupRaw) {
      return;
    }
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
