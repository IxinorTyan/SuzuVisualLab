import { indexedDBStorage, StoredResource } from '../utils/indexedDBStorage';

export type ResourceType = 'image' | 'video' | 'sequence' | 'unknown';

export interface ResourceItem {
  id: string;
  name: string;
  type: ResourceType;
  blob: Blob | null;
  metadata?: Record<string, any>;
  createdAt: number;
  lastUsedAt: number;
}

type ResourceListener = () => void;

class ResourceStore {
  private cache: Map<string, ResourceItem> = new Map();
  private isInitialized = false;
  private listeners: Set<ResourceListener> = new Set();

  subscribe(listener: ResourceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      // Light-weight Initialization: Only load metadata index from IndexedDB via cursor
      // Real binary Blob objects are set to null and loaded on-demand via loadBlob(id)
      const metaList = await indexedDBStorage.getAllMetadata();
      metaList.forEach((item) => {
        this.cache.set(item.id, {
          id: item.id,
          name: item.name,
          type: item.type as ResourceType,
          blob: null,
          metadata: item.metadata,
          createdAt: item.createdAt,
          lastUsedAt: item.lastUsedAt
        });
      });
      this.isInitialized = true;
    } catch (e) {
      console.warn('Failed to load resource metadata from IndexedDB', e);
    }
  }

  // Load single Blob on-demand from IndexedDB by resource ID
  async loadBlob(id: string): Promise<Blob | null> {
    const item = this.cache.get(id);
    if (!item) return null;

    if (item.blob) {
      item.lastUsedAt = Date.now();
      return item.blob;
    }

    try {
      const stored = await indexedDBStorage.getResource(id);
      if (stored && stored.blob) {
        item.blob = stored.blob;
        item.lastUsedAt = Date.now();
        return stored.blob;
      }
    } catch (e) {
      console.error(`Failed to load blob on-demand for ID ${id}:`, e);
    }

    return null;
  }

  async addResource(
    name: string,
    type: ResourceType,
    blob: Blob,
    metadata?: Record<string, any>
  ): Promise<ResourceItem> {
    await this.init();

    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const item: ResourceItem = {
      id,
      name,
      type,
      blob,
      metadata,
      createdAt: now,
      lastUsedAt: now
    };

    this.cache.set(id, item);

    try {
      await indexedDBStorage.saveResource({
        id: item.id,
        name: item.name,
        type: item.type,
        blob,
        metadata: item.metadata,
        createdAt: item.createdAt,
        lastUsedAt: item.lastUsedAt
      });
    } catch (e) {
      console.error('Failed to persist resource to IndexedDB', e);
    }

    this.notify();
    return item;
  }

  getResource(id: string): ResourceItem | undefined {
    const item = this.cache.get(id);
    if (item) {
      item.lastUsedAt = Date.now();
    }
    return item;
  }

  async touchResource(id: string): Promise<void> {
    const item = this.cache.get(id);
    if (item) {
      item.lastUsedAt = Date.now();
      if (item.blob) {
        try {
          await indexedDBStorage.saveResource({
            id: item.id,
            name: item.name,
            type: item.type,
            blob: item.blob,
            metadata: item.metadata,
            createdAt: item.createdAt,
            lastUsedAt: item.lastUsedAt
          });
        } catch (e) {
          console.error('Failed to update lastUsedAt in IndexedDB', e);
        }
      }
    }
  }

  getLatestResource(type?: ResourceType): ResourceItem | undefined {
    let items = Array.from(this.cache.values());
    if (type) {
      items = items.filter((i) => i.type === type);
    }
    if (items.length === 0) return undefined;

    items.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    return items[0];
  }

  getAllResources(): ResourceItem[] {
    return Array.from(this.cache.values()).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }
}

export const resourceStore = new ResourceStore();
