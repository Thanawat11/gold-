const SHEET_NAMES = [
  'Users',
  'Products',
  'Customers',
  'PawnTickets',
  'PawnHistory',
  'Transactions',
  'PawnableItems',
];

const HEADERS = {
  Users: ['username', 'password', 'fullName', 'role'],
  Products: ['id', 'barcode', 'qrCode', 'name', 'category', 'design', 'goldPercent', 'weightGram', 'weightText', 'makingFee', 'costFee', 'costAmount', 'imageUrl', 'status'],
  Customers: ['id', 'fullName', 'phone', 'identityType', 'idCard', 'address', 'trustLevel', 'idCardImageUrl', 'customerImageUrl', 'documentUrl', 'notes'],
  PawnTickets: ['id', 'customer', 'product', 'principal', 'interestRate', 'pawnDate', 'dueDate', 'status'],
  PawnHistory: ['id', 'ticketId', 'actionType', 'amountPaid', 'interestPaid', 'createdAt'],
  Transactions: ['id', 'receiptNumber', 'transactionType', 'netAmount', 'paymentMethod'],
  PawnableItems: ['id', 'name', 'category'],
};

function setupGoldShopSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  SHEET_NAMES.forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
    const headers = HEADERS[sheetName];
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });
}

function doGet(event) {
  const sheetName = event.parameter.sheet;
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  const rows = values
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => headers.reduce((record, header, index) => {
      record[header] = row[index];
      return record;
    }, {}));

  return json(rows);
}

function doPost(event) {
  const payload = JSON.parse(event.postData.contents);
  const sheet = getSheet(payload.sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map((header) => payload.data[header] ?? '');
  sheet.appendRow(row);

  return json({ ok: true });
}

function getSheet(sheetName) {
  if (!SHEET_NAMES.includes(sheetName)) {
    throw new Error(`Unknown sheet: ${sheetName}`);
  }
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet is not initialized: ${sheetName}`);
  }
  return sheet;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
