import React, { useEffect, useState } from 'react';
import { 
  fetchAdminOrders, 
  addAdminProduct, 
  updateAdminProduct,
  deleteAdminProduct, 
  fetchProducts 
} from '../services/api';
import type { 
  Order, 
  Product, 
  User 
} from '../services/api';

interface AdminDashboardProps {
  user: User;
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onBackToStore }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Track stock input edits per product ID
  const [stockInputs, setStockInputs] = useState<{ [key: string]: number }>({});

  // New product form state
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    description: '', 
    priceUSD: '', 
    imageUrl: '', 
    stock: '' 
  });

  // Helper for refreshing data after admin actions (adding/deleting/updating stock)
  const refreshData = async () => {
    try {
      const [ordersData, productsData] = await Promise.all([
        fetchAdminOrders(),
        fetchProducts()
      ]);
      setOrders(ordersData);
      setProducts(productsData);

      const initialStock: { [key: string]: number } = {};
      productsData.forEach((p) => {
        initialStock[p._id] = p.stock;
      });
      setStockInputs(initialStock);
    } catch (err) {
      console.error('Failed to refresh admin data', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        const [ordersData, productsData] = await Promise.all([
          fetchAdminOrders(),
          fetchProducts()
        ]);

        if (isMounted) {
          setOrders(ordersData);
          setProducts(productsData);

          const initialStock: { [key: string]: number } = {};
          productsData.forEach((p) => {
            initialStock[p._id] = p.stock;
          });
          setStockInputs(initialStock);
        }
      } catch (err) {
        console.error('Failed to load admin data', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAdminProduct({
        name: newProduct.name,
        description: newProduct.description,
        priceUSD: Number(newProduct.priceUSD),
        imageUrl: newProduct.imageUrl,
        stock: Number(newProduct.stock)
      });
      setNewProduct({ name: '', description: '', priceUSD: '', imageUrl: '', stock: '' });
      await refreshData();
      alert('Product added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add product');
    }
  };

  const handleUpdateStock = async (productId: string) => {
    const newStock = stockInputs[productId];
    if (newStock === undefined || newStock < 0) return;

    try {
      await updateAdminProduct(productId, { stock: Number(newStock) });
      await refreshData();
      alert('Stock updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update stock');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteAdminProduct(id);
        await refreshData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Admin Portal
            </h1>
            <p className="text-gray-400 text-sm">Logged in as admin: <span className="text-purple-300">{user.username}</span></p>
          </div>
          <button
            onClick={onBackToStore}
            className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            ← Back to Storefront
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading admin data...</div>
        ) : (
          <div className="space-y-8">
            {/* Inventory Management */}
            <div className="bg-[#131b2e] border border-gray-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-purple-300">Inventory Management</h2>
              
              {/* Add Product Form */}
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-[#0b0f19] p-4 rounded-xl border border-gray-800">
                <input
                  type="text" placeholder="Product Name" required
                  value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="bg-gray-900 border border-gray-700 p-2 rounded text-sm text-white"
                />
                <input
                  type="number" placeholder="Price (USD)" required
                  value={newProduct.priceUSD} onChange={e => setNewProduct({...newProduct, priceUSD: e.target.value})}
                  className="bg-gray-900 border border-gray-700 p-2 rounded text-sm text-white"
                />
                <input
                  type="number" placeholder="Stock Quantity" required
                  value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                  className="bg-gray-900 border border-gray-700 p-2 rounded text-sm text-white"
                />
                <input
                  type="text" placeholder="Image URL" required
                  value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                  className="bg-gray-900 border border-gray-700 p-2 rounded text-sm text-white md:col-span-2"
                />
                <input
                  type="text" placeholder="Description" required
                  value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  className="bg-gray-900 border border-gray-700 p-2 rounded text-sm text-white md:col-span-3"
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded text-sm font-semibold md:col-span-3">
                  + Add New Product
                </button>
              </form>

              {/* Product List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Stock Management</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {products.map((p) => (
                      <tr key={p._id}>
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3">${p.priceUSD.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              value={stockInputs[p._id] ?? p.stock}
                              onChange={(e) => setStockInputs({ ...stockInputs, [p._id]: Number(e.target.value) })}
                              className="w-20 bg-gray-900 border border-gray-700 p-1.5 rounded text-sm text-white"
                            />
                            <button
                              onClick={() => handleUpdateStock(p._id)}
                              className="bg-blue-600/30 text-blue-300 border border-blue-500/50 px-2.5 py-1.5 rounded text-xs hover:bg-blue-600/50 transition font-medium"
                            >
                              Update Stock
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteProduct(p._id)}
                            className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/30 text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Audit Logs */}
            <div className="bg-[#131b2e] border border-gray-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-purple-300">Timestamped Purchase Audit Log</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Total USD</th>
                      <th className="p-3">Tokens Paid</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {orders.map((order) => (
                      <tr key={order._id}>
                        <td className="p-3 text-gray-400 text-xs">
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-medium text-purple-300">
                          {typeof order.userId === 'object' && order.userId !== null ? order.userId.username : 'Unknown User'}
                        </td>
                        <td className="p-3">${order.totalUSD?.toFixed(2)}</td>
                        <td className="p-3 text-indigo-300">{order.tokenAmountRequired} Tokens</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs uppercase font-semibold ${
                            order.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};