const API_BASE_URL = 'http://localhost:5000/api';

export interface Product {
  _id: string;
  name: string;
  description: string;
  priceUSD: number;
  imageUrl: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const fetchProducts = async (): Promise<Product[]> => {
  const response = await fetch(`${API_BASE_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
};

export const initializeCheckout = async (customerWallet: string, items: { productId: string; quantity: number }[]) => {
  const response = await fetch(`${API_BASE_URL}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerWallet, items }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Checkout initialization failed');
  }
  
  return response.json();
};