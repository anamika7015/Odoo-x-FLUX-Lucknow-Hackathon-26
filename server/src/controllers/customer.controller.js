import { asyncHandler } from '../utils/async-handler.js';
import { createCustomer, getCustomer, getCustomerHistory, getOwnCustomer, listCustomers, updateCustomer, updateOwnCustomer } from '../services/customer.service.js';

export const createCustomerController = asyncHandler(async (request, response) => {
  const customer = await createCustomer(request.body, request.user.id);
  response.status(201).json({ success: true, data: { customer } });
});

export const listCustomersController = asyncHandler(async (request, response) => {
  const result = await listCustomers(request.query, request.user);
  response.json({ success: true, data: result });
});

export const getCustomerController = asyncHandler(async (request, response) => {
  const customer = await getCustomer(request.params.customerId, request.user);
  response.json({ success: true, data: { customer } });
});

export const getCustomerHistoryController = asyncHandler(async (request, response) => {
  const history = await getCustomerHistory(request.params.customerId, request.user);
  response.json({ success: true, data: history, requestId: request.id });
});

export const updateCustomerController = asyncHandler(async (request, response) => {
  const customer = await updateCustomer(request.params.customerId, request.body, request.user);
  response.json({ success: true, data: { customer } });
});

export const getOwnCustomerController = asyncHandler(async (request, response) => {
  const customer = await getOwnCustomer(request.user);
  response.json({ success: true, data: { customer }, requestId: request.id });
});

export const updateOwnCustomerController = asyncHandler(async (request, response) => {
  const customer = await updateOwnCustomer(request.user, request.body);
  response.json({ success: true, data: { customer }, requestId: request.id });
});
