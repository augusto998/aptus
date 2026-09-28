# Deploy do APTUS

## Arquitetura recomendada

- **Frontend estático/landing:** GitHub Pages.
- **Aplicação completa:** Flask/Python em Render (ou outro serviço Python equivalente).
- **Banco:** PostgreSQL gerenciado.

GitHub Pages não executa o processo Python nem hospeda PostgreSQL. Por isso, o sistema completo deve ficar no serviço de backend, enquanto o Pages pode servir a página estática/porta de entrada.

## Render

O arquivo `render.yaml` já define um Web Service Python e um banco PostgreSQL.

1. Suba o repositório para o GitHub.
2. No Render, crie um Blueprint usando o repositório.
3. O Render usará `render.yaml`.
4. Verifique/adicione `SECRET_KEY`.
5. Após o primeiro deploy, execute o seed ou crie os dados necessários.

## GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica `frontend-pages/`.

Antes de publicar, substitua `https://SEU-BACKEND.onrender.com` em `frontend-pages/index.html` pela URL real do backend.
