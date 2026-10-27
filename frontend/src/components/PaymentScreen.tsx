import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MERCHANT_WALLET = '8iwQM2hdFeDqdskgoE8CJGPdh4PK73AhGSuu6pKgte6c';
const CUSTOM_TOKEN_MINT = '8wy77GbnLEnyHsyC33ukJVbTRuiXVxDSrwQbyrrnjLMk';

interface OrderData {
  orderId: string;
  referenceKey: string;
  tokenAmountRequired: number;
}

export const PaymentScreen: React.FC = () => {
  const navigate = useNavigate();

  const [orderData] = useState<OrderData | null>(() => {
    const storedOrder = sessionStorage.getItem('current_order');
    return storedOrder ? JSON.parse(storedOrder) : null;
  });

  const [status, setStatus] = useState<string>('Awaiting payment confirmation from network...');
  const [isPaid, setIsPaid] = useState<boolean>(false);

  useEffect(() => {
    if (!orderData) {
      alert('No active order found.');
      navigate('/shop');
      return;
    }

    // Set up polling to check backend for payment verification every 3 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:5000/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.orderId,
            referenceKey: orderData.referenceKey
          })
        });

        const result = await response.json();

        if (result.verified) {
          setIsPaid(true);
          setStatus('Payment verified! Order completed successfully.');
          clearInterval(interval);
          sessionStorage.removeItem('current_order');
          
          // Redirect back to shop after brief success message
          setTimeout(() => navigate('/shop'), 3000);
        }
      } catch (err) {
        console.log(err); // Silently ignore network errors during polling; keep trying
      }
    }, 3000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [orderData, navigate]);

  if (!orderData) return <div className="text-white p-6">Loading order details...</div>;

  // Generate the standard Solana Pay URI
  const solanaPayUri = `solana:${MERCHANT_WALLET}?amount=${orderData.tokenAmountRequired}&spl-token=${CUSTOM_TOKEN_MINT}&reference=${orderData.referenceKey}&label=Web3+Storefront&message=Order+${orderData.orderId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(solanaPayUri);
    alert('Solana Pay URI copied to clipboard!');
  };

  const handleRedirectToCustomWallet = () => {
    const returnUrl = encodeURIComponent(window.location.href);
    // Redirects to your custom wallet app running on port 5173 with URI & return route
    window.location.href = `https://web-solana-wallet-8m1087vcg-umer-061c.vercel.app/pay?uri=${encodeURIComponent(solanaPayUri)}&redirect=${returnUrl}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-purple-400 mb-6">Solana Pay Checkout</h1>
      
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Order ID:</span>
          <span className="font-mono text-xs">{orderData.orderId}</span>
        </div>
        <div className="border-t border-gray-700 pt-4 flex justify-between font-bold text-lg">
          <span>Total Due:</span>
          <span className="text-green-400">{orderData.tokenAmountRequired} Tokens</span>
        </div>
      </div>

      {!isPaid ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center space-y-4">
          <p className="text-sm text-gray-300">
            Click below to open your custom web wallet and authorize this payment securely.
          </p>

          <button
            onClick={handleRedirectToCustomWallet}
            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition shadow-lg shadow-purple-900/40"
          >
            Pay with My Custom Web Wallet
          </button>
          
          <div className="bg-black p-3 rounded text-xs font-mono text-gray-400 break-all text-left">
            {solanaPayUri}
          </div>

          <button
            onClick={copyToClipboard}
            className="w-full bg-gray-700 hover:bg-gray-600 py-2.5 rounded-lg text-sm font-medium transition"
          >
            Copy Solana Pay URI manually
          </button>

          <div className="pt-4 border-t border-gray-700 flex items-center justify-center space-x-3">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-purple-400">{status}</p>
          </div>
        </div>
      ) : (
        <div className="bg-green-900 border border-green-500 rounded-xl p-6 text-center">
          <p className="text-lg font-bold text-green-300">{status}</p>
          <p className="text-sm text-green-400 mt-2">Redirecting to storefront...</p>
        </div>
      )}
    </div>
  );
};