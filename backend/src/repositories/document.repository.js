// Persistência em memória dos metadados (RNF-02). Indexada por id.
const documents = new Map();

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id) ?? null;
}

// Retorna os documentos do dono do mais recente para o mais antigo.
function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner).reverse();
}

module.exports = { save, findById, findByOwner };
