import React, { useEffect, useState } from 'react';
import { fetchProducts, initializeCheckout } from '../services/api';
import type { Product, CartItem, User } from '../services/api';
import { useNavigate } from 'react-router-dom';

const TOKEN_EXCHANGE_RATE = 10; // $1 USD = 10 Custom Tokens

interface StorefrontScreenProps {
  user: User;
  onLogout: () => void;
}

export const StorefrontScreen: React.FC<StorefrontScreenProps> = ({ user, onLogout }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  const customerWallet = "11111111111111111111111111111111";

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalUSD = cart.reduce((sum, item) => sum + item.product.priceUSD * item.quantity, 0);
  const totalTokens = totalUSD * TOKEN_EXCHANGE_RATE;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      setIsCheckingOut(true);
      const formattedItems = cart.map((item) => ({
        productId: item.product._id,
        quantity: item.quantity,
      }));

      const userId = user.userId;

      const response = await initializeCheckout(
        userId,
        customerWallet,
        formattedItems
      );
      
      // Store order details in session storage
      sessionStorage.setItem('current_order', JSON.stringify(response));
      
      navigate('/payment');

    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (loading) return <div className="text-center p-12 text-gray-400">Loading catalog...</div>;
  if (error) return <div className="text-center p-12 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 max-w-7xl mx-auto">
      {/* Top Header displaying Username and Admin options */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-400">Decentralized Storefront</h1>
          <p className="text-sm text-gray-400">Pay securely with custom SPL tokens via Solana Pay</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {user.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="bg-purple-600/30 text-purple-300 border border-purple-500/50 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-purple-600/50 transition"
            >
              🛡️ Admin Portal
            </button>
          )}
          
          <div className="text-sm bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center space-x-2">
            <span className="text-gray-400 font-medium">👤 User:</span>
            <span className="font-semibold text-purple-300">{user.username}</span>
          </div>

          <button
            onClick={onLogout}
            className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-sm hover:bg-red-500/30 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((product) => (
            <div key={product._id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
              <img src={product.imageUrl} alt={product.name} className="h-48 w-full object-cover" />
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                <p className="text-gray-400 text-sm mb-4 flex-grow">{product.description}</p>
                <div className="flex justify-between items-center mt-auto">
                  <div>
                    <span className="text-xl font-bold text-green-400">${product.priceUSD.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 block">({product.priceUSD * TOKEN_EXCHANGE_RATE} Tokens)</span>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold text-sm transition"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Shopping Cart Drawer / Summary */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 h-fit sticky top-6">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Your Shopping Cart</h2>
          {cart.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">Your cart is empty.</p>
          ) : (
            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div key={item.product._id} className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-sm">{item.product.name}</h4>
                    <span className="text-xs text-gray-400">${item.product.priceUSD} x {item.quantity}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => updateQuantity(item.product._id, -1)} className="bg-gray-700 px-2 py-1 rounded text-xs">-</button>
                    <span className="text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product._id, 1)} className="bg-gray-700 px-2 py-1 rounded text-xs">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-700 pt-4 space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total USD:</span>
              <span className="font-bold">${totalUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-purple-300">
              <span>Token Total:</span>
              <span>{totalTokens.toLocaleString()} Tokens</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {isCheckingOut ? 'Initializing Checkout...' : 'Proceed to Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
};