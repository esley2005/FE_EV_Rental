"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCars, createCar, updateCar, deleteCar } from "@/services/carService";
import { Car } from "@/types/car";

export default function TestApiPage() {
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<Car[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getCars()
      .then((data) => {
        // Normalize response: ensure we always store an array
        if (Array.isArray(data)) {
          setCars(data);
        } else if (data) {
          setCars([data]);
        } else {
          setCars([]);
        }
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        const msg = err?.response?.data?.message || err?.message || String(err);
        setError(msg);
        setCars([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Form state for create/update
  // use a loose form shape (backend and frontend car types differ)
  const [form, setForm] = useState<any>({
    name: "",
    model: "",
    seats: "4",
    rentPricePerDay: "0",
    imageUrl: "",
  });
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  const resetForm = () => {
    setForm({ name: "", model: "", seats: 4, rentPricePerDay: 0, imageUrl: "" });
    setEditingCar(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingCar) {
        // ensure id is a number and convert numeric fields
        const id = Number((editingCar as any).id || (editingCar as any).Id);
        const payload = {
          Name: form.name || form.Name,
          Model: form.model || form.Model,
          Seats: Number(form.seats),
          RentPricePerDay: Number(form.rentPricePerDay),
          ImageUrl: form.imageUrl || form.ImageUrl,
        } as any;
        await updateCar(id, payload);
      } else {
        const payload = {
          Name: form.name || form.Name,
          Model: form.model || form.Model,
          Seats: Number(form.seats),
          RentPricePerDay: Number(form.rentPricePerDay),
          ImageUrl: form.imageUrl || form.ImageUrl,
        } as any;
        await createCar(payload);
      }
      const updated = await getCars();
      setCars(updated);
      resetForm();
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (car: Car) => {
    setEditingCar(car);
    setForm({
      name: (car as any).name || (car as any).Name || "",
      model: (car as any).model || (car as any).Model || "",
      seats: String((car as any).seats || (car as any).Seats || "4"),
      rentPricePerDay: String((car as any).rentPricePerDay || (car as any).RentPricePerDay || "0"),
      imageUrl: (car as any).imageUrl || (car as any).ImageUrl || "",
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa xe này?")) return;
    try {
      setLoading(true);
      await deleteCar(id);
      const updated = await getCars();
      setCars(updated);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Test API Connection — Cars</h1>

        {loading && <p>Loading…</p>}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <strong className="text-red-700">Error:</strong>
            <div className="text-sm text-red-600 mt-1">{error}</div>
            <div className="mt-2 text-xs text-gray-500">Ensure backend is running at https://localhost:7200 and CORS is configured.</div>
          </div>
        )}

        {cars.length > 0 ? (
          <div className="mt-4">
            <h2 className="text-lg font-medium">Cars ({cars.length})</h2>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cars.map((car, idx) => {
                const key = (car as any).Id ?? (car as any).id ?? `${(car as any).Name || (car as any).name}-${idx}`;
                const id = (car as any).Id ?? (car as any).id;
                const name = (car as any).Name ?? (car as any).name;
                const model = (car as any).Model ?? (car as any).model;
                const seats = (car as any).Seats ?? (car as any).seats;
                const price = (car as any).RentPricePerDay ?? (car as any).rentPricePerDay ?? (car as any).price;
                const img = (car as any).ImageUrl ?? (car as any).imageUrl ?? ((car as any).images && (car as any).images[0]);

                return (
                  <div key={key} className="p-3 bg-white rounded shadow">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={name} className="w-full h-40 object-cover rounded mb-2" />
                    )}
                    <h3 className="font-medium">{name}</h3>
                    <div className="text-sm text-gray-600">{model} — {seats} chỗ</div>
                    <div className="text-sm text-gray-800 font-semibold mt-2">{price ? `$${price}/day` : "—"}</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => startEdit(car as any)} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">Sửa</button>
                      {id != null && (
                        <button onClick={() => handleDelete(Number(id))} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Xóa</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !loading && !error && (
            <div className="mt-4 text-gray-600">No cars returned (empty array).</div>
          )
        )}
      </main>
      <Footer />
    </div>
  );
}
