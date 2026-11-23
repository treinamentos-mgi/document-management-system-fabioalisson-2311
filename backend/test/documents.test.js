const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Configuração precisa estar no ambiente antes de carregar o app (config lê as variáveis na importação).
const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_BYTES = '1024';

const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  server.close();
  fs.rmSync(storageDir, { recursive: true, force: true });
});

function uploadFile({ fieldName = 'file', name = 'contrato.txt', content = 'conteudo', owner } = {}) {
  const form = new FormData();
  form.append(fieldName, new Blob([content], { type: 'text/plain' }), name);
  const headers = owner ? { 'X-User-Id': owner } : {};
  return fetch(`${baseUrl}/upload`, { method: 'POST', body: form, headers });
}

function listDocuments(owner) {
  return fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': owner } });
}

test('POST /upload grava o arquivo com nome gerado e retorna metadados sem storedName', async () => {
  const response = await uploadFile({ name: 'relatório.txt', content: 'abc', owner: 'maria' });
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  assert.strictEqual(body.originalName, 'relatório.txt');
  assert.strictEqual(body.size, 3);
  assert.strictEqual(body.owner, 'maria');
  assert.ok(body.id);
  assert.ok(body.uploadedAt);
  assert.strictEqual(body.storedName, undefined);

  const storedFiles = fs.readdirSync(storageDir);
  assert.strictEqual(storedFiles.length, 1);
  assert.strictEqual(fs.readFileSync(path.join(storageDir, storedFiles[0]), 'utf8'), 'abc');
});

test('GET /documents lista apenas os documentos do usuário, do mais recente para o mais antigo', async () => {
  await uploadFile({ name: 'primeiro.txt', owner: 'joao' });
  await uploadFile({ name: 'segundo.txt', owner: 'joao' });
  await uploadFile({ name: 'de-outro.txt', owner: 'ana' });

  const response = await listDocuments('joao');
  const body = await response.json();

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(
    body.map((document) => document.originalName),
    ['segundo.txt', 'primeiro.txt'],
  );
});

test('GET /documents retorna lista vazia para usuário sem documentos', async () => {
  const response = await listDocuments('sem-documentos');

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), []);
});

test('GET /documents/:id/download devolve o conteúdo com Content-Type e Content-Disposition', async () => {
  const uploaded = await (await uploadFile({ name: 'relatório fiscal.txt', content: 'dados', owner: 'carla' })).json();

  const response = await fetch(`${baseUrl}/documents/${uploaded.id}/download`, {
    headers: { 'X-User-Id': 'carla' },
  });

  assert.strictEqual(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/plain/);
  assert.strictEqual(response.headers.get('content-length'), '5');
  assert.strictEqual(
    response.headers.get('content-disposition'),
    `attachment; filename="relat?rio fiscal.txt"; filename*=UTF-8''relat%C3%B3rio%20fiscal.txt`,
  );
  assert.strictEqual(await response.text(), 'dados');
});

test('GET /documents/:id/download retorna 404 para documento de outro usuário', async () => {
  const uploaded = await (await uploadFile({ owner: 'dono' })).json();

  const response = await fetch(`${baseUrl}/documents/${uploaded.id}/download`, {
    headers: { 'X-User-Id': 'intruso' },
  });

  assert.strictEqual(response.status, 404);
});

test('GET /documents/:id/download retorna 404 para documento inexistente', async () => {
  const response = await fetch(`${baseUrl}/documents/inexistente/download`);

  assert.strictEqual(response.status, 404);
  assert.ok((await response.json()).error);
});

test('POST /upload rejeita requisição sem arquivo com 400', async () => {
  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: new FormData() });

  assert.strictEqual(response.status, 400);
  assert.ok((await response.json()).error);
});

test('POST /upload rejeita campo diferente de "file" com 400', async () => {
  const response = await uploadFile({ fieldName: 'outro' });

  assert.strictEqual(response.status, 400);
  assert.ok((await response.json()).error);
});

test('POST /upload rejeita arquivo acima do limite com 413 e não grava o arquivo', async () => {
  const filesBefore = fs.readdirSync(storageDir).length;

  const response = await uploadFile({ content: 'x'.repeat(2048) });

  assert.strictEqual(response.status, 413);
  assert.strictEqual(fs.readdirSync(storageDir).length, filesBefore);
});

test('GET /documents/:id/download retorna 500 quando o arquivo não existe mais no disco', async () => {
  for (const name of fs.readdirSync(storageDir)) {
    fs.rmSync(path.join(storageDir, name));
  }
  const uploaded = await (await uploadFile({ owner: 'sumiu' })).json();
  fs.rmSync(path.join(storageDir, fs.readdirSync(storageDir)[0]));

  const response = await fetch(`${baseUrl}/documents/${uploaded.id}/download`, {
    headers: { 'X-User-Id': 'sumiu' },
  });

  assert.strictEqual(response.status, 500);
});
