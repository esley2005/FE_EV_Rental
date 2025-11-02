"use client";

import { useState, useEffect, useRef } from "react";
import { BellOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
}

// thông báo mẫu 
const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Welcome to EV Rental",
    message: "Chào mừng bạn đến với EV Rental, bấm vào đây để xem những kinh nghiệm thuê xe hữu ích.",
    type: "info",
    read: false,
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 năm trước
    link: "/about",
  },
  
];

interface NotificationDropdownProps {
  userId?: string;
}

export default function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const baseClasses = "w-10 h-10 rounded-full flex items-center justify-center";
    switch (type) {
      case "success":
        return (
          <div className={`${baseClasses} bg-green-100`}>
            <BellOutlined className="text-green-600 text-lg" />
          </div>
        );
      case "warning":
        return (
          <div className={`${baseClasses} bg-yellow-100`}>
            <BellOutlined className="text-yellow-600 text-lg" />
          </div>
        );
      case "error":
        return (
          <div className={`${baseClasses} bg-red-100`}>
            <BellOutlined className="text-red-600 text-lg" />
          </div>
        );
      default:
        return (
          <div className={`${baseClasses} bg-green-100`}>
            <BellOutlined className="text-green-600 text-lg" />
          </div>
        );
    }
  };

  // Lọc thông báo theo trạng thái
  const newNotifications = notifications.filter((n) => !n.read);
  const oldNotifications = notifications.filter((n) => n.read);

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
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Thông báo</h3>
            
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {/* Mới */}
            {newNotifications.length > 0 && (
              <div className="px-4 pt-3 pb-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Mới</p>
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
              <div className="px-4 py-8 text-center">
                <BellOutlined className="text-4xl text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Không có thông báo</p>
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
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        !notification.read ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {getIcon(notification.type)}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm mb-1">{notification.title}</h4>
          <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-400">{formatTime(notification.createdAt)}</p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}

