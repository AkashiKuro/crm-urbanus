# Urbanus CRM

CRM para gerenciar os leads/clientes que você entra em contato, com **Dashboard** e
quadro de **Leads** em estilo Kanban (New / Open / In Progress / Open deal).

Baseado no design fornecido: sidebar de navegação, topbar com busca e perfil,
cards de lead com telefone, email e situação (In Process / Dead / Recycled).

## Stack

- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS + React Router
- **Backend:** mesma lógica roda como Express (local) e como funções serverless (Vercel)
- **Banco de dados:** **detecção automática**
  - **SQLite** local (nativo do Node 22+ via `node:sqlite`) — arquivo em `server/data/crm.db`
  - **Postgres/Supabase** quando existir a variável `POSTGRES_URL` (produção/Vercel)
- **Ícones:** lucide-react

## Como rodar (desenvolvimento local)

Pré-requisito: Node.js 22+ (este projeto foi montado com Node 24).

```bash
npm install      # primeira vez
npm run dev      # sobe backend (porta 3001) + frontend (porta 5173) juntos
```

Depois abra: http://localhost:5173

> Sem `.env`, ele usa **SQLite local** automaticamente — zero configuração.
> O terminal mostra qual banco está em uso ao subir.

Comandos separados, se preferir:

```bash
npm run dev:server   # só a API  -> http://localhost:3001
npm run dev:web      # só o front -> http://localhost:5173
```

## Estrutura

```
crm/
├── api/                    # Funções serverless da Vercel (produção)
│   ├── leads/index.js      #   GET /api/leads  e  POST /api/leads
│   ├── leads/[id].js       #   PUT/DELETE /api/leads/:id
│   └── stats.js            #   GET /api/stats
├── server/
│   ├── index.js            # Servidor Express (apenas desenvolvimento local)
│   ├── handlers.js         # Lógica das rotas (compartilhada Express + Vercel)
│   ├── repo.js             # Camada de dados: SQLite local OU Postgres/Supabase
│   └── data/crm.db         # Banco SQLite local (criado automaticamente, ignorado no git)
├── src/
│   ├── components/         # Sidebar, Topbar, Layout, LeadCard, NewLeadModal
│   ├── pages/             # Dashboard, Leads, Placeholder
│   ├── api.ts             # cliente HTTP da API
│   ├── types.ts           # tipos e metadados de status/tags
│   └── App.tsx            # rotas
├── vercel.json            # config de deploy
├── .env.example           # modelo de variáveis (POSTGRES_URL)
└── ...config (vite, tailwind, tsconfig)
```

## API

| Método | Rota              | Descrição                          |
|--------|-------------------|------------------------------------|
| GET    | `/api/leads`      | Lista todos os leads               |
| POST   | `/api/leads`      | Cria um lead                       |
| PUT    | `/api/leads/:id`  | Atualiza um lead                   |
| DELETE | `/api/leads/:id`  | Remove um lead                     |
| GET    | `/api/stats`      | Indicadores do dashboard           |

## Modelo de Lead

- **status:** `new`, `open`, `in_progress`, `open_deal` (colunas do Kanban)
- **tag (situação):** `in_process`, `dead`, `recycled`
- campos: nome, telefone, email, origem (source), observações (notes)

---

## 🚀 Deploy na Vercel + Supabase

O projeto já está pronto para a Vercel. O banco vira **Postgres no Supabase**
automaticamente quando a variável `POSTGRES_URL` existir. A tabela `leads` e os
dados de exemplo são criados **sozinhos** no primeiro acesso.

### 1. Criar o banco no Supabase

1. Acesse https://supabase.com e crie uma conta (grátis).
2. **New project** → escolha um nome e uma senha forte para o banco (guarde-a).
3. Espere o projeto provisionar (~1 min).
4. Vá em **Project Settings → Database → Connection string → URI**.
5. Selecione a aba **Connection pooling** (recomendado para serverless) e copie a URI.
   Ela se parece com:
   ```
   postgresql://postgres.xxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
   > Troque `SUA_SENHA` pela senha definida no passo 2.

### 2. Subir o código para o GitHub

```bash
cd crm
git init
git add .
git commit -m "CRM inicial"
# crie um repositório no GitHub e:
git remote add origin https://github.com/SEU_USUARIO/urbanus-crm.git
git push -u origin main
```

### 3. Importar na Vercel

1. Acesse https://vercel.com e faça login com o GitHub.
2. **Add New → Project** → selecione o repositório do CRM.
3. **Root Directory:** se o repo for só a pasta `crm`, deixe `/`.
   Se você subiu o `urbanus-suzuki` inteiro, defina **Root Directory = `crm`**.
4. Em **Environment Variables**, adicione:
   - **Name:** `POSTGRES_URL`
   - **Value:** a URI copiada do Supabase (passo 1.5)
5. Clique em **Deploy**.

Pronto! A Vercel detecta o Vite, builda o frontend e publica as funções de `api/`.
Sua URL final fica algo como `https://urbanus-crm.vercel.app`.

### Resumo de qual banco é usado

| Ambiente | Variável `POSTGRES_URL` | Banco usado          |
|----------|-------------------------|----------------------|
| Local    | ausente                 | SQLite (`crm.db`)    |
| Vercel   | definida                | Postgres (Supabase)  |

> Para testar o Supabase **localmente**, copie `.env.example` para `.env` e cole sua
> `POSTGRES_URL` lá. Rode `npm run dev` — o terminal mostrará
> `Banco de dados: Postgres (Supabase)`.

## Já funciona

- Dashboard com totais, gráfico de barras por status e leads recentes
- Quadro de Leads em colunas por status, com cards do design
- Criar e excluir lead — salvo no banco (SQLite local ou Supabase)
- Pronto para deploy na Vercel com Postgres/Supabase

## Próximos passos sugeridos

- Editar lead / arrastar entre colunas (drag-and-drop)
- Filtros reais (status, origem, busca)
- Telas de Accounts, Contacts, Calendar, Activities, Reports
- Export real (CSV)
- Autenticação de usuário
