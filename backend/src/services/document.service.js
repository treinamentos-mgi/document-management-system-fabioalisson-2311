const { randomUUID } = require('node:crypto');
const path = require('node:path');
const config = require('../config');
const { HttpError } = require('../errors/http-error');
const documentRepository = require('../repositories/document.repository');

// Remove o nome interno do arquivo, que não deve sair da aplicação.
function toPublicDocument({ storedName, ...publicFields }) {
  return publicFields;
}

function createDocument({ file, owner }) {
  const document = documentRepository.save({
    id: randomUUID(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
  });
  return toPublicDocument(document);
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
}

// Documentos de outros usuários são tratados como inexistentes (RF-06).
function getDocumentForDownload(owner, id) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    throw new HttpError(404, 'Documento não encontrado.');
  }
  return {
    document: toPublicDocument(document),
    filePath: path.join(config.storageDir, document.storedName),
  };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };
