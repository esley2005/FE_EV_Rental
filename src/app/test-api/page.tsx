"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getUsers } from "@/services/userService";

export default function TestApiPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => {
        setUsers(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err?.message || String(err));
        setUsers(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Test API Connection</h1>

        {loading && <p>Loading…</p>}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <strong className="text-red-700">Error:</strong>
            <div className="text-sm text-red-600 mt-1">{error}</div>
            <div className="mt-2 text-xs text-gray-500">Ensure backend is running at https://localhost:7200 and CORS is configured.</div>
          </div>
        )}

        {users && (
          <div className="mt-4">
            <h2 className="text-lg font-medium">Users ({users.length})</h2>
            <pre className="mt-2 bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(users, null, 2)}</pre>
          </div>
        )}

        {!loading && !error && !users && (
          <div className="mt-4 text-gray-600">No users returned (empty array).</div>
        )}
      </main>
      <Footer />
    </div>
  );
}
