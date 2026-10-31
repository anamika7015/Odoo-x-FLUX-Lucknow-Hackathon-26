import { Product } from '../models/product.model.js';
import { ProductVariant } from '../models/product-variant.model.js';
import { AppError } from '../utils/app-error.js';

const normalize = (value) => value.trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function calculateVariantFinalPrice(salesPrice, additionalPrice) {
  return salesPrice + additionalPrice;
}

function withFinalPrice(product, variant) {
  const plain = variant.toObject ? variant.toObject() : variant;
  return { ...plain, finalPrice: calculateVariantFinalPrice(product.salesPrice, plain.additionalPrice), currency: product.currency };
}

export async function createProduct(input) {
  return Product.create({ ...input, normalizedName: normalize(input.name) });
}
export async function listProducts({ page, limit, search, status, productType }) {
  const filter = {};
  if (status) filter.status = status;
  if (productType) filter.productType = productType;
  if (search) filter.$or = [{ name: { $regex: escapeRegex(search), $options: 'i' } }, { productType: { $regex: escapeRegex(search), $options: 'i' } }];
  const [items, total] = await Promise.all([Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Product.countDocuments(filter)]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getProduct(productId) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found.', { statusCode: 404, code: 'PRODUCT_NOT_FOUND' });
  return product;
}
export async function updateProduct(productId, input) {
  const update = { ...input };
  if (input.name) update.normalizedName = normalize(input.name);
  const product = await Product.findByIdAndUpdate(productId, update, { new: true, runValidators: true });
  if (!product) throw new AppError('Product not found.', { statusCode: 404, code: 'PRODUCT_NOT_FOUND' });
  return product;
}
export async function createVariant(productId, input) {
  await getProduct(productId);
  return ProductVariant.create({ ...input, product: productId, normalizedName: normalize(input.name) });
}
export async function listVariants(productId, { activeOnly = false } = {}) {
  const product = await getProduct(productId);
  const filter = { product: productId, ...(activeOnly ? { status: 'ACTIVE' } : {}) };
  const variants = await ProductVariant.find(filter).sort({ attribute: 1, name: 1 });
  return variants.map((variant) => withFinalPrice(product, variant));
}
export async function updateVariant(productId, variantId, input) {
  await getProduct(productId);
  const update = { ...input };
  if (input.name) update.normalizedName = normalize(input.name);
  const variant = await ProductVariant.findOneAndUpdate({ _id: variantId, product: productId }, update, { new: true, runValidators: true });
  if (!variant) throw new AppError('Product variant not found.', { statusCode: 404, code: 'VARIANT_NOT_FOUND' });
  return withFinalPrice(await getProduct(productId), variant);
}
