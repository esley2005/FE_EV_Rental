"use client";

import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, Rate, message, Spin, Empty, Space, Divider } from "antd";
import { Star, MessageSquare, Send } from "lucide-react";
import { feedbackApi, type FeedbackData, type CreateFeedbackData } from "@/services/api";
import { authUtils } from "@/utils/auth";
import dayjs from "dayjs";

const { TextArea } = Input;

interface FeedbackSectionProps {
  rentalOrderId?: number; // Optional: để filter feedback theo đơn hàng cụ thể
  carId?: number; // Optional: để hiển thị feedback cho xe cụ thể
}

export default function FeedbackSection({ rentalOrderId, carId }: FeedbackSectionProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [user, setUser] = useState<any>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  // Kiểm tra user đã đăng nhập chưa
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
  }, []);

  // Load feedbacks
  useEffect(() => {
    loadFeedbacks();
  }, [rentalOrderId, carId]);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      let response;
      
      // Nếu có rentalOrderId, lấy feedback theo đơn hàng
      if (rentalOrderId) {
        response = await feedbackApi.getByRentalOrderId(rentalOrderId);
      } 
      // Nếu có carId, lấy feedback theo xe
      else if (carId) {
        response = await feedbackApi.getByCarId(carId);
      } 
      // Nếu không có gì, lấy tất cả feedback
      else {
        response = await feedbackApi.getAll();
      }

      if (response.success && response.data) {
        // API đã normalize rồi, response.data là array
        let feedbacksData = response.data;
        
        // Đảm bảo là array
        if (!Array.isArray(feedbacksData)) {
          feedbacksData = [];
        }
        
        // Nếu có rentalOrderId, filter theo rentalOrderId (double check)
        if (rentalOrderId) {
          feedbacksData = feedbacksData.filter((fb: FeedbackData) => fb.rentalOrderId === rentalOrderId);
        }
        
        setFeedbacks(feedbacksData);
      } else {
        setFeedbacks([]);
      }
    } catch (error) {
      console.error("Error loading feedbacks:", error);
      message.error("Không thể tải đánh giá. Vui lòng thử lại!");
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: { title: string; content: string; rating: number }) => {
    if (!user) {
      message.warning("Vui lòng đăng nhập để gửi đánh giá!");
      return;
    }

    if (!rentalOrderId) {
      message.warning("Không tìm thấy thông tin đơn hàng. Vui lòng thử lại!");
      return;
    }

    setSubmitting(true);
    try {
      const feedbackData: CreateFeedbackData = {
        title: values.title.trim(),
        content: values.content.trim(),
        rating: values.rating,
        rentalOrderId: rentalOrderId,
      };

      const response = await feedbackApi.create(feedbackData);

      if (response.success) {
        message.success("Cảm ơn bạn đã đánh giá!");
        form.resetFields();
        setCanSubmit(false);
        // Reload feedbacks để hiển thị feedback mới
        await loadFeedbacks();
      } else {
        message.error(response.error || "Không thể gửi đánh giá. Vui lòng thử lại!");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      message.error("Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return dayjs(dateString).format("DD/MM/YYYY HH:mm");
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
          <h2 className="text-white text-lg font-semibold">Đánh giá từ khách hàng</h2>
         
        </div>
      </div>

      <div className="p-5">
        {/* Form tạo feedback - chỉ hiển thị khi có user và rentalOrderId */}
        {user && rentalOrderId && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Viết đánh giá của bạn</h3>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={() => {
                const title = form.getFieldValue("title");
                const content = form.getFieldValue("content");
                const rating = form.getFieldValue("rating");
                setCanSubmit(
                  !!title?.trim() && !!content?.trim() && rating && rating > 0
                );
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  label={<span className="text-sm font-medium">Tiêu đề</span>}
                  name="title"
                  rules={[
                    { required: true, message: "Vui lòng nhập tiêu đề!" },
                    { max: 200, message: "Tiêu đề không được vượt quá 200 ký tự!" },
                  ]}
                  className="mb-3"
                >
                  <Input
                    placeholder="VD: Xe quá trời đẹp"
                    size="middle"
                    maxLength={200}
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="text-sm font-medium">Đánh giá sao</span>}
                  name="rating"
                  rules={[
                    { required: true, message: "Vui lòng chọn số sao đánh giá!" },
                  ]}
                  className="mb-3"
                >
                  <Rate allowClear className="text-lg" />
                </Form.Item>
              </div>

              <Form.Item
                label={<span className="text-sm font-medium">Nội dung đánh giá</span>}
                name="content"
                rules={[
                  { required: true, message: "Vui lòng nhập nội dung đánh giá!" },
                  { min: 10, message: "Nội dung phải có ít nhất 10 ký tự!" },
                  { max: 1000, message: "Nội dung không được vượt quá 1000 ký tự!" },
                ]}
                className="mb-3"
              >
                <TextArea
                  placeholder="Chia sẻ trải nghiệm của bạn về xe..."
                  rows={3}
                  maxLength={1000}
                  showCount
                />
              </Form.Item>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  disabled={!canSubmit}
                  icon={<Send className="w-4 h-4" />}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Gửi đánh giá
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}

        {/* Danh sách feedbacks */}
        <div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : feedbacks.length === 0 ? (
            <Empty
              description="Chưa có đánh giá nào"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all bg-gray-50/50"
                >
                  {/* Header: User name và rating */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {feedback.userFullName || "Khách hàng"}
                        </span>
                        <Rate
                          disabled
                          value={feedback.rating}
                          className="text-xs"
                          style={{ fontSize: '14px' }}
                        />
                      </div>
                    </div>
                    {feedback.createdAt && (
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatDate(feedback.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  {feedback.title && (
                    <h4 className="font-semibold text-gray-900 text-sm mb-1.5">
                      {feedback.title}
                    </h4>
                  )}

                  {/* Content */}
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

