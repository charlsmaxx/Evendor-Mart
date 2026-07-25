import { create } from "zustand";

export interface MarketplaceFilters {
  q: string;
  category: string;
  city: string;
  minBudget: string;
  maxBudget: string;
  minRating: string;
  verified: boolean;
}

interface FilterState extends MarketplaceFilters {
  set: (partial: Partial<MarketplaceFilters>) => void;
  reset: () => void;
}

const initial: MarketplaceFilters = {
  q: "",
  category: "",
  city: "",
  minBudget: "",
  maxBudget: "",
  minRating: "",
  verified: false,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initial,
  set: (partial) => set((s) => ({ ...s, ...partial })),
  reset: () => set(initial),
}));
