"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, Typography, Button, Space, Spin, Alert } from "antd";
import { ReloadOutlined, BulbOutlined } from "@ant-design/icons";
import { analyzeAI } from "@/services/ai";

const { Title, Paragraph, Text } = Typography;

export default function AIAnalysis() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [analysis, setAnalysis] = useState<string>("");

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await analyzeAI();
      if (res.success && res.data?.response) {
        setAnalysis(res.data.response);
      } else {
        setError(res.error || "Không thể lấy kết quả phân tích.");
      }
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return (
    <Card bordered>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
          <Space align="center">
            <BulbOutlined style={{ fontSize: 22, color: "#1447E6" }} />
            <Title level={4} style={{ margin: 0 }}>
              Phân tích AI (Gợi ý nâng cấp)
            </Title>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAnalysis} disabled={loading}>
            Làm mới
          </Button>
        </Space>

        {loading && (
          <Spin tip="Đang phân tích dữ liệu...">
            <div style={{ height: 80 }} />
          </Spin>
        )}

        {!loading && error && (
          <Alert type="error" message="Lỗi" description={error} showIcon />
        )}

        {!loading && !error && (
          <Card type="inner">
            <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
              <Text>{analysis || "Chưa có nội dung gợi ý."}</Text>
            </Paragraph>
          </Card>
        )}
      </Space>
    </Card>
  );
}


