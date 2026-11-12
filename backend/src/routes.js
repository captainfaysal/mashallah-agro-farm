import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User, Party, Product, Purchase, Supply, Settlement, Payment, CrateMovement, Entry, Cattle } from './models.js';
import { requireAuth, signIn } from './auth.js';
import { wrap } from './crud.js';

const r = Router();
const str = z.string().trim();
const opt = str.optional().nullable();
const money = z.coerce.number().nonnegative();
const pos = z.coerce.number().positive();
const date = z.coerce.date();
const id = z.string().min(1);
const recordId = (value) => String(value?._id || value || '');

function latestSettlementBySupply(settlements) {
  const latest = new Map();
  for (const settlement of settlements) {
    const supplyId = recordId(settlement.supplyId);
    if (!supplyId) continue;
    const current = latest.get(supplyId);
    if (!current || new Date(settlement.settlementDate) >= new Date(current.settlementDate)) {
      latest.set(supplyId, settlement);
    }
  }
  return latest;
}

function supplyReceivableTotal(supplies, settlements) {
  const latest = latestSettlementBySupply(settlements);
  return supplies.reduce((total, supply) => {
    const settlement = latest.get(recordId(supply._id));
    return total + Number(settlement ? settlement.agreeableAmount : supply.totalExpectedAmount || 0);
  }, 0);
}

/* ---------- auth ---------- */
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });
r.post('/auth/login', loginLimiter, wrap(async (req, res) => {
  const { email, password } = z.object({ email: str.email(), password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Wrong email or password' });
  signIn(res, user);
  res.json({ id: user._id, name: user.name });
}));
r.post('/auth/logout', (req, res) => {
  res.clearCookie('token', { sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
});
r.get('/auth/me', requireAuth, (req, res) => res.json({ id: req.user.id, name: req.user.name }));

/* ---------- public ---------- */
r.get('/public/summary', wrap(async (req, res) => {
  const [products, activeCattle] = await Promise.all([
    Product.find().sort({ name: 1 }).select('name unit'),
    Cattle.countDocuments({ status: 'ACTIVE' }),
  ]);
  res.json({ products, activeCattle });
}));

/* ---------- parties ---------- */
r.get('/parties', requireAuth, wrap(async (req, res) => {
  const parties = await Party.find().sort({ name: 1 });
  // outstanding money & crates per party
  const [supplies, payments, crates, settlements] = await Promise.all([
    Supply.find().select('_id partyId totalExpectedAmount totalCrates'),
    Payment.find().select('partyId amount'),
    CrateMovement.find().select('partyId direction quantity supplyId'),
    Settlement.find().select('partyId supplyId agreeableAmount settlementDate'),
  ]);
  const moneyMap = new Map(), crateMap = new Map();
  const settlementsByParty = new Map();
  for (const settlement of settlements) {
    const key = String(settlement.partyId);
    settlementsByParty.set(key, [...(settlementsByParty.get(key) || []), settlement]);
  }
  for (const s of supplies) {
    const k = String(s.partyId);
    moneyMap.set(k, (moneyMap.get(k) || 0) + Number(s.totalExpectedAmount || 0));
    crateMap.set(k, (crateMap.get(k) || 0) + s.totalCrates);
  }
  for (const p of payments) {
    const k = String(p.partyId);
    moneyMap.set(k, (moneyMap.get(k) || 0) - Number(p.amount || 0));
  }
  for (const c of crates) {
    const k = String(c.partyId);
    if (c.direction === 'RETURNED') crateMap.set(k, (crateMap.get(k) || 0) - Number(c.quantity || 0));
    else if (!c.supplyId) crateMap.set(k, (crateMap.get(k) || 0) + Number(c.quantity || 0));
  }
  for (const [partyId, partySettlements] of settlementsByParty) {
    const partySupplies = supplies.filter((supply) => String(supply.partyId) === partyId);
    const expected = partySupplies.reduce((sum, supply) => sum + Number(supply.totalExpectedAmount || 0), 0);
    const settled = supplyReceivableTotal(partySupplies, partySettlements);
    moneyMap.set(partyId, (moneyMap.get(partyId) || 0) + settled - expected);
  }
  res.json(parties.map(p => ({
    ...p.toObject(),
    outstandingMoney: moneyMap.get(String(p._id)) || 0,
    outstandingCrates: crateMap.get(String(p._id)) || 0,
  })));
}));

r.post('/parties', requireAuth, wrap(async (req, res) => {
  const data = z.object({ name: str.min(1), phone: opt, address: opt, note: opt }).parse(req.body);
  res.status(201).json(await Party.create(data));
}));
r.put('/parties/:id', requireAuth, wrap(async (req, res) => {
  const data = z.object({ name: str.min(1), phone: opt, address: opt, note: opt }).partial().parse(req.body);
  const doc = await Party.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));
r.delete('/parties/:id', requireAuth, wrap(async (req, res) => {
  await Party.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- party ledger ---------- */
r.get('/parties/:id/ledger', requireAuth, wrap(async (req, res) => {
  const partyId = req.params.id;
  const [party, supplies, payments, crateMovements, settlements] = await Promise.all([
    Party.findById(partyId),
    Supply.find({ partyId }).populate('items.productId').sort({ supplyDate: 1 }),
    Payment.find({ partyId }).sort({ paymentDate: 1 }),
    CrateMovement.find({ partyId }).sort({ date: 1 }),
    Settlement.find({ partyId }).sort({ settlementDate: 1 }),
  ]);
  if (!party) return res.status(404).json({ error: 'Party not found' });

  let outstandingMoney = 0, outstandingCrates = 0;
  const events = [];
  const settlementsBySupply = new Map();
  for (const s of supplies) {
    events.push({
      date: s.supplyDate, priority: 0, type: 'SUPPLY', ref: s._id,
      products: s.items.map(i => `${i.productId?.name} ${i.weightKg}kg`).join(', '),
      weightKg: s.totalWeightKg, cratesSent: s.totalCrates,
      amountPayable: Number(s.totalExpectedAmount || 0),
      moneyChange: Number(s.totalExpectedAmount || 0),
      cratesChange: Number(s.totalCrates || 0),
    });
  }
  for (const st of settlements) {
    const supplyKey = recordId(st.supplyId);
    if (supplyKey) {
      settlementsBySupply.set(supplyKey, [...(settlementsBySupply.get(supplyKey) || []), st]);
    } else {
      events.push({
        date: st.settlementDate, priority: 1, type: 'SETTLEMENT', ref: st._id,
        actualSales: st.actualSalesAmount, amountPayable: st.agreeableAmount,
        note: 'সরবরাহের সাথে যুক্ত নয়; বকেয়ায় প্রভাব নেই',
      });
    }
  }
  for (const supply of supplies) {
    let previousReceivable = Number(supply.totalExpectedAmount || 0);
    const linkedSettlements = (settlementsBySupply.get(String(supply._id)) || [])
      .sort((a, b) => new Date(a.settlementDate) - new Date(b.settlementDate));
    for (const settlement of linkedSettlements) {
      const agreedReceivable = Number(settlement.agreeableAmount || 0);
      events.push({
        date: settlement.settlementDate, priority: 1, type: 'SETTLEMENT', ref: settlement._id,
        actualSales: settlement.actualSalesAmount, amountPayable: agreedReceivable,
        moneyChange: agreedReceivable - previousReceivable,
      });
      previousReceivable = agreedReceivable;
    }
  }
  for (const p of payments) {
    events.push({
      date: p.paymentDate, priority: 2, type: 'PAYMENT', ref: p._id,
      amountReceived: Number(p.amount || 0), moneyChange: -Number(p.amount || 0),
    });
  }
  for (const c of crateMovements) {
    if (c.direction === 'SENT' && !c.supplyId) {
      events.push({ date: c.date, priority: 0, type: 'CRATE_SENT', ref: c._id, cratesSent: c.quantity, cratesChange: Number(c.quantity || 0) });
    } else if (c.direction === 'RETURNED') {
      events.push({ date: c.date, priority: 3, type: 'CRATE_RETURN', ref: c._id, cratesReturned: c.quantity, cratesChange: -Number(c.quantity || 0) });
    }
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date) || a.priority - b.priority);
  const rows = events.map(({ priority, moneyChange = 0, cratesChange = 0, ...event }) => {
    outstandingMoney += moneyChange;
    outstandingCrates += cratesChange;
    return { ...event, outstandingMoney, outstandingCrates };
  });
  res.json({ party, outstandingMoney, outstandingCrates, rows });
}));

/* ---------- products ---------- */
r.get('/products', requireAuth, wrap(async (req, res) => res.json(await Product.find().sort({ name: 1 }))));
r.post('/products', requireAuth, wrap(async (req, res) => {
  const data = z.object({ name: str.min(1), unit: str.optional() }).parse(req.body);
  res.status(201).json(await Product.create(data));
}));
r.put('/products/:id', requireAuth, wrap(async (req, res) => {
  const data = z.object({ name: str.min(1), unit: str }).partial().parse(req.body);
  res.json(await Product.findByIdAndUpdate(req.params.id, data, { new: true }));
}));
r.delete('/products/:id', requireAuth, wrap(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- purchases ---------- */
const purchaseItemSchema = z.object({
  productId: id, crates: z.coerce.number().default(0),
  weightKg: pos, ratePerKg: money,
});
const purchaseSchema = z.object({
  purchaseDate: date, supplierName: str.min(1),
  items: z.array(purchaseItemSchema).min(1),
  transportCost: money.default(0), otherCost: money.default(0), note: opt,
});

r.get('/purchases', requireAuth, wrap(async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from || to) { where.purchaseDate = {}; if (from) where.purchaseDate.$gte = new Date(from); if (to) where.purchaseDate.$lte = new Date(`${to}T23:59:59.999Z`); }
  res.json(await Purchase.find(where).populate('items.productId').sort({ purchaseDate: -1 }));
}));

r.post('/purchases', requireAuth, wrap(async (req, res) => {
  const data = purchaseSchema.parse(req.body);
  const items = data.items.map(i => ({ ...i, amount: i.weightKg * i.ratePerKg }));
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const landedCost = totalAmount + data.transportCost + data.otherCost;
  const doc = await Purchase.create({ ...data, items, totalAmount, landedCost });
  res.status(201).json(await doc.populate('items.productId'));
}));

r.put('/purchases/:id', requireAuth, wrap(async (req, res) => {
  const data = purchaseSchema.partial().parse(req.body);
  if (data.items) {
    data.items = data.items.map(i => ({ ...i, amount: i.weightKg * i.ratePerKg }));
    data.totalAmount = data.items.reduce((s, i) => s + i.amount, 0);
    data.landedCost = data.totalAmount + (data.transportCost || 0) + (data.otherCost || 0);
  }
  const doc = await Purchase.findByIdAndUpdate(req.params.id, data, { new: true }).populate('items.productId');
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

r.delete('/purchases/:id', requireAuth, wrap(async (req, res) => {
  await Purchase.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- supplies ---------- */
const supplyItemSchema = z.object({
  productId: id, purchaseId: id.optional(),
  crates: z.coerce.number().default(0), weightKg: pos,
  allocatedCost: money.default(0), expectedAmount: money.default(0), note: opt,
});
const supplySchema = z.object({
  supplyDate: date, partyId: id,
  items: z.array(supplyItemSchema).min(1), note: opt,
});

r.get('/supplies', requireAuth, wrap(async (req, res) => {
  const { from, to, partyId } = req.query;
  const where = {};
  if (partyId) where.partyId = partyId;
  if (from || to) { where.supplyDate = {}; if (from) where.supplyDate.$gte = new Date(from); if (to) where.supplyDate.$lte = new Date(`${to}T23:59:59.999Z`); }
  res.json(await Supply.find(where).populate('partyId').populate('items.productId').sort({ supplyDate: -1 }));
}));

r.post('/supplies', requireAuth, wrap(async (req, res) => {
  const data = supplySchema.parse(req.body);
  const totalWeightKg = data.items.reduce((s, i) => s + i.weightKg, 0);
  const totalCrates = data.items.reduce((s, i) => s + i.crates, 0);
  const totalAllocatedCost = data.items.reduce((s, i) => s + i.allocatedCost, 0);
  const totalExpectedAmount = data.items.reduce((s, i) => s + i.expectedAmount, 0);
  const doc = await Supply.create({ ...data, totalWeightKg, totalCrates, totalAllocatedCost, totalExpectedAmount });
  // auto-create crate movement if crates > 0
  if (totalCrates > 0) await CrateMovement.create({ date: data.supplyDate, partyId: data.partyId, supplyId: doc._id, direction: 'SENT', quantity: totalCrates });
  res.status(201).json(await doc.populate(['partyId', 'items.productId']));
}));

r.put('/supplies/:id', requireAuth, wrap(async (req, res) => {
  const data = supplySchema.partial().parse(req.body);
  if (data.items) {
    data.totalWeightKg = data.items.reduce((s, i) => s + i.weightKg, 0);
    data.totalCrates = data.items.reduce((s, i) => s + i.crates, 0);
    data.totalAllocatedCost = data.items.reduce((s, i) => s + i.allocatedCost, 0);
    data.totalExpectedAmount = data.items.reduce((s, i) => s + i.expectedAmount, 0);
  }
  const doc = await Supply.findByIdAndUpdate(req.params.id, data, { new: true }).populate(['partyId', 'items.productId']);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

r.delete('/supplies/:id', requireAuth, wrap(async (req, res) => {
  await Supply.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- settlements ---------- */
const settlementSchema = z.object({
  settlementDate: date, partyId: id, supplyId: id,
  quantityKg: money.default(0), actualSalesAmount: money.default(0),
  agreeableAmount: money, note: opt,
});

r.get('/settlements', requireAuth, wrap(async (req, res) => {
  const { partyId, from, to } = req.query;
  const where = {};
  if (partyId) where.partyId = partyId;
  if (from || to) { where.settlementDate = {}; if (from) where.settlementDate.$gte = new Date(from); if (to) where.settlementDate.$lte = new Date(`${to}T23:59:59.999Z`); }
  res.json(await Settlement.find(where).populate('partyId').populate('supplyId').sort({ settlementDate: -1 }));
}));

r.post('/settlements', requireAuth, wrap(async (req, res) => {
  const data = settlementSchema.parse(req.body);
  const supply = await Supply.findOne({ _id: data.supplyId, partyId: data.partyId });
  if (!supply) return res.status(400).json({ error: 'Select a supply record belonging to this party' });
  res.status(201).json(await (await Settlement.create(data)).populate(['partyId', 'supplyId']));
}));
r.put('/settlements/:id', requireAuth, wrap(async (req, res) => {
  const data = settlementSchema.partial().parse(req.body);
  const existing = await Settlement.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const partyId = data.partyId || String(existing.partyId);
  const supplyId = data.supplyId || recordId(existing.supplyId);
  if (!supplyId || !await Supply.exists({ _id: supplyId, partyId })) {
    return res.status(400).json({ error: 'Select a supply record belonging to this party' });
  }
  const doc = await Settlement.findByIdAndUpdate(req.params.id, data, { new: true }).populate(['partyId', 'supplyId']);
  res.json(doc);
}));
r.delete('/settlements/:id', requireAuth, wrap(async (req, res) => {
  await Settlement.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- payments ---------- */
const paymentSchema = z.object({
  paymentDate: date, partyId: id, amount: pos,
  allocations: z.array(z.object({ supplyId: id, amount: money })).optional(),
  note: opt,
});

r.get('/payments', requireAuth, wrap(async (req, res) => {
  const { partyId, from, to } = req.query;
  const where = {};
  if (partyId) where.partyId = partyId;
  if (from || to) { where.paymentDate = {}; if (from) where.paymentDate.$gte = new Date(from); if (to) where.paymentDate.$lte = new Date(`${to}T23:59:59.999Z`); }
  res.json(await Payment.find(where).populate('partyId').sort({ paymentDate: -1 }));
}));

r.post('/payments', requireAuth, wrap(async (req, res) => {
  const data = paymentSchema.parse(req.body);
  res.status(201).json(await (await Payment.create(data)).populate('partyId'));
}));
r.put('/payments/:id', requireAuth, wrap(async (req, res) => {
  const data = paymentSchema.partial().parse(req.body);
  const doc = await Payment.findByIdAndUpdate(req.params.id, data, { new: true }).populate('partyId');
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));
r.delete('/payments/:id', requireAuth, wrap(async (req, res) => {
  await Payment.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- crate movements ---------- */
const crateSchema = z.object({
  date, partyId: id, supplyId: id.optional(),
  direction: z.enum(['SENT', 'RETURNED']), quantity: pos, note: opt,
});

r.get('/crates', requireAuth, wrap(async (req, res) => {
  const { partyId } = req.query;
  const where = partyId ? { partyId } : {};
  res.json(await CrateMovement.find(where).populate('partyId').populate('supplyId').sort({ date: -1 }));
}));

r.post('/crates', requireAuth, wrap(async (req, res) => {
  const data = crateSchema.parse(req.body);
  if (data.direction === 'RETURNED') {
    const [returnedMovements, sentMovements, supplyTotals] = await Promise.all([
      CrateMovement.aggregate([{ $match: { partyId: { $eq: data.partyId }, direction: 'RETURNED' } }, { $group: { _id: null, total: { $sum: '$quantity' } } }]),
      CrateMovement.find({ partyId: data.partyId, direction: 'SENT' }).select('quantity supplyId').lean(),
      Supply.find({ partyId: data.partyId }).select('totalCrates').lean(),
    ]);
    const totalSent = supplyTotals.reduce((sum, supply) => sum + (supply.totalCrates || 0), 0);
    const manualSent = sentMovements.filter((movement) => !movement.supplyId).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
    const outstanding = totalSent + manualSent - (returnedMovements[0]?.total || 0);
    if (data.quantity > outstanding) return res.status(400).json({ error: `Outstanding crates: ${outstanding}. Cannot return more.` });
  }
  res.status(201).json(await (await CrateMovement.create(data)).populate(['partyId', 'supplyId']));
}));

r.put('/crates/:id', requireAuth, wrap(async (req, res) => {
  const data = crateSchema.partial().parse(req.body);
  const doc = await CrateMovement.findByIdAndUpdate(req.params.id, data, { new: true }).populate(['partyId', 'supplyId']);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));
r.delete('/crates/:id', requireAuth, wrap(async (req, res) => {
  await CrateMovement.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- daily report ---------- */
r.get('/reports/daily', requireAuth, wrap(async (req, res) => {
  const from = req.query.date ? new Date(req.query.date) : new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from); to.setUTCHours(23, 59, 59, 999);
  const range = { $gte: from, $lte: to };

  const [purchases, supplies, payments, settlements, crateReturns] = await Promise.all([
    Purchase.find({ purchaseDate: range }).populate('items.productId'),
    Supply.find({ supplyDate: range }).populate('partyId').populate('items.productId'),
    Payment.find({ paymentDate: range }).populate('partyId'),
    Settlement.find({ settlementDate: range }).populate('partyId').populate('supplyId'),
    CrateMovement.find({ date: range, direction: 'RETURNED' }).populate('partyId'),
  ]);

  const totalPurchaseKg = purchases.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.weightKg, 0), 0);
  const totalPurchaseCost = purchases.reduce((s, p) => s + p.landedCost, 0);
  const totalSuppliedKg = supplies.reduce((s, p) => s + p.totalWeightKg, 0);
  const totalSuppliedCrates = supplies.reduce((s, p) => s + p.totalCrates, 0);
  const totalMoneyReceived = payments.reduce((s, p) => s + p.amount, 0);
  const totalCrateReturns = crateReturns.reduce((s, c) => s + c.quantity, 0);

  res.json({ date: from, purchases, supplies, payments, settlements, crateReturns, summary: { totalPurchaseKg, totalPurchaseCost, totalSuppliedKg, totalSuppliedCrates, totalMoneyReceived, totalCrateReturns } });
}));

/* ---------- dashboard summary ---------- */
r.get('/reports/summary', requireAuth, wrap(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart); todayEnd.setUTCHours(23, 59, 59, 999);
  const today = { $gte: todayStart, $lte: todayEnd };
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const [todayPurchases, todaySupplies, todayPayments, todayCrateReturns, allSupplies, allPayments, allCrates, allSettlements] = await Promise.all([
    Purchase.find({ purchaseDate: today }),
    Supply.find({ supplyDate: today }),
    Payment.find({ paymentDate: today }),
    CrateMovement.find({ date: today, direction: 'RETURNED' }),
    Supply.find().select('_id partyId totalExpectedAmount totalCrates'),
    Payment.find().select('partyId amount'),
    CrateMovement.find().select('partyId direction quantity supplyId'),
    Settlement.find().select('supplyId agreeableAmount settlementDate'),
  ]);

  const totalOutstandingMoney = supplyReceivableTotal(allSupplies, allSettlements) - allPayments.reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalOutstandingCrates = allSupplies.reduce((s, x) => s + Number(x.totalCrates || 0), 0)
    + allCrates.filter((c) => c.direction === 'SENT' && !c.supplyId).reduce((s, c) => s + Number(c.quantity || 0), 0)
    - allCrates.filter((c) => c.direction === 'RETURNED').reduce((s, c) => s + Number(c.quantity || 0), 0);

  const yearRange = { $gte: yearStart, $lte: todayEnd };
  const [profitPurchases, profitPayments, profitEntries] = await Promise.all([
    Purchase.find({ purchaseDate: yearRange }).select('purchaseDate landedCost'),
    Payment.find({ paymentDate: yearRange }).select('paymentDate amount'),
    Entry.find({ date: yearRange }).select('date kind amount'),
  ]);

  const calculateProfitLoss = (start) => {
    const inPeriod = (date) => date && new Date(date) >= start && new Date(date) <= todayEnd;
    const income = profitPayments.reduce((sum, payment) => sum + (inPeriod(payment.paymentDate) ? Number(payment.amount || 0) : 0), 0)
      + profitEntries.reduce((sum, entry) => sum + (entry.kind === 'INCOME' && inPeriod(entry.date) ? Number(entry.amount || 0) : 0), 0);
    const expense = profitPurchases.reduce((sum, purchase) => sum + (inPeriod(purchase.purchaseDate) ? Number(purchase.landedCost || 0) : 0), 0)
      + profitEntries.reduce((sum, entry) => sum + (entry.kind === 'EXPENSE' && inPeriod(entry.date) ? Number(entry.amount || 0) : 0), 0);
    return { income, expense, profit: income - expense };
  };

  res.json({
    today: {
      purchaseKg: todayPurchases.reduce((s, p) => s + p.items?.reduce((ss, i) => ss + i.weightKg, 0), 0),
      purchaseCost: todayPurchases.reduce((s, p) => s + p.landedCost, 0),
      suppliedKg: todaySupplies.reduce((s, p) => s + p.totalWeightKg, 0),
      suppliedCrates: todaySupplies.reduce((s, p) => s + p.totalCrates, 0),
      moneyReceived: todayPayments.reduce((s, p) => s + p.amount, 0),
      crateReturns: todayCrateReturns.reduce((s, c) => s + c.quantity, 0),
    },
    profitLoss: {
      daily: calculateProfitLoss(todayStart),
      monthly: calculateProfitLoss(monthStart),
      yearly: calculateProfitLoss(yearStart),
    },
    totalOutstandingMoney,
    totalOutstandingCrates,
  });
}));

/* ---------- entries (daybook) ---------- */
const entrySchema = z.object({ date, kind: z.enum(['INCOME', 'EXPENSE']), category: str.min(1), amount: money, note: opt });
r.get('/entries', requireAuth, wrap(async (req, res) => {
  const { from, to } = req.query;
  const dateRange = {};
  if (from) dateRange.$gte = new Date(from);
  if (to) dateRange.$lte = new Date(`${to}T23:59:59.999Z`);
  const [manualEntries, purchases, payments] = await Promise.all([
    Entry.find(from || to ? { date: dateRange } : {}).sort({ date: -1 }).lean(),
    Purchase.find(from || to ? { purchaseDate: dateRange } : {}).select('purchaseDate supplierName landedCost note').lean(),
    Payment.find(from || to ? { paymentDate: dateRange } : {}).select('paymentDate partyId amount note').populate('partyId', 'name').lean(),
  ]);
  const entries = [
    ...manualEntries.map((entry) => ({ ...entry, source: 'MANUAL' })),
    ...purchases.map((purchase) => ({
      _id: `purchase:${purchase._id}`,
      date: purchase.purchaseDate,
      kind: 'EXPENSE',
      category: `ক্রয় — ${purchase.supplierName}`,
      amount: purchase.landedCost,
      note: purchase.note || '',
      source: 'PURCHASE',
    })),
    ...payments.map((payment) => ({
      _id: `payment:${payment._id}`,
      date: payment.paymentDate,
      kind: 'INCOME',
      category: `পেমেন্ট — ${payment.partyId?.name || 'পার্টি'}`,
      amount: payment.amount,
      note: payment.note || '',
      source: 'PAYMENT',
    })),
  ];
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(entries);
}));
r.post('/entries', requireAuth, wrap(async (req, res) => res.status(201).json(await Entry.create(entrySchema.parse(req.body)))));
r.put('/entries/:id', requireAuth, wrap(async (req, res) => res.json(await Entry.findByIdAndUpdate(req.params.id, entrySchema.partial().parse(req.body), { new: true }))));
r.delete('/entries/:id', requireAuth, wrap(async (req, res) => { await Entry.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

/* ---------- cattle ---------- */
const cattleSchema = z.object({ tag: str.min(1), breed: opt, purchaseDate: date, purchasePrice: money, status: z.enum(['ACTIVE', 'SOLD']).optional(), saleDate: date.optional().nullable(), salePrice: money.optional().nullable(), note: opt });
r.get('/cattle', requireAuth, wrap(async (req, res) => res.json(await Cattle.find(req.query.status ? { status: req.query.status } : {}).sort({ purchaseDate: -1 }))));
r.post('/cattle', requireAuth, wrap(async (req, res) => res.status(201).json(await Cattle.create(cattleSchema.parse(req.body)))));
r.put('/cattle/:id', requireAuth, wrap(async (req, res) => res.json(await Cattle.findByIdAndUpdate(req.params.id, cattleSchema.partial().parse(req.body), { new: true }))));
r.delete('/cattle/:id', requireAuth, wrap(async (req, res) => { await Cattle.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

const cattleExpenseSchema = z.object({ cattleId: id, date, category: str.min(1), amount: money, note: opt });
const flattenCattleExpenses = (cattleList) => cattleList.flatMap((cattle) => (cattle.expenses || []).map((expense) => ({
  _id: expense._id,
  cattleId: cattle._id,
  cattle: { _id: cattle._id, tag: cattle.tag },
  date: expense.date,
  category: expense.category,
  amount: expense.amount,
  note: expense.note,
})));

r.get('/cattle-expenses', requireAuth, wrap(async (req, res) => {
  const cattleList = await Cattle.find().select('tag expenses');
  res.json(flattenCattleExpenses(cattleList));
}));

r.post('/cattle-expenses', requireAuth, wrap(async (req, res) => {
  const data = cattleExpenseSchema.parse(req.body);
  const cattle = await Cattle.findById(data.cattleId);
  if (!cattle) return res.status(404).json({ error: 'Not found' });

  const expense = { date: data.date, category: data.category, amount: data.amount, note: data.note };
  cattle.expenses.push(expense);
  await cattle.save();

  const saved = cattle.expenses[cattle.expenses.length - 1];
  res.status(201).json({
    _id: saved._id,
    cattleId: cattle._id,
    cattle: { _id: cattle._id, tag: cattle.tag },
    date: saved.date,
    category: saved.category,
    amount: saved.amount,
    note: saved.note,
  });
}));

r.put('/cattle-expenses/:id', requireAuth, wrap(async (req, res) => {
  const data = cattleExpenseSchema.partial().parse(req.body);
  const cattle = await Cattle.findOne({ 'expenses._id': req.params.id });
  if (!cattle) return res.status(404).json({ error: 'Not found' });

  const expense = cattle.expenses.id(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });

  if (data.date) expense.date = data.date;
  if (data.category) expense.category = data.category;
  if (typeof data.amount !== 'undefined') expense.amount = data.amount;
  if (typeof data.note !== 'undefined') expense.note = data.note;

  await cattle.save();
  res.json(flattenCattleExpenses([cattle]).find((item) => String(item._id) === req.params.id));
}));

r.delete('/cattle-expenses/:id', requireAuth, wrap(async (req, res) => {
  const cattle = await Cattle.findOne({ 'expenses._id': req.params.id });
  if (!cattle) return res.status(404).json({ error: 'Not found' });

  cattle.expenses = cattle.expenses.filter((expense) => String(expense._id) !== req.params.id);
  await cattle.save();
  res.json({ ok: true });
}));

r.post('/cattle/:id/expenses', requireAuth, wrap(async (req, res) => {
  const data = z.object({ date, category: str.min(1), amount: money, note: opt }).parse(req.body);
  const cattle = await Cattle.findById(req.params.id);
  if (!cattle) return res.status(404).json({ error: 'Not found' });
  cattle.expenses.push(data);
  await cattle.save();
  res.status(201).json(cattle);
}));

export default r;
