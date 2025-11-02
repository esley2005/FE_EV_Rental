"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Checkbox, Col, Form, Input, Row, Upload, InputNumber, message } from "antd";
import type { UploadFile } from "antd/es/upload/interface";

type ReturnFormValues = {
  carId: string;
  customerId: string;
  damageNote?: string;
  batteryPercent?: number;
  odometerKm?: number;
  extraFee?: number;
  agreed: boolean;
  signature?: string; // base64
  images?: UploadFile[];
};

type ReturnFormProps = {
  carId: string;
  customerId: string;
  onSubmit?: (values: ReturnFormValues) => Promise<void> | void;
  submitting?: boolean;
};

export default function ReturnForm({ carId, customerId, onSubmit, submitting }: ReturnFormProps) {
  const [form] = Form.useForm<ReturnFormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    form.setFieldsValue({ carId, customerId });
  }, [carId, customerId, form]);

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("Chỉ cho phép tải ảnh");
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Ảnh phải nhỏ hơn 5MB");
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleUploadChange = ({ fileList: newList }: { fileList: UploadFile[] }) => {
    setFileList(newList);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return canvas.toDataURL("image/png");
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    draw(e);
  };

  const endDraw = () => {
    drawing.current = false;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
    ctx.fill();
  };

  const onFinish = async (values: ReturnFormValues) => {
    const signature = getSignatureDataUrl();
    const payload: ReturnFormValues = { ...values, signature, images: fileList };
    try {
      if (onSubmit) await onSubmit(payload);
      message.success("Đã hoàn tất nhận xe");
      form.resetFields(["damageNote", "batteryPercent", "odometerKm", "extraFee", "agreed"]);
      setFileList([]);
      clearSignature();
    } catch (e) {
      message.error("Không thể hoàn tất nhận xe");
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ carId, customerId, agreed: false }}>
      <Card title="Thông tin xe">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Mã xe" name="carId">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Mã khách hàng" name="customerId">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Kiểm tra xe khi nhận" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="% pin còn lại" name="batteryPercent" rules={[{ required: true, message: "% pin là bắt buộc" }]}> 
              <InputNumber min={0} max={100} addonAfter="%" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Số km (odometer)" name="odometerKm" rules={[{ required: true, message: "Số km là bắt buộc" }]}> 
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Ghi chú hư hỏng / tình trạng" name="damageNote">
          <Input.TextArea rows={4} showCount maxLength={1000} placeholder="Mô tả vết xước, đèn, lốp, phụ kiện..." />
        </Form.Item>

        <Form.Item label="Hình ảnh khi nhận xe" required>
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={handleUploadChange}
            multiple
          >
            + Thêm ảnh
          </Upload>
        </Form.Item>

        <Form.Item label="Phí phát sinh (nếu có)" name="extraFee">
          <InputNumber min={0} step={10000} style={{ width: "100%" }} />
        </Form.Item>
      </Card>

      <Card title="Xác nhận nhận xe" style={{ marginTop: 16 }}>
        <Form.Item
          name="agreed"
          valuePropName="checked"
          rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject("Cần xác nhận đồng ý")) }]}
        >
          <Checkbox>Khách hàng đồng ý biên bản nhận xe</Checkbox>
        </Form.Item>

        <Form.Item label="Chữ ký điện tử">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={160}
              style={{ border: "1px solid #d9d9d9", borderRadius: 6, background: "#fff" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
            <Button onClick={clearSignature}>Xóa chữ ký</Button>
          </div>
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={submitting}>Hoàn tất nhận xe</Button>
      </Card>
    </Form>
  );
}
