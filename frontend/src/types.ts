export type Role = 'OWNER' | 'MANAGER' | 'STAFF' | 'ACCOUNT' | 'CASHIER';
export type ProductStatus = 'AVAILABLE' | 'SOLD' | 'PAWNED' | 'EXPIRED_PAWN' | 'REPAIR' | 'MELTED' | 'RETURNED_TO_ARTISAN';
export type TransactionStatus = 'ACTIVE' | 'VOIDED';
export type TransactionType = 'SELL' | 'BUY' | 'TRADE_IN';
export type TransactionItemType = 'SELL' | 'BUY';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'PROMPTPAY' | 'CREDIT_CARD' | 'MIXED';
export type PawnStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
export type PawnActionType = 'CREATE' | 'RENEW' | 'ADJUST_PRINCIPAL' | 'REDEEM' | 'EXPIRE';
export type IdentityType = 'THAI_ID' | 'PASSPORT';
export type CustomerTrustLevel = 'HIGH' | 'NORMAL' | 'WATCHLIST' | 'BLOCKED';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

export interface UserCreateRequest {
  username: string;
  fullName: string;
  password: string;
  role: Role;
}

export interface UserUpdateRequest {
  fullName: string;
  password?: string;
  role: Role;
}

export interface AuthResponse extends User {
  token: string;
}

export interface PriceDetail {
  buy: string | null;
  sell: string | null;
}

export interface GoldPriceResponse {
  bar: PriceDetail;
  ornament: PriceDetail;
  updateTime: string;
}

export interface GoldPriceHistoryItem {
  id: number;
  buyPrice: number;
  sellPrice: number;
  ornamentBuyPrice?: number | null;
  ornamentSellPrice?: number | null;
  effectiveDate: string;
}

export interface GoldPriceUpdateRequest {
  barBuyPrice: number;
  barSellPrice: number;
  ornamentBuyPrice?: number | null;
  ornamentSellPrice?: number | null;
}

export interface Product {
  id: number;
  barcode: string;
  qrCode?: string;
  name: string;
  category: string;
  design?: string;
  goldPercent?: number;
  weightGram: number;
  weightText?: string;
  makingFee?: number;
  costFee?: number;
  costAmount?: number;
  imageUrl?: string;
  status: ProductStatus;
  createdAt?: string;
}

export interface ProductRequest {
  barcode?: string;
  qrCode?: string;
  name: string;
  category: string;
  design?: string;
  goldPercent?: number;
  weightGram: number;
  weightText?: string;
  makingFee?: number;
  costFee?: number;
  costAmount?: number;
  imageUrl?: string;
  status?: ProductStatus;
}

export interface Customer {
  id: number;
  fullName: string;
  phoneNumber?: string;
  identityType?: IdentityType;
  idCardNumber?: string;
  address?: string;
  trustLevel?: CustomerTrustLevel;
  idCardImageUrl?: string;
  customerImageUrl?: string;
  documentUrl?: string;
  notes?: string;
  createdAt?: string;
}

export interface CustomerRequest {
  fullName: string;
  phoneNumber?: string;
  identityType?: IdentityType;
  idCardNumber?: string;
  address?: string;
  trustLevel?: CustomerTrustLevel;
  idCardImageUrl?: string;
  customerImageUrl?: string;
  documentUrl?: string;
  notes?: string;
}

export interface CheckoutItemRequest {
  productId?: number;
  itemType: TransactionItemType;
  price: number;
  fee?: number;
}

export interface CheckoutPaymentRequest {
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNo?: string;
}

export interface CheckoutRequest {
  customerId?: number;
  items: CheckoutItemRequest[];
  payments?: CheckoutPaymentRequest[];
  transactionType: TransactionType;
  totalAmount: number;
  discount: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
}

export interface Transaction {
  id: number;
  receiptNumber: string;
  transactionType: TransactionType;
  totalAmount: number;
  discount: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
  status?: TransactionStatus;
  cancelReason?: string;
  canceledAt?: string;
  transactionDate: string;
  items?: CheckoutItemRequest[];
  payments?: CheckoutPaymentRequest[];
}

export interface CustomerTransactionHistoryItem {
  id: number;
  receiptNumber: string;
  transactionType: TransactionType;
  netAmount: number;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  itemCount: number;
}

export interface CustomerPawnHistoryItem {
  id: number;
  ticketNumber: string;
  productName: string;
  principalAmount: number;
  interestRate: number;
  pawnDate: string;
  dueDate: string;
  status: PawnStatus;
}

export interface CustomerProfileResponse {
  customer: Customer;
  purchaseHistory: CustomerTransactionHistoryItem[];
  goldSaleHistory: CustomerTransactionHistoryItem[];
  pawnHistory: CustomerPawnHistoryItem[];
  totalPurchaseAmount: number;
  totalGoldSaleAmount: number;
  activePawnPrincipal: number;
}

export interface PawnTicket {
  id: number;
  ticketNumber: string;
  customer: Customer;
  product: Product;
  principalAmount: number;
  interestRate: number;
  pawnDate: string;
  dueDate: string;
  status: PawnStatus;
  createdAt?: string;
}

export interface PawnTicketRequest {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  identityType?: IdentityType;
  identityNumber?: string;
  idCard?: string;
  productId?: number;
  productName?: string;
  category?: string;
  weightGram?: number;
  weightText?: string;
  principalAmount: number;
  interestRate?: number;
  pawnDate?: string;
  dueDate?: string;
}

export interface PawnEstimateRequest {
  weightGram: number;
  goldPricePerBaht?: number;
  wearDeductionPercent?: number;
  loanToValuePercent?: number;
  principalAmount?: number;
}

export interface PawnEstimateResponse {
  goldPricePerBaht: number;
  rawGoldValue: number;
  wearDeductionAmount: number;
  appraisedValue: number;
  loanToValuePercent: number;
  recommendedPrincipal: number;
  selectedPrincipal: number;
  monthlyInterestRate: number;
  monthlyInterestAmount: number;
  defaultTermMonths: number;
  defaultDueDate: string;
  formula: string;
}

export interface PawnActionRequest {
  actionType: PawnActionType;
  amountPaid?: number;
  interestPaid?: number;
  principalAdjusted?: number;
  extendMonths?: number;
  newInterestRate?: number;
}

export interface PawnHistory {
  id: number;
  actionType: PawnActionType;
  amountPaid: number;
  interestPaid: number;
  principalAdjusted: number;
  previousDueDate?: string;
  newDueDate?: string;
  createdAt: string;
}

export interface PawnInterestSuggestion {
  principal: number;
  startDate: string;
  redeemMonths: number;
  renewMonths: number;
  redeemInterest: number;
  renewInterest: number;
  rate: number;
  reduction: number;
}

export interface PriceQuoteRequest {
  weightGram?: number;
  goldPricePerBaht?: number;
  makingFee?: number;
  makingFeeDiscount?: number;
  wearDeductionPercent?: number;
  fixedDeductionAmount?: number;
  overrideAmount?: number;
  tradeInPolicy?: string;
  newItemTotal?: number;
  oldItemBuyPrice?: number;
  principal?: number;
  monthlyInterestRate?: number;
  months?: number;
}

export interface PriceQuoteResponse {
  goldAmount: number;
  feeAmount: number;
  discountAmount: number;
  deductionAmount: number;
  netAmount: number;
  formula: string;
}

export interface DashboardSummary {
  dailySalesAmount: number;
  dailyTransactionCount: number;
  nearDuePawnTickets: number;
  availableInventoryWeightGram: number;
  availableProductCount: number;
  lowStock: Array<{ category: string; count: number }>;
}

export interface ReportSummary {
  date: string;
  transactionCount: number;
  netAmount: number;
  availableProductCount: number;
}

export type ReportPeriod = 'DAILY' | 'MONTHLY' | 'YEARLY';

export interface ReportTotals {
  transactionCount: number;
  revenueAmount: number;
  salesAmount: number;
  buyOldGoldAmount: number;
  salesProfit: number;
  estimatedNetProfit: number;
  unknownCostItemCount: number;
  cashInAmount: number;
  cashOutAmount: number;
  netCashAmount: number;
  activePawnPrincipal: number;
  interestIncome: number;
  expiredPawnCount: number;
  availableStockWeightGram: number;
  availableStockGoldBaht: number;
  availableStockCount: number;
  taxBaseAmount: number;
  vatAmount: number;
}

export interface PeriodReportRow {
  periodKey: string;
  transactionCount: number;
  revenueAmount: number;
  salesAmount: number;
  buyOldGoldAmount: number;
  salesProfit: number;
  estimatedNetProfit: number;
  cashInAmount: number;
  cashOutAmount: number;
  interestIncome: number;
}

export interface TransactionReportRow {
  id: number;
  receiptNumber: string;
  transactionDate: string;
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  customerName: string;
  cashierName: string;
  netAmount: number;
  cashInAmount: number;
  cashOutAmount: number;
  cancelReason?: string | null;
  canceledAt?: string | null;
}

export interface ProfitReportRow {
  receiptNumber: string;
  transactionDate: string;
  productName: string;
  category: string;
  sellerName: string;
  saleAmount: number;
  costAmount: number;
  profitAmount: number;
  costKnown: boolean;
}

export interface OldGoldPurchaseRow {
  receiptNumber: string;
  transactionDate: string;
  description: string;
  weightGram?: number | null;
  amount: number;
  cashierName: string;
}

export interface PawnOutstandingRow {
  ticketNumber: string;
  customerName: string;
  productName: string;
  weightGram: number;
  principalAmount: number;
  interestRate: number;
  pawnDate: string;
  dueDate: string;
  daysUntilDue: number;
}

export interface PawnExpiredRow {
  ticketNumber: string;
  customerName: string;
  productName: string;
  weightGram: number;
  principalAmount: number;
  dueDate: string;
  expiredAt?: string | null;
}

export interface PawnReport {
  activeTicketCount: number;
  activePrincipalAmount: number;
  interestIncome: number;
  outstandingTickets: PawnOutstandingRow[];
  expiredTickets: PawnExpiredRow[];
}

export interface InventoryStatusRow {
  status: string;
  count: number;
  weightGram: number;
  costAmount: number;
}

export interface InventoryCategoryRow {
  category: string;
  count: number;
  weightGram: number;
  costAmount: number;
}

export interface InventoryWeightRow {
  weightLabel: string;
  count: number;
  weightGram: number;
  costAmount: number;
}

export interface InventoryReport {
  totalProductCount: number;
  availableProductCount: number;
  totalWeightGram: number;
  availableWeightGram: number;
  totalGoldBaht: number;
  availableGoldBaht: number;
  stockCostAmount: number;
  byStatus: InventoryStatusRow[];
  byCategory: InventoryCategoryRow[];
  byWeight: InventoryWeightRow[];
}

export interface TaxReport {
  salesAmount: number;
  taxBaseAmount: number;
  vatAmount: number;
  vatRate: number;
}

export interface EmployeeSalesRow {
  username: string;
  fullName: string;
  transactionCount: number;
  salesAmount: number;
  buyOldGoldAmount: number;
  salesProfit: number;
  unknownCostItemCount: number;
}

export interface OwnerReportResponse {
  fromDate: string;
  toDate: string;
  period: ReportPeriod;
  canViewProfit: boolean;
  canExport: boolean;
  canCancelTransactions: boolean;
  totals: ReportTotals;
  periodRows: PeriodReportRow[];
  transactionRows: TransactionReportRow[];
  profitRows: ProfitReportRow[];
  oldGoldPurchaseRows: OldGoldPurchaseRow[];
  pawn: PawnReport;
  inventory: InventoryReport;
  tax: TaxReport;
  employeeSalesRows: EmployeeSalesRow[];
}

export interface SystemSettings {
  gramsPerBaht: number;
  wearDeductionPercent: number;
  buyFixedDeductionAmount: number;
  pawnDefaultTermMonths: number;
  pawnLoanToValuePercent: number;
  pawnSmallTicketInterestRate: number;
  pawnStandardTicketInterestRate: number;
  pawnSmallTicketLimit: number;
  pawnMiddleTicketMin: number;
  pawnMonthlyReductionForMiddleTickets: number;
  ownerMaxMakingFeeDiscount: number;
  cashierMaxMakingFeeDiscount: number;
  managerMaxMakingFeeDiscount: number;
  googleSheetsEnabled: boolean;
}

export type SystemSettingsUpdateRequest = Omit<SystemSettings, 'googleSheetsEnabled'>;

export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId?: string;
  username?: string;
  role?: string;
  ipAddress?: string;
  description?: string;
  createdAt: string;
}

export interface CartItem {
  uid: string;
  productId?: number;
  barcode?: string;
  name: string;
  weightText?: string;
  itemType: TransactionItemType;
  goldAmount?: number;
  makingFee?: number;
  discount?: number;
  price: number;
  fee?: number;
}
