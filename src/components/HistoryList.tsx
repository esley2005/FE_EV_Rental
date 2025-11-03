"use client";

import React, { useState } from "react";
import { Table, Button, Modal, Form, Input } from "antd";

interface HistoryRecord {
  key: string;
  customer: string;
  car: string;
  date: string;
  status: string;
}

const HistoryList: React.FC = () => {
  const [dataSource, setDataSource] = useState<HistoryRecord[]>([
    // { key: "1", customer: "Nguyễn Văn A", car: "VinFast VF e34", date: "08/10/2025", status: "Đã trả" },
    // { key: "2", customer: "Trần Thị B", car: "Yadea G5", date: "09/10/2025", status: "Đang thuê" },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HistoryRecord | null>(null);
  const [form] = Form.useForm();

  // Mở modal thêm/sửa
  const openModal = (record?: HistoryRecord) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(record);
    } else {
      setEditingRecord(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // Xác nhận OK
  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        if (editingRecord) {
          // Sửa record
          setDataSource((prev) =>
            prev.map((item) =>
              item.key === editingRecord.key ? { ...editingRecord, ...values } : item
            )
          );
        } else {
          // Thêm record mới
          const newKey = String(dataSource.length + 1);
          setDataSource([...dataSource, { key: newKey, ...values }]);
        }
        setIsModalVisible(false);
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  // Hủy modal
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // Xóa record
  const handleDelete = (key: string) => {
    setDataSource(dataSource.filter((item) => item.key !== key));
  };

  // Cột bảng
  const columns = [
    { title: "Khách hàng", dataIndex: "customer", key: "customer" },
    { title: "Xe", dataIndex: "car", key: "car" },
    { title: "Ngày thuê", dataIndex: "date", key: "date" },
    { title: "Trạng thái", dataIndex: "status", key: "status" },
    {
      title: "Hành động",
      key: "action",
      render: (_: unknown, record: HistoryRecord) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button type="primary" onClick={() => openModal(record)}>
            Sửa
          </Button>
          <Button danger onClick={() => handleDelete(record.key)}>
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => openModal()}>
        Thêm lịch sử
      </Button>

      <Table<HistoryRecord>
        dataSource={dataSource}
        columns={columns}
        rowKey="key"
      />

      <Modal
        title={editingRecord ? "Sửa lịch sử giao nhận" : "Thêm lịch sử mới"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical" name="historyForm">
          <Form.Item
            name="customer"
            label="Khách hàng"
            rules={[{ required: true, message: "Vui lòng nhập tên khách hàng!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="car"
            label="Xe"
            rules={[{ required: true, message: "Vui lòng nhập tên xe!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="date"
            label="Ngày thuê"
            rules={[{ required: true, message: "Vui lòng nhập ngày thuê!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: "Vui lòng nhập trạng thái!" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HistoryList;
