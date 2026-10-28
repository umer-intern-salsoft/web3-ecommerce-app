const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://react.customdev.solutions:5000/api';

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

export interface User {
  userId: string;
  username: string;
  role: 'customer' | 'admin';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  userId: string;
  username: string;
  role: 'customer' | 'admin';
}

export interface OrderItem {
  productId: Product | string;
  quantity: number;
}

export interface Order {
  _id: string;
  userId: { _id: string; username: string } | string;
  customerWallet: string;
  items: OrderItem[];
  totalUSD: number;
  tokenAmountRequired: number;
  referenceKey: string;
  status: 'pending' | 'paid';
  createdAt: string;
}

export interface AdminWalletBalanceResponse {
  solBalance: number;
  tokenBalance: number;
  merchantWallet: string;
}

// --- STOREFRONT PRODUCTS ---
export const fetchProducts = async (): Promise<Product[]> => {
  const response = await fetch(`${API_BASE_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
};

// --- AUTHENTICATION ---
export const loginUser = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  return data;
};

export const signupUser = async (username: string, password: string, role = 'customer'): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Signup failed');
  return data;
};

// --- CHECKOUT & PAYMENT ---
export const initializeCheckout = async (
  userId: string,
  customerWallet: string,
  items: { productId: string; quantity: number }[]
) => {
  const response = await fetch(`${API_BASE_URL}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, customerWallet, items }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Checkout initialization failed');
  }

  return response.json();
};

export const verifyPayment = async (orderId: string, referenceKey: string) => {
  const response = await fetch(`${API_BASE_URL}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, referenceKey }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Verification failed');
  return data;
};

// --- USER ORDER HISTORY ---
export const fetchUserOrders = async (userId: string): Promise<Order[]> => {
  const response = await fetch(`${API_BASE_URL}/orders/user/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user order history');
  return response.json();
};

// --- ADMIN PORTAL ---
export const fetchAdminWalletBalance = async (): Promise<AdminWalletBalanceResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/wallet-balance`);
  if (!response.ok) throw new Error('Failed to fetch wallet balance');
  return response.json();
};

export const fetchAdminOrders = async (): Promise<Order[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/orders`);
  if (!response.ok) throw new Error('Failed to fetch audit logs');
  return response.json();
};

export const addAdminProduct = async (productData: Omit<Product, '_id'>): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  if (!response.ok) throw new Error('Failed to add product');
  return response.json();
};

export const updateAdminProduct = async (productId: string, productData: Partial<Product>): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  if (!response.ok) throw new Error('Failed to update product');
  return response.json();
};

export const deleteAdminProduct = async (productId: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete product');
  return response.json();
};