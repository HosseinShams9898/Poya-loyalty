require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { hashPassword } = require('../src/services/authService');

async function main() {
  const tiers = [
    { code:'BASE', title:'پایه', audienceType:'ALL', minPoints:0, multiplier:1, sortOrder:1, benefits:JSON.stringify(['امتیاز خرید']) },
    { code:'SILVER', title:'نقره‌ای', audienceType:'ALL', minPoints:1500, multiplier:1.1, sortOrder:2, benefits:JSON.stringify(['۱۰٪ امتیاز بیشتر']) },
    { code:'GOLD', title:'طلایی', audienceType:'ALL', minPoints:3500, multiplier:1.25, sortOrder:3, benefits:JSON.stringify(['۲۵٪ امتیاز بیشتر']) },
    { code:'VIP', title:'ویژه', audienceType:'ALL', minPoints:7000, multiplier:1.5, sortOrder:4, benefits:JSON.stringify(['۵۰٪ امتیاز بیشتر']) },
  ];
  for (const t of tiers) await prisma.loyaltyTier.upsert({where:{code:t.code},update:t,create:t});
  const settings = [
    ['purchaseRialPerPoint','1000000','ریال خرید به ازای هر امتیاز','loyalty'],
    ['pointExpiryDays','365','مدت اعتبار امتیاز','loyalty'],
    ['walletConversionThreshold','1000','حداقل امتیاز برای تبدیل','loyalty'],
    ['walletRialPerConversion','500000','ریال اعتبار به ازای تبدیل','loyalty'],
    ['memberOtpExpiryMinutes','3','اعتبار رمز یک‌بارمصرف','member'],
  ];
  for (const [key,value,label,group] of settings) await prisma.setting.upsert({where:{key},update:{value,label,group},create:{key,value,label,group}});
  const password = process.env.SEED_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : 'Admin@123456');
  if (password) await prisma.user.upsert({where:{email:'admin@loyalty.com'},update:{role:'ADMIN',status:'ACTIVE'},create:{firstName:'مدیر',lastName:'باشگاه',email:'admin@loyalty.com',password:await hashPassword(password),role:'ADMIN',status:'ACTIVE'}});
  const rule={code:'PURCHASE_BASE',title:'امتیاز پایه خرید',description:'امتیاز بر اساس مبلغ خرید قطعی',eventType:'PURCHASE',conditions:JSON.stringify({}),action:JSON.stringify({type:'POINTS_PER_RIAL',rialPerPoint:1000000}),priority:100,stackable:true,isActive:true};
  await prisma.loyaltyRule.upsert({where:{code:rule.code},update:rule,create:rule});
}
main().then(()=>prisma.$disconnect()).catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1)});
