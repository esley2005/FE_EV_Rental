// Common Notice component - thông báo đơn giản, không rối
interface NoticeProps {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function Notice({ type, message, onRetry, className = '' }: NoticeProps) {
  const typeStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800'
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  };

  return (
    <div className={`border rounded-lg p-4 ${typeStyles[type]} ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icons[type]}</span>
        <span className="font-medium">{message}</span>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="ml-auto bg-white bg-opacity-50 hover:bg-opacity-75 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}
