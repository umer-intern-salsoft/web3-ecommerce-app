import { Schema, model } from 'mongoose';
const orderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerWallet: { type: String, required: true },
    items: [
        {
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, min: 1 }
        }
    ],
    totalUSD: { type: Number, required: true },
    tokenAmountRequired: { type: Number, required: true },
    referenceKey: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
export const Order = model('Order', orderSchema);
