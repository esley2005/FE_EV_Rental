"use client";

import React, { useState } from "react";
import { Table, Button, Modal, Form, Input } from "antd";

interface CarRecord {
  key: string;
  car: string;
  status: string;
  location: string;
}

const CarList: React.FC = () => {
  const [dataSource, setDataSource] = useState<CarRecord[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CarRecord | null>(null);

  const [form] = Form.useForm();

  // Mở modal để thêm hoặc sửa
  const openModal = (record?: CarRecord) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(record);
    } else {
      setEditingRecord(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // Xử lý khi nhấn OK trong modal
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

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // Xóa record
  const handleDelete = (key: string) => {
    setDataSource(dataSource.filter((item) => item.key !== key));
  };

  // Columns của table
  const columns = [
    { title: "Tên xe", dataIndex: "car", key: "car" },
    { title: "Trạng thái", dataIndex: "status", key: "status" },
    { title: "Điểm thuê", dataIndex: "location", key: "location" },
    {
      title: "Hành động",
      key: "action",
      render: (_: unknown, record: CarRecord) => (
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
        Thêm xe
      </Button>

      <Table<CarRecord>
        dataSource={dataSource}
        columns={columns}
        rowKey="key"
      />

      <Modal
        title={editingRecord ? "Sửa thông tin xe" : "Thêm xe mới"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical" name="carForm">
          <Form.Item
            name="car"
            label="Tên xe"
            rules={[{ required: true, message: "Vui lòng nhập tên xe!" }]}
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
          <Form.Item
            name="location"
            label="Điểm thuê"
            rules={[{ required: true, message: "Vui lòng nhập điểm thuê!" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CarList;
