// components/Feedback.tsx
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiCall, feedbackApi } from "@/services/api";
import { authUtils } from "@/utils/auth";

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

  if (loading) return <p>Đang tải phản hồi...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-4">
      {allowCreate && createRentalOrderId && userId && carId && (
        <form
          onSubmit={handleCreate}
          className="border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/40 space-y-3"
        >
          <h3 className="font-semibold text-gray-900">Để lại đánh giá của bạn</h3>
          <p className="text-sm text-gray-500">
            Chỉ khách hàng đã thuê xe mới có thể gửi đánh giá. Đánh giá của bạn giúp chúng tôi cải thiện dịch vụ.
          </p>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Tiêu đề"
            value={newFeedback.title}
            onChange={(e) => setNewFeedback((prev) => ({ ...prev, title: e.target.value }))}
          />
          <textarea
            className="w-full border rounded px-3 py-2 text-sm min-h-[120px]"
            placeholder="Chia sẻ thêm về trải nghiệm của bạn..."
            value={newFeedback.content}
            onChange={(e) => setNewFeedback((prev) => ({ ...prev, content: e.target.value }))}
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
              disabled={!canSubmitFeedback || createLoading}
            >
              {createLoading ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      )}

      {feedbacks.length === 0 && <p>Chưa có phản hồi nào.</p>}

      {feedbacks.map((f) => {
        const isEditing = editingFeedbackId === f.id;

        return (
          <div key={f.id} className="border p-4 rounded shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2 text-sm"
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Tiêu đề phản hồi"
                    />
                    <textarea
                      className="w-full border rounded px-3 py-2 text-sm min-h-[100px]"
                      value={editForm.content}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="Nội dung phản hồi"
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-gray-700 whitespace-pre-line">{f.content}</p>
                  </>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Bởi {f.userFullName} • {new Date(f.createdAt).toLocaleString()}
                </p>
              </div>

              {canManageFeedback && (
                <div className="flex md:flex-col gap-2 min-w-[140px] text-sm">
                  {isEditing ? (
                    <>
                      <button
                        className="bg-blue-600 text-white rounded px-3 py-1.5 disabled:opacity-60"
                        onClick={handleUpdate}
                        disabled={actionLoading}
                      >
                        Lưu
                      </button>
                      <button
                        className="border border-gray-300 rounded px-3 py-1.5"
                        onClick={cancelEditing}
                        disabled={actionLoading}
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="border border-blue-600 text-blue-600 rounded px-3 py-1.5"
                        onClick={() => startEditing(f)}
                        disabled={actionLoading}
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        className="border border-red-500 text-red-500 rounded px-3 py-1.5"
                        onClick={() => handleDelete(f.id)}
                        disabled={actionLoading}
                      >
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
