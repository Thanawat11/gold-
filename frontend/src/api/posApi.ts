import { request } from './client';
import type {
  CheckoutRequest,
  PriceQuoteRequest,
  PriceQuoteResponse,
  Product,
  ProductRequest,
  Transaction,
} from '../types';

export const posApi = {
  searchByBarcode: (barcode: string) => request<Product>(`/api/v1/products/barcode/${encodeURIComponent(barcode)}`),
  checkout: (data: CheckoutRequest) => request<Transaction>('/api/v1/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getProducts: () => request<Product[]>('/api/v1/products'),
  getAvailableProducts: () => request<Product[]>('/api/v1/products/available'),
  createProduct: (data: ProductRequest) => request<Product>('/api/v1/products', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  quoteSell: (data: PriceQuoteRequest) => request<PriceQuoteResponse>('/api/v1/pricing/sell', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  quoteBuy: (data: PriceQuoteRequest) => request<PriceQuoteResponse>('/api/v1/pricing/buy', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  quoteTradeIn: (data: PriceQuoteRequest) => request<PriceQuoteResponse>('/api/v1/pricing/trade-in', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
