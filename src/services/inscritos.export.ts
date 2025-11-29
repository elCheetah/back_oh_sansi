import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { listarInscritosSrv } from "./inscritos.service";
import { InscritoDTO } from "../types/inscritos.types";

export async function exportarInscritosExcelSrv(q: any) {
  const { data } = await listarInscritosSrv(q);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inscritos");

  ws.addRow([
    "#",
    "Nombre Completo",
    "CI",
    "Unidad Educativa",
    "Modalidad",
    "Departamento",
    "Área",
    "Nivel",
    "Tutor Legal",
  ]);

  data.forEach((i: InscritoDTO, idx: number) => {
    ws.addRow([
      idx + 1,
      i.olimpista?.nombreCompleto ?? i.equipo?.nombre ?? "",
      i.olimpista?.ci ?? "",
      i.olimpista?.unidadEducativa ??
        i.equipo?.unidadEducativa ??
        "",
      i.modalidad === "INDIVIDUAL" ? "Individual" : "Grupal",
      i.olimpista?.departamento ?? i.equipo?.departamento ?? "",
      i.area.nombre,
      i.nivel.nombre,
      i.tutorLegal?.nombreCompleto ?? "",
    ]);
  });

  return wb.xlsx.writeBuffer();
}

export async function exportarInscritosPdfSrv(q: any) {
  const { data } = await listarInscritosSrv(q);
  const doc = new PDFDocument({ margin: 32 });
  const chunks: Buffer[] = [];

  doc.on("data", (c: Buffer) => chunks.push(c));
  const end = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  );

  doc.fontSize(14).text("Lista de Olímpistas Inscritos", { align: "left" }).moveDown();

  data.forEach((i: InscritoDTO, idx: number) => {
    doc
      .fontSize(10)
      .text(
        `${idx + 1}. ${
          i.olimpista?.nombreCompleto ?? i.equipo?.nombre
        } | CI: ${i.olimpista?.ci ?? "-"} | UE: ${
          i.olimpista?.unidadEducativa ??
          i.equipo?.unidadEducativa ??
          "-"
        } | ${
          i.modalidad === "INDIVIDUAL" ? "Individual" : "Grupal"
        } | ${i.area.nombre} / ${i.nivel.nombre} | Tutor: ${
          i.tutorLegal?.nombreCompleto ?? "-"
        }`
      );
  });

  doc.end();
  return end;
}
