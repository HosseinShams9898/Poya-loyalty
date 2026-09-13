/**
 * Auth Middleware — JWT verification with user lookup
 * 
 * Supports both:
 * - Staff tokens (tokenUse: 'staff_access') → ADMIN, SALES_REP, LOYALTY_MANAGER
 * - Member tokens (tokenUse: 'member_access') → Customers
 * 
 * Import prisma from ../lib/prisma (singleton)
 */
 const jwt = require('jsonwebtoken');
 const prisma = require('../lib/prisma');
 
 const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
 
 /**
  * requireAuth — Verify JWT access token from Authorization header.
  * Supports both staff and member tokens.
  * Attaches req.user with user/customer info.
  */
 function requireAuth(req, res, next) {
   const authHeader = req.headers.authorization;
 
   if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({
       success: false,
       message: 'توکن احراز هویت ارسال نشده است',
     });
   }
 
   const token = authHeader.split(' ')[1];
 
   try {
     const decoded = jwt.verify(token, JWT_SECRET);
 
     // ─── ۱. توکن Member (باشگاه مشتریان) ───
     if (decoded.tokenUse === 'member_access') {
       const customerId = decoded.customerId || decoded.id || decoded.sub;
 
       if (!customerId) {
         return res.status(401).json({
           success: false,
           message: 'توکن نامعتبر است',
         });
       }
 
       prisma.customer.findUnique({
         where: { id: customerId },
         select: {
           id: true,
           fullName: true,
           mobile: true,
           memberStatus: true,
           status: true,
           company: true,
           tierId: true,
           totalPoints: true,
           walletBalance: true,
         },
       })
       .then((customer) => {
         if (!customer) {
           return res.status(401).json({
             success: false,
             message: 'مشتری یافت نشد',
           });
         }
 
         if (customer.memberStatus !== 'ACTIVE') {
           return res.status(403).json({
             success: false,
             message: 'حساب کاربری غیرفعال شده است',
           });
         }
 
         req.user = {
           id: customer.id,
           fullName: customer.fullName,
           mobile: customer.mobile,
           role: 'MEMBER',
           isMember: true,
           customerId: customer.id,
           company: customer.company,
           tierId: customer.tierId,
           totalPoints: customer.totalPoints,
           walletBalance: customer.walletBalance,
         };
         next();
       })
       .catch((err) => {
         console.error('[auth middleware] DB error:', err.message);
         return res.status(500).json({
           success: false,
           message: 'خطا در بررسی احراز هویت',
         });
       });
       
       return;
     }
 
     // ─── ۲. توکن Staff (کارکنان) ───
     const userId = decoded.id || decoded.sub || decoded.userId;
 
     if (!userId) {
       return res.status(401).json({
         success: false,
         message: 'توکن نامعتبر است',
       });
     }
 
     prisma.user.findUnique({
         where: { id: userId },
         select: {
           id: true,
           email: true,
           role: true,
           status: true,
           firstName: true,
           lastName: true,
         },
       })
       .then((user) => {
         if (!user) {
           return res.status(401).json({
             success: false,
             message: 'کاربر یافت نشد',
           });
         }
 
         if (user.status !== 'ACTIVE') {
           return res.status(403).json({
             success: false,
             message: 'حساب کاربری غیرفعال شده است',
           });
         }
 
         req.user = {
           id: user.id,
           email: user.email,
           role: user.role,
           status: user.status,
           firstName: user.firstName,
           lastName: user.lastName,
           isMember: false,
         };
         next();
       })
       .catch((err) => {
         console.error('[auth middleware] DB error:', err.message);
         return res.status(500).json({
           success: false,
           message: 'خطا در بررسی احراز هویت',
         });
       });
   } catch (error) {
     if (error.name === 'TokenExpiredError') {
       return res.status(401).json({
         success: false,
         message: 'توکن منقضی شده — لطفاً دوباره وارد شوید',
         code: 'TOKEN_EXPIRED',
       });
     }
     return res.status(401).json({
       success: false,
       message: 'توکن نامعتبر است',
     });
   }
 }
 
 /**
  * requireRole — Wrapper that checks req.user.role is in the allowed list.
  * Must be used AFTER requireAuth.
  * @param  {...string} roles
  */
 function requireRole(...roles) {
   return (req, res, next) => {
     if (!req.user) {
       return res.status(401).json({
         success: false,
         message: 'ابتدا وارد شوید',
       });
     }
     
     // Members don't have access to admin routes
     if (req.user.isMember) {
       return res.status(403).json({
         success: false,
         message: 'شما دسترسی به این بخش ندارید',
       });
     }
     
     if (!roles.includes(req.user.role)) {
       return res.status(403).json({
         success: false,
         message: 'شما دسترسی به این بخش ندارید',
       });
     }
     next();
   };
 }
 
 module.exports = { requireAuth, requireRole };