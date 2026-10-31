import { Customer } from '../models/customer.model.js';
import { AppError } from '../utils/app-error.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function createCustomer(input, userId) {
  return Customer.create({ ...input, createdBy: userId });
}

export async function listCustomers({ page, limit, search, status }) {
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.$or = [
    { fullName: { $regex: escapeRegex(search), $options: 'i' } },
    { email: { $regex: escapeRegex(search), $options: 'i' } },
    { companyName: { $regex: escapeRegex(search), $options: 'i' } },
  ];
  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Customer.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getCustomer(customerId) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError('Customer not found.', { statusCode: 404, code: 'CUSTOMER_NOT_FOUND' });
  return customer;
}

export async function updateCustomer(customerId, input) {
  const customer = await Customer.findByIdAndUpdate(customerId, input, { new: true, runValidators: true });
  if (!customer) throw new AppError('Customer not found.', { statusCode: 404, code: 'CUSTOMER_NOT_FOUND' });
  return customer;
}
