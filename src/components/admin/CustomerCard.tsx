"use client";

import { Card, Button } from "antd";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function CustomerCard({ customer }: { customer: any }) {
  const router = useRouter();

  return (
    <Card
      hoverable
      className="rounded-xl shadow-sm"
      cover={
        <Image
          alt={customer.name}
          src={customer.image || "/default-avatar.png"}
          width={400}
          height={200}
          className="object-cover rounded-t-xl"
        />
      }
    >
      <h3 className="font-semibold text-lg">{customer.name}</h3>
      <p>SĐT: {customer.phone}</p>
      <p>Email: {customer.email}</p>
      <Button
        type="primary"
        className="mt-2 w-full"
        onClick={() => router.push(`/admin/customers/${customer.id}`)}
      >
        Xem chi tiết
      </Button>
    </Card>
  );
}
