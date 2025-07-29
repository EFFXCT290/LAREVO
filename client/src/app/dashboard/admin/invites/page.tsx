"use client";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/app/lib/api";

interface Invite {
  id: string;
  code: string;
  createdAt: string;
  usedAt?: string;
  expiresAt?: string;
  createdBy: {
    id: string;
    username: string;
    email: string;
  };
  usedBy?: {
    id: string;
    username: string;
    email: string;
  };
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchInvites = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch invites");
      const data = await res.json();
      setInvites(data.invites);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch invites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleCreateInvite = async () => {
    setCreateLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/invites`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          expiresAt: expiresAt || null
        }),
      });
      
      if (!res.ok) throw new Error("Failed to create invite");
      
      const data = await res.json();
      setInvites([data.invite, ...invites]);
      setShowCreateModal(false);
      setExpiresAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    setDeleteLoading(id);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/invites/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error("Failed to delete invite");
      
      setInvites(invites.filter(invite => invite.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete invite");
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatus = (invite: Invite) => {
    if (invite.usedBy) return "Used";
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return "Expired";
    return "Active";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Used": return "text-green-500";
      case "Expired": return "text-red-500";
      case "Active": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-10">
      <div className="mb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">Invite Management</h1>
        <p className="text-text-secondary">Create and manage invite codes for user registration</p>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-text-secondary">
          Total Invites: {invites.length}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Create Invite
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-text-secondary">Loading invites...</div>
      ) : (
        <div className="bg-surface/80 backdrop-blur-lg rounded-2xl border border-border/50 shadow-xl overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-bg-hover">
                <th className="px-4 py-3 text-left text-text font-medium">Code</th>
                <th className="px-4 py-3 text-left text-text font-medium">Created By</th>
                <th className="px-4 py-3 text-left text-text font-medium">Used By</th>
                <th className="px-4 py-3 text-left text-text font-medium">Status</th>
                <th className="px-4 py-3 text-left text-text font-medium">Created</th>
                <th className="px-4 py-3 text-left text-text font-medium">Expires</th>
                <th className="px-4 py-3 text-left text-text font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const status = getStatus(invite);
                return (
                  <tr key={invite.id} className="border-t border-border/30">
                    <td className="px-4 py-3 text-text font-mono">{invite.code}</td>
                    <td className="px-4 py-3 text-text">{invite.createdBy.username}</td>
                    <td className="px-4 py-3 text-text">
                      {invite.usedBy ? invite.usedBy.username : "-"}
                    </td>
                    <td className={`px-4 py-3 font-medium ${getStatusColor(status)}`}>
                      {status}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDate(invite.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {invite.expiresAt ? formatDate(invite.expiresAt) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!invite.usedBy && (
                          <>
                            <button
                              onClick={() => {
                                const registrationUrl = `${window.location.origin}/register?invite=${invite.code}`;
                                navigator.clipboard.writeText(registrationUrl);
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              Copy Link
                            </button>
                            <button
                              onClick={() => handleDeleteInvite(invite.id)}
                              disabled={deleteLoading === invite.id}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                            >
                              {deleteLoading === invite.id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Invite Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-text mb-4">Create New Invite</h2>
            
            <div className="mb-4">
              <label className="block text-text-secondary text-sm mb-2">
                Expiration Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setExpiresAt("");
                }}
                className="px-4 py-2 text-text-secondary hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvite}
                disabled={createLoading}
                className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {createLoading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 