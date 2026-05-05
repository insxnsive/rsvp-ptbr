import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseGuestWorkbook } from "../src/server/importGuests.js";

function workbookBuffer(rows: Array<Record<string, string>>): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Convidados");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("guest import", () => {
  it("parses valid Excel rows", () => {
    const preview = parseGuestWorkbook(
      workbookBuffer([
        { Convidados: "Ana Maria", Grupo: "Adulto" },
        { Convidados: "Lia", Grupo: "Criança" }
      ]),
      "guests.xlsx"
    );
    expect(preview.errors).toEqual([]);
    expect(preview.validRows).toEqual([
      { name: "Ana Maria", group: "adulto", rowNumber: 2 },
      { name: "Lia", group: "crianca", rowNumber: 3 }
    ]);
  });

  it("reports missing required columns", () => {
    const preview = parseGuestWorkbook(workbookBuffer([{ Nome: "Ana" }]), "guests.xlsx");
    expect(preview.errors.map((error) => error.field)).toContain("Grupo");
  });
});
