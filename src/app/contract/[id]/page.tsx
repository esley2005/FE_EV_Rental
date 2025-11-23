"use client";

import { useEffect, useState, useRef } from "react";
import { Button, message } from "antd";
import Header from "@/components/Header";
import { useSearchParams } from "next/navigation";
import { rentalContactApi, type RentalContact } from "@/services/rentalContactApi";
import { authApi, type User } from "@/services/api";

export default function ContractPage() {
  const [currentDate, setCurrentDate] = useState("");
  const [checked, setChecked] = useState(false);
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingContact, setExistingContact] = useState<RentalContact | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [citizenId, setCitizenId] = useState<string | undefined>(undefined);
  const contractRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const searchParams = useSearchParams();

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now.toLocaleDateString("vi-VN"));
  }, []);

  // Fetch current user profile to prefill contract info
  useEffect(() => {
    (async () => {
      const res = await authApi.getProfile();
      if (res.success && res.data) {
        const data = res.data as User;
        setUser(data);
        type MaybeCitizen = Partial<{
          citizenIdNumber: string;
          citizenId: string;
          cccd: string;
          cmnd: string;
          identificationNumber: string;
        }>;
        const raw = res.data as unknown as MaybeCitizen;
        const cccd =
          raw.citizenIdNumber ||
          raw.citizenId ||
          raw.cccd ||
          raw.cmnd ||
          raw.identificationNumber ||
          undefined;
        setCitizenId(typeof cccd === "string" ? cccd : undefined);
      }
    })();
  }, []);

  // Prefetch existing contract by rentalOrderId (if any)
  useEffect(() => {
    const idParam = searchParams.get("rentalOrderId");
    const rentalOrderId = idParam ? Number(idParam) : NaN;
    if (!idParam || Number.isNaN(rentalOrderId)) return;

    (async () => {
      const res = await rentalContactApi.getByRentalOrderId(rentalOrderId);
      if (res.success && res.data) {
        // Some APIs may return array; normalize
        const data = Array.isArray(res.data) ? (res.data[0] ?? null) : (res.data as RentalContact);
        if (data) {
          setExistingContact(data);
          setSigned(true);
          messageApi.info("Hợp đồng đã tồn tại cho đơn thuê này.");
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConfirmSign = () => {
    if (!checked) {
      messageApi.warning("Vui lòng đánh dấu vào ô cam kết trước khi ký hợp đồng!");
      return;
    }
    const idParam = searchParams.get("rentalOrderId");
    const rentalOrderId = idParam ? Number(idParam) : NaN;
    if (!idParam || Number.isNaN(rentalOrderId)) {
      messageApi.error("Thiếu rentalOrderId trên URL. Không thể ký hợp đồng.");
      return;
    }

    const content = contractRef.current?.innerText || "";

    setSubmitting(true);
    (async () => {
      // If already exists, try update; otherwise create
      let res;
      if (existingContact?.id) {
        res = await rentalContactApi.update({ id: existingContact.id, content });
      } else {
        res = await rentalContactApi.create({ rentalOrderId, content });
      }

      setSubmitting(false);
      if (!res.success) {
        messageApi.error(res.error || "Ký hợp đồng thất bại. Vui lòng thử lại.");
        return;
      }
      setSigned(true);
      const messageText = (() => {
        const d = res.data;
        if (typeof d === "string") return d;
        if (d && typeof d === "object" && "message" in d) {
          const maybe = (d as { message?: unknown }).message;
          if (typeof maybe === "string" && maybe.trim()) return maybe;
        }
        return "Bạn đã ký hợp đồng thành công!";
      })();
      messageApi.success(messageText);
    })();
  };

  return (
    <>
      <Header />
      {contextHolder}
      <div className="min-h-screen bg-gray-100 px-4 pt-24 pb-10 flex flex-col items-center">
        <div
          ref={contractRef}
          className="bg-white w-full max-w-3xl shadow-lg rounded-lg p-10 border border-gray-300"
          style={{ fontFamily: "Times New Roman, serif" }}
        >
          <h1 className="text-2xl font-bold text-center mb-6 uppercase">
            HỢP ĐỒNG THUÊ XE Ô TÔ
          </h1>

          <p className="text-right text-gray-600 mb-6">Ngày: {currentDate}</p>

          <p className="mb-4">
            <strong>Bên cho thuê (Bên A):</strong> Công ty TNHH EV Rental
            <br />
            Địa chỉ: 123 Đường Điện Biên Phủ, Quận 3, TP. Hồ Chí Minh
            <br />
            Đại diện: Nguyễn Văn An – Giám đốc
            <br />
            Điện thoại: 0909 123 456
          </p>

          <p className="mb-4">
            <strong>Bên thuê (Bên B):</strong> {user?.fullName || ".............................................................."}
            <br />
            CMND/CCCD số: {citizenId || ".............................................................."}
            <br />
            Địa chỉ: ...................................................................................
            <br />
            Điện thoại: {user?.phone || ".............................................................."}
          </p>

          <p className="mt-6 font-semibold">Điều 1: Đối tượng hợp đồng</p>
          <p className="mb-4">
            Bên A đồng ý cho Bên B thuê xe ô tô thuộc sở hữu hợp pháp của mình
            theo các điều kiện ghi trong hợp đồng này.
          </p>

          <p className="font-semibold">Điều 2: Thời hạn thuê và giá thuê</p>
          <p className="mb-4">
            Thời gian thuê: từ ....... đến .......
            <br />
            Giá thuê: .......... VNĐ / ngày (đã bao gồm thuế VAT)
            <br />
            Thanh toán: Bên B thanh toán toàn bộ số tiền thuê trước khi nhận xe.
          </p>

          <p className="font-semibold">Điều 3: Trách nhiệm của các bên</p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              Bên A đảm bảo xe trong tình trạng kỹ thuật tốt, có đầy đủ giấy tờ hợp lệ khi giao xe.
            </li>
            <li>
              Bên B sử dụng xe đúng mục đích, không cho người khác thuê lại hoặc dùng vào việc vi phạm pháp luật.
            </li>
          </ul>

          <div className="my-6 border-t border-gray-300"></div>

          <label className="flex items-start gap-2 mb-6">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <span className="text-gray-800 leading-relaxed">
              Tôi cam kết chịu mọi thiệt hại nếu thuê xe hộ người khác hoặc sử dụng sai mục đích thuê xe.
            </span>
          </label>

          <div className="my-6 border-t border-gray-300"></div>

          {signed && (
            <div className="text-right text-green-600 font-semibold mt-6">
              ✅ Hợp đồng đã được ký điện tử bởi Bên B
            </div>
          )}

          <div className="grid grid-cols-2 gap-10 text-center mt-10">
            <div>
              <p className="font-bold uppercase">Bên A</p>
              <p>(Công ty EV Rental)</p>
            </div>
            <div>
              <p className="font-bold uppercase">Bên B</p>
              <p>(Người thuê xe)</p>
            </div>
          </div>
        </div>

        {!signed && (
          <Button
            type="primary"
            size="large"
            className="mt-8 px-10"
            onClick={handleConfirmSign}
            loading={submitting}
            disabled={submitting}
          >
            Xác nhận & Ký
          </Button>
        )}
      </div>
    </>
  );
}
