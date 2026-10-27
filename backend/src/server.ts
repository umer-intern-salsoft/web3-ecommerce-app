import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import { Product } from './models/product.js';
import { Order } from './models/order.js';
import { User } from './models/user.js';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SOLANA_RPC = 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

const MERCHANT_WALLET = '8iwQM2hdFeDqdskgoE8CJGPdh4PK73AhGSuu6pKgte6c';
const CUSTOM_TOKEN_MINT = '8wy77GbnLEnyHsyC33ukJVbTRuiXVxDSrwQbyrrnjLMk';

// Mock Exchange Rate: $1 USD = 10 Custom Tokens
const TOKEN_EXCHANGE_RATE = 10;

// Seed Initial Products & a Default Admin Account if Database is Empty
const seedDatabase = async () => {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
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

    // Seed default admin account if none exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default admin account created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'customer'
    });

    await newUser.save();
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: newUser._id,
      username: newUser.username,
      role: newUser.role
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      userId: user._id,
      username: user.username,
      role: user.role
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// --- STOREFRONT PRODUCT ROUTES ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// --- USER ORDER HISTORY ROUTE ---
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate('items.productId', 'name priceUSD imageUrl')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user orders' });
  }
});

// --- CHECKOUT & PAYMENT ROUTES ---
app.post('/api/checkout', async (req, res) => {
  try {
    const { userId, customerWallet, items } = req.body;

    if (!userId || !customerWallet || !items || !Array.isArray(items) || items.length === 0) {
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
    const referenceKeypair = await Keypair.generate();
    const referenceKey = referenceKeypair.publicKey.toBase58();

    const newOrder = new Order({
      userId,
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
    const signatures = await connection.getSignaturesForAddress(referencePubkey, { limit: 1 });

    if (signatures.length === 0) {
      return res.status(400).json({ verified: false, message: 'Payment transaction not found yet.' });
    }

    const latestSignature = signatures[0];
    if (latestSignature.err) {
      return res.status(400).json({ verified: false, message: 'Transaction failed on-chain.' });
    }

    // Deduct stock for purchased items upon successful verification
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

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

// --- ADMIN PORTAL ROUTES ---

// 1. Get Store Wallet Balance (SOL + Custom SPL Token)
app.get('/api/admin/wallet-balance', async (req, res) => {
  try {
    const merchantPubkey = new PublicKey(MERCHANT_WALLET);
    
    // Get SOL balance
    const lamports = await connection.getBalance(merchantPubkey);
    const solBalance = Number(lamports) / 1e9;

    // Get Custom SPL Token balance
    let tokenBalance = 0;
    try {
      const mintPubkey = new PublicKey(CUSTOM_TOKEN_MINT);
      const ata = await getAssociatedTokenAddress(mintPubkey, merchantPubkey);
      const accountInfo = await getAccount(connection, ata);
      tokenBalance = Number(accountInfo.amount);
    } catch {
      tokenBalance = 0; 
    }

    res.json({ solBalance, tokenBalance, merchantWallet: MERCHANT_WALLET });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch wallet balance' });
  }
});

// 2. Get All Timestamped Purchase Audit Logs for Admin
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'username')
      .populate('items.productId', 'name priceUSD')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});

// 3. Admin Product Management (Add, Update, Delete)
app.post('/api/admin/products', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add product' });
  }
});

app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete product' });
  }
});

// --- START SERVER ---
connectDB().then(() => {
  seedDatabase();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
});