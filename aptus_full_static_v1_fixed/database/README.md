# Banco de dados do APTUS

A versão destinada ao GitHub Pages é uma aplicação estática. Por isso, o banco funcional em tempo de execução usa **IndexedDB no navegador**.

Para manter a modelagem pedida no trabalho, esta pasta também contém `schema.sql` com o modelo PostgreSQL equivalente e **exatamente 10 tabelas**.

Tabelas:
1. users
2. user_profiles
3. nutritionists
4. posts
5. comments
6. likes
7. recipes
8. follows
9. consultations
10. messages

Isso permite demonstrar a aplicação sem backend externo e, ao mesmo tempo, documentar a estrutura PostgreSQL planejada para produção.
