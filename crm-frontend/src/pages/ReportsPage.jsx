import { useState, useRef } from 'react';
import {
  FileSpreadsheet, Download, Upload, FileDown, Calendar,
  AlertCircle, CheckCircle2, XCircle, Loader2, Info,
} from 'lucide-react';
import { reportService } from '../api/api';
import { Card } from '../components/common/UI';
import { PageHeader } from '../components/common/Breadcrumbs';
import { showToast } from '../utils/toast';
import { cn } from '../utils/ui';
import SimplePersianDatePicker from '../components/common/SimplePersianDatePicker';

/** مبدل تاریخ میلادی → یونیکس timestamp (برای query param) */
function dateToParam(date) {
  if (!date) return '';
  return date.toISOString();
}

/** دانلود Blob به عنوان فایل */
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (fromDate) params.from = dateToParam(fromDate);
      if (toDate) params.to = dateToParam(toDate);
      const res = await reportService.exportInvoices(params);
      if (res?.isMock) {
        showToast(res._mockBlobMessage, 'warning');
        return;
      }
      if (res?.data instanceof Blob) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        downloadBlob(res.data, `invoices-export-${dateStr}.xlsx`);
        showToast('فایل اکسل دانلود شد', 'success');
      } else {
        showToast('خطا در دریافت فایل', 'error');
      }
    } catch (e) {
      showToast(e.message || 'خطا در خروجی اکسل', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const res = await reportService.downloadSample();
      if (res?.isMock) {
        showToast(res._mockBlobMessage, 'warning');
        return;
      }
      if (res?.data instanceof Blob) {
        downloadBlob(res.data, 'sample-import-template.xlsx');
        showToast('فایل نمونه دانلود شد', 'success');
      }
    } catch (e) {
      showToast(e.message || 'خطا در دانلود فایل نمونه', 'error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        showToast('فقط فایل‌های .xlsx یا .xls قابل قبول هستند', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('حجم فایل نباید بیشتر از ۵ مگابایت باشد', 'error');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast('ابتدا یک فایل انتخاب کنید', 'warning');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await reportService.importInvoices(formData);
      
      console.log('📦 Import result:', res);

      if (res?.success && res.data?.successCount > 0) {
        setImportResult({
          success: true,
          successCount: res.data?.successCount || 0,
          errorCount: res.data?.errorCount || 0,
          errors: res.data?.errors || [],
          message: res.message || `✅ ${res.data?.successCount} فاکتور با موفقیت ثبت شد`,
        });
        showToast(res.message || `✅ ${res.data?.successCount} فاکتور ثبت شد`, 'success');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else if (res?.success && res.data?.successCount === 0 && res.data?.errorCount > 0) {
        setImportResult({
          success: false,
          message: res.message || `❌ ${res.data?.errorCount} خطا در پردازش فایل`,
          errors: res.data?.errors || [],
        });
        showToast(res.message || `❌ ${res.data?.errorCount} خطا در پردازش فایل`, 'error');
      } else {
        setImportResult({
          success: false,
          message: res?.message || 'خطا در پردازش فایل',
        });
        showToast(res?.message || 'خطا در پردازش فایل', 'error');
      }
    } catch (e) {
      console.error('Import error:', e);
      setImportResult({
        success: false,
        message: e.message || 'خطا در پردازش فایل اکسل',
      });
      showToast(e.message || 'خطا در ورود فایل', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="گزارش‌گیری و تبادل اکسل"
        subtitle="خروجی اکسل برای حسابداری سپیدار و ورود گروهی فاکتورها"
        icon={FileSpreadsheet}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══════ کارت ۱: خروجی اکسل ═══════ */}
        <Card className="p-0 overflow-visible">
          <div className="bg-gradient-to-l from-brand-600 to-brand-500 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <FileDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold">خروجی اکسل فاکتورها</h2>
                <p className="text-brand-100 text-xs mt-0.5">برای ارسال به واحد حسابداری (سپیدار)</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-sky-50 dark:bg-sky-900/30 rounded-lg">
              <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
              <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
                فاکتورهای ثبت شده در باشگاه مشتریان را با فرمت اکسل دانلود کنید.
                این فایل شامل شماره فاکتور، نام مشتری، مبلغ، نوع پرداخت، امتیاز و تاریخ است و قابل وارد کردن در سپیدار می‌باشد.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">از تاریخ (شمسی)</label>
                <SimplePersianDatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="انتخاب تاریخ شروع"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">تا تاریخ (شمسی)</label>
                <SimplePersianDatePicker
                  value={toDate}
                  onChange={setToDate}
                  placeholder="انتخاب تاریخ پایان"
                />
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'در حال تولید...' : 'دانلود فایل اکسل'}
            </button>
          </div>
        </Card>

        {/* ═══════ کارت ۲: ورود گروهی ═══════ */}
        <Card className="p-0 overflow-visible">
          <div className="bg-gradient-to-l from-emerald-600 to-emerald-500 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold">ورود گروهی فاکتورها</h2>
                <p className="text-emerald-100 text-xs mt-0.5">ثبت سریع فاکتورها از فایل اکسل + محاسبه امتیاز</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                فاکتورها را به صورت گروهی از فایل اکسل وارد کنید. برای هر فاکتور موتور امتیازدهی اجرا شده و امتیاز محاسبه می‌شود.
                ردیف‌های دارای خطا رد شده و بقیه ثبت می‌شوند.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                selectedFile
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{(selectedFile.size / 1024).toFixed(1)} کیلوبایت</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">فایل اکسل را اینجا بکشید یا کلیک کنید</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">xlsx یا xls — حداکثر ۵ مگابایت</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? 'در حال پردازش...' : 'ثبت فاکتورها'}
              </button>
              <button
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                فایل نمونه
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════ نتیجه ورود گروهی ═══════ */}
      {importResult && (
        <div className={cn(
          'rounded-xl border p-5 animate-fade-in',
          importResult.success
            ? importResult.errorCount > 0
              ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30'
              : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30'
            : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30'
        )}>
          <div className="flex items-start gap-3">
            {importResult.success ? (
              importResult.errorCount > 0 ? (
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
              )
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">{importResult.message}</p>

              {importResult.success && importResult.successCount > 0 && (
                <div className="flex gap-4 text-sm mb-3">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    {importResult.successCount} فاکتور ثبت شد
                  </span>
                  {importResult.errorCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <XCircle className="w-4 h-4" />
                      {importResult.errorCount} خطا
                    </span>
                  )}
                </div>
              )}

              {importResult.errors?.length > 0 && (
                <div className="mt-2 bg-white dark:bg-surface-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                        <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">ردیف</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">خطا</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {importResult.errors.map((err, i) => (
                        <tr key={i} className="hover:bg-red-50 dark:hover:bg-red-900/20">
                          <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{err.row}</td>
                          <td className="px-3 py-2 text-red-700 dark:text-red-400">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ راهنمای ستون‌ها ═══════ */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">راهنمای فرمت فایل اکسل ورودی</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">ستون</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">عنوان</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">مثال</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">توضیح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr><td className="px-3 py-2 font-mono text-brand-600 dark:text-brand-400">A</td><td className="px-3 py-2 text-slate-700 dark:text-slate-200">شماره فاکتور</td><td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">INV-1404-101</td><td className="px-3 py-2 text-slate-500 dark:text-slate-400">الزامی — یکتا</td></tr>
              <tr><td className="px-3 py-2 font-mono text-brand-600 dark:text-brand-400">B</td><td className="px-3 py-2 text-slate-700 dark:text-slate-200">نام یا موبایل مشتری</td><td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">09121111111</td><td className="px-3 py-2 text-slate-500 dark:text-slate-400">ابتدا موبایل، سپس نام جستجو می‌شود</td></tr>
              <tr><td className="px-3 py-2 font-mono text-brand-600 dark:text-brand-400">C</td><td className="px-3 py-2 text-slate-700 dark:text-slate-200">مبلغ (ریال)</td><td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">450000000</td><td className="px-3 py-2 text-slate-500 dark:text-slate-400">عدد صحیح مثبت</td></tr>
              <tr><td className="px-3 py-2 font-mono text-brand-600 dark:text-brand-400">D</td><td className="px-3 py-2 text-slate-700 dark:text-slate-200">نوع پرداخت</td><td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">CASH یا CREDIT</td><td className="px-3 py-2 text-slate-500 dark:text-slate-400">پیش‌فرض: CREDIT</td></tr>
              <tr><td className="px-3 py-2 font-mono text-brand-600 dark:text-brand-400">E</td><td className="px-3 py-2 text-slate-700 dark:text-slate-200">وضعیت پرداخت</td><td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">PAID یا PENDING</td><td className="px-3 py-2 text-slate-500 dark:text-slate-400">پیش‌فرض: PENDING</td></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}