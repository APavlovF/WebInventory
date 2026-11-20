// src/data/InventoryContext.ts
// ONE shared inventory store for the whole app. Before, MainFrame and MapCanvas each called
// useInventory() and fetched the same data twice. In demo mode two copies would also hold
// different data, so everything must read from this single context.
import { createContext, useContext } from 'react';
import type { useInventory } from '../features/workshop/UseInventory';

export type InventoryStore = ReturnType<typeof useInventory>;

export const InventoryContext = createContext<InventoryStore | null>(null);

export function useInventoryStore(): InventoryStore {
    const store = useContext(InventoryContext);
    if (!store) throw new Error('useInventoryStore must be used inside <InventoryContext.Provider>');
    return store;
}
