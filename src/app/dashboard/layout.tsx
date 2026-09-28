import { requireHost } from "@/lib/session";
import { Sidebar } from "./sidebar";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const host = await requireHost();

  return (
    <div className="min-h-full flex-1 bg-surface">
      <Sidebar user={{ name: host.name ?? host.username, email: host.email ?? "", image: host.image, username: host.username }} />
      <div className="lg:pl-62">
        <main className="mx-auto w-full max-w-[1080px] px-5 pt-10 pb-24 sm:px-[clamp(20px,4vw,56px)]">{children}</main>
      </div>
    </div>
  );
}
