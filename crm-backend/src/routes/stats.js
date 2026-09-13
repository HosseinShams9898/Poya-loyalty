const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.get('/loyalty-dashboard', requireAuth, requireRole('ADMIN','LOYALTY_MANAGER'), async (_req,res)=>{
  try {
    const [members, activeMembers, invoices, points, wallet] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({where:{memberStatus:'ACTIVE'}}),
      prisma.invoice.aggregate({_sum:{amount:true},_count:{id:true}}),
      prisma.pointTransaction.aggregate({_sum:{points:true}}),
      prisma.walletTransaction.aggregate({_sum:{amount:true}}),
    ]);
    res.json({success:true,data:{members,activeMembers,invoicesCount:invoices._count.id,totalSales:invoices._sum.amount||0n,netPoints:points._sum.points||0,walletNet:wallet._sum.amount||0n}});
  } catch(e){ console.error('[stats]',e); res.status(500).json({success:false,message:'خطا در دریافت آمار باشگاه'}); }
});
module.exports=router;
