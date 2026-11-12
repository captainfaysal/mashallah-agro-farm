import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export const User = model('User', new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
}, { timestamps: true }));

export const Party = model('Party', new Schema({
  name: { type: String, required: true },
  phone: String,
  address: String,
  note: String,
}, { timestamps: true }));

export const Product = model('Product', new Schema({
  name: { type: String, required: true },
  unit: { type: String, default: 'kg' },
}));

// MODULE A: Purchase
const PurchaseItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  crates: { type: Number, default: 0 },
  weightKg: { type: Number, required: true },
  ratePerKg: { type: Number, required: true },
  amount: { type: Number, required: true }, // weightKg * ratePerKg
});

export const Purchase = model('Purchase', new Schema({
  purchaseDate: { type: Date, required: true },
  supplierName: { type: String, required: true },
  items: [PurchaseItemSchema],
  transportCost: { type: Number, default: 0 },
  otherCost: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },   // sum of items amount
  landedCost: { type: Number, required: true },    // totalAmount + transportCost + otherCost
  note: String,
}, { timestamps: true }));

// MODULE B: Supply
const SupplyItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase' },
  crates: { type: Number, default: 0 },
  weightKg: { type: Number, required: true },
  allocatedCost: { type: Number, default: 0 },
  expectedAmount: { type: Number, default: 0 },
  note: String,
});

export const Supply = model('Supply', new Schema({
  supplyDate: { type: Date, required: true },
  partyId: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
  items: [SupplyItemSchema],
  totalWeightKg: { type: Number, required: true },
  totalCrates: { type: Number, default: 0 },
  totalAllocatedCost: { type: Number, default: 0 },
  totalExpectedAmount: { type: Number, default: 0 },
  note: String,
}, { timestamps: true }));

// MODULE C: Settlement
export const Settlement = model('Settlement', new Schema({
  settlementDate: { type: Date, required: true },
  partyId: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
  supplyId: { type: Schema.Types.ObjectId, ref: 'Supply' },
  quantityKg: { type: Number, default: 0 },
  actualSalesAmount: { type: Number, default: 0 },  // party reported sales
  agreeableAmount: { type: Number, required: true }, // amount payable to farm
  note: String,
}, { timestamps: true }));

// MODULE C: Payment
export const Payment = model('Payment', new Schema({
  paymentDate: { type: Date, required: true },
  partyId: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
  amount: { type: Number, required: true },
  allocations: [{ // which supplies this payment covers
    supplyId: { type: Schema.Types.ObjectId, ref: 'Supply' },
    amount: Number,
  }],
  note: String,
}, { timestamps: true }));

// MODULE D: Crate Movement
export const CrateMovement = model('CrateMovement', new Schema({
  date: { type: Date, required: true },
  partyId: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
  supplyId: { type: Schema.Types.ObjectId, ref: 'Supply' },
  direction: { type: String, enum: ['SENT', 'RETURNED'], required: true },
  quantity: { type: Number, required: true },
  note: String,
}, { timestamps: true }));

// Daybook (keep)
export const Entry = model('Entry', new Schema({
  date: { type: Date, required: true },
  kind: { type: String, enum: ['INCOME', 'EXPENSE'], required: true },
  category: String,
  amount: Number,
  note: String,
}));

// Cattle (keep)
const CattleExpenseSchema = new Schema({ date: Date, category: String, amount: Number, note: String });
export const Cattle = model('Cattle', new Schema({
  tag: { type: String, unique: true },
  breed: String,
  purchaseDate: Date,
  purchasePrice: Number,
  status: { type: String, enum: ['ACTIVE', 'SOLD'], default: 'ACTIVE' },
  saleDate: Date,
  salePrice: Number,
  note: String,
  expenses: [CattleExpenseSchema],
}));
