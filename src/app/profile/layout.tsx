import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {children}
      </main>
      <div style={{ marginLeft: "17rem" }}>
        <Footer />
      </div>
    </>
  );
}
