import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomFieldDef {
  name: string;
  type: 'text' | 'number' | 'date';
  required?: boolean;
}

export interface InventoryCategory {
  id: number;
  name: string;
  custom_field_defs: CustomFieldDef[];
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryProduct {
  id: number;
  category: number;
  category_name: string;
  name: string;
  price: string;
  quantity: number;
  custom_fields: Record<string, string | number>;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'in' | 'out' | 'adjustment';

export interface InventoryMovement {
  id: number;
  product: number;
  movement_type: MovementType;
  quantity_change: number;
  balance_after: number;
  note: string;
  recorded_at: string;
}

// ─── Category endpoints ───────────────────────────────────────────────────────

export const getCategories = (): Promise<InventoryCategory[]> =>
  api.get('/inventory/categories/').then(r => r.data);

export const createCategory = (data: {
  name: string;
  custom_field_defs?: CustomFieldDef[];
}): Promise<InventoryCategory> =>
  api.post('/inventory/categories/', data).then(r => r.data);

export const updateCategory = (
  catId: number,
  data: Partial<{ name: string; custom_field_defs: CustomFieldDef[] }>,
): Promise<InventoryCategory> =>
  api.patch(`/inventory/categories/${catId}/`, data).then(r => r.data);

export const deleteCategory = (catId: number): Promise<void> =>
  api.delete(`/inventory/categories/${catId}/`).then(() => undefined);

// ─── Product endpoints ────────────────────────────────────────────────────────

export const getProducts = (catId: number): Promise<InventoryProduct[]> =>
  api.get(`/inventory/categories/${catId}/products/`).then(r => r.data);

export const createProduct = (
  catId: number,
  data: {
    name: string;
    price: string | number;
    quantity?: number;
    custom_fields?: Record<string, string | number>;
  },
): Promise<InventoryProduct> =>
  api.post(`/inventory/categories/${catId}/products/`, data).then(r => r.data);

export const updateProduct = (
  prodId: number,
  data: Partial<{ name: string; price: string | number; custom_fields: Record<string, string | number> }>,
): Promise<InventoryProduct> =>
  api.patch(`/inventory/products/${prodId}/`, data).then(r => r.data);

export const deleteProduct = (prodId: number): Promise<void> =>
  api.delete(`/inventory/products/${prodId}/`).then(() => undefined);

// ─── Movement endpoints ───────────────────────────────────────────────────────

export const getMovements = (prodId: number): Promise<InventoryMovement[]> =>
  api.get(`/inventory/products/${prodId}/movements/`).then(r => r.data);

export const recordMovement = (
  prodId: number,
  data: { movement_type: MovementType; quantity: number; note?: string },
): Promise<InventoryMovement> =>
  api.post(`/inventory/products/${prodId}/movements/`, data).then(r => r.data);
