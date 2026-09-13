import { Trash2 } from 'lucide-react';

export default function DeleteSegmentModal({ open, segment, onClose, onConfirm }) {
  if (!open || !segment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-3xl w-full max-w-sm mx-4 p-6 shadow-2xl animate-slide-up">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">حذف بخش</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            آیا از حذف بخش <span className="font-semibold text-slate-900 dark:text-white">{segment.title}</span> اطمینان دارید؟
          </p>
          <p className="text-xs text-red-500 dark:text-red-400 font-medium">
            ⚠️ این عمل غیرقابل بازگشت است!
          </p>
          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}