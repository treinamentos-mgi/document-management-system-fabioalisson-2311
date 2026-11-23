const { randomUUID } = require('node:crypto');
const { HttpError } = require('../errors/http-error');
const documentRepository = require('../repositories/document.repository');
const documentFileRepository = require('../repositories/document-file.repository');

// Remove o nome interno do arquivo, que não deve sair da aplicação.
function toPublicDocument({ storedName, ...publicFields }) {
  return publicFields;
}

function buildDocumentRecord(file, owner) {
  return {
    id: randomUUID(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
  };
}

// Documentos de outros usuários são tratados como inexistentes (RF-06).
function findOwnedDocument(owner, id) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    throw new HttpError(404, 'Documento não encontrado.');
  }
  return document;
}

function createDocument({ file, owner }) {
  return toPublicDocument(documentRepository.save(buildDocumentRecord(file, owner)));
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
}

function getDocumentForDownload(owner, id) {
  const document = findOwnedDocument(owner, id);
  return {
    document: toPublicDocument(document),
    filePath: documentFileRepository.resolvePath(document.storedName),
  };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };
