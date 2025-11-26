import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiCall } from "@/services/api";

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { sender: "ai", text: "👋 Xin chào! Tôi có thể giúp gì cho bạn hôm nay?" },
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hàm scroll xuống cuối
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll mỗi khi có tin nhắn mới
  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const autoReplies = [
    { keywords: ["Bạn là ai?", "ai vậy"], reply: "Tôi là trợ lý AI của Cửa hàng EV Rental" },
    { keywords: ["địa chỉ", "ở đâu"], reply: "Cửa hàng EV Rental: 123 Lê Lợi, Q1, HCM" },
    { keywords: ["giờ", "mấy giờ", "mở cửa"], reply: " Giờ làm việc: 7:00 - 22:00 mỗi ngày" },
    { keywords: ["hotline", "liên hệ", "sđt"], reply: "Hotline: 1900 1218 hoặc Thư điện tử: evrental@gmail.com "  },
     { keywords: ["Giá", "bao nhiêu", "Giá thuê xe bao nhiêu"], reply: "Giá dao động từ 800 000VND đến 3 000 000VND. Rất Phù Hợp với ví tiền đấy ạ" }
  ];

  const quickReplies = [
    "Bạn là ai?",
    "Địa chỉ cửa hàng ở đâu?",
    "Giờ mở cửa hôm nay?",
    "Số điện thoại liên hệ?",
    "Giá thuê xe bao nhiêu?",
  ];

  const sendMessage = async (text?: string) => {
    const msgText = text ?? input;
    if (!msgText.trim()) return;

    const userMessage = { sender: "user", text: msgText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Normalize text để so sánh (lowercase, loại bỏ dấu câu)
    const normalizeText = (str: string) => {
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
        .replace(/[^\w\s]/g, "") // Loại bỏ dấu câu
        .trim();
    };

    const normalizedMsg = normalizeText(msgText);
    
    const matched = autoReplies.find((item) =>
      item.keywords.some((kw) => {
        const normalizedKw = normalizeText(kw);
        return normalizedMsg.includes(normalizedKw) || normalizedKw.includes(normalizedMsg);
      })
    );
    
    if (matched) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: "ai", text: matched.reply }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      const response = await apiCall<{ reply?: string; response?: string }>("/AI/chat", {
        method: "POST",
        body: JSON.stringify({ message: msgText }),
        skipAuth: true, // Chat endpoint có thể là public
      });
      
      if (response.success && response.data) {
        const aiReply = response.data.reply || response.data.response || "🤖 Xin lỗi, tôi chưa hiểu.";
        setMessages((prev) => [...prev, { sender: "ai", text: aiReply }]);
      } else {
        setMessages((prev) => [...prev, { sender: "ai", text: response.error || "🤖 Xin lỗi, tôi chưa hiểu." }]);
      }
    } catch (err) {
      console.error("Chat API Error:", err);
      setMessages((prev) => [...prev, { sender: "ai", text: "⚠️ Không thể kết nối tới máy chủ." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 cursor-pointer"
          style={{ boxShadow: '0 8px 24px rgba(255, 87, 34, 0.4)' }}
        >
          <div className="absolute inset-0 rounded-full animate-ping bg-orange-400 opacity-70"></div>
          <MessageCircle size={26} className="relative z-10" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 w-80 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border-2 border-orange-200 overflow-hidden z-50"
            style={{ boxShadow: '0 20px 60px rgba(255, 87, 34, 0.3)' }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              // Ngăn chặn event bubbling để tránh đóng chatbox
              const target = e.target as HTMLElement;
              const isCloseButton = target.closest('button[class*="hover:bg-white"]');
              if (!isCloseButton) {
                e.stopPropagation();
              }
            }}
          >
            {/* Header */}
            <div 
              className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-3 flex justify-between items-center select-none"
              style={{ 
                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff1744 100%)',
                boxShadow: '0 4px 12px rgba(255, 87, 34, 0.3)'
              }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">💬 Trợ lý EV Rental</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }} 
                className="hover:bg-white/30 p-1.5 rounded-full transition-colors"
                style={{ backdropFilter: 'blur(4px)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Nội dung chat */}
            <div 
              className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-blue-200"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm shadow-sm ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                    style={msg.sender === "user" ? {
                      background: 'linear-gradient(135deg, #ff6b35 0%, #ff1744 100%)',
                      boxShadow: '0 2px 8px rgba(255, 87, 34, 0.3)'
                    } : {}}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {/* Invisible div để scroll */}
              <div ref={messagesEndRef} />
              {isLoading && <div className="text-gray-400 text-sm italic animate-pulse">Trợ lý đang nhập...</div>}
            </div>

            {/* Quick Replies */}
            <div 
              className="p-2 border-t bg-gradient-to-r from-orange-50 to-red-50 flex flex-wrap gap-2"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {quickReplies.map((q, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage(q);
                  }}
                  className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 px-3 py-1 rounded-full text-xs hover:from-orange-200 hover:to-red-200 transition-all shadow-sm border border-orange-200"
                  style={{ 
                    background: 'linear-gradient(135deg, #ffe0b2 0%, #ffccbc 100%)',
                    color: '#e65100'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div 
              className="flex items-center border-t bg-gradient-to-r from-orange-50 to-red-50 p-2"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <input
                value={input}
                onChange={(e) => {
                  e.stopPropagation();
                  setInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Nhập tin nhắn..."
                className="flex-1 border-2 border-orange-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
                disabled={isLoading}
                style={{ 
                  background: 'white',
                  boxShadow: '0 2px 4px rgba(255, 87, 34, 0.1)'
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendMessage();
                }}
                disabled={isLoading}
                className="ml-2 text-white p-2 rounded-full hover:opacity-90 active:scale-95 transition-transform shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #ff6b35 0%, #ff1744 100%)',
                  boxShadow: '0 4px 12px rgba(255, 87, 34, 0.4)'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
