"use client";

import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, Rate, message, Spin, Empty, Space, Divider, Avatar, Popconfirm } from "antd";
import { Star, MessageSquare, Send, Trash2 } from "lucide-react";
import { feedbackApi, rentalOrderApi, type FeedbackData, type CreateFeedbackData } from "@/services/api";
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
  const [showAllFeedbacks, setShowAllFeedbacks] = useState(false);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<number | null>(null);
  const [feedbackOwners, setFeedbackOwners] = useState<Map<number, number>>(new Map()); // feedbackId -> userId

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

  // Load userId của mỗi feedback từ rentalOrder
  useEffect(() => {
    if (feedbacks.length > 0 && !rentalOrderId && user) {
      // Chỉ load khi ở trang car/[id] (không có rentalOrderId) và có user
      loadFeedbackOwners();
    }
  }, [feedbacks, rentalOrderId, user]);

  const loadFeedbackOwners = async () => {
    const ownersMap = new Map<number, number>();
    
    for (const feedback of feedbacks) {
      if (!feedback.id || !feedback.rentalOrderId) continue;
      
      try {
        const orderResponse = await rentalOrderApi.getById(feedback.rentalOrderId);
        if (orderResponse.success && orderResponse.data) {
          const order = orderResponse.data as any;
          const orderUserId = order.userId || order.UserId;
          if (orderUserId) {
            ownersMap.set(feedback.id, orderUserId);
          }
        }
      } catch (error) {
        console.error(`Error loading order ${feedback.rentalOrderId}:`, error);
      }
    }
    
    setFeedbackOwners(ownersMap);
    
    // Sau khi load owners, sắp xếp lại feedbacks để ưu tiên feedback của user
    if (user && feedbacks.length > 0) {
      const userAny = user as any;
      const userId = userAny?.id || userAny?.userId;
      
      if (userId) {
        const sortedFeedbacks = [...feedbacks].sort((a: FeedbackData, b: FeedbackData) => {
          const aOwnerId = ownersMap.get(a.id!);
          const bOwnerId = ownersMap.get(b.id!);
          const aIsOwn = aOwnerId === userId;
          const bIsOwn = bOwnerId === userId;
          
          // Feedback của user hiện tại lên đầu
          if (aIsOwn && !bIsOwn) return -1;
          if (!aIsOwn && bIsOwn) return 1;
          
          // Nếu cùng loại, sắp xếp theo ngày tạo (mới nhất trước)
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        setFeedbacks(sortedFeedbacks);
      }
    }
  };

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
        
        // Sắp xếp: ưu tiên feedback của user hiện tại lên đầu
        if (user && feedbacksData.length > 0) {
          const userAny = user as any;
          const userId = userAny?.id || userAny?.userId;
          
          feedbacksData.sort((a: FeedbackData, b: FeedbackData) => {
            // Nếu có userId trong feedback, so sánh trực tiếp
            const aIsOwn = (a as any).userId === userId || 
                          (rentalOrderId && a.rentalOrderId === rentalOrderId);
            const bIsOwn = (b as any).userId === userId || 
                          (rentalOrderId && b.rentalOrderId === rentalOrderId);
            
            // Feedback của user hiện tại lên đầu
            if (aIsOwn && !bIsOwn) return -1;
            if (!aIsOwn && bIsOwn) return 1;
            
            // Nếu cùng loại, sắp xếp theo ngày tạo (mới nhất trước)
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
        } else {
          // Nếu không có user, sắp xếp theo ngày tạo (mới nhất trước)
          feedbacksData.sort((a: FeedbackData, b: FeedbackData) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
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
      // Get userId from user object
      const userId = user?.id || user?.userId;
      if (!userId || typeof userId !== 'number') {
        message.error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!");
        return;
      }

      const feedbackData: CreateFeedbackData = {
        title: values.title.trim(),
        content: values.content.trim(),
        rating: values.rating,
        userId: userId,
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
      const date = dayjs(dateString);
      const now = dayjs();
      const diffMinutes = now.diff(date, 'minute');
      const diffHours = now.diff(date, 'hour');
      const diffDays = now.diff(date, 'day');
      const diffMonths = now.diff(date, 'month');
      const diffYears = now.diff(date, 'year');

      // Nếu quá 1 năm, hiển thị ngày/tháng/năm
      if (diffYears > 0) {
        return date.format("DD/MM/YYYY");
      }

      // Nếu quá 1 tháng, hiển thị ngày/tháng/năm
      if (diffMonths > 0) {
        return date.format("DD/MM/YYYY");
      }

      // Nếu quá 7 ngày, hiển thị ngày/tháng/năm
      if (diffDays > 7) {
        return date.format("DD/MM/YYYY");
      }

      // Nếu quá 1 ngày, hiển thị "X ngày trước"
      if (diffDays > 0) {
        return `${diffDays} ngày trước`;
      }

      // Nếu quá 1 giờ, hiển thị "X giờ Y phút trước" hoặc "X giờ trước"
      if (diffHours > 0) {
        const remainingMinutes = diffMinutes % 60;
        if (remainingMinutes > 0) {
          return `${diffHours} giờ ${remainingMinutes} phút trước`;
        }
        return `${diffHours} giờ trước`;
      }

      // Nếu dưới 1 giờ, hiển thị "X phút trước" hoặc "Vừa xong"
      if (diffMinutes > 0) {
        return `${diffMinutes} phút trước`;
      }

      return "Vừa xong";
    } catch (e) {
      return dateString;
    }
  };

  // Calculate average rating
  const calculateAverageRating = (feedbacksList: FeedbackData[]): { average: number; count: number } => {
    if (!feedbacksList || feedbacksList.length === 0) {
      return { average: 0, count: 0 };
    }
    const sum = feedbacksList.reduce((acc, fb) => acc + (fb.rating || 0), 0);
    return {
      average: sum / feedbacksList.length,
      count: feedbacksList.length
    };
  };

  // Get avatar initial
  const getAvatarInitial = (name?: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 0) {
      return parts[parts.length - 1].charAt(0).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Kiểm tra có thể xóa feedback không
  const canDeleteFeedback = (feedback: FeedbackData): boolean => {
    if (!user || !feedback.id) return false;
    
    // Admin và Staff có thể xóa bất kỳ feedback nào
    if (authUtils.isAdmin() || authUtils.isStaff()) {
      return true;
    }
    
    // Customer chỉ có thể xóa feedback của chính mình
    const userAny = user as any;
    const userId = userAny?.id || userAny?.userId;
    if (!userId) return false;
    
    // Nếu feedback có userId, so sánh trực tiếp
    if ((feedback as any).userId) {
      return (feedback as any).userId === userId;
    }
    
    // Nếu có rentalOrderId trong props (trang đánh giá đơn hàng), chỉ xóa được feedback của đơn hàng đó
    if (rentalOrderId && feedback.rentalOrderId === rentalOrderId) {
      return true;
    }
    
    // Nếu không có rentalOrderId trong props (trang car/[id]), kiểm tra userId từ rentalOrder
    const feedbackOwnerId = feedbackOwners.get(feedback.id);
    if (feedbackOwnerId) {
      return feedbackOwnerId === userId;
    }
    
    // Nếu chưa load được owner, tạm thời không cho phép (sẽ load sau)
    return false;
  };

  // Xóa feedback
  const handleDeleteFeedback = async (feedbackId: number) => {
    if (!feedbackId) return;
    
    setDeletingFeedbackId(feedbackId);
    try {
      const response = await feedbackApi.delete(feedbackId);
      
      if (response.success) {
        message.success('Đã xóa đánh giá thành công!');
        // Reload feedbacks
        await loadFeedbacks();
      } else {
        message.error(response.error || 'Không thể xóa đánh giá. Vui lòng thử lại!');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      message.error('Có lỗi xảy ra khi xóa đánh giá. Vui lòng thử lại!');
    } finally {
      setDeletingFeedbackId(null);
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
        {/* Rating Summary */}
        {feedbacks.length > 0 && (
          <div className="flex items-center gap-2 pb-4 mb-4 border-b">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-lg font-semibold">
              {calculateAverageRating(feedbacks).average.toFixed(1)} • {feedbacks.length} đánh giá
            </span>
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
              {(showAllFeedbacks ? feedbacks : feedbacks.slice(0, 2)).map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <Avatar 
                      size={40}
                      style={{ backgroundColor: '#22c55e' }}
                    >
                      {getAvatarInitial(feedback.userFullName)}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">
                            {feedback.userFullName || 'Khách hàng'}
                          </div>
                          <Rate disabled value={feedback.rating} className="text-xs" style={{ fontSize: '14px' }} />
                        </div>
                        <div className="flex items-center gap-2">
                          {feedback.createdAt && (
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                              {formatDate(feedback.createdAt)}
                            </span>
                          )}
                          {canDeleteFeedback(feedback) && feedback.id && (
                            <Popconfirm
                              title="Xóa đánh giá"
                              description="Bạn có chắc chắn muốn xóa đánh giá này không?"
                              onConfirm={() => handleDeleteFeedback(feedback.id!)}
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<Trash2 className="w-4 h-4" />}
                                loading={deletingFeedbackId === feedback.id}
                                className="text-red-500 hover:text-red-700"
                              />
                            </Popconfirm>
                          )}
                        </div>
                      </div>
                      {feedback.title && (
                        <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                          {feedback.title}
                        </h4>
                      )}
                      {feedback.content && (
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mt-1">
                          {feedback.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {feedbacks.length > 2 && !showAllFeedbacks && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="default"
                    onClick={() => setShowAllFeedbacks(true)}
                    className="border-green-500 text-green-600 hover:bg-green-50"
                  >
                    Xem thêm
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form tạo feedback - chỉ hiển thị khi có user và rentalOrderId */}
        {user && rentalOrderId && (
          <div className="mt-6 pt-6 border-t p-4 bg-gray-50 rounded-lg border border-gray-200">
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
      </div>
    </div>
  );
}

