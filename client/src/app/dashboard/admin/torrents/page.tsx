"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/app/lib/api";

interface Torrent {
  id: string;
  name: string;
  description: string | null;
  size: string;
  isApproved: boolean;
  createdAt: string;
  uploader: {
    id: string;
    username: string;
    email: string;
  };
  category: {
    id: string;
    name: string;
  };
  _count: {
    announces: number;
    hitAndRuns: number;
    bookmarks: number;
    comments: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Category {
  id: string;
  name: string;
}

export default function TorrentManagementPage() {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTorrent, setEditingTorrent] = useState<Torrent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [torrentToDelete, setTorrentToDelete] = useState<Torrent | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchTorrents();
  }, [currentPage, search, selectedCategory, selectedStatus]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/admin/category`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchTorrents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        ...(search && { search }),
        ...(selectedCategory && { categoryId: selectedCategory }),
        ...(selectedStatus && { status: selectedStatus }),
      });

      const response = await fetch(`${API_BASE_URL}/admin/torrents/manage?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTorrents(data.torrents);
        setPagination(data.pagination);
      } else {
        console.error("Failed to fetch torrents");
      }
    } catch (error) {
      console.error("Error fetching torrents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTorrent = async (torrent: Torrent) => {
    setEditingTorrent(torrent);
    setShowEditModal(true);
  };

  const handleUpdateTorrent = async (formData: FormData) => {
    if (!editingTorrent) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/admin/torrents/manage/${editingTorrent.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
          categoryId: formData.get("categoryId"),
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingTorrent(null);
        fetchTorrents();
      } else {
        console.error("Failed to update torrent");
      }
    } catch (error) {
      console.error("Error updating torrent:", error);
    }
  };

  const handleDeleteTorrent = async () => {
    if (!torrentToDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/admin/torrents/manage/${torrentToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setTorrentToDelete(null);
        fetchTorrents();
      } else {
        console.error("Failed to delete torrent");
      }
    } catch (error) {
      console.error("Error deleting torrent:", error);
    }
  };

  const formatBytes = (bytes: string) => {
    const size = parseInt(bytes);
    if (size === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text">Torrent Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-surface/50 rounded-xl p-6 border border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search torrents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-lg bg-bg border border-border/50 text-text placeholder-text/50"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 rounded-lg bg-bg border border-border/50 text-text"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 rounded-lg bg-bg border border-border/50 text-text"
          >
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Torrents List */}
      <div className="bg-surface/50 rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                  Uploader
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {torrents.map((torrent) => (
                <tr key={torrent.id} className="hover:bg-surface/30">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-text">{torrent.name}</div>
                      <div className="text-sm text-text/50">
                        {torrent.description?.substring(0, 50)}
                        {torrent.description && torrent.description.length > 50 && "..."}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text">
                    {torrent.uploader.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-text">
                    {torrent.category.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-text">
                    {formatBytes(torrent.size)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        torrent.isApproved
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {torrent.isApproved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text">
                    <div className="space-y-1">
                      <div>Announces: {torrent._count.announces}</div>
                      <div>Bookmarks: {torrent._count.bookmarks}</div>
                      <div>Comments: {torrent._count.comments}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTorrent(torrent)}
                        className="text-primary hover:text-primary/80"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setTorrentToDelete(torrent);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-text/70">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg bg-surface/50 border border-border/50 text-text disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-text">
              Page {currentPage} of {pagination.pages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === pagination.pages}
              className="px-3 py-1 rounded-lg bg-surface/50 border border-border/50 text-text disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTorrent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-text">Edit Torrent</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-text/50 hover:text-text transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Edit Form */}
              <div>
                <h4 className="text-lg font-semibold text-text mb-4">Torrent Details</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateTorrent(new FormData(e.currentTarget));
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingTorrent.name}
                        className="w-full px-4 py-3 rounded-xl bg-bg border border-border/50 text-text placeholder-text/50 focus:border-primary focus:outline-none transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        defaultValue={editingTorrent.description || ""}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-bg border border-border/50 text-text placeholder-text/50 focus:border-primary focus:outline-none transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">
                        Category
                      </label>
                      <select
                        name="categoryId"
                        defaultValue={editingTorrent.category.id}
                        className="w-full px-4 py-3 rounded-xl bg-bg border border-border/50 text-text focus:border-primary focus:outline-none transition-colors"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-3 rounded-xl bg-surface/50 border border-border/50 text-text hover:bg-surface/70 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      Update Torrent
                    </button>
                  </div>
                </form>
              </div>

              {/* Torrent Stats */}
              <div>
                <h4 className="text-lg font-semibold text-text mb-4">Torrent Statistics</h4>
                <div className="bg-surface/30 rounded-xl p-6 border border-border/50">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-text/70">Uploader:</span>
                      <span className="text-text font-medium">{editingTorrent.uploader.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text/70">Size:</span>
                      <span className="text-text font-medium">{formatBytes(editingTorrent.size)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text/70">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        editingTorrent.isApproved
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {editingTorrent.isApproved ? "Approved" : "Pending"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text/70">Created:</span>
                      <span className="text-text font-medium">{formatDate(editingTorrent.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text/70">Announces:</span>
                      <span className="text-text font-medium">{editingTorrent._count.announces}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text/70">Bookmarks:</span>
                      <span className="text-text font-medium">{editingTorrent._count.bookmarks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text/70">Comments:</span>
                      <span className="text-text font-medium">{editingTorrent._count.comments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text/70">Hit & Runs:</span>
                      <span className="text-text font-medium">{editingTorrent._count.hitAndRuns}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && torrentToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-text">Delete Torrent</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-text/50 hover:text-text transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-800 font-medium">Warning</span>
              </div>
              <p className="text-red-700 mt-2">
                This action cannot be undone. The torrent and all associated data will be permanently deleted.
              </p>
            </div>

            <div className="bg-surface/30 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-text mb-2">Torrent Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text/70">Name:</span>
                  <span className="text-text font-medium">{torrentToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/70">Uploader:</span>
                  <span className="text-text font-medium">{torrentToDelete.uploader.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/70">Size:</span>
                  <span className="text-text font-medium">{formatBytes(torrentToDelete.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/70">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    torrentToDelete.isApproved
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {torrentToDelete.isApproved ? "Approved" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-3 rounded-xl bg-surface/50 border border-border/50 text-text hover:bg-surface/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTorrent}
                className="px-6 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete Torrent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 