import { request } from './client';
import type {
  PawnActionRequest,
  PawnHistory,
  PawnInterestSuggestion,
  PawnTicket,
  PawnTicketRequest,
} from '../types';

export interface PawnableItem {
  id: string;
  name: string;
  category: string;
}

export const pawnApi = {
  createTicket: (data: PawnTicketRequest) => request<PawnTicket>('/api/v1/pawn/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTickets: () => request<PawnTicket[]>('/api/v1/pawn/tickets'),
  redeem: (id: number) => request<PawnTicket>(`/api/v1/pawn/redeem/${id}`, { method: 'POST' }),
  getSummary: () => request<{ activeCount: number; nearDueCount: number; totalPrincipal: number }>('/api/v1/pawn/summary'),
  performAction: (id: number, data: PawnActionRequest) => request<PawnTicket>(`/api/v1/pawn/${id}/action`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getHistory: (id: number) => request<PawnHistory[]>(`/api/v1/pawn/${id}/history`),
  getInterestSuggestion: (id: number) => request<PawnInterestSuggestion>(`/api/v1/pawn/${id}/interest-suggestion`),
  getPawnableItems: () => request<PawnableItem[]>('/api/v1/sheets/pawnable-items'),
};
