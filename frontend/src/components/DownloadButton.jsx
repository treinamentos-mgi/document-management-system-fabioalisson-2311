import { useState } from 'react';
import { downloadDocument } from '../services/documentsApi.js';

// Dispara o download do blob no navegador usando um link temporário.
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function DownloadButton({ document, onFeedback }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleClick() {
    setIsDownloading(true);
    try {
      const blob = await downloadDocument(document.id);
      saveBlob(blob, document.originalName);
      onFeedback({ type: 'success', text: `Download de "${document.originalName}" iniciado.` });
    } catch (error) {
      onFeedback({ type: 'error', text: error.message });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={isDownloading}>
      {isDownloading ? 'Baixando...' : 'Baixar'}
    </button>
  );
}
