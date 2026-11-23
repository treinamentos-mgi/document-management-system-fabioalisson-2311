import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentsApi.js';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      setDocuments(await listDocuments());
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '900px' }}>
      <h1>Document Management System</h1>

      <section>
        <h2>Enviar documento</h2>
        <UploadComponent onUploaded={loadDocuments} onFeedback={setFeedback} />
      </section>

      {feedback && (
        <p role={feedback.type === 'error' ? 'alert' : 'status'} style={{ color: feedback.type === 'error' ? '#b00020' : '#1b5e20' }}>
          {feedback.text}
        </p>
      )}

      <section>
        <h2>Meus documentos</h2>
        <DocumentList documents={documents} isLoading={isLoading} onFeedback={setFeedback} />
      </section>
    </main>
  );
}
