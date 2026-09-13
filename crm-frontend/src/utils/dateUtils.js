/**
 * تاریخ و ساعت شمسی با اعداد فارسی
 * 
 * formatPersianDate(isoDate) → "۱۴۰۴/۰۵/۲۲"
 * formatPersianDateTime(isoDate) → "۱۴۰۴/۰۵/۲۲ - ۱۴:۳۰"
 * formatPersianTime(isoDate) → "۱۴:۳۰"
 * formatPersianDateShort(isoDate) → "۲۲ مرداد ۱۴۰۴"
 * formatRelativePersian(isoDate) → "۳ ساعت پیش"
 */

// تبدیل اعداد انگلیسی به فارسی
const toPersianDigits = (num) => {
    const digits = '۰۱۲۳۴۵۶۷۸۹';
    return String(num).replace(/\d/g, (d) => digits[parseInt(d)]);
  };
  
  // پد کردن عدد با صفر
  const pad = (num) => String(num).padStart(2, '0');
  
  /**
   * تبدیل تاریخ ISO به شمسی با فرمت دلخواه
   * @param {string} isoDate - تاریخ ISO (مثلاً 2024-08-12T10:30:00Z)
   * @param {object} options - گزینه‌ها
   * @returns {string} تاریخ شمسی با اعداد فارسی
   */
  export const toPersianDate = (isoDate, options = {}) => {
    if (!isoDate) return '—';
    
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '—';
      
      const formatter = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options,
      });
      
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      
      return toPersianDigits(`${year}/${month}/${day}`);
    } catch {
      return '—';
    }
  };
  
  /**
   * تاریخ شمسی کامل با نام ماه
   * @param {string} isoDate 
   * @returns {string} مثلاً "۲۲ مرداد ۱۴۰۴"
   */
  export const toPersianDateFull = (isoDate) => {
    if (!isoDate) return '—';
    
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '—';
      
      const formatter = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      return toPersianDigits(formatter.format(date));
    } catch {
      return '—';
    }
  };
  
  /**
   * زمان شمسی (ساعت و دقیقه) به صورت ۲۴ ساعته
   * @param {string} isoDate 
   * @returns {string} مثلاً "۱۴:۳۰"
   */
  export const toPersianTime = (isoDate) => {
    if (!isoDate) return '—';
    
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '—';
      
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      
      return toPersianDigits(`${hours}:${minutes}`);
    } catch {
      return '—';
    }
  };
  
  /**
   * تاریخ و زمان شمسی کامل
   * @param {string} isoDate 
   * @returns {string} مثلاً "۱۴۰۴/۰۵/۲۲ - ۱۴:۳۰"
   */
  export const toPersianDateTime = (isoDate) => {
    if (!isoDate) return '—';
    return `${toPersianDate(isoDate)} - ${toPersianTime(isoDate)}`;
  };
  
  /**
   * تاریخ شمسی به صورت "۲۲ مرداد ۱۴۰۴ - ۱۴:۳۰"
   * @param {string} isoDate 
   * @returns {string}
   */
  export const toPersianDateTimeFull = (isoDate) => {
    if (!isoDate) return '—';
    return `${toPersianDateFull(isoDate)} - ${toPersianTime(isoDate)}`;
  };
  
  /**
   * زمان نسبی به فارسی (همین الان، ۳ دقیقه پیش، ۲ ساعت پیش، ...)
   * @param {string} isoDate 
   * @returns {string}
   */
  export const toPersianRelative = (isoDate) => {
    if (!isoDate) return '—';
    
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '—';
      
      const diff = Date.now() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);
      
      if (seconds < 60) return 'همین الان';
      if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه پیش`;
      if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
      if (days < 30) return `${toPersianDigits(days)} روز پیش`;
      if (months < 12) return `${toPersianDigits(months)} ماه پیش`;
      return `${toPersianDigits(years)} سال پیش`;
    } catch {
      return '—';
    }
  };
  
  // ============================================================
  // Export های قدیمی برای سازگاری با کدهای قبلی
  // ============================================================
  
  /**
   * @deprecated از toPersianDate استفاده کنید
   */
  export const formatDate = toPersianDate;
  
  /**
   * @deprecated از toPersianDateTime استفاده کنید
   */
  export const formatDateTime = toPersianDateTime;
  
  /**
   * @deprecated از toPersianRelative استفاده کنید
   */
  export const formatRelative = toPersianRelative;