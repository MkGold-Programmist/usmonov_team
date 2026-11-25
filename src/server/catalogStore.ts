import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  BLUEPRINT_CONSTRAINTS,
  validateProductInput,
  type GearProduct,
  type ProductCategory,
  type ProductInput,
} from '../utils/storeLogic';
import { INITIAL_PRODUCTS } from '../data/seedData';

export interface CatalogChangeEvent {
  reason: string;
  productId?: string;
  products: GearProduct[];
  updatedAt: string;
}

export type CatalogSubscriber = (event: CatalogChangeEvent) => void;

export const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function resolveSafeChildPath(baseDir: string, unsafeFilename: string): string {
  const normalizedBase = path.resolve(baseDir);
  const cleanName = path.basename(String(unsafeFilename || '').replace(/\0/g, ''));
  if (!cleanName || cleanName === '.' || cleanName === '..') {
    throw new Error('Некорректное имя файла.');
  }
  const resolved = path.resolve(normalizedBase, cleanName);
  if (!resolved.startsWith(normalizedBase + path.sep)) {
    throw new Error('Нарушение границ каталога при сохранении файла.');
  }
  return resolved;
}

export function sanitizeUploadExtension(rawExt: string): string {
  const lower = String(rawExt || '').toLowerCase();
  if (ALLOWED_IMAGE_EXTENSIONS.has(lower)) {
    return lower === '.jpeg' ? '.jpg' : lower;
  }
  return '.jpg';
}

export class CatalogStore {
  private readonly dataFilePath: string;
  private readonly uploadsDir: string;
  private products: GearProduct[] = [];
  private updatedAt: string = new Date().toISOString();
  private subscribers = new Set<CatalogSubscriber>();

  constructor(options?: {
    dataFilePath?: string;
    uploadsDir?: string;
    initialProducts?: GearProduct[];
  }) {
    this.dataFilePath = path.resolve(
      options?.dataFilePath ?? path.join(process.cwd(), 'data', 'catalog.json')
    );
    this.uploadsDir = path.resolve(
      options?.uploadsDir ?? path.join(process.cwd(), 'uploads', 'products')
    );
    this.ensureDirectories();
    this.loadOrSeed(options?.initialProducts ?? INITIAL_PRODUCTS);
  }

  private ensureDirectories(): void {
    fs.mkdirSync(path.dirname(this.dataFilePath), { recursive: true });
    fs.mkdirSync(this.uploadsDir, { recursive: true });
  }

  private loadOrSeed(fallbackProducts: GearProduct[]): void {
    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 0) {
          this.products = parsed.map((p) => this.normalizeRecord(p));
          this.updatedAt = new Date().toISOString();
          return;
        }
      } catch (err) {
        console.warn('Catalog file corrupted or unreadable, restoring defaults:', err);
      }
    }
    this.products = fallbackProducts.map((p) => ({ ...p }));
    this.persistSync();
  }

  private normalizeRecord(raw: Partial<GearProduct>): GearProduct {
    const category = BLUEPRINT_CONSTRAINTS.CATEGORIES.includes(raw.category as ProductCategory)
      ? (raw.category as ProductCategory)
      : 'Accessories';
    const nowIso = new Date().toISOString();
    return {
      id: String(raw.id || `p_${Date.now().toString(36)}`).slice(0, 60),
      name: String(raw.name || 'Товар UsmonovTeam').slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_NAME_MAX),
      category,
      price: Math.max(0, Math.round(Number(raw.price || 0) * 100) / 100),
      stock: Math.max(0, Math.floor(Number(raw.stock ?? 0))),
      variants: String(raw.variants || 'Стандарт').slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_VARIANTS_MAX),
      sizes: String(raw.sizes || 'Standard').slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_SIZES_MAX),
      imageKey: String(raw.imageKey || 'studio_rashguard').slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_IMAGE_MAX),
      description: String(raw.description || 'Экипировка UsmonovTeam').slice(
        0,
        BLUEPRINT_CONSTRAINTS.PRODUCT_DESC_MAX
      ),
      featured: Boolean(raw.featured),
      updatedBy: String(raw.updatedBy || 'system').slice(0, 128),
      createdAt: String(raw.createdAt || nowIso),
      updatedAt: String(raw.updatedAt || nowIso),
    };
  }

  private persistSync(): void {
    this.ensureDirectories();
    const tmpPath = `${this.dataFilePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.products, null, 2), 'utf-8');
    fs.renameSync(tmpPath, this.dataFilePath);
    this.updatedAt = new Date().toISOString();
  }

  private emit(reason: string, productId?: string): void {
    const snapshot = this.listProducts();
    const payload: CatalogChangeEvent = {
      reason,
      productId,
      products: snapshot,
      updatedAt: this.updatedAt,
    };
    for (const listener of this.subscribers) {
      try {
        listener(payload);
      } catch {
        // Ignore broken listener
      }
    }
  }

  public subscribe(listener: CatalogSubscriber): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  public getUploadsDir(): string {
    return this.uploadsDir;
  }

  public getUpdatedAt(): string {
    return this.updatedAt;
  }

  public listProducts(): GearProduct[] {
    return this.products.map((p) => ({ ...p }));
  }

  public getProductById(id: string): GearProduct | null {
    const found = this.products.find((p) => p.id === id);
    return found ? { ...found } : null;
  }

  public saveUploadedImage(buffer: Buffer, extensionHint = '.jpg'): string {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('Пустой файл изображения.');
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Размер изображения превышает 10 МБ.');
    }
    const ext = sanitizeUploadExtension(extensionHint);
    const filename = `tg_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const targetPath = resolveSafeChildPath(this.uploadsDir, filename);
    fs.writeFileSync(targetPath, buffer);
    return `/uploads/products/${filename}`;
  }

  public createProduct(
    input: ProductInput,
    updatedBy = 'owner_telegram'
  ): { ok: true; product: GearProduct } | { ok: false; error: string } {
    const check = validateProductInput(input);
    if (!check.valid || !check.sanitized) {
      return { ok: false, error: check.error || 'Некорректные данные товара.' };
    }
    const nowIso = new Date().toISOString();
    const id = `p_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
    const created: GearProduct = {
      id,
      ...check.sanitized,
      updatedBy: updatedBy.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'owner_telegram',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.products.unshift(created);
    this.persistSync();
    this.emit('product:created', created.id);
    return { ok: true, product: { ...created } };
  }

  public updateProduct(
    id: string,
    patch: Partial<ProductInput>,
    updatedBy = 'owner_telegram'
  ): { ok: true; product: GearProduct } | { ok: false; error: string } {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx < 0) {
      return { ok: false, error: 'Товар не найден в каталоге.' };
    }
    const existing = this.products[idx];
    const merged: ProductInput = {
      name: patch.name !== undefined ? patch.name : existing.name,
      category: patch.category !== undefined ? patch.category : existing.category,
      price: patch.price !== undefined ? patch.price : existing.price,
      stock: patch.stock !== undefined ? patch.stock : existing.stock,
      variants: patch.variants !== undefined ? patch.variants : existing.variants,
      sizes: patch.sizes !== undefined ? patch.sizes : existing.sizes,
      imageKey: patch.imageKey !== undefined ? patch.imageKey : existing.imageKey,
      description: patch.description !== undefined ? patch.description : existing.description,
      featured: patch.featured !== undefined ? patch.featured : existing.featured,
    };
    const check = validateProductInput(merged);
    if (!check.valid || !check.sanitized) {
      return { ok: false, error: check.error || 'Некорректные параметры товара.' };
    }
    const updated: GearProduct = {
      ...existing,
      ...check.sanitized,
      updatedBy: updatedBy.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'owner_telegram',
      updatedAt: new Date().toISOString(),
    };
    this.products[idx] = updated;
    this.persistSync();
    this.emit('product:updated', updated.id);
    return { ok: true, product: { ...updated } };
  }

  public adjustStock(
    id: string,
    deltaOrExact: { delta?: number; exact?: number },
    updatedBy = 'owner_telegram'
  ): { ok: true; product: GearProduct } | { ok: false; error: string } {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx < 0) {
      return { ok: false, error: 'Товар не найден в каталоге.' };
    }
    const existing = this.products[idx];
    const nextStock =
      deltaOrExact.exact !== undefined
        ? Math.floor(deltaOrExact.exact)
        : Math.floor(existing.stock + (deltaOrExact.delta ?? 0));

    if (!Number.isFinite(nextStock) || nextStock < 0 || nextStock > 100000) {
      return { ok: false, error: 'Количество должно быть целым числом от 0 до 100 000.' };
    }
    return this.updateProduct(id, { stock: nextStock }, updatedBy);
  }

  public deleteProduct(id: string): { ok: true; deleted: GearProduct } | { ok: false; error: string } {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx < 0) {
      return { ok: false, error: 'Товар не найден или уже удалён.' };
    }
    const [removed] = this.products.splice(idx, 1);
    this.persistSync();
    this.emit('product:deleted', removed.id);
    return { ok: true, deleted: { ...removed } };
  }

  public decrementStockForOrder(
    items: Array<{ productId: string; quantity: number }>
  ): boolean {
    if (!Array.isArray(items) || items.length === 0) return false;
    let changed = false;
    const nowIso = new Date().toISOString();

    for (const line of items) {
      const qty = Math.floor(Number(line.quantity || 0));
      if (!line.productId || qty <= 0) continue;
      const idx = this.products.findIndex((p) => p.id === line.productId);
      if (idx >= 0) {
        const nextStock = Math.max(0, this.products[idx].stock - qty);
        if (nextStock !== this.products[idx].stock) {
          this.products[idx] = {
            ...this.products[idx],
            stock: nextStock,
            updatedBy: 'order_checkout',
            updatedAt: nowIso,
          };
          changed = true;
        }
      }
    }

    if (changed) {
      this.persistSync();
      this.emit('order:stock_decremented');
    }
    return changed;
  }
}
