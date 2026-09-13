/**
 * Auth Routes — login, refresh, logout, register, me, bootstrap-admin
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authService = require('../services/authService');
const { requireAuth, requireRole } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// ════════════════════════════════════════════
// POST /login
// ════════════════════════════════════════════
router.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 8, message: 'تلاش ورود بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید' }), async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email;

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'ایمیل/موبایل و رمز عبور الزامی است',
      });
    }

    const result = await authService.login(loginId, password);
    res.json({
      success: true,
      data: {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        user: result.user,
      },
    });
  } catch (err) {
    if (err.message.includes('ایمیل یا رمز عبور') || err.message.includes('غیرفعال')) {
      return res.status(401).json({ success: false, message: err.message });
    }
    console.error('[auth/login] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ════════════════════════════════════════════
// POST /refresh
// ════════════════════════════════════════════
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'توکن تمدید الزامی است',
      });
    }

    const tokens = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: { access_token: tokens.accessToken, refresh_token: tokens.refreshToken } });
  } catch (err) {
    if (
      err.message.includes('نامعتبر') ||
      err.message.includes('منقضی') ||
      err.message.includes('غیرفعال')
    ) {
      return res.status(401).json({ success: false, message: err.message });
    }
    console.error('[auth/refresh] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ════════════════════════════════════════════
// POST /logout
// ════════════════════════════════════════════
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.body.refresh_token || req.body.refreshToken;
    await authService.logout(refreshToken);
    res.json({ success: true, message: 'با موفقیت خارج شدید' });
  } catch (err) {
    console.error('[auth/logout] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ════════════════════════════════════════════
// POST /register (ADMIN only)
// ════════════════════════════════════════════
router.post('/register', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'نام، نام خانوادگی، ایمیل و رمز عبور الزامی است',
      });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'این ایمیل قبلاً ثبت شده است',
      });
    }

    const hashedPassword = await authService.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        mobile: mobile || null,
        password: hashedPassword,
        role: (role && ['ADMIN', 'LOYALTY_MANAGER', 'SALES_REP'].includes(role)) ? role : 'SALES_REP',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error('[auth/register] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ════════════════════════════════════════════
// GET /me — current user profile
// ════════════════════════════════════════════
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد',
      });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[auth/me] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ════════════════════════════════════════════
// PUT /me — update own profile
// ════════════════════════════════════════════
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, mobile } = req.body;

    // Build update data with only provided fields
    const data = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (mobile !== undefined) data.mobile = mobile;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'حداقل یک فیلد برای بروزرسانی ارسال کنید',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[auth/me PUT] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ════════════════════════════════════════════
// POST /bootstrap-admin
// ONLY works if ZERO users exist in DB.
// Creates the first admin user.
// ════════════════════════════════════════════
router.post('/bootstrap-admin', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'ایمیل و رمز عبور الزامی است',
      });
    }

    // Check if any user already exists
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'ادمین قبلاً ایجاد شده است — این مسیر فقط یک بار قابل استفاده است',
      });
    }

    const hashedPassword = await authService.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: firstName || 'Admin',
        lastName: lastName || 'User',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'ادمین اولیه ایجاد شد',
      data: user,
    });
  } catch (err) {
    console.error('[auth/bootstrap-admin] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
