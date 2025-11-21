"use client";

import { useState, useEffect, useRef } from "react";
import { BellOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { 
  Gift, 
  Info,
  AlertCircle,
  XCircle
} from "lucide-react";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
}

// thông báo mẫu - chỉ giữ Welcome
const getWelcomeNotification = (): Notification => ({
  id: "4",
  title: "Welcome to EV Rental",
  message: "Chào mừng bạn đến với EV Rental! Khám phá bộ sưu tập hơn 1000 xe điện đời mới.",
  type: "info",
  read: false,
  createdAt: new Date().toISOString(), // Thời gian hiện tại khi login
  link: "/about",
});

interface NotificationDropdownProps {
  userId?: string;
}

export default function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([getWelcomeNotification()]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cập nhật thời gian welcome notification khi component mount (sau khi login)
  useEffect(() => {
    setNotifications([getWelcomeNotification()]);
  }, [userId]); // Cập nhật khi userId thay đổi (sau khi login)

  // Đếm số thông báo chưa đọc
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Đánh dấu thông báo đã đọc
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  // Format thời gian
  const formatTime = (dateString: string) => {
    const date = dayjs(dateString);
    const now = dayjs();
    const diffInDays = now.diff(date, "day");

    if (diffInDays === 0) {
      return "Hôm nay";
    } else if (diffInDays === 1) {
      return "Hôm qua";
    } else if (diffInDays < 7) {
      return `${diffInDays} ngày trước`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} tuần trước`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} tháng trước`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} năm trước`;
    }
  };

  // Lấy icon theo type
  const getNotificationIcon = (type?: string) => {
    const baseClasses = "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0";
    switch (type) {
      case "success":
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-green-100 to-emerald-100`}>
            <Gift className="w-5 h-5 text-green-600" />
          </div>
        );
      case "warning":
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-yellow-100 to-amber-100`}>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
        );
      case "error":
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-red-100 to-rose-100`}>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
        );
      default:
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-blue-100 to-indigo-100`}>
            <Info className="w-5 h-5 text-blue-600" />
          </div>
        );
    }
  };

  // Lọc thông báo theo trạng thái
  const newNotifications = notifications.filter((n) => !n.read);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-400 transition-colors"
        aria-label="Thông báo"
      >
        <BellOutlined className="text-2xl text-gray-900 bg-gray-600 rounded-full p-2" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellOutlined className="text-blue-600" />
                <h3 className="font-bold text-gray-900">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {/* Mới */}
            {newNotifications.length > 0 && (
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                  <p className="text-sm font-bold text-gray-900">Mới</p>
                </div>
                <div className="space-y-2">
                  {newNotifications.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onRead={() => markAsRead(notif.id)}
                      formatTime={formatTime}
                      getIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              </div>
            )}

  
     

            {/* Empty State */}
            {notifications.length === 0 && (
              <div className="px-4 py-12 text-center">
                <BellOutlined className="text-5xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">Không có thông báo</p>
                <p className="text-gray-400 text-xs mt-1">Chúng tôi sẽ thông báo khi có cập nhật mới</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Component con để render từng thông báo
interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  formatTime: (dateString: string) => string;
  getIcon: (type?: string) => React.ReactNode;
}

function NotificationItem({ notification, onRead, formatTime, getIcon }: NotificationItemProps) {
  const handleClick = () => {
    onRead();
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
        !notification.read 
          ? "bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-l-4 border-blue-500 shadow-sm" 
          : "bg-gray-50 hover:bg-gray-100 border-l-4 border-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        {getIcon(notification.type)}
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-sm mb-1 ${
            !notification.read ? "text-gray-900" : "text-gray-700"
          }`}>
            {notification.title}
          </h4>
          <p className={`text-xs leading-relaxed mb-2 line-clamp-2 ${
            !notification.read ? "text-gray-700" : "text-gray-600"
          }`}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">{formatTime(notification.createdAt)}</p>
            {notification.link && (
              <span className="text-xs text-blue-600 font-medium">Xem thêm →</span>
            )}
          </div>
        </div>
        {!notification.read && (
          <div className="w-2.5 h-2.5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex-shrink-0 mt-2 animate-pulse" />
        )}
      </div>
    </div>
  );
}

