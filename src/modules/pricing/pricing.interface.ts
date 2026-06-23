export interface PriceLineItem {
  name: string;
  type: 'base' | 'ingredient';
  unitPriceCents: number;
  quantita: number;
  totalPriceCents: number;
}

export interface PriceBreakdown {
  basePriceCents: number;
  items: PriceLineItem[];
  subtotalCents: number;
  totalCents: number;
}