/**
 * api.ts — Central API client for Aapno Rasto
 * Replaces all Supabase client calls with calls to your FastAPI + PostgreSQL backend.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const complaints = await api.complaints.getAll();
 */

import type { ComplaintRow, ComplaintData } from '@/services/complaintsService';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Generic fetch helper ──────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}


// ═══════════════════════════════════════════════════════════════════════════
// COMPLAINTS API
// ═══════════════════════════════════════════════════════════════════════════

export const complaintsApi = {

  /** Fetch all complaints (optionally filter by status or category) */
  getAll: (params?: { status?: string; category?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status)   qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    if (params?.limit)    qs.set('limit', String(params.limit));
    if (params?.offset)   qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return request<ComplaintRow[]>(`/api/complaints${query}`);
  },

  /** Get complaints filed by a specific user */
  getByUser: (userId: string) =>
    request<ComplaintRow[]>(`/api/complaints/user/${userId}`),

  /** Get a single complaint by ID */
  getById: (id: string) =>
    request<ComplaintRow>(`/api/complaints/${id}`),

  /** Submit a new complaint */
  create: (data: ComplaintData & { user_id?: string }) =>
    request<ComplaintRow>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update complaint status (pending → in_progress → completed | rejected) */
  updateStatus: (
    id: string,
    data: { status: string; urgency?: string; resolution_notes?: string; resolution_image_url?: string }
  ) =>
    request<ComplaintRow>(`/api/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Assign complaint to an engineer */
  assign: (id: string, engineerId: string) =>
    request<ComplaintRow>(`/api/complaints/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ engineer_id: engineerId }),
    }),

  /** Upvote a complaint */
  upvote: (id: string) =>
    request<{ id: string; upvotes: number }>(`/api/complaints/${id}/upvote`, {
      method: 'PUT',
    }),

  /** Mark as duplicate (used by AI service) */
  markDuplicate: (
    id: string,
    data: {
      is_duplicate: boolean;
      duplicate_type?: string;
      master_issue_id?: string;
      match_confidence?: number;
      match_reason?: string[];
    }
  ) =>
    request<ComplaintRow>(`/api/complaints/${id}/duplicate`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a complaint (admin only) */
  delete: (id: string) =>
    request<{ message: string }>(`/api/complaints/${id}`, { method: 'DELETE' }),
};


// ═══════════════════════════════════════════════════════════════════════════
// USERS API
// ═══════════════════════════════════════════════════════════════════════════

export interface UserPayload {
  firebase_uid?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface UserProfile {
  id: string;
  firebase_uid?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  points: number;
  avatar_url?: string;
  created_at: string;
}

export const usersApi = {
  /** Create user after Firebase login (upserts — safe to call every login) */
  createOrGet: (data: UserPayload) =>
    request<UserProfile>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get user profile by ID */
  getById: (id: string) =>
    request<UserProfile>(`/api/users/${id}`),

  /** Get user profile by email */
  getByEmail: (email: string) =>
    request<UserProfile>(`/api/users/by-email/${encodeURIComponent(email)}`),
};


// ═══════════════════════════════════════════════════════════════════════════
// AI / DUPLICATE DETECTION API
// ═══════════════════════════════════════════════════════════════════════════

export const aiApi = {
  /** Group complaints by proximity + category to find duplicates */
  groupComplaints: (
    complaints: Array<{ id: string; category: string; location: { lat: number; lng: number }; description?: string }>,
    radiusMeters = 50
  ) =>
    request<{ groups: Array<{ master_id: string; duplicate_ids: string[]; category: string }> }>(
      '/api/complaints/group',
      {
        method: 'POST',
        body: JSON.stringify({ complaints, radius_meters: radiusMeters }),
      }
    ),

  /** Compare two complaint images for similarity */
  compareImages: (image1_url: string, image2_url: string) =>
    request<{ similarity_score: number; is_duplicate: boolean; recommendation: string }>(
      '/api/images/compare',
      {
        method: 'POST',
        body: JSON.stringify({ image1_url, image2_url }),
      }
    ),
};


// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

export const healthApi = {
  check: () =>
    request<{ status: string; database: string; version: string }>('/health'),
};


// ─── Default export ────────────────────────────────────────────────────────

export const api = {
  complaints: complaintsApi,
  users: usersApi,
  ai: aiApi,
  health: healthApi,
};
