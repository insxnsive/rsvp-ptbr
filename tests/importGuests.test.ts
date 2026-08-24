import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseGuestWorkbook } from "../src/server/importGuests.js";

async function workbookBuffer(rows: Array<Record<string, string>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Convidados");
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(headers.map((header) => row[header] ?? "")));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("guest import", () => {
  it("parses valid Excel rows", async () => {
    const preview = await parseGuestWorkbook(
      await workbookBuffer([
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

  it("defaults guests to the adult group when the optional group column is absent", async () => {
    const preview = await parseGuestWorkbook(await workbookBuffer([{ Nome: "Ana" }]), "guests.xlsx");

    expect(preview.errors).toEqual([]);
    expect(preview.validRows).toEqual([{ name: "Ana", group: "adulto", rowNumber: 2 }]);
  });

  it("parses UTF-8 CSV rows with quoted commas", async () => {
    const preview = await parseGuestWorkbook(
      Buffer.from('Convidados,Grupo\n"Silva, Ana",Adulto\nLia,Criança\n', "utf8"),
      "guests.csv"
    );

    expect(preview.errors).toEqual([]);
    expect(preview.validRows.map(({ name, group }) => ({ name, group }))).toEqual([
      { name: "Silva, Ana", group: "adulto" },
      { name: "Lia", group: "crianca" }
    ]);
  });

  it("parses semicolon-delimited CSV exported by PT-BR Excel", async () => {
    const preview = await parseGuestWorkbook(
      Buffer.from("Convidados;Grupo\nAna Maria;Adulto\nLia;Criança\n", "utf8"),
      "guests.csv"
    );

    expect(preview.errors).toEqual([]);
    expect(preview.validRows.map(({ name, group }) => ({ name, group }))).toEqual([
      { name: "Ana Maria", group: "adulto" },
      { name: "Lia", group: "crianca" }
    ]);
  });

  it("reports a missing name column", async () => {
    const preview = await parseGuestWorkbook(await workbookBuffer([{ Grupo: "Adulto" }]), "guests.xlsx");
    expect(preview.errors.map((error) => error.field)).toContain("Convidados");
  });
});
