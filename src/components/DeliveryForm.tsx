import { Button, Card, Checkbox, Col, Form, Input, Row, Upload } from "antd";

<Form layout="vertical">
  <Card title="Thông tin xe">
    <Row gutter={16}>
      <Col span={12}><Form.Item label="Mã xe"><Input value="VN-001" disabled /></Form.Item></Col>
      <Col span={12}><Form.Item label="Mã khách hàng"><Input value="KH-001" disabled /></Form.Item></Col>
    </Row>
  </Card>

  <Card title="Kiểm tra xe trước khi giao">
    <Form.Item label="Tình trạng xe">
      <Input.TextArea placeholder="Ghi chú tình trạng xe, ví dụ: bình ắc quy, đèn, gương..." />
    </Form.Item>

    <Form.Item label="Hình ảnh kiểm tra">
      <Upload listType="picture-card">+ Thêm ảnh</Upload>
    </Form.Item>
  </Card>

  <Card title="Xác nhận giao xe">
    <Checkbox>Khách hàng đã kiểm tra và đồng ý</Checkbox>
    <Form.Item label="Chữ ký điện tử">
      {/* Dùng thư viện react-signature-canvas */}
    </Form.Item>
    <Button type="primary">Hoàn tất bàn giao</Button>
  </Card>
</Form>
