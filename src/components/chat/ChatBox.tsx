import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, GripVertical } from "lucide-react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { apiCall } from "@/services/api";

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { sender: "ai", text: "👋 Xin chào! Tôi có thể giúp gì cho bạn hôm nay?" },
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Motion values cho drag position - khởi tạo từ localStorage hoặc mặc định
  const getInitialPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    
    try {
      const saved = localStorage.getItem('chatbox-position');
      if (saved) {
        const pos = JSON.parse(saved);
        // Validate position
        if (pos.x >= 0 && pos.x <= window.innerWidth - 320 && 
            pos.y >= 0 && pos.y <= window.innerHeight - 500) {
          return pos;
        }
      }
    } catch (e) {
      console.warn('Failed to load chatbox position:', e);
    }
    
    // Default: góc dưới bên phải
    return {
      x: window.innerWidth - 320 - 24,
      y: window.innerHeight - 500 - 24
    };
  };

  const initialPos = getInitialPosition();
  const x = useMotionValue(initialPos.x);
  const y = useMotionValue(initialPos.y);

  // Lưu vị trí vào localStorage khi drag kết thúc
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const unsubscribeX = x.on('change', (latestX) => {
      const latestY = y.get();
      localStorage.setItem('chatbox-position', JSON.stringify({ x: latestX, y: latestY }));
    });
    
    const unsubscribeY = y.on('change', (latestY) => {
      const latestX = x.get();
      localStorage.setItem('chatbox-position', JSON.stringify({ x: latestX, y: latestY }));
    });

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [x, y]);

  // Cập nhật vị trí khi window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      const currentX = x.get();
      const currentY = y.get();
      const maxX = window.innerWidth - 320;
      const maxY = window.innerHeight - 500;
      
      // Giữ vị trí trong bounds nếu đang ở ngoài
      let newX = currentX;
      let newY = currentY;
      
      if (currentX < 0) newX = 0;
      if (currentX > maxX) newX = maxX;
      if (currentY < 0) newY = 0;
      if (currentY > maxY) newY = maxY;
      
      if (newX !== currentX || newY !== currentY) {
        x.set(newX);
        y.set(newY);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [x, y]);

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
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.2}
          whileDrag={{ scale: 1.1, rotate: 5 }}
          className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 cursor-grab active:cursor-grabbing"
          style={{ boxShadow: '0 8px 24px rgba(255, 87, 34, 0.4)' }}
        >
          <div className="absolute inset-0 rounded-full animate-ping bg-orange-400 opacity-70"></div>
          <MessageCircle size={26} className="relative z-10" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag
            dragMomentum={true}
            dragTransition={{ power: 0.2, timeConstant: 200 }}
            dragConstraints={(ref: HTMLElement | null) => {
              if (!ref || typeof window === 'undefined') return { left: 0, right: 0, top: 0, bottom: 0 };
              const rect = ref.getBoundingClientRect();
              const width = rect.width || 320;
              const height = rect.height || 500;
              return {
                left: 0,
                right: window.innerWidth - width,
                top: 0,
                bottom: window.innerHeight - height,
              };
            }}
            dragElastic={0.1}
            style={{ 
              x,
              y,
              boxShadow: '0 20px 60px rgba(255, 87, 34, 0.3)',
              position: 'fixed',
              cursor: 'default',
              zIndex: 50
            }}
            whileDrag={{ 
              scale: 1.02,
              cursor: 'grabbing',
              zIndex: 9999
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-80 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border-2 border-orange-200 overflow-hidden"
          >
            {/* Header - Draggable area */}
            <motion.div 
              className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-3 flex justify-between items-center cursor-grab active:cursor-grabbing select-none"
              style={{ 
                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff1744 100%)',
                boxShadow: '0 4px 12px rgba(255, 87, 34, 0.3)'
              }}
              onMouseDown={(e: React.MouseEvent) => {
                // Prevent text selection while dragging
                e.preventDefault();
              }}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="opacity-70" />
                <span className="font-semibold text-sm">💬 Trợ lý EV Rental</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-white/30 p-1.5 rounded-full transition-colors"
                style={{ backdropFilter: 'blur(4px)' }}
              >
                <X size={18} />
              </button>
            </motion.div>

            {/* Nội dung chat */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-blue-200">
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
            <div className="p-2 border-t bg-gradient-to-r from-orange-50 to-red-50 flex flex-wrap gap-2">
              {quickReplies.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(q)}
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
            <div className="flex items-center border-t bg-gradient-to-r from-orange-50 to-red-50 p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Nhập tin nhắn..."
                className="flex-1 border-2 border-orange-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
                disabled={isLoading}
                style={{ 
                  background: 'white',
                  boxShadow: '0 2px 4px rgba(255, 87, 34, 0.1)'
                }}
              />
              <button
                onClick={() => sendMessage()}
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
