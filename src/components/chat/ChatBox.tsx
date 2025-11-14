import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    { keywords: ["Bạn là ai?", "ai vậy"], reply: "🏢Tôi là trợ lý AI của Cửa hàng EV Rental" },
    { keywords: ["địa chỉ", "ở đâu"], reply: "🏢 Cửa hàng EV Rental: 123 Lê Lợi, Q1, HCM" },
    { keywords: ["giờ", "mấy giờ", "mở cửa"], reply: "🕒 Giờ làm việc: 7:00 - 22:00 mỗi ngày" },
    { keywords: ["hotline", "liên hệ", "sđt"], reply: "📞 Hotline: 1900 00000 hoặc Thư điện tử: contact@evrental.vn "  },
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

    const matched = autoReplies.find((item) =>
      item.keywords.some((kw) => msgText.toLowerCase().includes(kw))
    );
    if (matched) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: "ai", text: matched.reply }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      const res = await axios.post("https://localhost:7200/api/AI/chat", { message: msgText });
      const aiReply = res.data?.reply || res.data?.response || "🤖 Xin lỗi, tôi chưa hiểu.";
      setMessages((prev) => [...prev, { sender: "ai", text: aiReply }]);
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
          className="relative bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-300"
        >
          <div className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-60"></div>
          <MessageCircle size={26} className="relative z-10" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-80 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 flex justify-between items-center">
              <span className="font-semibold text-sm">💬 Trợ lý EV Rental</span>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={18} />
              </button>
            </div>

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
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
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
            <div className="p-2 border-t bg-gray-50 flex flex-wrap gap-2">
              {quickReplies.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(q)}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs hover:bg-blue-200 transition"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex items-center border-t bg-gray-50 p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Nhập tin nhắn..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading}
                className="ml-2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 active:scale-95 transition-transform"
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
