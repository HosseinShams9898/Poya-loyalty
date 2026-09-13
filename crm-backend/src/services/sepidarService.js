const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const loyaltyService = require('./loyaltyService');

function cfg() {
  return {
    baseURL: (process.env.SEPIDAR_BASE_URL || 'http://127.0.0.1:7373').replace(/\/$/, ''),
    generationVersion: Number(process.env.SEPIDAR_GENERATION_VERSION || 112),
    integrationId: Number(process.env.SEPIDAR_INTEGRATION_ID || 0),
    username: process.env.SEPIDAR_USERNAME || '',
    password: process.env.SEPIDAR_PASSWORD || '',
    publicKeyXml: process.env.SEPIDAR_PUBLIC_KEY_XML || '',
  };
}
function b64url(buf){ return Buffer.from(buf).toString('base64url'); }
function xmlKeyToPem(xml){
  const m=xml.match(/<Modulus>([^<]+)<\/Modulus>/i), e=xml.match(/<Exponent>([^<]+)<\/Exponent>/i);
  if(!m||!e) throw new Error('کلید عمومی XML سپیدار معتبر نیست');
  return crypto.createPublicKey({key:{kty:'RSA',n:b64url(Buffer.from(m[1],'base64')),e:b64url(Buffer.from(e[1],'base64'))},format:'jwk'}).export({type:'spki',format:'pem'});
}
function secureHeaders(token){
  const c=cfg();
  if(!c.integrationId || !c.publicKeyXml) throw new Error('تنظیمات IntegrationID/PublicKey سپیدار کامل نیست');
  const arbitraryCode=crypto.randomUUID();
  const enc=crypto.publicEncrypt({key:xmlKeyToPem(c.publicKeyXml),padding:crypto.constants.RSA_PKCS1_PADDING},Buffer.from(arbitraryCode)).toString('base64');
  return { GenerationVersion:c.generationVersion, IntegrationID:c.integrationId, ArbitraryCode:arbitraryCode, EncArbitraryCode:enc, ...(token?{Authorization:`Bearer ${token}`}:{}) };
}
async function login(){
  const c=cfg();
  if(!c.username||!c.password) throw new Error('نام کاربری/رمز سپیدار تنظیم نشده است');
  const headers=secureHeaders();
  const r=await axios.post(`${c.baseURL}/api/users/login`,{UserName:c.username,PasswordHash:crypto.createHash('md5').update(c.password).digest('hex')},{headers,timeout:10000});
  return r.data?.Token || r.data?.token || r.data?.Result?.Token;
}
async function client(){ const token=await login(); return axios.create({baseURL:cfg().baseURL,timeout:15000,headers:secureHeaders(token)}); }
async function testConnection(){ const c=await client(); const r=await c.get('/api/IsAuthorized'); return r.data === true || r.data?.Result === true || r.status===200; }
async function pagedGet(path, limit=100){
  const c=await client(); let offset=0, out=[];
  for(let i=0;i<200;i++){
    const r=await c.get(path,{params:{limit,offset}}); const body=r.data||{}; const rows=body.Result||body.result||body.Data||body.data||[];
    if(!Array.isArray(rows)) break; out.push(...rows); if(rows.length<limit) break; offset+=limit;
  } return out;
}
function first(v,...keys){ for(const k of keys) if(v?.[k]!==undefined&&v?.[k]!==null&&v?.[k]!== '') return v[k]; return null; }
async function syncCustomers(){
  const rows=await pagedGet('/api/Customers/Paginated'); let created=0,updated=0,skipped=0;
  for(const x of rows){
    const ref=String(first(x,'CustomerID','ID','CustomerId','Id')??''); if(!ref){skipped++;continue;}
    const code=String(first(x,'Code','CustomerCode')??ref); const name=String(first(x,'Title','Name','FullName')??`مشتری ${code}`);
    const mobile=String(first(x,'Mobile','MobilePhone','CellPhone')??'').replace(/\s/g,'');
    const existing=await prisma.customer.findFirst({where:{OR:[{accountingRef:ref},...(mobile?[{mobile}]:[])]}});
    const data={accountingSystem:'SEPIDAR',accountingRef:ref,accountingCode:code,fullName:name,company:first(x,'CompanyName','EconomicName')||null};
    if(existing){await prisma.customer.update({where:{id:existing.id},data});updated++;}
    else {await prisma.customer.create({data:{...data,mobile:mobile||null,customerType:'END_CUSTOMER',status:'ACTIVE'}});created++;}
  } return {received:rows.length,created,updated,skipped};
}
async function syncInvoices(){
  const rows=await pagedGet('/api/invoices/Paginated/'); let created=0,skipped=0,processed=0;
  for(const x of rows){
    const ext=String(first(x,'InvoiceID','ID')??''); const number=String(first(x,'Number','InvoiceNumber')??ext); const cref=String(first(x,'CustomerRef','CustomerID')??'');
    if(!ext||!number||!cref){skipped++;continue;} if(await prisma.invoice.findFirst({where:{OR:[{externalRef:ext},{invoiceNumber:number}]}})){skipped++;continue;}
    const customer=await prisma.customer.findFirst({where:{accountingRef:cref}}); if(!customer){skipped++;continue;}
    const amount=BigInt(Math.max(0,Math.round(Number(first(x,'NetPrice','Price','TotalPrice','FinalPrice')||0)))); if(amount<=0n){skipped++;continue;}
    const rawDate=first(x,'Date','InvoiceDate','IssueDate','CreateDate');
    const parsedDate=rawDate ? new Date(rawDate) : null;
    const invoiceDate=parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
    await prisma.$transaction(async tx=>{
      const remainingRaw=first(x,'RemainingAmount','RemainAmount');
      const receivedRaw=first(x,'TotalReceivedAmount','ReceivedAmount');
      const statusRaw=String(first(x,'PaymentStatus','Status','SettlementStatus')||'').toUpperCase();
      const remaining=remainingRaw===null?null:Number(remainingRaw);
      const received=receivedRaw===null?null:Number(receivedRaw);
      const explicitPaid=['PAID','SETTLED','CLOSED','FULLY_PAID'].includes(statusRaw);
      const explicitPending=['PENDING','OPEN','UNPAID','PARTIAL','PARTIALLY_PAID','OVERDUE'].includes(statusRaw);
      const isPaid = explicitPaid || (!explicitPending && remaining !== null && Number.isFinite(remaining) && remaining <= 0 && received !== null && Number.isFinite(received) && received > 0);
      const hasDebt = remaining !== null && Number.isFinite(remaining) && remaining > 0;
      const invoice=await tx.invoice.create({data:{invoiceNumber:number,externalRef:ext,invoiceDate,customerId:customer.id,amount,paymentType:hasDebt?'CREDIT':'CASH',paymentStatus:isPaid?'PAID':'PENDING',source:'SEPIDAR_API',paymentDate:isPaid?invoiceDate:null}});
      await loyaltyService.processInvoice(tx,invoice,customer); processed++;
    }); created++;
  } return {received:rows.length,created,processed,skipped};
}
async function syncAll(){ const startedAt=new Date(); const customers=await syncCustomers(); const invoices=await syncInvoices(); return {startedAt,finishedAt:new Date(),customers,invoices}; }
function status(){ const c=cfg(); return {configured:Boolean(c.integrationId&&c.username&&c.password&&c.publicKeyXml),baseURL:c.baseURL,generationVersion:c.generationVersion,integrationId:c.integrationId||null,mode:'REST_API',writeBack:false}; }
module.exports={status,testConnection,syncCustomers,syncInvoices,syncAll};
