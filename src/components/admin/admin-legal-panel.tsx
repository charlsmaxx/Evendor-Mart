"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/admin-ui";

type Row = {
  id: string;
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  acceptanceMethod: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
  };
};

export function AdminLegalPanel() {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-legal", search, method],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (method !== "all") params.set("method", method);
      const res = await fetch(`/api/admin/legal-acceptances?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load");
      return json.data as Row[];
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Legal acceptances"
        subtitle="Terms and Privacy versions accepted by users. Records cannot be edited from this screen."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email"
          className="h-10 flex-1 rounded-xl border border-white/10 bg-[#1a1215] px-3 text-sm text-[#E5DFD9] placeholder:text-[#E5DFD9]/30"
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-[#1a1215] px-3 text-sm text-[#E5DFD9]"
        >
          <option value="all">All methods</option>
          <option value="email">Email</option>
          <option value="google">Google</option>
          <option value="otp">OTP</option>
          <option value="reconsent">Re-consent</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-[#E5DFD9]/40">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Accepted</th>
              <th className="px-4 py-3 font-medium">Terms</th>
              <th className="px-4 py-3 font-medium">Privacy</th>
              <th className="px-4 py-3 font-medium">Method</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#E5DFD9]/40">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#E5DFD9]/40">
                  No acceptance records yet.
                </td>
              </tr>
            )}
            {data?.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#E5DFD9]">{row.user.fullName || "—"}</p>
                  <p className="text-xs text-[#E5DFD9]/50">{row.user.email}</p>
                </td>
                <td className="px-4 py-3 text-[#E5DFD9]/80">
                  {new Date(row.acceptedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[#E5DFD9]/80">{row.termsVersion}</td>
                <td className="px-4 py-3 text-[#E5DFD9]/80">{row.privacyVersion}</td>
                <td className="px-4 py-3 capitalize text-[#E5DFD9]/80">{row.acceptanceMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
