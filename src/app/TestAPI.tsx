import axiosClient from "./api/axiosClient";
import { useEffect } from "react";

export default function TestApi() {
  useEffect(() => {
    axiosClient.get("/api/Car")
      .then(res => console.log("✅ Data:", res.data))
      .catch(err => console.error("❌ Error:", err));
  }, []);

  return <h1>Testing API...</h1>;
}
