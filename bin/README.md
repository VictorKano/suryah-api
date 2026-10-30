# Suryah API

API de agendamento de aulas do estúdio de yoga **Suryah**.

**Stack:** Java 21 · Spring Boot 3.4 · PostgreSQL 16 · Flyway · JPA

## Rodando localmente

```bash
docker compose up -d        # sobe o PostgreSQL
mvn spring-boot:run         # sobe a API em http://localhost:8080
```

- `GET /api/tipos-aula` – lista tipos de aula
- `GET /actuator/health` – health check

Testes (requer Docker, usa Testcontainers): `mvn test`

## Variáveis de ambiente

| Variável | Padrão |
|----------|--------|
| DB_URL | jdbc:postgresql://localhost:5432/suryah |
| DB_USER | suryah |
| DB_PASSWORD | suryah |
| PORT | 8080 |

## Roadmap

- [x] Estrutura inicial, migration V1, entidades
- [ ] Cadastro/login de alunos (Spring Security + JWT)
- [ ] CRUD admin: tipos de aula e aulas
- [ ] Agenda com vagas + reservar/cancelar
- [ ] Turmas fixas e alunos fixos
- [ ] Lista de espera e notificações
