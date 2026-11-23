const documentService = require('../services/document.service');
const { HttpError } = require('../errors/http-error');

// Usuário identificado pelo cabeçalho X-User-Id; padrão "anonymous" (ver dms-spec, seção 2).
function getOwner(req) {
  return req.get('X-User-Id') || 'anonymous';
}

function upload(req, res) {
  if (!req.file) {
    throw new HttpError(400, 'Envie um arquivo no campo "file".');
  }
  const document = documentService.createDocument({ file: req.file, owner: getOwner(req) });
  res.status(201).json(document);
}

function list(req, res) {
  res.json(documentService.listDocuments(getOwner(req)));
}

// Monta Content-Disposition com fallback ASCII e filename* (RFC 6266/5987) para nomes com acentos.
function buildAttachmentDisposition(fileName) {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, '?').replace(/"/g, '\\"');
  const encodedName = encodeURIComponent(fileName).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`;
}

function download(req, res, next) {
  const { document, filePath } = documentService.getDocumentForDownload(getOwner(req), req.params.id);
  res.setHeader('Content-Disposition', buildAttachmentDisposition(document.originalName));
  res.type(document.mimeType);
  res.sendFile(filePath, (err) => {
    if (err) {
      next(new HttpError(500, 'Não foi possível ler o arquivo solicitado.'));
    }
  });
}

module.exports = { upload, list, download };
