import DownloadButton from './DownloadButton.jsx';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ documents, isLoading, onFeedback }) {
  if (isLoading) {
    return <p>Carregando documentos...</p>;
  }

  if (documents.length === 0) {
    return <p>Nenhum documento enviado ainda.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {documents.map((document) => (
        <li
          key={document.id}
          style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #ddd' }}
        >
          <span style={{ flex: 1 }}>{document.originalName}</span>
          <span>{formatSize(document.size)}</span>
          <span>{new Date(document.uploadedAt).toLocaleString('pt-BR')}</span>
          <DownloadButton document={document} onFeedback={onFeedback} />
        </li>
      ))}
    </ul>
  );
}
