import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

interface PrescriptionData {
  clinic_name: string;
  doctor_name: string;
  patient_name: string;
  date: string;
  diagnosis: string;
  treatment_plan: string;
  medications?: Array<{ name: string; dosage: string; frequency: string }>;
  additional_notes?: string;
  vitals?: Record<string, any>;
}

@Injectable()
export class PdfGeneratorService {
  async generatePrescriptionPdf(data: PrescriptionData): Promise<Buffer> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      </head>
      <body class="bg-white p-8 font-sans">
        <div class="max-w-2xl mx-auto">
          <div class="border-b-2 border-blue-600 pb-4 mb-6">
            <h1 class="text-2xl font-bold text-blue-600">${this.escapeHtml(data.clinic_name)}</h1>
            <p class="text-gray-500 text-sm">Receta y expediente clínico</p>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p class="text-sm text-gray-500">Paciente</p>
              <p class="font-semibold">${this.escapeHtml(data.patient_name)}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Doctor</p>
              <p class="font-semibold">${this.escapeHtml(data.doctor_name)}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Fecha</p>
              <p class="font-semibold">${this.escapeHtml(data.date)}</p>
            </div>
          </div>

          ${
            data.vitals
              ? `
          <div class="mb-6 bg-gray-50 p-4 rounded">
            <h3 class="font-semibold text-gray-700 mb-2">Signos vitales</h3>
            <pre class="text-sm">${this.escapeHtml(JSON.stringify(data.vitals, null, 2))}</pre>
          </div>`
              : ''
          }

          <div class="mb-6">
            <h3 class="font-semibold text-gray-700 mb-2">Diagnóstico</h3>
            <p class="text-gray-600">${this.escapeHtml(data.diagnosis)}</p>
          </div>

          <div class="mb-6">
            <h3 class="font-semibold text-gray-700 mb-2">Plan de tratamiento</h3>
            <p class="text-gray-600">${this.escapeHtml(data.treatment_plan)}</p>
          </div>

          ${
            data.medications?.length
              ? `
          <div class="mb-6">
            <h3 class="font-semibold text-gray-700 mb-2">Medicamentos prescritos</h3>
            <div class="space-y-3">
              ${data.medications
                .map(
                  (medication) => `
                <div class="rounded border border-gray-200 p-3">
                  <p class="font-semibold text-gray-800">${this.escapeHtml(medication.name)}</p>
                  <p class="text-sm text-gray-600">Dosis: ${this.escapeHtml(medication.dosage)}</p>
                  <p class="text-sm text-gray-600">Frecuencia: ${this.escapeHtml(medication.frequency)}</p>
                </div>`,
                )
                .join('')}
            </div>
          </div>`
              : ''
          }

          ${
            data.additional_notes
              ? `
          <div class="mb-6">
            <h3 class="font-semibold text-gray-700 mb-2">Notas adicionales</h3>
            <p class="text-gray-600">${this.escapeHtml(data.additional_notes)}</p>
          </div>`
              : ''
          }

          <div class="mt-12 pt-4 border-t text-center text-xs text-gray-400">
            <p>Documento generado digitalmente por la clínica para uso clínico.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
