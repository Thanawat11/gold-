# Google Sheets Setup

1. Create a Google Sheet named `Ek Hua Heng Goldshop`.
2. Open Extensions > Apps Script.
3. Paste `google-sheets/Code.gs`.
4. Run `setupGoldShopSheets()` once.
5. Deploy as Web app with access set for the backend service account or controlled workspace users.
6. Set backend environment variables:

```bash
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_WEB_APP_URL=<your-apps-script-web-app-url>
GOLDSHOP_ADMIN_PASSWORD=<first-owner-password>
JWT_SECRET=<at-least-32-byte-secret>
```

For local development, this project also includes `backend/src/main/resources/application-local.yml`
with the current Apps Script Web App URL already configured. `mvn spring-boot:run`
automatically uses the `local` profile through `backend/.mvn/maven.config`.

```bash
cd backend
mvn spring-boot:run
```

Required worksheets:

| Sheet | Columns |
| --- | --- |
| Users | username, password, fullName, role |
| Products | id, barcode, name, category, weightGram, weightText, status |
| Customers | id, fullName, phone, idCard |
| PawnTickets | id, customer, product, principal, interestRate, pawnDate, dueDate, status |
| PawnHistory | id, ticketId, actionType, amountPaid, interestPaid, createdAt |
| Transactions | id, receiptNumber, transactionType, netAmount, paymentMethod |
| PawnableItems | id, name, category |
