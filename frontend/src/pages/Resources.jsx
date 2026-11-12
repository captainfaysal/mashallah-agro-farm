import { Link } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage';
import { taka, day } from '../api';

const TX_TYPES = [{ value: 'SALE', label: 'Sale' }, { value: 'PURCHASE', label: 'Purchase' }];

export const Transactions = () => (
  <ResourcePage
    title="Buy & Sell" endpoint="/transactions"
    fields={[
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'type', label: 'Type', options: TX_TYPES },
      { name: 'partyId', label: 'Party', from: '/parties' },
      { name: 'productId', label: 'Product', from: '/products' },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'rate', label: 'Rate', type: 'number' },
      { name: 'paid', label: 'Paid now', type: 'number', optional: true },
      { name: 'note', label: 'Note', optional: true },
    ]}
    columns={[
      { label: 'Date', render: (r) => day(r.date) },
      { label: 'Type', render: (r, t) => t(r.type === 'SALE' ? 'Sale' : 'Purchase') },
      { label: 'Party', render: (r) => r.party?.name },
      { label: 'Product', render: (r) => r.product?.name },
      { label: 'Quantity', render: (r) => `${Number(r.quantity)} ${r.product?.unit || ''}` },
      { label: 'Rate', render: (r) => taka(r.rate) },
      { label: 'Total', render: (r) => taka(r.total) },
      { label: 'Due', render: (r) => taka(Number(r.total) - Number(r.paid)) },
    ]}
  />
);

export const Payments = () => (
  <ResourcePage
    title="Payments" endpoint="/payments"
    fields={[
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'partyId', label: 'Party', from: '/parties' },
      { name: 'direction', label: 'Direction', options: [{ value: 'RECEIVED', label: 'Received' }, { value: 'PAID', label: 'Paid' }] },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'note', label: 'Note', optional: true },
    ]}
    columns={[
      { label: 'Date', render: (r) => day(r.date) },
      { label: 'Party', render: (r) => r.party?.name },
      { label: 'Direction', render: (r, t) => t(r.direction === 'RECEIVED' ? 'Received' : 'Paid') },
      { label: 'Amount', render: (r) => taka(r.amount) },
      { label: 'Note', key: 'note' },
    ]}
  />
);

export const Parties = () => (
  <ResourcePage
    title="Parties" endpoint="/parties"
    fields={[
      { name: 'name', label: 'Name' },
      { name: 'type', label: 'Type', options: [{ value: 'CUSTOMER', label: 'Customer' }, { value: 'SUPPLIER', label: 'Supplier' }, { value: 'BOTH', label: 'Both' }] },
      { name: 'phone', label: 'Phone', optional: true },
      { name: 'address', label: 'Address', optional: true },
    ]}
    columns={[
      { label: 'Name', render: (r) => <Link className="font-medium text-forest underline" to={`/app/parties/${r._id || r.id}`}>{r.name}</Link> },
      { label: 'Type', render: (r, t) => t(r.type[0] + r.type.slice(1).toLowerCase()) },
      { label: 'Phone', key: 'phone' },
      { label: 'Balance', render: (r, t) => (r.balance === 0 ? '—' : `${taka(Math.abs(r.balance))} ${t(r.balance > 0 ? 'To receive' : 'To pay')}`) },
    ]}
  />
);

export const Products = () => (
  <ResourcePage
    title="Products & Stock" endpoint="/products"
    fields={[{ name: 'name', label: 'Name' }, { name: 'unit', label: 'Unit', optional: true }]}
    columns={[
      { label: 'Name', key: 'name' },
      { label: 'Unit', key: 'unit' },
      { label: 'Stock', render: (r) => `${r.stock} ${r.unit}` },
    ]}
  />
);

export const Daybook = () => (
  <ResourcePage
    title="Daybook" endpoint="/entries"
    fields={[
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'kind', label: 'Type', options: [{ value: 'EXPENSE', label: 'Expense' }, { value: 'INCOME', label: 'Income' }] },
      { name: 'category', label: 'Category' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'note', label: 'Note', optional: true },
    ]}
    columns={[
      { label: 'Date', render: (r) => day(r.date) },
      { label: 'Type', render: (r, t) => t(r.kind === 'INCOME' ? 'Income' : 'Expense') },
      { label: 'Category', key: 'category' },
      { label: 'Amount', render: (r) => taka(r.amount) },
      { label: 'Note', key: 'note' },
    ]}
  />
);

export const Cattle = () => (
  <ResourcePage
    title="Cattle" endpoint="/cattle"
    fields={[
      { name: 'tag', label: 'Tag' },
      { name: 'breed', label: 'Breed', optional: true },
      { name: 'purchaseDate', label: 'Purchase date', type: 'date' },
      { name: 'purchasePrice', label: 'Purchase price', type: 'number' },
      { name: 'status', label: 'Status', options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'SOLD', label: 'Sold' }] },
      { name: 'saleDate', label: 'Sale date', type: 'date', optional: true },
      { name: 'salePrice', label: 'Sale price', type: 'number', optional: true },
      { name: 'note', label: 'Note', optional: true },
    ]}
    columns={[
      { label: 'Tag', key: 'tag' },
      { label: 'Breed', key: 'breed' },
      { label: 'Purchase price', render: (r) => taka(r.purchasePrice) },
      { label: 'Extra cost', render: (r) => taka(r.expenses.reduce((s, e) => s + Number(e.amount), 0)) },
      { label: 'Status', render: (r, t) => t(r.status === 'SOLD' ? 'Sold' : 'Active') },
      { label: 'Sale price', render: (r) => (r.salePrice ? taka(r.salePrice) : '—') },
      {
        label: 'Profit / loss',
        render: (r) => {
          if (r.status !== 'SOLD' || !r.salePrice) return '—';
          const v = Number(r.salePrice) - Number(r.purchasePrice) - r.expenses.reduce((s, e) => s + Number(e.amount), 0);
          return <span className={v >= 0 ? 'text-leaf' : 'text-red-700'}>{taka(v)}</span>;
        },
      },
    ]}
  />
);

export const CattleCosts = () => (
  <ResourcePage
    title="Cattle costs" endpoint="/cattle-expenses"
    fields={[
      { name: 'cattleId', label: 'Cattle tag', from: '/cattle', labelKey: 'tag' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'category', label: 'Category' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'note', label: 'Note', optional: true },
    ]}
    columns={[
      { label: 'Date', render: (r) => day(r.date) },
      { label: 'Cattle tag', render: (r) => r.cattle?.tag },
      { label: 'Category', key: 'category' },
      { label: 'Amount', render: (r) => taka(r.amount) },
      { label: 'Note', key: 'note' },
    ]}
  />
);
