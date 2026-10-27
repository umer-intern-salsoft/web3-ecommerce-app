import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface IOrder extends Document {
  customerWallet: string;
  items: IOrderItem[];
  totalUSD: number;
  tokenAmountRequired: number;
  referenceKey: string;
  status: 'pending' | 'paid' | 'shipped';
  createdAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const orderSchema = new Schema<IOrder>({
  customerWallet: { type: String, required: true },
  items: [orderItemSchema],
  totalUSD: { type: Number, required: true, min: 0 },
  tokenAmountRequired: { type: Number, required: true, min: 0 },
  referenceKey: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'paid', 'shipped'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export const Order = model<IOrder>('Order', orderSchema);