/**
 * User Management Routes (ADMIN only)
 * 
 * - GET    /            — list all users (without passwords)
 * - PATCH  /:id/status  — activate/deactivate user
 * - DELETE /:id          — soft delete (set status=INACTIVE)
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

// All routes require auth + admin role
router.use(requireAuth, requireRole('ADMIN'));

// ════════════════════════════════════════════
// GET / — List all users (without passwords)
// ════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { page = '1', pageSize = '20', role, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const sizeNum = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20));
    const skip = (pageNum - 1) * sizeNum;

    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;

    if (search && search.trim()) {
      where.OR = [
        { firstName: { contains: search.trim(), mode: 'insensitive' } },
        { lastName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          _count: {
            select: {
              assignedLeads: true,
              campaigns: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: sizeNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        pageSize: sizeNum,
        total,
        totalPages: Math.ceil(total / sizeNum),
      },
    });
  } catch (err) {
    console.error('[users/list] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ════════════════════════════════════════════
// PATCH /:id/status — Activate/deactivate user
// ════════════════════════════════════════════
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'وضعیت نامعتبر است. مقادیر مجاز: ACTIVE, INACTIVE',
      });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.id && status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'شما نمی‌توانید حساب خود را غیرفعال کنید',
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد',
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[users/status] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ════════════════════════════════════════════
// DELETE /:id — Soft delete (set status=INACTIVE)
// ════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'شما نمی‌توانید حساب خود را حذف کنید',
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد',
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    res.json({
      success: true,
      message: 'کاربر غیرفعال شد',
      data: updated,
    });
  } catch (err) {
    console.error('[users/delete] خطا:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
