import { create } from 'zustand';
import type { CartItem, GoldPriceResponse } from '../types';

interface StoreState {
  goldPrice: GoldPriceResponse & {
    buy: number;
    sell: number;
  };
  setGoldPriceFromApi: (data: GoldPriceResponse) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (uid: string) => void;
  clearCart: () => void;
}

const parsePrice = (price: string | null) => {
  if (!price) {
    return 0;
  }
  return Number(price.replace(/,/g, ''));
};

export const useStore = create<StoreState>((set) => ({
  goldPrice: {
    bar: { buy: '0', sell: '0' },
    ornament: { buy: '0', sell: '0' },
    updateTime: '',
    buy: 0,
    sell: 0,
  },
  setGoldPriceFromApi: (data) => set({
    goldPrice: {
      ...data,
      buy: parsePrice(data.bar.buy),
      sell: parsePrice(data.bar.sell),
    },
  }),
  cart: [],
  addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
  removeFromCart: (uid) => set((state) => ({ cart: state.cart.filter((item) => item.uid !== uid) })),
  clearCart: () => set({ cart: [] }),
}));
