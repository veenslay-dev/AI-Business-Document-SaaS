import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateUserForm } from "@/components/admin/user-controls";

export default function AdminNewUserPage() {
  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand"><ArrowLeft className="size-4" aria-hidden />All users</Link>
      <h2 className="text-2xl font-extrabold">Add a user</h2>
      <CreateUserForm />
    </div>
  );
}
