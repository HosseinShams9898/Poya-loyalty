/**
 * Auth Service — Password hashing, token generation, login/logout/refresh
 * 
 * Uses Node.js crypto.scrypt for hashing (NOT bcrypt).
 * Import prisma from ../lib/prisma (singleton).
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

// ─────────────────────────────────────────────
// Password hashing with scrypt
// ─────────────────────────────────────────────

/**
 * Hash a password using Node.js crypto.scrypt.
 * Format: $scrypt$<salt-hex>$<hash-hex>
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`$scrypt$${salt}$${derivedKey.toString('hex')}`);
      }
    );
  });
}

/**
 * Verify a password against a scrypt hash.
 * @param {string} password
 * @param {string} hash — in format $scrypt$<salt-hex>$<hash-hex>
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  const parts = hash.split('$');
  // parts: ['', 'scrypt', salt, hashHex]
  if (parts.length !== 4 || parts[1] !== 'scrypt') {
    throw new Error('Invalid hash format');
  }
  const salt = parts[2];
  const storedHash = parts[3];

  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, derivedKey) => {
        if (err) return reject(err);
        const computedHash = derivedKey.toString('hex');
        // Timing-safe comparison
        resolve(crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash)));
      }
    );
  });
}

// ─────────────────────────────────────────────
// Token generation
// ─────────────────────────────────────────────

/**
 * Generate access + refresh token pair.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenUse: 'staff_access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenUse: 'staff_refresh', jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );

  return { accessToken, refreshToken };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compute the absolute expiry date for a refresh token.
 */
function refreshExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return d;
}

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────

/**
 * Authenticate user by email + password.
 * Returns tokens + user info (no password).
 */
async function login(identifier, password) {
  const normalized = String(identifier || '').toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: normalized }, { mobile: normalized }] },
  });

  if (!user) {
    throw new Error('ایمیل یا رمز عبور اشتباه است');
  }

  if (user.status !== 'ACTIVE') {
    throw new Error('حساب کاربری غیرفعال شده است');
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    throw new Error('ایمیل یا رمز عبور اشتباه است');
  }

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token in DB
  await prisma.refreshToken.create({
    data: {
      token: hashToken(refreshToken),
      userId: user.id,
      expiresAt: refreshExpiryDate(),
    },
  });

  // Return user without password
  const { password: _pw, ...userInfo } = user;
  return {
    accessToken,
    refreshToken,
    user: userInfo,
  };
}

// ─────────────────────────────────────────────
// Refresh token
// ─────────────────────────────────────────────

/**
 * Refresh an existing token pair.
 * Finds token in DB, checks expiry, generates new pair, rotates tokens.
 */
async function refreshToken(token) {
  // Find the refresh token in DB
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.tokenUse !== 'staff_refresh') throw new Error('توکن تمدید نامعتبر است');
  const stored = await prisma.refreshToken.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });

  if (!stored) {
    throw new Error('توکن تمدید نامعتبر است');
  }

  if (stored.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new Error('توکن تمدید منقضی شده — لطفاً دوباره وارد شوید');
  }

  if (stored.user.status !== 'ACTIVE') {
    throw new Error('حساب کاربری غیرفعال شده است');
  }

  // Generate new token pair
  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    id: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  });

  // Delete old refresh token
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  // Store new refresh token
  await prisma.refreshToken.create({
    data: {
      token: hashToken(newRefreshToken),
      userId: stored.user.id,
      expiresAt: refreshExpiryDate(),
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────

/**
 * Logout — delete refresh token from DB.
 */
async function logout(token) {
  if (!token) return;
  await prisma.refreshToken.deleteMany({ where: { token: hashToken(token) } });
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateTokens,
  login,
  refreshToken,
  logout,
  hashToken,
};
