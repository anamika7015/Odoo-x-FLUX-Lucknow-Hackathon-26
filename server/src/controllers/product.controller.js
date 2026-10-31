import * as products from '../services/product.service.js';

export async function createProduct(request, response) { const product = await products.createProduct(request.body); response.status(201).json({ success: true, data: { product }, requestId: request.id }); }
export async function listProducts(request, response) { const result = await products.listProducts(request.query); response.status(200).json({ success: true, data: { products: result.items }, meta: result.meta, requestId: request.id }); }
export async function getProduct(request, response) { const product = await products.getProduct(request.params.productId); response.status(200).json({ success: true, data: { product }, requestId: request.id }); }
export async function updateProduct(request, response) { const product = await products.updateProduct(request.params.productId, request.body); response.status(200).json({ success: true, data: { product }, requestId: request.id }); }
export async function createVariant(request, response) { const variant = await products.createVariant(request.params.productId, request.body); response.status(201).json({ success: true, data: { variant }, requestId: request.id }); }
export async function listVariants(request, response) { const variants = await products.listVariants(request.params.productId, { activeOnly: request.query.active === 'true' }); response.status(200).json({ success: true, data: { variants }, requestId: request.id }); }
export async function updateVariant(request, response) { const variant = await products.updateVariant(request.params.productId, request.params.variantId, request.body); response.status(200).json({ success: true, data: { variant }, requestId: request.id }); }
