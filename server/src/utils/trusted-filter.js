import mongoose from 'mongoose';

// Filters are trusted only after route-level Zod validation and service-level
// escaping/ownership checks. Never wrap raw request objects in this helper.
const logicalOperators = new Set(['$and', '$or', '$nor']);

function trustValidatedOperators(filter) {
  for (const [key, value] of Object.entries(filter)) {
    if (logicalOperators.has(key) && Array.isArray(value)) {
      filter[key] = value.map((branch) => trustValidatedOperators(branch));
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if (Object.keys(value).some((operator) => operator.startsWith('$'))) filter[key] = mongoose.trusted(value);
      else trustValidatedOperators(value);
    }
  }
  return filter;
}

export const trustedFilter = (filter) => trustValidatedOperators(filter);
