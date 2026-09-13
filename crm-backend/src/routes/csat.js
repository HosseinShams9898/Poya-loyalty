/**
 * CSAT Routes — سیستم سنجش رضایت مشتری
 * 
 * GET  /api/v1/csat/:token   — دریافت اطلاعات توکن (عمومی)
 * POST /api/v1/csat/:token   — ثبت امتیاز (عمومی)
 * GET  /api/v1/csat/stats   — آمار CSAT (محافظت‌شده)
 */

const express = require('express');
const csatService = require('../services/csatService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────────
// GET /api/v1/csat/:token
// عمومی — بدون احراز هویت
// مشتری لینک پیامک را باز می‌کند
// ──────────────────────────────────────────────
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await csatService.getTokenInfo(token);

    if (!result.valid) {
      return res.status(410).json({
        success: false,
        reason: result.reason,
        message: {
          TOKEN_NOT_FOUND: 'لینک نامعتبر است',
          TOKEN_EXPIRED: 'لینک منقضی شده. مهلت ارسال نظر گذشته است.',
          ALREADY_SUBMITTED: 'شما قبلاً امتیاز خود را ثبت کرده‌اید. از شما سپاسگزاریم!',
        }[result.reason] || 'خطای ناشناخته',
      });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[csat] خطا در getTokenInfo:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
});

// ──────────────────────────────────────────────
// POST /api/v1/csat/:token
// عمومی — بدون احراز هویت
// ثبت امتیاز ۱ تا ۵
// ──────────────────────────────────────────────
router.post('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { score } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({
        success: false,
        message: 'فیلد score الزامی است (عدد ۱ تا ۵)',
      });
    }

    const result = await csatService.submitScore(token, score);

    if (!result.success) {
      const statusCode = result.error.includes('منقضی') || result.error.includes('قبلاً') ? 410 : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.error,
      });
    }

    return res.json({
      success: true,
      data: {
        score: result.score,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('[csat] خطا در submitScore:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/csat/stats
// محافظت‌شده — فقط ADMIN
// ──────────────────────────────────────────────
router.get('/admin/stats', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const stats = await csatService.getStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[csat] خطا در getStats:', error);
    return res.status(500).json({ success: false, message: 'خطا در دریافت آمار' });
  }
});

module.exports = router;
