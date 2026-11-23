const { Router } = require('express');
const documentController = require('../controllers/document.controller');
const { uploadSingleFile } = require('../middlewares/upload.middleware');

const router = Router();

router.post('/upload', uploadSingleFile, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;
