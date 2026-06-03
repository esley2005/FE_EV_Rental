"use client";

import React, { Suspense } from "react";
import { Skeleton } from "antd";
import { useSearchParams } from "next/navigation";
import ScanPlateStation from "@/components/staff/gate/ScanPlateStation";

function ScanPlateContent() {
  const searchParams = useSearchParams();
  const gate = searchParams.get("gate") === "out" ? "out" : "in";
  return <ScanPlateStation gate={gate} />;
}

export default function ScanPlatePage() {
  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
      <ScanPlateContent />
    </Suspense>
  );
}
