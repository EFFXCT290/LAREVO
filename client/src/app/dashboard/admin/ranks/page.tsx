"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/app/lib/api";

interface Rank {
  id: string;
  name: string;
  description: string | null;
  order: number;
  minUpload: string;
  minDownload: string;
  minRatio: number;
  color: string | null;
}

interface RankFormData {
  name: string;
  description: string;
  order: number;
  minUpload: string;
  minDownload: string;
  minRatio: string;
  color: string;
}

export default function AdminRanksPage() {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [rankSystemEnabled, setRankSystemEnabled] = useState(true);
  const [formData, setFormData] = useState<RankFormData>({
    name: "",
    description: "",
    order: 1,
    minUpload: "0",
    minDownload: "0",
    minRatio: "0",
    color: "#3B82F6"
  });

  const fetchRanks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [ranksRes, statusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/ranks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/admin/ranks/status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      if (ranksRes.ok) {
        const ranksData = await ranksRes.json();
        setRanks(ranksData.ranks);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setRankSystemEnabled(statusData.enabled);
      }
    } catch (err) {
      setError("Failed to fetch ranks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const url = editingRank 
        ? `${API_BASE_URL}/admin/ranks/${editingRank.id}`
        : `${API_BASE_URL}/admin/ranks`;
      
      const method = editingRank ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          order: Number(formData.order),
          minUpload: Number(formData.minUpload),
          minDownload: Number(formData.minDownload),
          minRatio: Number(formData.minRatio),
          color: formData.color || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save rank");
      }

      setShowCreateModal(false);
      setEditingRank(null);
      resetForm();
      fetchRanks();
    } catch (err: any) {
      setError(err.message || "Failed to save rank");
    }
  };

  const handleDelete = async (rankId: string) => {
    if (!confirm("Are you sure you want to delete this rank?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/ranks/${rankId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete rank");
      }

      fetchRanks();
    } catch (err: any) {
      setError(err.message || "Failed to delete rank");
    }
  };

  const handleEdit = (rank: Rank) => {
    setEditingRank(rank);
          setFormData({
        name: rank.name,
        description: rank.description || "",
        order: rank.order,
        minUpload: rank.minUpload,
        minDownload: rank.minDownload,
        minRatio: rank.minRatio.toString(),
        color: rank.color || "#3B82F6"
      });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      order: 1,
      minUpload: "0",
      minDownload: "0",
      minRatio: "0",
      color: "#3B82F6"
    });
  };

  const handleToggleSystem = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/ranks/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !rankSystemEnabled }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle rank system");
      }

      setRankSystemEnabled(!rankSystemEnabled);
    } catch (err: any) {
      setError(err.message || "Failed to toggle rank system");
    }
  };

  const formatBytes = (bytes: string) => {
    const num = parseInt(bytes, 10);
    if (num === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading ranks...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-text to-text/70 bg-clip-text text-transparent mb-2">Rank Management</h1>
        <p className="text-text-secondary">Configure user ranks based on upload, download, and ratio requirements</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleSystem}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              rankSystemEnabled
                ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                : "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
            }`}
          >
            {rankSystemEnabled ? "Disable" : "Enable"} Rank System
          </button>
        </div>
        <button
          onClick={() => {
            setEditingRank(null);
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Add Rank
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-surface/50 backdrop-blur-lg rounded-2xl border border-border/50 shadow-2xl">
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ranks.map((rank) => (
              <div
                key={rank.id}
                className="bg-surface/30 backdrop-blur-lg rounded-xl border border-border/30 p-6 hover:border-primary/30 transition-all duration-200 hover:shadow-lg group"
                style={{
                  borderLeftColor: rank.color || "#3B82F6",
                  borderLeftWidth: "4px"
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-text group-hover:text-primary transition-colors">{rank.name}</h3>
                  <span className="text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full">#{rank.order}</span>
                </div>
                {rank.description && (
                  <p className="text-sm text-text-secondary mb-4 leading-relaxed">{rank.description}</p>
                )}
                <div className="space-y-2 text-sm mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Min Upload:</span>
                    <span className="font-medium text-text">{formatBytes(rank.minUpload)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Min Download:</span>
                    <span className="font-medium text-text">{formatBytes(rank.minDownload)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Min Ratio:</span>
                    <span className="font-medium text-text">{rank.minRatio}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(rank)}
                    className="flex-1 px-4 py-2 text-sm bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all duration-200 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rank.id)}
                    className="flex-1 px-4 py-2 text-sm bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all duration-200 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          {ranks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-text mb-2">No Ranks Configured</h3>
              <p className="text-text-secondary mb-6">Create your first rank to start the ranking system</p>
              <button
                onClick={() => {
                  setEditingRank(null);
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium transition-all duration-200"
              >
                Create First Rank
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface/95 backdrop-blur-lg rounded-2xl border border-border/50 shadow-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text">
                  {editingRank ? "Edit Rank" : "Create Rank"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingRank(null);
                    resetForm();
                  }}
                  className="text-text-secondary hover:text-text transition-colors p-1 hover:bg-surface/50 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-border/50 rounded-lg bg-background/50 text-text placeholder-text-secondary focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                    placeholder="Enter rank name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border border-border/50 rounded-lg bg-background/50 text-text placeholder-text-secondary focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 resize-none"
                    rows={2}
                    placeholder="Optional description for this rank"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Order *
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full p-2 border border-border/50 rounded-lg bg-background/50 text-text placeholder-text-secondary focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                    min="1"
                    required
                  />
                  <p className="text-xs text-text-secondary mt-1">Lower number = higher rank</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Min Upload *
                    </label>
                    <input
                      type="number"
                      value={formData.minUpload}
                      onChange={(e) => setFormData({ ...formData, minUpload: e.target.value })}
                      className="w-full p-2 border border-border/50 rounded-lg bg-background/50 text-text placeholder-text-secondary focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                      min="0"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Min Download *
                    </label>
                    <input
                      type="number"
                      value={formData.minDownload}
                      onChange={(e) => setFormData({ ...formData, minDownload: e.target.value })}
                      className="w-full p-2 border border-border/50 rounded-lg bg-background/50 text-text placeholder-text-secondary focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Min Ratio *
                    </label>
                    <input
                      type="number"
                      value={formData.minRatio}
                      onChange={(e) => setFormData({ ...formData, minRatio: e.target.value })}
                      className="w-full p-2 border border-border/50 rounded-lg bg-background/50 text-text placeholder-text-secondary focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-10 h-8 border border-border/50 rounded-lg bg-background/50 cursor-pointer"
                      />
                      <span className="text-xs text-text-secondary">Color</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-all duration-200"
                  >
                    {editingRank ? "Update Rank" : "Create Rank"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingRank(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 bg-surface/50 text-text border border-border/50 rounded-lg hover:bg-surface/70 font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 