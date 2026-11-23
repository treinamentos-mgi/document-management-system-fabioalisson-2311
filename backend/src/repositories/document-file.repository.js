const path = require('node:path');
const config = require('../config');

// Acesso ao filesystem local onde os arquivos enviados são guardados (RNF-01).
const storageDir = config.storageDir;

function resolvePath(storedName) {
  return path.join(storageDir, storedName);
}

module.exports = { storageDir, resolvePath };
