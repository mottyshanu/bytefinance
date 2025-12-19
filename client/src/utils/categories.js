// Comprehensive expense and income categories for agency finance
export const EXPENSE_CATEGORIES = [
  { value: 'marketing', label: 'Marketing & Advertising', icon: 'Megaphone' },
  { value: 'software', label: 'Software & Tools', icon: 'Code2' },
  { value: 'subscriptions', label: 'Subscriptions & SaaS', icon: 'RefreshCw' },
  { value: 'salaries', label: 'Salaries & Payroll', icon: 'Users' },
  { value: 'freelancers', label: 'Freelancer Payments', icon: 'UserCheck' },
  { value: 'office', label: 'Office & Rent', icon: 'Building2' },
  { value: 'hardware', label: 'Hardware & Equipment', icon: 'Laptop' },
  { value: 'travel', label: 'Travel & Accommodation', icon: 'Plane' },
  { value: 'utilities', label: 'Utilities & Internet', icon: 'Wifi' },
  { value: 'legal', label: 'Legal & Compliance', icon: 'Scale' },
  { value: 'insurance', label: 'Insurance', icon: 'Shield' },
  { value: 'training', label: 'Training & Education', icon: 'GraduationCap' },
  { value: 'entertainment', label: 'Client Entertainment', icon: 'Coffee' },
  { value: 'misc', label: 'Miscellaneous', icon: 'MoreHorizontal' }
];

export const INCOME_CATEGORIES = [
  { value: 'project', label: 'Project Payment', icon: 'Briefcase' },
  { value: 'retainer', label: 'Retainer Fee', icon: 'Clock' },
  { value: 'consulting', label: 'Consulting Services', icon: 'MessageSquare' },
  { value: 'design', label: 'Design Work', icon: 'Palette' },
  { value: 'development', label: 'Development Services', icon: 'Code' },
  { value: 'maintenance', label: 'Maintenance & Support', icon: 'Wrench' },
  { value: 'license', label: 'License & Royalties', icon: 'Award' },
  { value: 'referral', label: 'Referral Commission', icon: 'Share2' },
  { value: 'other', label: 'Other Income', icon: 'DollarSign' }
];

export const getCategoryLabel = (value, type = 'EXPENSE') => {
  const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const cat = categories.find(c => c.value === value);
  return cat ? cat.label : value;
};

export const getCategoryIcon = (value, type = 'EXPENSE') => {
  const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const cat = categories.find(c => c.value === value);
  return cat ? cat.icon : 'Circle';
};
