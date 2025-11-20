// components/Feedback.tsx
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiCall, feedbackApi } from "@/services/api";
import { authUtils } from "@/utils/auth";
import { 
  MessageSquare, 
  Send, 
  Edit2, 
  Trash2, 
  User, 
  Clock, 
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Star
} from "lucide-react";

// Helper function to calculate time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export interface FeedbackItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  userFullName: string;
  rentalOrderId: number;
  carId?: number;
  userId?: number;
}

interface FeedbackProps {
  rentalOrderId?: number;
  userId?: number;
  carId?: number;
  allowCreate?: boolean;
  createRentalOrderId?: number;
}

export default function Feedback({
  rentalOrderId,
  userId,
  carId,
  allowCreate = false,
  createRentalOrderId,
}: FeedbackProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Bạn");
  const [editingFeedbackId, setEditingFeedbackId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; content: string }>({
    title: "",
    content: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newFeedback, setNewFeedback] = useState<{ title: string; content: string }>({
    title: "",
    content: "",
  });

  const canQueryByRentalOrder = useMemo(() => Boolean(rentalOrderId && userId), [rentalOrderId, userId]);
  const canManageFeedback = useMemo(() => {
    if (!currentRole) return false;
    const role = currentRole.toLowerCase();
    return role === "admin" || role === "staff";
  }, [currentRole]);
  const canSubmitFeedback = useMemo(() => {
    return Boolean(
      allowCreate &&
        carId &&
        createRentalOrderId &&
        userId &&
        newFeedback.title.trim() &&
        newFeedback.content.trim()
    );
  }, [allowCreate, carId, createRentalOrderId, userId, newFeedback.content, newFeedback.title]);

  useEffect(() => {
    const user = authUtils.getCurrentUser();
    setCurrentRole(user?.role ?? null);
    const fullName = user?.fullName || user?.FullName || user?.email || "Bạn";
    setCurrentUserName(fullName);
  }, []);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);
      try {
        let items: FeedbackItem[] = [];

        if (canQueryByRentalOrder && rentalOrderId && userId) {
          const res = await apiCall<{ $values: FeedbackItem[] }>(
            `/Feedback/GetAll?rentalOrderId=${rentalOrderId}&userId=${userId}`,
            { skipAuth: false }
          );

          if (res.success) {
            items = ((res.data as any)?.$values ?? []) as FeedbackItem[];
          } else {
            throw new Error(res.error || "Không thể tải phản hồi.");
          }
        } else {
          const res = await feedbackApi.getAll();
          if (res.success) {
            items = ((res.data as any)?.$values ?? []) as FeedbackItem[];
          } else {
            throw new Error(res.error || "Không thể tải phản hồi.");
          }
        }

        if (carId) {
          items = items.filter(
            (f: any) => f?.carId === carId || f?.CarId === carId || f?.rentalOrderId === carId
          );
        }

        setFeedbacks(items);
      } catch (err: any) {
        setError(err.message || "Có lỗi xảy ra khi tải phản hồi.");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [carId, canQueryByRentalOrder, rentalOrderId, userId]);

  const startEditing = (item: FeedbackItem) => {
    setEditingFeedbackId(item.id);
    setEditForm({ title: item.title, content: item.content });
  };

  const cancelEditing = () => {
    setEditingFeedbackId(null);
    setEditForm({ title: "", content: "" });
  };

  const handleUpdate = async () => {
    if (!editingFeedbackId) return;
    if (!editForm.title.trim() || !editForm.content.trim()) {
      setError("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await feedbackApi.update({
        id: editingFeedbackId,
        title: editForm.title.trim(),
        content: editForm.content.trim(),
      });

      if (res.success && res.data) {
        setFeedbacks((prev) =>
          prev.map((item) => (item.id === editingFeedbackId ? { ...item, ...res.data } : item))
        );
        cancelEditing();
      } else {
        throw new Error(res.error || "Cập nhật phản hồi thất bại.");
      }
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật phản hồi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (typeof window !== "undefined") {
      const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa phản hồi này?");
      if (!confirmDelete) return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await feedbackApi.delete(id);
      if (res.success) {
        setFeedbacks((prev) => prev.filter((item) => item.id !== id));
        if (editingFeedbackId === id) {
          cancelEditing();
        }
      } else {
        throw new Error(res.error || "Xóa phản hồi thất bại.");
      }
    } catch (err: any) {
      setError(err.message || "Không thể xóa phản hồi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSubmitFeedback || !userId || !createRentalOrderId || !carId) return;

    setCreateLoading(true);
    setError(null);
    try {
      const payload = {
        title: newFeedback.title.trim(),
        content: newFeedback.content.trim(),
        rentalOrderId: createRentalOrderId,
        userId,
        carId,
      };
      const res = await feedbackApi.create(payload);

      if (res.success && res.data) {
        setFeedbacks((prev) => [res.data, ...prev]);
      } else {
        const fallbackItem: FeedbackItem = {
          id: Date.now(),
          title: payload.title,
          content: payload.content,
          rentalOrderId: payload.rentalOrderId,
          carId: payload.carId,
          userId: payload.userId,
          createdAt: new Date().toISOString(),
          userFullName: currentUserName,
        };
        setFeedbacks((prev) => [fallbackItem, ...prev]);
      }
      setNewFeedback({ title: "", content: "" });
    } catch (err: any) {
      setError(err.message || "Không thể gửi phản hồi.");
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Đang tải đánh giá...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {allowCreate && createRentalOrderId && userId && carId && (
        <form
          onSubmit={handleCreate}
          className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 space-y-4 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-gray-900">Để lại đánh giá của bạn</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Chỉ khách hàng đã thuê xe mới có thể gửi đánh giá. Đánh giá của bạn giúp chúng tôi cải thiện dịch vụ.
            </p>
            <input
              type="text"
              className="w-full border-2 border-blue-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white shadow-sm"
              placeholder="Tiêu đề đánh giá..."
              value={newFeedback.title}
              onChange={(e) => setNewFeedback((prev) => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className="w-full border-2 border-blue-200 rounded-lg px-4 py-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white shadow-sm"
              placeholder="Chia sẻ thêm về trải nghiệm của bạn..."
              value={newFeedback.content}
              onChange={(e) => setNewFeedback((prev) => ({ ...prev, content: e.target.value }))}
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                disabled={!canSubmitFeedback || createLoading}
              >
                {createLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Gửi đánh giá
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {feedbacks.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chưa có đánh giá nào</p>
          <p className="text-gray-400 text-sm mt-1">Hãy là người đầu tiên đánh giá!</p>
        </div>
      )}

      {feedbacks.map((f, index) => {
        const isEditing = editingFeedbackId === f.id;
        const createdDate = new Date(f.createdAt);
        const timeAgo = getTimeAgo(createdDate);

        return (
          <div
            key={f.id}
            className="group relative bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:border-blue-300 overflow-hidden opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards]"
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      className="w-full border-2 border-blue-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Tiêu đề phản hồi"
                    />
                    <textarea
                      className="w-full border-2 border-blue-200 rounded-lg px-4 py-2.5 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-gray-50"
                      value={editForm.content}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="Nội dung phản hồi"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{f.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium text-gray-700">{f.userFullName}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-13">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                        {f.content}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {canManageFeedback && (
                <div className="flex md:flex-col gap-2 min-w-[140px]">
                  {isEditing ? (
                    <>
                      <button
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                        onClick={handleUpdate}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Lưu
                          </>
                        )}
                      </button>
                      <button
                        className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={cancelEditing}
                        disabled={actionLoading}
                      >
                        <XCircle className="w-4 h-4" />
                        Hủy
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="border-2 border-blue-500 hover:bg-blue-50 text-blue-600 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md transform hover:scale-105"
                        onClick={() => startEditing(f)}
                        disabled={actionLoading}
                      >
                        <Edit2 className="w-4 h-4" />
                        Sửa
                      </button>
                      <button
                        className="border-2 border-red-500 hover:bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md transform hover:scale-105"
                        onClick={() => handleDelete(f.id)}
                        disabled={actionLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
