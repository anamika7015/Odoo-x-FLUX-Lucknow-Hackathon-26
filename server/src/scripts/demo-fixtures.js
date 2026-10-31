export const demoCustomerFixtures = [
  { fullName: 'Maya Sharma', companyName: 'Northstar Commerce', phone: '+91 98765 43101', billingAddress: 'Lucknow, Uttar Pradesh', taxId: '09AABCN1234C1Z2' },
  { fullName: 'Aarav Mehta', companyName: 'Mehta Design Co.', phone: '+91 98765 43102', billingAddress: 'Jaipur, Rajasthan', taxId: '08AABCM2345D1Z3' },
  { fullName: 'Isha Kapoor', companyName: 'Kapoor Health Labs', phone: '+91 98765 43103', billingAddress: 'New Delhi, Delhi', taxId: '07AABCK3456E1Z4' },
  { fullName: 'Kabir Verma', companyName: 'Verma Logistics', phone: '+91 98765 43104', billingAddress: 'Pune, Maharashtra', taxId: '27AABCV4567F1Z5' },
  { fullName: 'Anaya Rao', companyName: 'Rao Learning Studio', phone: '+91 98765 43105', billingAddress: 'Bengaluru, Karnataka', taxId: '29AABCR5678G1Z6' },
];

export const demoProductFixtures = [
  { name: 'Demo · CRM Pro', key: 'demo-crm-pro', productType: 'SAAS', salesPrice: 499_00, costPrice: 125_00, description: 'Customer relationships, sales pipelines, and team collaboration.' },
  { name: 'Demo · HR Management Suite', key: 'demo-hr-management-suite', productType: 'SAAS', salesPrice: 999_00, costPrice: 240_00, description: 'People operations, leave management, and employee records.' },
  { name: 'Demo · Inventory Management', key: 'demo-inventory-management', productType: 'SAAS', salesPrice: 2_499_00, costPrice: 510_00, description: 'Real-time stock visibility and warehouse operations.' },
  { name: 'Demo · Accounting Cloud', key: 'demo-accounting-cloud', productType: 'SAAS', salesPrice: 1_499_00, costPrice: 360_00, description: 'Billing, reconciliation, and financial reporting.' },
  { name: 'Demo · Project Management Pro', key: 'demo-project-management-pro', productType: 'SAAS', salesPrice: 749_00, costPrice: 180_00, description: 'Project planning, resource allocation, and delivery tracking.' },
  { name: 'Demo · Marketing Automation', key: 'demo-marketing-automation', productType: 'SAAS', salesPrice: 1_999_00, costPrice: 430_00, description: 'Campaign journeys, audience segments, and attribution.' },
  { name: 'Demo · AI Analytics Suite', key: 'demo-ai-analytics-suite', productType: 'SAAS', salesPrice: 2_999_00, costPrice: 650_00, description: 'Predictive insights and operational dashboards.' },
  { name: 'Demo · Business Intelligence Platform', key: 'demo-business-intelligence-platform', productType: 'SAAS', salesPrice: 3_499_00, costPrice: 780_00, description: 'Cross-functional analytics and governed data exploration.' },
];

export const demoPlanFixtures = [
  { name: 'Demo · Basic Monthly', product: 0, price: 499_00, frequency: 'MONTHLY', minimumQuantity: 1, allowPause: true, allowRenewal: true },
  { name: 'Demo · Professional Monthly', product: 0, price: 999_00, frequency: 'MONTHLY', minimumQuantity: 2, allowPause: true, allowRenewal: true },
  { name: 'Demo · Business Monthly', product: 1, price: 2_499_00, frequency: 'MONTHLY', minimumQuantity: 1, allowPause: true, allowRenewal: true },
  { name: 'Demo · Enterprise Monthly', product: 2, price: 4_999_00, frequency: 'MONTHLY', minimumQuantity: 1, allowPause: false, allowRenewal: true },
  { name: 'Demo · Professional Yearly', product: 3, price: 9_999_00, frequency: 'YEARLY', minimumQuantity: 1, allowPause: true, allowRenewal: true },
  { name: 'Demo · Enterprise Yearly', product: 4, price: 49_999_00, frequency: 'YEARLY', minimumQuantity: 1, allowPause: false, allowRenewal: true },
  { name: 'Demo · Marketing Monthly', product: 5, price: 1_499_00, frequency: 'MONTHLY', minimumQuantity: 1, allowPause: true, allowRenewal: true },
  { name: 'Demo · Analytics Monthly', product: 6, price: 2_499_00, frequency: 'MONTHLY', minimumQuantity: 1, allowPause: true, allowRenewal: true },
  { name: 'Demo · Intelligence Weekly', product: 7, price: 399_00, frequency: 'WEEKLY', minimumQuantity: 1, allowPause: true, allowRenewal: true },
  { name: 'Demo · CRM Daily', product: 0, price: 49_00, frequency: 'DAILY', minimumQuantity: 1, allowPause: true, allowRenewal: true },
];

export const demoTaxFixtures = [
  { name: 'Demo · GST 18%', key: 'demo-gst-18', rateBasisPoints: 1_800, products: [0, 1, 2, 3] },
  { name: 'Demo · Digital Services 12%', key: 'demo-digital-12', rateBasisPoints: 1_200, products: [4, 5, 6, 7] },
  { name: 'Demo · Essential Software 5%', key: 'demo-essential-5', rateBasisPoints: 500, products: [0, 3] },
];

export const demoDiscountFixtures = [
  { name: 'Demo · Welcome 10%', code: 'DEMO-WELCOME10', type: 'PERCENTAGE', value: 1_000, targetType: 'SUBSCRIPTION', autoApply: false, priority: 10 },
  { name: 'Demo · Annual 15%', code: 'DEMO-ANNUAL15', type: 'PERCENTAGE', value: 1_500, targetType: 'SUBSCRIPTION', autoApply: false, priority: 20 },
  { name: 'Demo · CRM 500 off', code: 'DEMO-CRM500', type: 'FIXED', value: 50_000, targetType: 'PRODUCT', products: [0], autoApply: false, priority: 30 },
  { name: 'Demo · Business 5%', code: 'DEMO-BIZ5', type: 'PERCENTAGE', value: 500, targetType: 'PRODUCT', products: [1, 2, 7], autoApply: true, priority: 40 },
  { name: 'Demo · Spring 250 off', code: 'DEMO-SPRING250', type: 'FIXED', value: 25_000, targetType: 'SUBSCRIPTION', autoApply: false, priority: 50 },
  { name: 'Demo · Analytics 8%', code: 'DEMO-ANALYTICS8', type: 'PERCENTAGE', value: 800, targetType: 'PRODUCT', products: [6, 7], autoApply: false, priority: 60 },
];

export const demoQuotationStatuses = ['CONVERTED', 'CONVERTED', 'CONVERTED', 'CONVERTED', 'CONVERTED', 'CONVERTED', 'QUOTATION', 'QUOTATION', 'CONFIRMED', 'DRAFT', 'REJECTED', 'EXPIRED'];
export const demoSubscriptionStatuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PAUSED', 'PAUSED', 'CONFIRMED', 'CONFIRMED', 'CLOSED', 'CLOSED', 'EXPIRED', 'EXPIRED'];
