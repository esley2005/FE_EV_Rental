'use client';
import React, { useEffect, useState } from "react";
import { Table, Spin, message } from "antd";
import { paymentApi } from "@/services/api";

interface RevenueByLocation {
  rentalLocationName: string;
  totalRevenue: number;
}

const RevenueByLocationComponent: React.FC = () => {
  const [data, setData] = useState<RevenueByLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const response = await paymentApi.getRevenueByLocation();
      if (response.success && response.data) {
        // unwrap $values nếu backend trả về .NET style
        const revenueData = Array.isArray(response.data)
          ? response.data
          : response.data.$values ?? [];

        setData(revenueData);
      } else {
        message.error(response.error || "Không lấy được dữ liệu doanh thu");
      }
    } catch (error) {
      console.error(error);
      message.error("Có lỗi xảy ra khi lấy dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const columns = [
 
    {
      title: "Location Name",
      dataIndex: "rentalLocationName",
      key: "rentalLocationName",
    },
    {
      title: "Total Revenue",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      render: (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Table
        rowKey="rentalLocationId"
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />
    </Spin>
  );
};

export default RevenueByLocationComponent;
