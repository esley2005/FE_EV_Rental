"use client";
import { motion } from 'framer-motion';
import Image from 'next/image';
import { 
  MapPin, 
  DollarSign, 
  Headphones, 
  UserCheck,
  Car,
  CreditCard,
  Shield,
  Clock,
  Zap,
  Battery
} from 'lucide-react';

export default function AboutSection() {
  return (
    <section className="w-full py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <motion.h2
          className="text-4xl font-bold text-gray-900 mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Về EV Rental
        </motion.h2>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text and Features */}
          <div>
            {/* Intro Paragraph */}
            <motion.p
              className="text-lg text-gray-700 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              EV Rental là nền tảng cho thuê xe ô tô điện, mang đến trải nghiệm lái xanh, an toàn và tiện lợi. Chúng tôi cung cấp đa dạng mẫu xe điện, dịch vụ hỗ trợ tài xế, và các gói bảo dưỡng đáng tin cậy.
            </motion.p>

            {/* Feature Boxes Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <MapPin className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Mạng lưới rộng</h3>
                <p className="text-sm text-gray-600">Trạm sạc và điểm nhận/trả trên toàn thành phố.</p>
              </motion.div>

              <motion.div
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <DollarSign className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Giá minh bạch</h3>
                <p className="text-sm text-gray-600">Hiển thị giá rõ ràng, không phí ẩn.</p>
              </motion.div>

              <motion.div
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Headphones className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Hỗ trợ 24/7</h3>
                <p className="text-sm text-gray-600">Đội ngũ hỗ trợ luôn sẵn sàng.</p>
              </motion.div>

              <motion.div
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <UserCheck className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Lựa chọn tài xế</h3>
                <p className="text-sm text-gray-600">Thuê kèm tài xế hoặc tự lái theo nhu cầu.</p>
              </motion.div>
            </div>
          </div>

          {/* Right Side - Illustration */}
          <motion.div
            className="relative h-[500px] bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl overflow-hidden"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Electric Car Image */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                <Image
                  src="/ev-2-edit.min_.jpg"
                  alt="Electric Car"
                  fill
                  className="object-contain object-center"
                  priority
                />
              </div>
            </div>
            
            {/* Floating Icons */}
            <motion.div
              className="absolute top-20 left-10 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg z-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Clock className="w-6 h-6 text-blue-600" />
            </motion.div>
            <motion.div
              className="absolute top-20 right-20 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg z-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <Car className="w-6 h-6 text-blue-600" />
            </motion.div>
            <motion.div
              className="absolute bottom-32 left-16 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg z-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <Zap className="w-6 h-6 text-orange-500" />
            </motion.div>
            <motion.div
              className="absolute bottom-20 right-16 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg z-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            >
              <Battery className="w-6 h-6 text-green-500" />
            </motion.div>
          </motion.div>
        </div>

        {/* Why Choose Us Section */}
        <motion.div
          className="mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-blue-600 text-center mb-4">
            Tại sao chọn chúng tôi
          </h2>
          <p className="text-lg text-gray-700 text-center mb-8 max-w-3xl mx-auto">
            Sự an toàn, tiện lợi và cam kết về trải nghiệm khách hàng là trọng tâm của EV Rental.
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <motion.div
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Car className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-blue-600 text-lg mb-2">Xe mới, sạch</h3>
              <p className="text-gray-600 text-sm">Bảo dưỡng định kỳ, nội thất sạch sẽ, pin khỏe.</p>
            </motion.div>

            <motion.div
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <CreditCard className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-blue-600 text-lg mb-2">Thanh toán linh hoạt</h3>
              <p className="text-gray-600 text-sm">Nhiều phương thức thanh toán, hỗ trợ hóa đơn điện tử.</p>
            </motion.div>

            <motion.div
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Shield className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-blue-600 text-lg mb-2">An toàn & bảo hiểm</h3>
              <p className="text-gray-600 text-sm">Gói bảo hiểm tiêu chuẩn cho mọi chuyến đi.</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

