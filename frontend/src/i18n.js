import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English strings are the keys; only Bangla needs a dictionary.
const bn = {
  'Dashboard': 'ড্যাশবোর্ড', 'Buy & Sell': 'ক্রয়-বিক্রয়', 'Payments': 'পেমেন্ট', 'Parties': 'পার্টি',
  'Products & Stock': 'পণ্য ও মজুদ', 'Daybook': 'দৈনিক আয়-ব্যয়', 'Cattle': 'গরু', 'Cattle costs': 'গরুর খরচ',
  'Sign out': 'লগ আউট', 'Owner sign in': 'মালিক লগইন', 'Sign in': 'লগইন', 'Email': 'ইমেইল', 'Password': 'পাসওয়ার্ড',
  'Add': 'যোগ করুন', 'Save': 'সংরক্ষণ', 'Cancel': 'বাতিল', 'Edit': 'সম্পাদনা', 'Delete': 'মুছুন', 'Search': 'খুঁজুন',
  'Delete this record?': 'এই রেকর্ডটি মুছবেন?', 'Nothing here yet. Add the first record.': 'এখনো কিছু নেই। প্রথম রেকর্ড যোগ করুন।',
  'Date': 'তারিখ', 'Type': 'ধরন', 'Party': 'পার্টি', 'Product': 'পণ্য', 'Quantity': 'পরিমাণ', 'Rate': 'দর', 'Total': 'মোট',
  'Paid now': 'এখন পরিশোধ', 'Due': 'বাকি', 'Note': 'নোট', 'Name': 'নাম', 'Phone': 'ফোন', 'Address': 'ঠিকানা',
  'Unit': 'একক', 'Stock': 'মজুদ', 'Balance': 'ব্যালেন্স', 'Amount': 'পরিমাণ (৳)', 'Category': 'ক্যাটাগরি',
  'Purchase': 'ক্রয়', 'Sale': 'বিক্রয়', 'Customer': 'ক্রেতা', 'Supplier': 'সরবরাহকারী', 'Both': 'উভয়',
  'Received': 'গ্রহণ', 'Paid': 'প্রদান', 'Direction': 'দিক', 'Income': 'আয়', 'Expense': 'ব্যয়',
  'Tag': 'ট্যাগ', 'Breed': 'জাত', 'Purchase date': 'ক্রয়ের তারিখ', 'Purchase price': 'ক্রয়মূল্য', 'Status': 'অবস্থা',
  'Active': 'চলমান', 'Sold': 'বিক্রিত', 'Sale date': 'বিক্রয়ের তারিখ', 'Sale price': 'বিক্রয়মূল্য',
  'Extra cost': 'অতিরিক্ত খরচ', 'Profit / loss': 'লাভ / ক্ষতি', 'Cattle tag': 'গরুর ট্যাগ',
  'Revenue': 'আয়', 'Cost': 'খরচ', 'Profit': 'লাভ', 'Loss': 'ক্ষতি', 'To receive': 'পাওনা', 'To pay': 'দেনা',
  'Daily': 'দৈনিক', 'Monthly': 'মাসিক', 'Yearly': 'বার্ষিক', 'From': 'শুরু', 'To': 'শেষ', 'Print report': 'রিপোর্ট প্রিন্ট',
  'Revenue vs cost': 'আয় বনাম খরচ', 'Profit over time': 'সময়ের সাথে লাভ', 'Ledger': 'লেজার', 'Back to parties': 'পার্টি তালিকায় ফিরুন',
  'Details': 'বিবরণ', 'Wrong email or password': 'ইমেইল বা পাসওয়ার্ড ভুল',
  'Trust-built, prosperous through farming': 'বিশ্বাসে গড়া, কৃষিতে সমৃদ্ধি', 'Cattle on the farm': 'খামারে গরু',
  'Products we deal in': 'আমাদের পণ্যসমূহ', 'No products listed yet.': 'এখনো কোনো পণ্য তালিকাভুক্ত নয়।',
  'Only the two farm owners can edit records.': 'শুধু দুইজন খামার মালিক রেকর্ড পরিবর্তন করতে পারেন।',
  'Loading…': 'লোড হচ্ছে…', 'Opening balance': 'প্রারম্ভিক', 'Payment received': 'পেমেন্ট গ্রহণ', 'Payment made': 'পেমেন্ট প্রদান',
};

i18n.use(initReactI18next).init({
  lng: localStorage.getItem('lang') || 'bn',
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  resources: { bn: { translation: bn } },
  interpolation: { escapeValue: false },
});
i18n.on('languageChanged', (l) => localStorage.setItem('lang', l));
export default i18n;
