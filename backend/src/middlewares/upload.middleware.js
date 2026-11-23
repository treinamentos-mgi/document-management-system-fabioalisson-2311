const { randomUUID } = require('node:crypto');
const multer = require('multer');
const config = require('../config');
const documentFileRepository = require('../repositories/document-file.repository');

const storage = multer.diskStorage({
  destination: documentFileRepository.storageDir,
  // Nome gerado pela aplicação; o nome original nunca é usado no disco (RNF-04).
  filename: (req, file, callback) => callback(null, randomUUID()),
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeBytes, files: 1 },
});

// O multer lê o nome do arquivo como latin1; o cliente envia UTF-8 (ex.: "relatório.pdf").
function decodeOriginalFilename(req, res, next) {
  if (req.file) {
    req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  }
  next();
}

module.exports = { uploadSingleFile: [upload.single('file'), decodeOriginalFilename] };
