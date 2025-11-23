# MoMo Payment Integration

Component và service để tích hợp thanh toán MoMo vào ứng dụng.

## Component: MomoPaymentButton

Component button để khởi tạo thanh toán MoMo.

### Sử dụng

```tsx
import MomoPaymentButton from '@/components/payment/MomoPaymentButton';

function CheckoutPage() {
  const orderId = 123;
  const userId = 1;
  const amount = 1000000; // VNĐ

  return (
    <MomoPaymentButton
      rentalOrderId={orderId}
      userId={userId}
      amount={amount}
      onSuccess={(momoOrderId) => {
        console.log('Payment initiated:', momoOrderId);
      }}
      onError={(error) => {
        console.error('Payment error:', error);
      }}
    />
  );
}
```

### Props

- `rentalOrderId` (number): Mã đơn hàng thuê xe
- `userId` (number): ID người dùng
- `amount` (number): Số tiền cần thanh toán (VNĐ)
- `onSuccess?` (function): Callback khi tạo payment thành công
- `onError?` (function): Callback khi có lỗi
- `redirectUrl?` (string): URL redirect tùy chỉnh (tùy chọn)

## Payment Success Page

Trang `/payment-success` tự động xử lý callback từ MoMo sau khi thanh toán.

### Query Parameters

Trang chấp nhận các query parameters sau:

- `orderId`: Mã đơn hàng
- `momoOrderId`: Mã đơn hàng MoMo (từ callback)
- `resultCode`: Mã kết quả từ MoMo (`0` = thành công)
- `message`: Thông báo từ MoMo
- `paymentId`: Mã thanh toán (nếu có)
- `amount`: Số tiền (nếu có)
- `transactionId`: Mã giao dịch (nếu có)

### Ví dụ URL

```
/payment-success?orderId=123&momoOrderId=xxx&resultCode=0
/payment-success?momoOrderId=xxx&resultCode=0
```

## API Services

### `paymentApi.createMomoPayment()`

Tạo payment request với MoMo.

```typescript
const response = await paymentApi.createMomoPayment(
  rentalOrderId,
  userId,
  amount
);

if (response.success && response.data) {
  const { momoPayUrl, momoOrderId } = response.data;
  // Redirect user đến momoPayUrl
  window.location.href = momoPayUrl;
}
```

### `paymentApi.getByMomoOrderId()`

Lấy thông tin payment theo MoMo Order ID.

```typescript
const response = await paymentApi.getByMomoOrderId(momoOrderId);

if (response.success && response.data) {
  const payment = response.data;
  console.log('Payment status:', payment.status);
}
```

## Flow hoàn chỉnh

1. User click "Thanh toán bằng MoMo"
2. Frontend gọi `paymentApi.createMomoPayment()`
3. Backend tạo payment và trả về `momoPayUrl`
4. Frontend redirect user đến `momoPayUrl`
5. User thanh toán trên MoMo
6. MoMo redirect user về `/payment-success?momoOrderId=xxx&resultCode=0`
7. Frontend tự động load payment details và hiển thị kết quả

## Lưu ý

- Đảm bảo backend đã config `RedirectUrl` đúng với frontend URL
- Production cần HTTPS (MoMo yêu cầu)
- Test với MoMo sandbox trước khi deploy

