"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, Typography, Button, Space, Spin, Alert, Skeleton, Tooltip, Empty, message } from "antd";
import type { CardProps } from "antd";
import { ReloadOutlined, BulbOutlined, CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { analyzeAI, analyzeCarUsage } from "@/services/ai";

const { Title, Paragraph, Text } = Typography;

type AIAnalysisProps = {
  variant?: "general" | "car-usage";
};

export default function AIAnalysis({ variant = "general" }: AIAnalysisProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [analysis, setAnalysis] = useState<string>("");
  const [copying, setCopying] = useState<boolean>(false);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = variant === "car-usage" ? await analyzeCarUsage() : await analyzeAI();
      if (res.success && res.data?.response) {
        setAnalysis(res.data.response);
      } else {
        setError(res.error || "Không thể lấy kết quả phân tích.");
      }
    } catch (e: unknown) {
      const messageText = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleCopy = async () => {
    if (!analysis) return;
    setCopying(true);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(analysis);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = analysis;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      message.success("Đã sao chép nội dung");
    } catch {
      message.error("Sao chép thất bại");
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = () => {
    if (!analysis) return;
    const blob = new Blob([analysis], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-analysis.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      bordered
      title={
        <Space align="center">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 20,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #1447E6 0%, #22D3EE 100%)",
              boxShadow: "0 6px 20px rgba(20,71,230,0.25)",
              color: "#fff"
            }}
          >
            <BulbOutlined />
          </div>
          <Title level={4} style={{ margin: 0, fontSize: 22 }}>
            <span style={{ color: "#0B1220" }}>
              {variant === "car-usage" ? "Tỷ lệ sử dụng xe" : "Phân tích AI · Gợi ý nâng cấp"}
            </span>
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Sao chép">
            <Button
              onClick={handleCopy}
              icon={<CopyOutlined />}
              loading={copying}
              disabled={!analysis || loading}
            />
          </Tooltip>
          <Tooltip title="Tải xuống">
            <Button onClick={handleDownload} icon={<DownloadOutlined />} disabled={!analysis || loading} />
          </Tooltip>
          <Tooltip title="Làm mới">
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchAnalysis} loading={loading}>
              Làm mới
            </Button>
          </Tooltip>
        </Space>
      }
      style={{ boxShadow: "0 12px 32px rgba(2,6,23,0.06)" }}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {loading && (
          <div>
            <Spin tip="Đang phân tích dữ liệu...">
              <div style={{ height: 0 }} />
            </Spin>
            <Card type="inner" style={{ marginTop: 12 }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            message="Lỗi phân tích"
            description={
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text type="secondary">{error}</Text>
                <Button onClick={fetchAnalysis} icon={<ReloadOutlined />}>Thử lại</Button>
              </Space>
            }
            showIcon
          />
        )}

        {!loading && !error && (
          analysis ? (
            <Card
              type="inner"
              styles={{ body: { padding: 0 } } as CardProps["styles"]}
              style={{
                background:
                  "linear-gradient(180deg, rgba(236,248,255,1) 0%, rgba(240,244,255,1) 50%, rgba(241,253,246,1) 100%)",
                border: "1px solid #DDE7FF",
                boxShadow: "0 10px 30px rgba(20,71,230,0.10), inset 0 1px 0 rgba(255,255,255,0.6)",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: "1px dashed #DFE7FF",
                  background: "rgba(255,255,255,0.6)"
                }}
              >
                <Text type="secondary">Kết quả phân tích</Text>
              </div>
              <div style={{ padding: 20 }}>
                <Paragraph style={{ marginBottom: 0 }}>
                  <div
                    style={{
                      position: "relative",
                      padding: 2,
                      borderRadius: 14,
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.35), rgba(34,197,94,0.35))",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 12,
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.65))",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          background: "#FFFFFF",
                          color: "#0B1220",
                          padding: 20,
                          borderRadius: 10,
                          border: "1px solid rgba(2,6,23,0.08)",
                          boxShadow: "0 6px 18px rgba(2,6,23,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
                          maxHeight: 420,
                          overflow: "auto",
                          fontSize: 15,
                          lineHeight: 1.7,
                        }}
                      >
                        {analysis}
                      </pre>
                    </div>
                  </div>
                </Paragraph>
              </div>
            </Card>
          ) : (
            <Card type="inner" style={{ textAlign: "center" }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span>Chưa có nội dung gợi ý</span>}
              >
                <Button type="primary" icon={<ReloadOutlined />} onClick={fetchAnalysis}>Phân tích lại</Button>
              </Empty>
            </Card>
          )
        )}
      </Space>
    </Card>
  );
}



