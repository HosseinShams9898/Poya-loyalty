const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function requireMember(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'برای ورود به باشگاه احراز هویت کنید' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    if (payload.tokenUse !== 'member_access' || !payload.customerId) {
      return res.status(401).json({ success: false, message: 'توکن عضویت نامعتبر است' });
    }
    const member = await prisma.customer.findUnique({
      where: { id: payload.customerId },
      select: { id: true, mobile: true, memberStatus: true },
    });
    if (!member || member.memberStatus !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'عضویت شما فعال نیست' });
    }
    req.member = member;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError' ? 'نشست شما منقضی شده است' : 'توکن عضویت نامعتبر است',
    });
  }
}

module.exports = { requireMember };
