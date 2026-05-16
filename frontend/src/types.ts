export type Role = 'OWNER' | 'MANAGER' | 'CASHIER';
export type ProductStatus = 'AVAILABLE' | 'SOLD' | 'PAWNED' | 'MELTED' | 'RETURNED_TO_ARTISAN';
export type TransactionType = 'SELL' | 'BUY' | 'TRADE_IN';
export type TransactionItemType = 'SELL' | 'BUY';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'PROMPTPAY' | 'CREDIT_CARD';
export type PawnStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
export type PawnActionType = 'CREATE' | 'RENEW' | 'ADJUST_PRINCIPAL' | 'REDEEM' | 'EXPIRE';

export interface User {
  id: number;
  username: string;
  fullName: string;
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

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category: string;
  weightGram: number;
  weightText?: string;
  costFee?: number;
  status: ProductStatus;
  createdAt?: string;
}

export interface ProductRequest {
  barcode?: string;
  name: string;
  category: string;
  weightGram: number;
  weightText?: string;
  costFee?: number;
  status?: ProductStatus;
}

export interface Customer {
  id: number;
  fullName: string;
  phoneNumber?: string;
  idCardNumber?: string;
  address?: string;
  createdAt?: string;
}

export interface CheckoutItemRequest {
  productId?: number;
  itemType: TransactionItemType;
  price: number;
  fee?: number;
}

export interface CheckoutRequest {
  customerId?: number;
  items: CheckoutItemRequest[];
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
  transactionDate: string;
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

export interface SystemSettings {
  gramsPerBaht: number;
  wearDeductionPercent: number;
  pawnDefaultTermMonths: number;
  cashierMaxMakingFeeDiscount: number;
  managerMaxMakingFeeDiscount: number;
  googleSheetsEnabled: boolean;
}

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
  name: string;
  weightText?: string;
  itemType: TransactionItemType;
  price: number;
  fee?: number;
}
