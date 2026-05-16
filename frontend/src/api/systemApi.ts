import { request } from './client';
import type {
  AuditLog,
  Customer,
  DashboardSummary,
  GoldPriceResponse,
  ReportSummary,
  SystemSettings,
} from '../types';

export const systemApi = {
  dashboard: () => request<DashboardSummary>('/api/v1/dashboard'),
  goldPrice: () => request<GoldPriceResponse>('/api/v1/gold-price'),
  goldPriceHistory: () => request<Array<{ id: number; buyPrice: number; sellPrice: number; effectiveDate: string }>>('/api/v1/gold-price/history'),
  updateGoldPrice: (barBuyPrice: number, barSellPrice: number) => request('/api/v1/gold-price', {
    method: 'PUT',
    body: JSON.stringify({ barBuyPrice, barSellPrice }),
  }),
  customers: () => request<Customer[]>('/api/v1/customers'),
  createCustomer: (customer: Omit<Customer, 'id'>) => request<Customer>('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  }),
  reportDaily: () => request<ReportSummary>('/api/v1/reports/daily'),
  settings: () => request<SystemSettings>('/api/v1/system/settings'),
  auditLogs: () => request<AuditLog[]>('/api/v1/system/audit-logs'),
};
