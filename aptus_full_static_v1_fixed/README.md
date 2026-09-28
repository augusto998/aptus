# APTUS 1.0 — versão completa para GitHub Pages

Esta versão foi preparada para funcionar **inteiramente em hospedagem estática**, sem depender de Flask ou de um servidor externo.

## O que está incluído

- Login separado para usuário e nutricionista
- Perfil do usuário
- Feed estilo Reels
- Receitas
- Curtidas
- Comentários
- Publicações
- Lista de nutricionistas
- Conversas/mensagens
- Área profissional do nutricionista
- Consultas
- Persistência usando IndexedDB
- Documentação de requisitos e histórias de usuário
- `database/schema.sql` com exatamente 10 tabelas PostgreSQL

## Credenciais demo

Usuário: `lucas` / `Aptus@123`

Nutricionista: `marina.nutri` / `Aptus@123`

## GitHub Pages

Publique a pasta `frontend-pages` como artefato do GitHub Pages.

## Observação importante

Uma hospedagem estática como GitHub Pages não executa Python nem PostgreSQL. Por isso, esta versão usa IndexedDB no navegador como banco funcional local. O schema PostgreSQL equivalente está em `database/schema.sql`, mantendo as 10 tabelas exigidas para a modelagem do projeto.
