"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Space, Table, Tag, message } from "antd";

type CarStatus = "available" | "booked" | "rented";

type CarRow = {
  carId: string;
  carName: string;
  status: CarStatus;
};

type CarStatusListProps = {
  onDeliver?: (car: CarRow) => void; // mở DeliveryForm
  onReturn?: (car: CarRow) => void; // mở ReturnForm
};

export default function CarStatusList({ onDeliver, onReturn }: CarStatusListProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CarRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<CarStatus | "all">("all");

  useEffect(() => {
    const fetchCars = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/cars");
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          const mapped: CarRow[] = json.data.map((c: any) => ({
            carId: c.id,
            carName: c.name,
            status: (c.status as CarStatus) || "available",
          }));
          setRows(mapped);
        } else {
          // fallback demo
          setRows([
            { carId: "vf3", carName: "VinFast VF 3", status: "available" },
            { carId: "vf6", carName: "VinFast VF 6", status: "booked" },
            { carId: "byd", carName: "BYD Atto 3", status: "rented" },
          ]);
        }
      } catch (e) {
        message.warning("Không thể tải danh sách xe, dùng dữ liệu mẫu");
        setRows([
          { carId: "vf3", carName: "VinFast VF 3", status: "available" },
          { carId: "vf6", carName: "VinFast VF 6", status: "booked" },
          { carId: "byd", carName: "BYD Atto 3", status: "rented" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchText = `${r.carId} ${r.carName}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" ? true : r.status === filterStatus;
      return matchText && matchStatus;
    });
  }, [rows, search, filterStatus]);

  const columns = [
    { title: "Mã xe", dataIndex: "carId", key: "carId" },
    { title: "Tên xe", dataIndex: "carName", key: "carName" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: CarStatus) => (
        <Tag color={status === "available" ? "green" : status === "booked" ? "gold" : "red"}>
          {status === "available" ? "Có sẵn" : status === "booked" ? "Đã đặt trước" : "Đang thuê"}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: CarRow) => (
        <Space>
          <Button type="primary" disabled={record.status !== "available"} onClick={() => onDeliver?.(record)}>
            Bàn giao
          </Button>
          <Button disabled={record.status !== "rented"} onClick={() => onReturn?.(record)}>
            Nhận xe
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="Tìm mã xe / tên xe" allowClear value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          value={filterStatus}
          style={{ width: 200 }}
          onChange={(v) => setFilterStatus(v)}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "available", label: "Có sẵn" },
            { value: "booked", label: "Đã đặt trước" },
            { value: "rented", label: "Đang thuê" },
          ]}
        />
      </Space>

      <Table<CarRow> loading={loading} dataSource={filtered} columns={columns} rowKey="carId" pagination={{ pageSize: 10 }} />
    </div>
  );
}
