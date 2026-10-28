import { Schema, model } from 'mongoose';
const productSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    priceUSD: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now }
});
export const Product = model('Product', productSchema);
