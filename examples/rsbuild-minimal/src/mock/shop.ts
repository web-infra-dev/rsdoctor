export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  desc: string;
}

export interface Order {
  id: string;
  status: 'pending' | 'paid' | 'shipped';
  total: number;
  itemCount: number;
  createdAt: string;
}

export const mockProducts: Product[] = [
  {
    id: 'sku-1001',
    name: 'Air Runner',
    category: 'Shoes',
    price: 499,
    stock: 23,
    desc: 'Lightweight running shoes for daily training.',
  },
  {
    id: 'sku-1002',
    name: 'Urban Backpack',
    category: 'Bags',
    price: 299,
    stock: 52,
    desc: 'Commuter backpack with 15-inch laptop compartment.',
  },
  {
    id: 'sku-1003',
    name: 'Cloud Hoodie',
    category: 'Apparel',
    price: 199,
    stock: 17,
    desc: 'Soft fleece hoodie for all-season comfort.',
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ord-20260401-001',
    status: 'paid',
    total: 998,
    itemCount: 2,
    createdAt: '2026-04-01 10:20',
  },
  {
    id: 'ord-20260329-016',
    status: 'shipped',
    total: 299,
    itemCount: 1,
    createdAt: '2026-03-29 13:47',
  },
];
