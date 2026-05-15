import { create } from 'zustand';

interface PriceDetail {
  buy: string;
  sell: string;
}

interface StoreState {
  goldPrice: {
    bar: PriceDetail;
    ornament: PriceDetail;
    updatedAt: string;
    // Legacy mapping (pointing to bar)
    buy: number;
    sell: number;
  };
  setGoldPriceFromApi: (data: any) => void;
  
  cart: any[];
  addToCart: (item: any) => void;
  clearCart: () => void;
}

const parsePrice = (priceStr: string) => {
  if (!priceStr || priceStr === 'N/A') return 0;
  return parseFloat(priceStr.replace(/,/g, ''));
};

export const useStore = create<StoreState>((set) => ({
  goldPrice: {
    bar: { buy: '0', sell: '0' },
    ornament: { buy: '0', sell: '0' },
    updatedAt: new Date().toISOString(),
    buy: 0,
    sell: 0,
  },
  setGoldPriceFromApi: (data) => set({ 
    goldPrice: { 
      bar: data.bar,
      ornament: data.ornament,
      updatedAt: data.updateTime || new Date().toISOString(),
      buy: parsePrice(data.bar.buy),
      sell: parsePrice(data.bar.sell),
    } 
  }),
  
  cart: [],
  addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
  clearCart: () => set({ cart: [] }),
}));
