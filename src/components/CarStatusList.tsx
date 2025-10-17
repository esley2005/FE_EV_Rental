import { Table, Tag } from "antd";

const data = [
  { carId: "1", carName: "Toyota Vios", status: "available" },
  { carId: "2", carName: "Honda City", status: "booked" },
  { carId: "3", carName: "VinFast VF5", status: "rented" },
];

const CarTable = () => {
  const columns = [
    { title: "Mã xe", dataIndex: "carId" },
    { title: "Tên xe", dataIndex: "carName" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: string) => (
        <Tag
          color={
            status === "available"
              ? "green"
              : status === "booked"
              ? "gold"
              : "red"
          }
        >
          {status === "available"
            ? "Có sẵn"
            : status === "booked"
            ? "Đã đặt trước"
            : "Đang thuê"}
        </Tag>
      ),
    },
  ];

  return <Table columns={columns} dataSource={data} rowKey="carId" />;
};

export default CarTable;
