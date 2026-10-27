import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string; // Hashed password
  role: 'customer' | 'admin';
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', userSchema);