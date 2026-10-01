import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const baseUrl = `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || '3001'}`;
async function json(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return response.json();
}

assert.deepEqual(await json('/health'), { status: 'ok', database: 'ok' });
const clinic = await json('/public/clinics/clinica-demo');
assert.ok(clinic.id);
const login = await json('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@clinica.cr', password: process.env.DEMO_ADMIN_PASSWORD }),
});
assert.ok(login.access_token);
assert.ok(login.memberships.some((item) => item.clinic_slug === 'clinica-demo'));
const patients = await json('/patients', {
  headers: { Authorization: `Bearer ${login.access_token}`, 'x-clinic-id': clinic.id },
});
assert.ok(patients.data.length > 0);

const require = createRequire('/opt/citabox/current/package.json');
const { PdfGeneratorService } = require('/opt/citabox/current/dist/src/pdf-generator/pdf-generator.service.js');
const pdf = await new PdfGeneratorService().generatePrescriptionPdf({
  clinic_name: 'Clinica Demo', doctor_name: 'Medico Demo', patient_name: 'Paciente Ficticio',
  date: 'Demo', diagnosis: 'Datos sinteticos de verificacion', treatment_plan: 'Prueba del generador PDF',
});
assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
console.log(`Runtime verified: database, login, patients, PDF (${pdf.length} bytes).`);
