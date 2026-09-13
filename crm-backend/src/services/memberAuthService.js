const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const settingsService = require('./settingsService');
const smsService = require('./smsService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const OTP_SECRET = process.env.OTP_SECRET || JWT_SECRET;

function otpHash(mobile, code) {
  return crypto.createHmac('sha256', OTP_SECRET).update(`${mobile}:${code}`).digest('hex');
}

function randomOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function requestOtp(rawMobile) {
  const mobile = smsService.normalizePhone(rawMobile);
  if (!mobile) throw new Error('شماره موبایل معتبر نیست');
  const customer = await prisma.customer.findUnique({ where: { mobile } });
  // Keep the public response indistinguishable for unknown users.
  if (!customer || customer.memberStatus !== 'ACTIVE') return { accepted: true, mobile };

  const expiryMinutes = Math.max(1, Math.min(10, Number(await settingsService.get('memberOtpExpiryMinutes')) || 3));
  const code = randomOtp();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60_000);
    console.log('📱 [OTP] کد تولید شده:', code);
  console.log('📱 [OTP] برای شماره:', mobile);
  console.log('📱 [OTP] HEPIKAL_API_KEY:', process.env.HEPIKAL_API_KEY ? 'تنظیم شده' : 'تنظیم نشده');
  console.log('📱 [OTP] NODE_ENV:', process.env.NODE_ENV);
  await prisma.$transaction([
    prisma.memberOtpCode.updateMany({
      where: { customerId: customer.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.memberOtpCode.create({
      data: { customerId: customer.id, codeHash: otpHash(mobile, code), expiresAt },
    }),
  ]);

 const isFakeMode = !process.env.HEPIKAL_API_KEY || process.env.HEPIKAL_API_KEY === 'your-hepikal-api-key';  
 const shouldReturnDemoCode = isFakeMode || process.env.NODE_ENV !== 'production';
  console.log('📱 [OTP] isFakeMode:', isFakeMode);
  console.log('📱 [OTP] shouldReturnDemoCode:', shouldReturnDemoCode);
  console.log('📱 [OTP] demoCode ارسال به فرانت:', shouldReturnDemoCode ? code : 'نه');
  await smsService.sendSMS(mobile, `کد ورود به باشگاه مشتریان پویا پلاستیک: ${code}\nاعتبار: ${expiryMinutes} دقیقه`);
  return {
    accepted: true,
    mobile,
    expiresIn: expiryMinutes * 60,
    ...(shouldReturnDemoCode  && { demoCode: code }),
  };
}

async function verifyOtp(rawMobile, code) {
  const mobile = smsService.normalizePhone(rawMobile);
  if (!mobile || !/^\d{6}$/.test(String(code || ''))) throw new Error('کد واردشده معتبر نیست');
  const customer = await prisma.customer.findUnique({ where: { mobile } });
  if (!customer || customer.memberStatus !== 'ACTIVE') throw new Error('کد واردشده معتبر نیست');
  const otp = await prisma.memberOtpCode.findFirst({
    where: { customerId: customer.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp || otp.expiresAt < new Date() || otp.attempts >= 5) throw new Error('کد منقضی یا نامعتبر است');
  const expected = Buffer.from(otp.codeHash, 'hex');
  const actual = Buffer.from(otpHash(mobile, String(code)), 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    await prisma.memberOtpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new Error('کد واردشده معتبر نیست');
  }
  await prisma.memberOtpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  const accessToken = jwt.sign(
    { customerId: customer.id, mobile: customer.mobile, tokenUse: 'member_access' },
    JWT_SECRET,
    { expiresIn: '12h' },
  );
  return { accessToken, expiresIn: 43_200, member: { id: customer.id, fullName: customer.fullName, mobile: customer.mobile } };
}

module.exports = { requestOtp, verifyOtp, otpHash };
