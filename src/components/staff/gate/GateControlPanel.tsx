"use client";

import React from "react";
import { Card, Col, Row, Typography } from "antd";
import { LoginOutlined, LogoutOutlined, RightOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Paragraph } = Typography;

type GateOption = {
  key: "in" | "out";
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  background: string;
};

const GATE_OPTIONS: GateOption[] = [
  {
    key: "in",
    title: "Cổng vào",
    description: "Quét biển số xe vào, tạo lượt và xử lý ngoại lệ.",
    icon: <LoginOutlined />,
    color: "#16a34a",
    background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
  },
  {
    key: "out",
    title: "Cổng ra",
    description: "Quét xe ra và xử lý ngoại lệ.",
    icon: <LogoutOutlined />,
    color: "#2563eb",
    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
  },
];

export default function GateControlPanel() {
  const router = useRouter();

  const goToStation = (gate: "in" | "out") => {
    router.push(`/staff/scan-plate?gate=${gate}`);
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Bảng điều khiển
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Chọn cổng bạn đang trực để bắt đầu xử lý xe.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]} justify="center">
        {GATE_OPTIONS.map((option) => (
          <Col xs={24} sm={12} key={option.key}>
            <Card
              hoverable
              onClick={() => goToStation(option.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") goToStation(option.key);
              }}
              style={{
                borderRadius: 16,
                border: `1px solid ${option.color}33`,
                background: option.background,
                height: "100%",
              }}
              styles={{ body: { padding: 28 } }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fff",
                  color: option.color,
                  fontSize: 30,
                  marginBottom: 20,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
              >
                {option.icon}
              </div>

              <Title level={4} style={{ marginBottom: 8, color: option.color }}>
                {option.title}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                {option.description}
              </Paragraph>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                  color: option.color,
                }}
              >
                Bắt đầu <RightOutlined />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
