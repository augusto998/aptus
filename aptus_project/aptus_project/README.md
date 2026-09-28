# APTUS

APTUS é uma plataforma web com conceito de rede social voltada à educação alimentar, compartilhamento de receitas/conteúdos e contato com nutricionistas.

## Objetivo

Criar uma experiência semelhante a uma rede social, mas direcionada à construção de hábitos alimentares mais saudáveis, com um espaço separado para atendimento e comunicação com nutricionistas.

> O conteúdo da plataforma tem caráter educacional e não substitui avaliação, diagnóstico ou acompanhamento individual por profissional habilitado.

## Funcionalidades

- Login separado para usuário e nutricionista.
- Cadastro de usuário.
- Perfil com objetivo, bio e estatísticas.
- Feed/reels vertical para receitas, curiosidades e conteúdo.
- Publicações com texto e mídia opcional.
- Curtidas, comentários e seguidores.
- Receitas vinculadas a publicações.
- Diretório de nutricionistas.
- Solicitações de acompanhamento.
- Mensagens diretas.
- Painel específico do nutricionista para consultas.

## Tecnologias

- Python / Flask
- HTML/Jinja
- CSS
- PostgreSQL
- SQLAlchemy
- Gunicorn
- Docker Compose para desenvolvimento local

## Arquitetura

O backend Flask renderiza o frontend e acessa o PostgreSQL. Em produção, use um serviço Python para o backend. GitHub Pages não executa Python/PostgreSQL; o projeto inclui uma landing page estática para Pages e um blueprint para Render.

## Estrutura

```text
aptus_project/
├── app/
│   ├── __init__.py
│   ├── models.py
│   └── routes.py
├── templates/
├── static/
│   └── css/app.css
├── docs/
├── tests/
├── frontend-pages/
├── .github/workflows/deploy-pages.yml
├── docker-compose.yml
├── render.yaml
├── seed.py
├── run.py
├── Procfile
├── requirements.txt
└── .env.example
```

## Banco de dados — exatamente 10 tabelas

1. `users`
2. `user_profiles`
3. `nutritionists`
4. `posts`
5. `comments`
6. `likes`
7. `recipes`
8. `follows`
9. `consultations`
10. `messages`

**TOTAL: 10 tabelas funcionais.**

A modelagem e o diagrama estão em `docs/database.md`.

## Rodar localmente

### 1. Preparar PostgreSQL com Docker

```bash
docker compose up -d db
```

### 2. Criar ambiente virtual

Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

Linux/macOS:

```bash
python -m venv .venv
source .venv/bin/activate
```

### 3. Instalar dependências

```bash
pip install -r requirements.txt
```

### 4. Configurar ambiente

Copie `.env.example` para `.env` e ajuste `SECRET_KEY`/`DATABASE_URL` conforme necessário.

Exemplo local:

```env
SECRET_KEY=uma-chave-local
DATABASE_URL=postgresql+psycopg://aptus:aptus@localhost:5432/aptus
APTUS_DEMO_PASSWORD=Aptus@123
```

### 5. Criar tabelas e dados demo

```bash
flask --app run.py init-db
python seed.py
```

### 6. Rodar

```bash
python run.py
```

Abra `http://127.0.0.1:5000`.

## Contas de demonstração

Depois do `seed.py`:

**Usuário**
- login: `lucas`
- senha: valor de `APTUS_DEMO_PASSWORD` (padrão `Aptus@123`)

**Nutricionista**
- login: `marina.nutri`
- senha: valor de `APTUS_DEMO_PASSWORD` (padrão `Aptus@123`)

## Testes

Os testes ficam em `tests/test_app.py` e verificam, entre outras coisas, que a aplicação define exatamente 10 tabelas.

```bash
pytest
```

## Deploy

Consulte `docs/deploy.md`. O arquivo `render.yaml` prepara backend + PostgreSQL no Render. O workflow de Pages publica a camada estática.

## Documentação acadêmica

- `docs/user-stories.md`
- `docs/requisitos-funcionais.md`
- `docs/requisitos-nao-funcionais.md`
- `docs/database.md`
- `docs/deploy.md`
