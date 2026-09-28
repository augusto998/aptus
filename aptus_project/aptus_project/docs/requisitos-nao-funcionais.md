# Requisitos Não Funcionais — APTUS

- **RNF01 — Segurança:** senhas devem ser armazenadas com hashing; segredos devem estar em variáveis de ambiente.
- **RNF02 — Autorização:** rotas profissionais devem exigir papel `nutritionist`.
- **RNF03 — Validação:** entradas de formulários devem ser validadas no servidor.
- **RNF04 — Persistência:** dados transacionais devem ser persistidos no PostgreSQL.
- **RNF05 — Responsividade:** interface deve funcionar em desktop e dispositivos móveis.
- **RNF06 — Usabilidade:** navegação deve manter as três áreas principais após o login.
- **RNF07 — Manutenibilidade:** código deve permanecer dividido por responsabilidades.
- **RNF08 — Configuração:** credenciais não devem ser versionadas.
- **RNF09 — Deploy:** backend deve ser compatível com uma plataforma Python; GitHub Pages pode hospedar somente a camada estática.
- **RNF10 — Portabilidade:** projeto deve oferecer execução local via Python e PostgreSQL/Docker.
- **RNF11 — Desempenho:** listagens devem usar consultas direcionadas e índices/constraints quando necessário.
- **RNF12 — Disponibilidade:** aplicação de produção deve ser executada em serviço com processo persistente e banco gerenciado.
