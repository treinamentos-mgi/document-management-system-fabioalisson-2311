const multer = require('multer');
const { HttpError } = require('../errors/http-error');

const MULTER_ERROR_RESPONSES = {
  LIMIT_FILE_SIZE: { status: 413, message: 'Arquivo acima do tamanho máximo permitido.' },
  LIMIT_UNEXPECTED_FILE: { status: 400, message: 'Envie um único arquivo no campo "file".' },
  LIMIT_FILE_COUNT: { status: 400, message: 'Envie um único arquivo no campo "file".' },
};

// Tratamento central de erros: converte erros de domínio, do multer e do body parser em respostas JSON.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof multer.MulterError) {
    const response = MULTER_ERROR_RESPONSES[err.code] ?? { status: 400, message: 'Requisição de upload inválida.' };
    return res.status(response.status).json({ error: response.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corpo da requisição em JSON inválido.' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}

module.exports = errorHandler;
