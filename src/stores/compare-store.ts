import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CompareItem = {
  listingId: string;
  vendorId: string;
  type?: "VENUE" | "SERVICE";
};

type AddResult = "added" | "duplicate" | "same-vendor" | "full";

interface CompareState {
  items: CompareItem[];
  add: (listingId: string, vendorId: string, type?: "VENUE" | "SERVICE") => AddResult;
  remove: (listingId: string) => void;
  clear: () => void;
  vendorIds: () => string[];
  listingIds: () => string[];
}

const MAX_COMPARE = 3;

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      vendorIds: () => get().items.map((i) => i.vendorId),
      listingIds: () => get().items.map((i) => i.listingId),
      add: (listingId, vendorId, type) => {
        const current = get().items;
        if (current.some((i) => i.listingId === listingId)) return "duplicate";
        if (current.some((i) => i.vendorId === vendorId)) return "same-vendor";
        const item = { listingId, vendorId, type };
        if (current.length >= MAX_COMPARE) {
          set({ items: [...current.slice(1), item] });
          return "added";
        }
        set({ items: [...current, item] });
        return "added";
      },
      remove: (listingId) =>
        set({ items: get().items.filter((i) => i.listingId !== listingId) }),
      clear: () => set({ items: [] }),
    }),
    { name: "evendor-compare-v2" }
  )
);
