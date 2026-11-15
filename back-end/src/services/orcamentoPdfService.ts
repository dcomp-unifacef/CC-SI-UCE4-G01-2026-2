import PDFDocument from "pdfkit";

import * as orcamentoService from "./orcamentoService.ts";

import type { OrcamentoRespostaDto } from "../dto/orcamento/orcamentoRespostaDto.ts";

import { formatarReais } from "../utils/moeda.ts";
import { hoje } from "../utils/validators.ts";


export interface PdfDoOrcamento {
  nomeDoArquivo: string;
  conteudo: Buffer;
}


const MARGEM = 50;
const FONTE = "Helvetica";
const FONTE_NEGRITO = "Helvetica-Bold";
const ALTURA_DO_RODAPE = 30;
const ALTURA_DO_TOTAL = 40;

const COLUNAS = {
  nome: { x: 50, largura: 250 },
  quantidade: { x: 305, largura: 40 },
  unitario: { x: 350, largura: 95 },
  subtotal: { x: 450, largura: 95 },
};

const SITUACOES: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
};


function dataBrasileira(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
}


function limiteDaPagina(doc: PDFKit.PDFDocument): number {
  return doc.page.height - MARGEM - ALTURA_DO_RODAPE;
}


function cabecalhoDaTabela(doc: PDFKit.PDFDocument): void {
  const y = doc.y;

  doc.font(FONTE_NEGRITO).fontSize(10);

  doc.text("Procedimento", COLUNAS.nome.x, y, {
    width: COLUNAS.nome.largura,
    lineBreak: false,
  });
  doc.text("Qtd.", COLUNAS.quantidade.x, y, {
    width: COLUNAS.quantidade.largura,
    align: "right",
    lineBreak: false,
  });
  doc.text("Valor unit.", COLUNAS.unitario.x, y, {
    width: COLUNAS.unitario.largura,
    align: "right",
    lineBreak: false,
  });
  doc.text("Subtotal", COLUNAS.subtotal.x, y, {
    width: COLUNAS.subtotal.largura,
    align: "right",
    lineBreak: false,
  });

  doc
    .moveTo(MARGEM, y + 16)
    .lineTo(doc.page.width - MARGEM, y + 16)
    .stroke();

  doc.y = y + 22;
}


function linhaDoItem(
  doc: PDFKit.PDFDocument,
  item: OrcamentoRespostaDto["itens"][number]
): void {
  doc.font(FONTE).fontSize(10);

  const alturaDoNome = doc.heightOfString(item.nome_procedimento, {
    width: COLUNAS.nome.largura,
  });

  const altura = Math.max(alturaDoNome, 12) + 8;

  if (doc.y + altura > limiteDaPagina(doc)) {
    doc.addPage();
    cabecalhoDaTabela(doc);
    doc.font(FONTE).fontSize(10);
  }

  const y = doc.y;

  doc.text(item.nome_procedimento, COLUNAS.nome.x, y, {
    width: COLUNAS.nome.largura,
  });
  doc.text(String(item.quantidade), COLUNAS.quantidade.x, y, {
    width: COLUNAS.quantidade.largura,
    align: "right",
    lineBreak: false,
  });
  doc.text(formatarReais(item.valor_unitario_centavos), COLUNAS.unitario.x, y, {
    width: COLUNAS.unitario.largura,
    align: "right",
    lineBreak: false,
  });
  doc.text(formatarReais(item.subtotal_centavos), COLUNAS.subtotal.x, y, {
    width: COLUNAS.subtotal.largura,
    align: "right",
    lineBreak: false,
  });

  doc.y = y + altura;
}


function rotulo(doc: PDFKit.PDFDocument, titulo: string, valor: string): void {
  const y = doc.y;

  doc.font(FONTE_NEGRITO).fontSize(10).text(`${titulo}: `, MARGEM, y, {
    continued: true,
  });
  doc.font(FONTE).text(valor);
}


function desenhar(doc: PDFKit.PDFDocument, orcamento: OrcamentoRespostaDto): void {
  doc.font(FONTE_NEGRITO).fontSize(18).text("OdontoSystem", MARGEM, MARGEM);
  doc.font(FONTE).fontSize(13).text(`Orçamento nº ${orcamento.id}`);
  doc.moveDown(0.5);

  doc
    .moveTo(MARGEM, doc.y)
    .lineTo(doc.page.width - MARGEM, doc.y)
    .stroke();

  doc.moveDown(0.8);

  rotulo(doc, "Paciente", orcamento.paciente.nome);

  if (orcamento.dentista) {
    rotulo(doc, "Dentista responsável", orcamento.dentista.nome);
  }

  rotulo(doc, "Situação", SITUACOES[orcamento.situacao] ?? orcamento.situacao);
  rotulo(doc, "Emitido em", dataBrasileira(hoje()));

  if (orcamento.valido_ate !== null) {
    rotulo(doc, "Válido até", dataBrasileira(orcamento.valido_ate));
  }

  doc.moveDown(1);

  cabecalhoDaTabela(doc);

  for (const item of orcamento.itens) {
    linhaDoItem(doc, item);
  }

  if (doc.y + ALTURA_DO_TOTAL > limiteDaPagina(doc)) {
    doc.addPage();
  }

  const yDoTotal = doc.y + 4;

  doc
    .moveTo(MARGEM, yDoTotal)
    .lineTo(doc.page.width - MARGEM, yDoTotal)
    .stroke();

  doc.font(FONTE_NEGRITO).fontSize(12);

  doc.text("Total", COLUNAS.nome.x, yDoTotal + 8, {
    width: COLUNAS.nome.largura,
    lineBreak: false,
  });
  doc.text(
    formatarReais(orcamento.total_centavos),
    COLUNAS.unitario.x,
    yDoTotal + 8,
    {
      width: COLUNAS.unitario.largura + COLUNAS.subtotal.largura + 5,
      align: "right",
      lineBreak: false,
    }
  );

  const paginas = doc.bufferedPageRange();

  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(paginas.start + i);

    doc.page.margins.bottom = 0;

    doc
      .font(FONTE)
      .fontSize(9)
      .text(
        `Página ${i + 1} de ${paginas.count}`,
        MARGEM,
        doc.page.height - MARGEM,
        { width: doc.page.width - 2 * MARGEM, align: "center", lineBreak: false }
      );
  }
}


export async function gerar(id: number): Promise<PdfDoOrcamento> {
  const orcamento = await orcamentoService.findById(id);

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGEM,
    bufferPages: true,
    info: {
      Title: `Orçamento nº ${orcamento.id}`,
      Author: "OdontoSystem",
    },
  });

  const partes: Buffer[] = [];

  const conteudo = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (parte: Buffer) => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });

  desenhar(doc, orcamento);

  doc.end();

  return {
    nomeDoArquivo: `orcamento-${orcamento.id}.pdf`,
    conteudo: await conteudo,
  };
}
