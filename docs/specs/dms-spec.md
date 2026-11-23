# Especificação - Document Management System

> Especificação derivada do modelo [spec-template.md](./spec-template.md),
> para orientar o desenvolvimento guiado por especificação (Spec Driven
> Development).

## 1. Objetivo

Entregar uma aplicação web que permita a usuários enviar, listar e baixar
documentos, com armazenamento local no filesystem da aplicação e metadados em
memória nesta fase inicial.

## 2. Escopo

### Dentro do escopo

- Upload de documentos (um arquivo por requisição)
- Listagem dos documentos do usuário
- Download de documentos pelo identificador
- Gestão simples por usuário (cada documento pertence a um único dono)
- Interface web para as três operações acima
- Configuração por variáveis de ambiente

### Fora do escopo

- Armazenamento externo, em nuvem ou serviços de upload de terceiros
- Versionamento de documentos
- Persistência de metadados em banco de dados (previsto para fase futura)
- Autenticação e autorização completas (login, senha, tokens, perfis)
- Compartilhamento de documentos entre usuários
- Exclusão, edição de metadados e busca textual
- Pré-visualização de conteúdo e processamento do arquivo (OCR, antivírus, etc.)
- TypeScript (projeto em JavaScript puro nesta fase)

### Premissas

- O usuário é identificado pelo cabeçalho HTTP `X-User-Id`. Nesta fase, não há
  validação de credenciais; o valor é apenas uma forma simples de separar
  documentos por dono. Se o cabeçalho estiver ausente, a requisição usa o
  usuário padrão `anonymous`.
- A aplicação roda em um único processo. Sem persistência de metadados, a
  reinicialização do processo remove a lista de documentos, mas não remove os
  arquivos já gravados em disco (ver seção 4 e 9).

## 3. Requisitos funcionais

| ID    | Requisito                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um documento via `POST /upload` (campo `file`, multipart/form-data)                       |
| RF-02 | O sistema registra os metadados do documento enviado (id, nome original, tamanho, data de upload e dono)        |
| RF-03 | O usuário pode listar os seus documentos via `GET /documents`, ordenados do mais recente para o mais antigo     |
| RF-04 | O usuário pode baixar um documento pelo identificador via `GET /documents/:id/download`                         |
| RF-05 | O download devolve o conteúdo original do arquivo, com `Content-Type` e `Content-Disposition` adequados          |
| RF-06 | Um usuário não acessa documentos de outro usuário; tentativas de acesso retornam `404`                          |
| RF-07 | Uploads sem arquivo, com campo diferente de `file` ou acima do tamanho máximo são rejeitados com erro claro     |
| RF-08 | A interface web permite enviar um arquivo, ver a lista de documentos e baixar cada um deles                     |
| RF-09 | A interface exibe mensagens de erro e de sucesso para as operações de upload e download                         |

## 4. Requisitos não funcionais

| ID     | Requisito                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| RNF-01 | Arquivos gravados no filesystem local, na pasta `backend/storage`, usando `multer` com `diskStorage`       |
| RNF-02 | Metadados mantidos em memória nesta fase (sem banco de dados)                                              |
| RNF-03 | Configuração exclusivamente via variáveis de ambiente (12-Factor), com valores padrão seguros para dev      |
| RNF-04 | Nomes dos arquivos em disco são gerados pela aplicação (ex.: UUID), nunca o nome original enviado pelo cliente, evitando colisões e path traversal |
| RNF-05 | Limite de tamanho por arquivo configurável (`MAX_FILE_SIZE_BYTES`), com padrão de 10 MB                     |
| RNF-06 | Erros de entrada HTTP e de leitura/escrita de arquivos são tratados nos limites do sistema                 |
| RNF-07 | Código em JavaScript; backend em CommonJS e frontend em ESM                                                |
| RNF-08 | Dependências limitadas às já presentes nos `package.json` (`express`, `multer`, `react`, `react-dom`, `vite`) |
| RNF-09 | Testes do backend executados com o runner nativo `node:test`                                               |

## 5. Modelo de dados (metadados do documento)

Os metadados são mantidos em memória, em uma estrutura indexada por `id`.

| Campo        | Tipo   | Descrição                                                                 |
| ------------ | ------ | ------------------------------------------------------------------------- |
| id           | string | Identificador único do documento (UUID v4, gerado pelo sistema)           |
| originalName | string | Nome original do arquivo enviado pelo cliente (apenas exibição)           |
| storedName   | string | Nome do arquivo gravado em `STORAGE_DIR` (interno, não exposto na API)    |
| mimeType     | string | Tipo MIME informado no upload (ex.: `application/pdf`)                    |
| size         | number | Tamanho em bytes                                                          |
| uploadedAt   | string | Data/hora do upload (ISO 8601, UTC)                                       |
| owner        | string | Identificador do usuário dono (valor de `X-User-Id` ou `anonymous`)       |

Regras:

- `id` e `storedName` são únicos.
- `storedName` nunca é retornado nas respostas da API.
- Metadados não são alterados após a criação (sem versionamento nem edição).

## 6. Contratos de API

Base: `/` no backend. No frontend, todas as chamadas usam o prefixo `/api`,
encaminhado pelo proxy do Vite para o backend.

Formato de erro padrão (JSON):

```json
{ "error": "Mensagem descritiva em português" }
```

Cabeçalho comum: `X-User-Id` (opcional; padrão `anonymous`).

### POST /upload

- Entrada: `multipart/form-data` com o campo `file` (um único arquivo).
- Sucesso: `201 Created`

```json
{
  "id": "3f1c9a2e-1b7d-4c1e-9a55-2d6f0e8b7a10",
  "originalName": "contrato.pdf",
  "mimeType": "application/pdf",
  "size": 48213,
  "uploadedAt": "2026-11-23T17:40:00.000Z",
  "owner": "maria"
}
```

- Erros:
  - `400 Bad Request` - nenhum arquivo enviado ou campo diferente de `file`
  - `413 Payload Too Large` - arquivo acima de `MAX_FILE_SIZE_BYTES`
  - `500 Internal Server Error` - falha ao gravar o arquivo

### GET /documents

- Sucesso: `200 OK` com a lista de metadados dos documentos do usuário
  (`X-User-Id`), ordenada por `uploadedAt` decrescente. Lista vazia retorna `[]`.

```json
[
  {
    "id": "3f1c9a2e-1b7d-4c1e-9a55-2d6f0e8b7a10",
    "originalName": "contrato.pdf",
    "mimeType": "application/pdf",
    "size": 48213,
    "uploadedAt": "2026-11-23T17:40:00.000Z",
    "owner": "maria"
  }
]
```

- Erros: `500 Internal Server Error` (erro inesperado).

### GET /documents/:id/download

- Sucesso: `200 OK` com o conteúdo binário do arquivo.
  - `Content-Type`: `mimeType` do documento
  - `Content-Length`: `size`
  - `Content-Disposition: attachment; filename="<originalName>"` (com
    codificação `filename*` para caracteres não ASCII)
- Erros:
  - `404 Not Found` - documento inexistente **ou** pertencente a outro usuário
  - `500 Internal Server Error` - arquivo ausente no disco ou falha de leitura

## 7. Decisões arquiteturais

### Backend - Clean Architecture simples

Estrutura em `backend/src`:

```
backend/src/
├── app.js                 # Composição da aplicação Express (sem listen)
├── server.js              # Ponto de entrada: lê config e inicia o servidor
├── config/
│   └── index.js           # Leitura das variáveis de ambiente
├── routes/                # Define endpoints e delega para controllers
├── controllers/           # Entrada/saída HTTP e validação básica
├── services/              # Regras de negócio (documentos, dono, limites)
├── repositories/          # Persistência em memória dos metadados
└── middlewares/           # Multer (diskStorage) e tratamento central de erros
```

Fluxo de dependência: `routes -> controllers -> services -> repositories`.
Camadas internas (`services`, `repositories`) não importam `routes`,
`controllers` nem `express`. O `multer` fica na camada HTTP (middleware), e o
serviço recebe apenas metadados e o caminho do arquivo já gravado.

Pastas de `backend/storage` são criadas na inicialização caso não existam.

### Frontend - baseado em componentes (React + Vite)

```
frontend/src/
├── main.jsx
├── App.jsx
├── pages/                 # Página principal (DocumentsPage)
├── components/            # UploadForm, DocumentList, DocumentItem, Alert
└── services/              # documentsApi.js (chamadas fetch ao /api)
```

- Componentes funcionais com React Hooks.
- Chamadas HTTP centralizadas em `services/`, usando `fetch` com prefixo `/api`.
- Componentes reutilizáveis (ex.: `Alert`) para evitar duplicação.

### Configuração (12-Factor)

| Variável              | Padrão          | Uso                                              |
| --------------------- | --------------- | ------------------------------------------------ |
| `PORT`                | `3000`          | Porta HTTP do backend                            |
| `STORAGE_DIR`         | `backend/storage` | Pasta de gravação dos arquivos                 |
| `MAX_FILE_SIZE_BYTES` | `10485760`      | Limite de tamanho por arquivo (10 MB)            |

O proxy do Vite aponta `/api` para `http://localhost:3000` (ou para o valor de
`PORT`, quando definido).

### Outras decisões

- Identificador de documento em UUID v4 (`crypto.randomUUID`), sem dependência extra.
- Erros de domínio são representados por classes simples de erro com status HTTP,
  tratadas por um único middleware de erro.
- Sem estado de sessão no backend.

## 8. Plano de execução

Etapas na ordem de implementação. Cada etapa deve terminar com validação
(testes ou verificação manual) antes da próxima.

| Etapa | Descrição                                                                 | Depende de |
| ----- | ------------------------------------------------------------------------- | ---------- |
| 1     | Configuração base: `config/index.js` com variáveis de ambiente e criação de `STORAGE_DIR` | -          |
| 2     | Repositório em memória de documentos (`repositories/`): inserir, listar por dono e buscar por id | 1          |
| 3     | Serviço de documentos (`services/`): criar metadados, listar do usuário, obter para download, regra de dono (RF-06) | 2          |
| 4     | Middleware de upload com `multer` + `diskStorage` (nome UUID, limite de tamanho, campo `file`) | 1          |
| 5     | Controllers e rotas: `POST /upload`, `GET /documents`, `GET /documents/:id/download` | 3, 4       |
| 6     | Middleware central de erros e mapeamento de erros para 400, 404, 413 e 500 | 5          |
| 7     | Composição em `app.js` e ponto de entrada `server.js`                      | 5, 6       |
| 8     | Testes do backend com `node:test` cobrindo upload, listagem, download, isolamento por dono, arquivo ausente e limite de tamanho | 7          |
| 9     | Estrutura base do frontend (`main.jsx`, `App.jsx`) e proxy `/api` no Vite  | -          |
| 10    | Camada `services/documentsApi.js` com `fetch` para upload, listagem e download | 9          |
| 11    | Componentes `UploadForm`, `DocumentList`, `DocumentItem` e `Alert` e página `DocumentsPage` | 10         |
| 12    | Tratamento de erros e mensagens de sucesso/erro na interface (RF-09)       | 11         |
| 13    | Validação ponta a ponta: upload, listagem, download, isolamento por `X-User-Id` e limite de tamanho | 8, 12      |
| 14    | Atualização do `README.md` com instruções de execução e variáveis de ambiente | 13         |

Caminho crítico: 1 -> 2 -> 3 -> 5 -> 6 -> 7 -> 8 -> 13 -> 14 (backend), com o
frontend (9 -> 10 -> 11 -> 12) podendo avançar em paralelo após a etapa 7,
desde que o contrato da seção 6 seja mantido.

## 9. Riscos e limitações conhecidos

- **Perda de metadados ao reiniciar:** sem banco de dados, a lista some ao
  reiniciar o processo, enquanto os arquivos permanecem em `STORAGE_DIR`. Mitigação
  prevista: persistência de metadados em fase futura (fora do escopo atual).
- **Identificação fraca do usuário:** `X-User-Id` não é autenticado. Qualquer
  cliente pode se passar por outro usuário. Aceitável apenas para a fase inicial.
- **Escala:** armazenamento local em um único processo não atende a múltiplas
  instâncias.
- **Conteúdo não validado:** o tipo MIME vem do cliente e não é verificado pelo
  conteúdo do arquivo.
