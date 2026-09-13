'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment-jalaali';
import { cn } from '../../utils/ui';

// تنظیم locale برای شمسی
moment.loadPersian({ dialect: 'persian-modern' });

// نام ماه‌های شمسی
const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// نام روزهای هفته شمسی
const PERSIAN_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// تبدیل اعداد به فارسی
const toPersianNumber = (num) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

// تبدیل میلادی به شمسی
const toJalali = (date) => {
  if (!date) return null;
  try {
    const m = moment(date);
    if (!m.isValid()) return null;
    return {
      year: m.jYear(),
      month: m.jMonth() + 1,
      day: m.jDate()
    };
  } catch {
    return null;
  }
};

// تبدیل شمسی به میلادی
const jalaliToGregorian = (year, month, day) => {
  try {
    const m = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD');
    if (!m.isValid()) return new Date();
    return m.toDate();
  } catch {
    return new Date();
  }
};

export function PersianDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  disabled = false,
  className = '',
  minDate,
  maxDate
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const [selectedDate, setSelectedDate] = useState(value || null);
  const popoverRef = useRef(null);

  // وقتی value از بیرون تغییر میکنه
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setViewDate(value);
    }
  }, [value]);

  // بستن پاپ‌آور با کلیک خارج
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const jalali = toJalali(viewDate);
  if (!jalali) return null;

  // تعداد روزهای ماه
  const getDaysInMonth = (year, month) => {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    // اسفند - بررسی سال کبیسه
    const isLeapYear = moment(`${year}/1/1`, 'jYYYY/jMM/jDD').jIsLeapYear();
    return isLeapYear ? 30 : 29;
  };

  // روز اول ماه
  const getFirstDayOfMonth = (year, month) => {
    const gregorianDate = jalaliToGregorian(year, month, 1);
    const dayOfWeek = gregorianDate.getDay();
    return (dayOfWeek + 1) % 7;
  };

  // تولید روزهای ماه
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(jalali.year, jalali.month);
    const firstDay = getFirstDayOfMonth(jalali.year, jalali.month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  // رفتن به ماه قبل
  const goToPrevMonth = () => {
    let newMonth = jalali.month - 1;
    let newYear = jalali.year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setViewDate(jalaliToGregorian(newYear, newMonth, 1));
  };

  // رفتن به ماه بعد
  const goToNextMonth = () => {
    let newMonth = jalali.month + 1;
    let newYear = jalali.year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setViewDate(jalaliToGregorian(newYear, newMonth, 1));
  };

  // انتخاب روز
  const handleDayClick = (day) => {
    const newDate = jalaliToGregorian(jalali.year, jalali.month, day);
    setSelectedDate(newDate);
    onChange?.(newDate);
    setOpen(false);
  };

  // بررسی انتخاب شده بودن
  const isSelected = (day) => {
    if (!selectedDate) return false;
    const valueJalali = toJalali(selectedDate);
    return (
      valueJalali?.year === jalali.year &&
      valueJalali?.month === jalali.month &&
      valueJalali?.day === day
    );
  };

  // بررسی امروز بودن
  const isToday = (day) => {
    const today = new Date();
    const todayJalali = toJalali(today);
    return (
      todayJalali?.year === jalali.year &&
      todayJalali?.month === jalali.month &&
      todayJalali?.day === day
    );
  };

  // فرمت نمایش
  const formatDisplay = (date) => {
    if (!date) return '';
    try {
      const j = toJalali(date);
      if (!j) return '';
      return `${toPersianNumber(j.year)}/${toPersianNumber(String(j.month).padStart(2, '0'))}/${toPersianNumber(String(j.day).padStart(2, '0'))}`;
    } catch {
      return '';
    }
  };

  // لیست سال‌ها
  const years = Array.from({ length: 86 }, (_, i) => 1320 + i);

  const handleYearChange = (year) => {
    const newDate = jalaliToGregorian(year, Math.min(jalali.month, 12), Math.min(jalali.day, 28));
    setViewDate(newDate);
  };

  const handleMonthChange = (month) => {
    const newDate = jalaliToGregorian(jalali.year, month, Math.min(jalali.day, 28));
    setViewDate(newDate);
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Input Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-start gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-all',
          !selectedDate && 'text-slate-400 dark:text-slate-500',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <CalendarIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="flex-1 text-right">
          {selectedDate ? formatDisplay(selectedDate) : placeholder}
        </span>
      </button>

      {/* Popover */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-[280px] bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              
              <div className="flex items-center gap-1.5">
                <select
                  value={jalali.month}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 px-2 outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {PERSIAN_MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                
                <select
                  value={jalali.year}
                  onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 px-2 outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {toPersianNumber(year)}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1.5">
              {PERSIAN_DAYS.map((day, index) => (
                <div
                  key={index}
                  className="h-8 flex items-center justify-center text-xs font-medium text-slate-400 dark:text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {generateCalendarDays().map((day, index) => (
                <div key={index} className="h-9 flex items-center justify-center">
                  {day !== null && (
                    <button
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-all duration-150 hover:scale-105',
                        isSelected(day)
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                          : isToday(day)
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                    >
                      {toPersianNumber(day)}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Today Button */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                className="w-full text-center text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20"
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setViewDate(today);
                  onChange?.(today);
                  setOpen(false);
                }}
              >
                امروز: {formatDisplay(new Date())}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// توابع کمکی برای استفاده در سایر بخش‌ها
export const formatPersianDate = (date) => {
  if (!date) return '-';
  try {
    const m = moment(date);
    if (!m.isValid()) return '-';
    const year = m.jYear();
    const month = m.jMonth() + 1;
    const day = m.jDate();
    return `${toPersianNumber(year)}/${toPersianNumber(String(month).padStart(2, '0'))}/${toPersianNumber(String(day).padStart(2, '0'))}`;
  } catch {
    return '-';
  }
};

export const formatPersianDateLong = (date) => {
  if (!date) return '-';
  try {
    const m = moment(date);
    if (!m.isValid()) return '-';
    const year = m.jYear();
    const month = m.jMonth();
    const day = m.jDate();
    return `${toPersianNumber(day)} ${PERSIAN_MONTHS[month]} ${toPersianNumber(year)}`;
  } catch {
    return '-';
  }
};

export const parsePersianDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('/').map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const m = moment(`${year}/${month}/${day}`, 'jYYYY/jMM/jDD');
    if (!m.isValid()) return null;
    return m.toDate();
  } catch {
    return null;
  }
};

export default PersianDatePicker;