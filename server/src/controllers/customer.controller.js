import { asyncHandler } from '../utils/async-handler.js';
import { createCustomer, getCustomer, listCustomers, updateCustomer } from '../services/customer.service.js';

export const createCustomerController = asyncHandler(async (request, response) => {
  const customer = await createCustomer(request.body, request.user.id);
  response.status(201).json({ success: true, data: { customer } });
});

export const listCustomersController = asyncHandler(async (request, response) => {
  const result = await listCustomers(request.query);
  response.json({ success: true, data: result });
});

export const getCustomerController = asyncHandler(async (request, response) => {
  const customer = await getCustomer(request.params.customerId);
  response.json({ success: true, data: { customer } });
});

export const updateCustomerController = asyncHandler(async (request, response) => {
  const customer = await updateCustomer(request.params.customerId, request.body);
  response.json({ success: true, data: { customer } });
});
