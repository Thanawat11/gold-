import { request } from './client';
import type {
  AuditLog,
  Customer,
  CustomerProfileResponse,
  CustomerRequest,
  DashboardSummary,
  GoldPriceHistoryItem,
  GoldPriceResponse,
  GoldPriceUpdateRequest,
  OwnerReportResponse,
  ReportPeriod,
  ReportSummary,
  SystemSettings,
  SystemSettingsUpdateRequest,
} from '../types';

export const systemApi = {
  dashboard: () => request<DashboardSummary>('/api/v1/dashboard'),
  goldPrice: () => request<GoldPriceResponse>('/api/v1/gold-price'),
  goldPriceHistory: () => request<GoldPriceHistoryItem[]>('/api/v1/gold-price/history'),
  updateGoldPrice: (payload: GoldPriceUpdateRequest) => request('/api/v1/gold-price', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  customers: () => request<Customer[]>('/api/v1/customers'),
  customerProfile: (id: number) => request<CustomerProfileResponse>(`/api/v1/customers/${id}/profile`),
  createCustomer: (customer: CustomerRequest) => request<Customer>('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  }),
  updateCustomer: (id: number, customer: CustomerRequest) => request<Customer>(`/api/v1/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  }),
  reportDaily: () => request<ReportSummary>('/api/v1/reports/daily'),
  ownerReport: (params: { from: string; to: string; period: ReportPeriod }) => {
    const searchParams = new URLSearchParams(params);
    return request<OwnerReportResponse>(`/api/v1/reports/owner?${searchParams.toString()}`);
  },
  settings: () => request<SystemSettings>('/api/v1/system/settings'),
  updateSettings: (payload: SystemSettingsUpdateRequest) => request<SystemSettings>('/api/v1/system/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  auditLogs: () => request<AuditLog[]>('/api/v1/system/audit-logs'),
};
