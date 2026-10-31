import { config } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User, roles } from '../models/user.model.js';
import { hashPassword, passwordPattern } from '../utils/password.js';

const [fullName, emailInput, password] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();

if (!fullName || !email || !password || !passwordPattern.test(password)) {
  console.error('Usage: npm run bootstrap:admin -- "Full Name" admin@example.com "Strong!Password1"');
  process.exit(1);
}

try {
  await connectDatabase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.error('An account with this email already exists; no changes were made.');
    process.exitCode = 1;
  } else {
    await User.create({ fullName: fullName.trim(), email, passwordHash: await hashPassword(password), role: roles.ADMIN });
    console.info(`Admin account created for ${email}.`);
  }
} finally {
  await disconnectDatabase();
}
