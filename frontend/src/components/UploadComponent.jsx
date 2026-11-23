import { useState } from 'react';
import { uploadDocument } from '../services/documentsApi.js';

export default function UploadComponent({ onUploaded, onFeedback }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile) {
      onFeedback({ type: 'error', text: 'Selecione um arquivo antes de enviar.' });
      return;
    }

    setIsUploading(true);
    try {
      const document = await uploadDocument(selectedFile);
      onFeedback({ type: 'success', text: `"${document.originalName}" enviado com sucesso.` });
      setSelectedFile(null);
      setInputKey((key) => key + 1);
      onUploaded();
    } catch (error) {
      onFeedback({ type: 'error', text: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        key={inputKey}
        type="file"
        name="file"
        onChange={(event) => setSelectedFile(event.target.files[0] ?? null)}
        disabled={isUploading}
      />
      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
}
