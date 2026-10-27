import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  priceUSD: number;
  imageUrl: string;
  stock: number;
  createdAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  priceUSD: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: true },
  stock: { type: Number, required: true, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const Product = model<IProduct>('Product', productSchema);