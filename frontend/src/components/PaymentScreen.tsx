import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { useNavigate } from 'react-router-dom';

const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const MERCHANT_WALLET = 'YOUR_MERCHANT_WALLET_PUBKEY_HERE';
const CUSTOM_TOKEN_MINT = 'YOUR_CUSTOM_SPL_TOKEN_MINT_HERE';
const TOKEN_DECIMALS = 9;

interface OrderData {
  orderId: string;
  referenceKey: string;
  tokenTotal: number;
}

export const PaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const customerWalletPubkey = localStorage.getItem('wallet_pubkey');

  // Lazy state initialization prevents the "set-state-in-effect" lint error
  const [orderData] = useState<OrderData | null>(() => {
    const storedOrder = sessionStorage.getItem('current_order');
    return storedOrder ? JSON.parse(storedOrder) : null;
  });

  const [status, setStatus] = useState<string>('Ready for payment');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!orderData) {
      alert('No active order found. Please select items from the shop first.');
      navigate('/shop');
    }
  }, [orderData, navigate]);

  const handleSolanaPayTransfer = async () => {
    if (!customerWalletPubkey || !orderData) return;

    try {
      setLoading(true);
      setStatus('Connecting to Solana network...');

      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const buyerPubkey = new PublicKey(customerWalletPubkey);
      const merchantPubkey = new PublicKey(MERCHANT_WALLET);
      const mintPubkey = new PublicKey(CUSTOM_TOKEN_MINT);

      const buyerATA = await getAssociatedTokenAddress(mintPubkey, buyerPubkey);
      const merchantATA = await getAssociatedTokenAddress(mintPubkey, merchantPubkey);

      setStatus('Building transaction instruction...');

      const rawAmount = BigInt(orderData.tokenTotal * Math.pow(10, TOKEN_DECIMALS));
      const transaction = new Transaction();

      const transferInstruction = createTransferCheckedInstruction(
        buyerATA,
        mintPubkey,
        merchantATA,
        buyerPubkey,
        rawAmount,
        TOKEN_DECIMALS,
        []
      );

      transferInstruction.keys.push({
        pubkey: new PublicKey(orderData.referenceKey),
        isSigner: false,
        isWritable: false,
      });

      transaction.add(transferInstruction);
      transaction.feePayer = buyerPubkey;
      
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      setStatus('Please sign the transaction in your wallet vault...');

      alert('Simulating Solana Pay transfer instruction generated successfully with reference key!');
      setStatus('Transaction flow ready for signature integration.');

    } catch (err: unknown) {
      setStatus(`Payment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!orderData) return <div className="text-white p-6">Loading order details...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-purple-400 mb-6">Solana Pay Checkout</h1>
      
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Order ID:</span>
          <span className="font-mono text-xs">{orderData.orderId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Solana Pay Reference:</span>
          <span className="font-mono text-xs text-purple-300">{orderData.referenceKey}</span>
        </div>
        <div className="border-t border-gray-700 pt-4 flex justify-between font-bold text-lg">
          <span>Total Due:</span>
          <span className="text-green-400">{orderData.tokenTotal} Tokens</span>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center space-y-4">
        <p className="text-sm text-gray-300">{status}</p>
        <button
          onClick={handleSolanaPayTransfer}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Processing Payment...' : 'Pay with Custom Token'}
        </button>
      </div>
    </div>
  );
};