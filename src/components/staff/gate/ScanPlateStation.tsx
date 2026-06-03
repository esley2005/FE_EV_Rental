"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CarOutlined,
  CheckCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  ScanOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  checkoutSession,
  createSession,
  getActiveSession,
  normalizePlate,
  type GateSession,
} from "./gateSessions";

const { Title, Paragraph, Text } = Typography;

type Gate = "in" | "out";

const VEHICLE_TYPES = ["Ô tô điện", "Xe máy điện", "Xe đạp điện", "Khác"];

const EXCEPTION_TYPES = [
  "Không đọc được biển số",
  "Sai thông tin biển số",
  "Xe không có lượt hợp lệ",
  "Sự cố barie / thiết bị",
  "Khác",
];

const formatTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

/* ---------- Quét biển số xe vào ---------- */
function ScanInPanel({
  onRecognized,
}: {
  onRecognized: (plate: string) => void;
}) {
  const [plate, setPlate] = useState("");
  const [recognized, setRecognized] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    const value = normalizePlate(plate);
    if (!value) {
      message.warning("Nhập biển số rồi bấm Quét, hoặc nhập trực tiếp từ camera.");
      return;
    }
    setScanning(true);
    window.setTimeout(() => {
      setRecognized(value);
      onRecognized(value);
      setScanning(false);
      message.success(`Đã nhận diện biển số: ${value}`);
    }, 600);
  };

  return (
    <Card title="Quét biển số xe vào" variant="outlined">
      <Paragraph type="secondary">
        Nhập hoặc nhận biển số từ camera tại cổng, sau đó nhận diện để chuyển sang
        bước tạo lượt.
      </Paragraph>
      <Space.Compact style={{ width: "100%", maxWidth: 420 }}>
        <Input
          size="large"
          placeholder="VD: 51K-123.45"
          value={plate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlate(e.target.value)}
          onPressEnter={handleScan}
          allowClear
        />
        <Button
          type="primary"
          size="large"
          icon={<ScanOutlined />}
          loading={scanning}
          onClick={handleScan}
        >
          Quét
        </Button>
      </Space.Compact>

      {recognized && (
        <Alert
          style={{ marginTop: 20, maxWidth: 420 }}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={
            <span>
              Biển số nhận diện: <Tag color="green">{recognized}</Tag>
            </span>
          }
          description='Chuyển sang tab "Tạo lượt" để ghi nhận xe vào.'
        />
      )}
    </Card>
  );
}

/* ---------- Tạo lượt ---------- */
function CreateSessionPanel({ initialPlate }: { initialPlate: string }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialPlate) form.setFieldsValue({ plate: initialPlate });
  }, [initialPlate, form]);

  const onFinish = (values: {
    plate: string;
    vehicleType: string;
    note?: string;
  }) => {
    setSubmitting(true);
    try {
      const session = createSession({
        plate: values.plate,
        vehicleType: values.vehicleType,
        note: values.note,
      });
      message.success(
        `Đã tạo lượt ${session.id} cho xe ${session.plate} lúc ${formatTime(
          session.timeIn
        )}.`
      );
      form.resetFields();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Tạo lượt" variant="outlined">
      <Paragraph type="secondary">
        Ghi nhận một lượt xe vào bãi. Thời gian vào được lấy tự động khi tạo lượt.
      </Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 460 }}
        initialValues={{ vehicleType: VEHICLE_TYPES[0] }}
      >
        <Form.Item
          name="plate"
          label="Biển số xe"
          rules={[{ required: true, message: "Vui lòng nhập biển số xe" }]}
          normalize={(v) => (typeof v === "string" ? v.toUpperCase() : v)}
        >
          <Input placeholder="VD: 51K-123.45" />
        </Form.Item>

        <Form.Item
          name="vehicleType"
          label="Loại xe"
          rules={[{ required: true, message: "Chọn loại xe" }]}
        >
          <Select
            options={VEHICLE_TYPES.map((t) => ({ label: t, value: t }))}
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm (không bắt buộc)" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={submitting}
          >
            Tạo lượt
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

/* ---------- Quét xe ra ---------- */
function ScanOutPanel() {
  const [plate, setPlate] = useState("");
  const [scanning, setScanning] = useState(false);
  const [searched, setSearched] = useState(false);
  const [session, setSession] = useState<GateSession | undefined>(undefined);

  const handleScan = () => {
    const value = normalizePlate(plate);
    if (!value) {
      message.warning("Nhập biển số xe ra.");
      return;
    }
    setScanning(true);
    window.setTimeout(() => {
      const found = getActiveSession(value);
      setSession(found);
      setSearched(true);
      setScanning(false);
      if (found) {
        message.success(`Tìm thấy lượt ${found.id} đang mở.`);
      } else {
        message.warning("Không tìm thấy lượt đang mở cho biển số này.");
      }
    }, 600);
  };

  const handleCheckout = () => {
    if (!session) return;
    const updated = checkoutSession(session.id);
    if (updated) {
      message.success(
        `Xác nhận xe ${updated.plate} ra lúc ${formatTime(updated.timeOut)}.`
      );
      setSession(undefined);
      setSearched(false);
      setPlate("");
    }
  };

  return (
    <Card title="Quét xe ra" variant="outlined">
      <Paragraph type="secondary">
        Quét biển số xe ra để đối chiếu lượt đang mở và xác nhận cho xe rời bãi.
      </Paragraph>
      <Space.Compact style={{ width: "100%", maxWidth: 420 }}>
        <Input
          size="large"
          placeholder="VD: 51K-123.45"
          value={plate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlate(e.target.value)}
          onPressEnter={handleScan}
          allowClear
        />
        <Button
          type="primary"
          size="large"
          icon={<ScanOutlined />}
          loading={scanning}
          onClick={handleScan}
        >
          Quét
        </Button>
      </Space.Compact>

      {searched && session && (
        <div style={{ marginTop: 20, maxWidth: 460 }}>
          <Descriptions
            bordered
            size="small"
            column={1}
            title={
              <Space>
                <CarOutlined /> Lượt đang mở
              </Space>
            }
          >
            <Descriptions.Item label="Mã lượt">{session.id}</Descriptions.Item>
            <Descriptions.Item label="Biển số">
              <Tag color="blue">{session.plate}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Loại xe">
              {session.vehicleType}
            </Descriptions.Item>
            <Descriptions.Item label="Giờ vào">
              {formatTime(session.timeIn)}
            </Descriptions.Item>
          </Descriptions>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            style={{ marginTop: 16 }}
            onClick={handleCheckout}
          >
            Xác nhận xe ra
          </Button>
        </div>
      )}

      {searched && !session && (
        <Alert
          style={{ marginTop: 20, maxWidth: 460 }}
          type="warning"
          showIcon
          message="Không tìm thấy lượt đang mở"
          description='Xe có thể chưa được tạo lượt khi vào. Hãy chuyển sang "Xử lý ngoại lệ".'
        />
      )}
    </Card>
  );
}

/* ---------- Xử lý ngoại lệ ---------- */
function ExceptionPanel({ gate }: { gate: Gate }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = (values: {
    plate?: string;
    type: string;
    description?: string;
  }) => {
    setSubmitting(true);
    try {
      message.success(
        `Đã ghi nhận ngoại lệ${
          values.plate ? ` cho xe ${normalizePlate(values.plate)}` : ""
        }: ${values.type}.`
      );
      form.resetFields();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <WarningOutlined style={{ color: "#faad14" }} /> Xử lý ngoại lệ
        </Space>
      }
      variant="outlined"
    >
      <Paragraph type="secondary">
        Ghi nhận các trường hợp bất thường tại {gate === "in" ? "cổng vào" : "cổng ra"}{" "}
        để bộ phận quản lý xử lý.
      </Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 460 }}
      >
        <Form.Item name="plate" label="Biển số xe (nếu có)">
          <Input placeholder="VD: 51K-123.45" />
        </Form.Item>

        <Form.Item
          name="type"
          label="Loại ngoại lệ"
          rules={[{ required: true, message: "Chọn loại ngoại lệ" }]}
        >
          <Select
            placeholder="Chọn loại ngoại lệ"
            options={EXCEPTION_TYPES.map((t) => ({ label: t, value: t }))}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả chi tiết"
          rules={[{ required: true, message: "Nhập mô tả chi tiết" }]}
        >
          <Input.TextArea rows={3} placeholder="Mô tả tình huống..." />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            danger
            htmlType="submit"
            icon={<WarningOutlined />}
            loading={submitting}
          >
            Ghi nhận ngoại lệ
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default function ScanPlateStation({ gate }: { gate: Gate }) {
  const router = useRouter();
  const [recognizedPlate, setRecognizedPlate] = useState("");

  const functions = useMemo(
    () =>
      gate === "in"
        ? [
            { label: "Quét biển số xe vào", value: "scan" },
            { label: "Tạo lượt", value: "create" },
            { label: "Xử lý ngoại lệ", value: "exception" },
          ]
        : [
            { label: "Quét xe ra", value: "scanout" },
            { label: "Xử lý ngoại lệ", value: "exception" },
          ],
    [gate]
  );

  const [active, setActive] = useState<string>(functions[0].value);

  useEffect(() => {
    setActive(functions[0].value);
  }, [functions]);

  const switchGate = (next: Gate) => {
    router.replace(`/staff/scan-plate?gate=${next}`);
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <Space
        style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}
        wrap
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/staff")}
        >
          Bảng điều khiển
        </Button>

        <Segmented
          value={gate}
          onChange={(value: string | number) => switchGate(value as Gate)}
          options={[
            { label: "Cổng vào", value: "in", icon: <LoginOutlined /> },
            { label: "Cổng ra", value: "out", icon: <LogoutOutlined /> },
          ]}
        />
      </Space>

      <Title level={4} style={{ marginBottom: 4 }}>
        {gate === "in" ? "Cổng vào" : "Cổng ra"}
      </Title>
      <Text type="secondary">
        {gate === "in"
          ? "Quét biển số xe vào, tạo lượt và xử lý ngoại lệ."
          : "Quét xe ra và xử lý ngoại lệ."}
      </Text>

      <Segmented
        block
        style={{ margin: "20px 0" }}
        value={active}
        onChange={(value: string | number) => setActive(value as string)}
        options={functions}
      />

      {active === "scan" && (
        <ScanInPanel onRecognized={(p) => setRecognizedPlate(p)} />
      )}
      {active === "create" && (
        <CreateSessionPanel initialPlate={recognizedPlate} />
      )}
      {active === "scanout" && <ScanOutPanel />}
      {active === "exception" && <ExceptionPanel gate={gate} />}
    </div>
  );
}
