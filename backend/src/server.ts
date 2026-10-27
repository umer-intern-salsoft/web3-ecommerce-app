import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';          // Note the .js extension
import { Product } from './models/product.js';      // Note capitalization matching Product.ts
import { Order } from './models/order.js';          // Note capitalization matching Order.ts
import { Keypair } from '@solana/web3.js';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Mock Exchange Rate: $1 USD = 10 Custom Tokens
const TOKEN_EXCHANGE_RATE = 10;

// Seed Initial Products if Database is Empty
const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany([
        {
          name: 'Cybersecurity Hardened Hoody',
          description: 'Premium heavyweight cotton hoodie with custom encryption motif and secure internal pocket.',
          priceUSD: 45.00,
          imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=600',
          stock: 25
        },
        {
          name: 'Hardware Security Key v2',
          description: 'FIDO2 certified physical security token for multi-factor authentication and Web3 signing.',
          priceUSD: 30.00,
          imageUrl: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&q=80&w=600',
          stock: 50
        },
        {
          name: 'Solana Devnet Sticker Pack',
          description: 'Holographic, weather-resistant vinyl stickers featuring Solana and cryptography graphics.',
          priceUSD: 10.00,
          imageUrl: 'https://images.unsplash.com/photo-1572375833936-4702331f47f2?auto=format&fit=crop&q=80&w=600',
          stock: 100
        },
        {
          name: 'Encrypted Mechanical Keyboard',
          description: 'Custom 75% hot-swappable mechanical keyboard with custom keycaps and zero-latency wireless.',
          priceUSD: 120.00,
          imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=600',
          stock: 15
        }
      ]);
      console.log('Database seeded with dummy products!');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

// --- API ROUTES ---

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/checkout', async (req, res) => {
  try {
    const { customerWallet, items } = req.body;

    if (!customerWallet || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid checkout payload.' });
    }

    let totalUSD = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      totalUSD += product.priceUSD * item.quantity;
      validatedItems.push({
        productId: product._id,
        quantity: item.quantity
      });
    }

    const tokenAmountRequired = totalUSD * TOKEN_EXCHANGE_RATE;
    // Generate keypair properly with await
    const referenceKeypair = await Keypair.generate();
    const referenceKey = referenceKeypair.publicKey.toBase58();

    const newOrder = new Order({
      customerWallet,
      items: validatedItems,
      totalUSD,
      tokenAmountRequired,
      referenceKey,
      status: 'pending'
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      orderId: newOrder._id,
      referenceKey,
      totalUSD,
      tokenAmountRequired,
      message: 'Order initialized successfully.'
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Internal server error during checkout' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { orderId, referenceKey } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const referencePubkey = new PublicKey(referenceKey);

    // Search for transactions containing the Solana Pay reference key
    const signatures = await connection.getSignaturesForAddress(referencePubkey, { limit: 1 });

    if (signatures.length === 0) {
      return res.status(400).json({ verified: false, message: 'Payment transaction not found yet.' });
    }

    const latestSignature = signatures[0];

    if (latestSignature.err) {
      return res.status(400).json({ verified: false, message: 'Transaction failed on-chain.' });
    }

    // Update order status to completed in MongoDB
    order.status = 'paid';
    await order.save();

    res.status(200).json({
      success: true,
      verified: true,
      signature: latestSignature.signature,
      message: 'Payment verified and order completed successfully!'
    });

  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

connectDB().then(() => {
  seedProducts();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
});