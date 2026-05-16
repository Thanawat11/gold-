# ห้างทองเอกฮั่วเฮง Goldshop

Web application for gold shop operations built with React TypeScript, MUI, Spring Boot, JWT security, JPA, and Google Sheets synchronization.

## Local Run

Backend requires Maven to run on Java 17. After Java 17 is the active Java for Maven:

```bash
cd backend
mvn spring-boot:run
```

The default local account is:

- Username: `admin`
- Password: `Admin@12345`

The `local` profile is enabled automatically for `spring-boot:run` through `backend/.mvn/maven.config`.
Local Google Sheets settings live in `backend/src/main/resources/application-local.yml`.

Frontend:

```bash
cd frontend
npm run dev
```

Google Sheets setup is documented in `docs/google-sheets-setup.md`.
