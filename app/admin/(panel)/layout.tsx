import AdminSidebar from "../components/AdminSidebar";
import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminSidebar />

      <div className="lg:pl-[250px]">
        {children}
      </div>
    </div>
  );
}