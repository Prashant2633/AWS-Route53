"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useToast } from "../../components/Notification";
import { validateZoneName } from "../../lib/validators";
import Breadcrumb from "../../components/Breadcrumb";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import SearchInput from "../../components/SearchInput";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { Plus, Trash2, Edit2, ExternalLink } from "lucide-react";

interface HostedZone {
  id: string;
  name: string;
  type: string;
  comment?: string;
  record_count: number;
  created_at: string;
}

interface DashboardStats {
  total_zones: number;
  total_records: number;
  public_zones: number;
  private_zones: number;
}

interface PaginatedZones {
  data: HostedZone[];
  total: number;
  page: number;
  total_pages: number;
}

export default function HostedZonesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  const [activeZone, setActiveZone] = useState<HostedZone | null>(null);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Public");
  const [newComment, setNewComment] = useState("");
  const [formError, setFormError] = useState("");

  const [editComment, setEditComment] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsCreateOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: () => api.get<DashboardStats>("/api/dashboard/stats"),
  });

  const { data: zoneData, isLoading } = useQuery<PaginatedZones>({
    queryKey: ["hostedZones", search, typeFilter, page],
    queryFn: () =>
      api.get<PaginatedZones>("/api/zones", {
        search,
        type: typeFilter,
        page,
        limit: 20,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; type: string; comment?: string }) =>
      api.post<HostedZone>("/api/zones", body),
    onSuccess: () => {
      addToast("Hosted zone created successfully", "success");
      setIsCreateOpen(false);
      setNewName("");
      setNewType("Public");
      setNewComment("");
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["hostedZones"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create hosted zone.");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.put<HostedZone>(`/api/zones/${id}`, { comment }),
    onSuccess: () => {
      addToast("Hosted zone comment updated", "success");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hostedZones"] });
    },
    onError: (err: any) => {
      addToast(err.message || "Failed to update hosted zone", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/zones/${id}`),
    onSuccess: () => {
      addToast("Hosted zone deleted successfully", "success");
      setIsDeleteOpen(false);
      setSelectedIds((prev) => prev.filter((id) => id !== activeZone?.id));
      queryClient.invalidateQueries({ queryKey: ["hostedZones"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      addToast(err.message || "Failed to delete hosted zone", "error");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await api.delete<void>(`/api/zones/${id}`);
      }
    },
    onSuccess: () => {
      addToast(`Deleted ${selectedIds.length} hosted zones successfully`, "success");
      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["hostedZones"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      addToast(err.message || "Failed to delete some hosted zones", "error");
      queryClient.invalidateQueries({ queryKey: ["hostedZones"] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const nameErr = validateZoneName(newName);
    if (nameErr) {
      setFormError(nameErr);
      return;
    }

    createMutation.mutate({
      name: newName.trim(),
      type: newType,
      comment: newComment.trim() || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeZone) return;
    editMutation.mutate({
      id: activeZone.id,
      comment: editComment,
    });
  };

  const handleDeleteSubmit = () => {
    if (!activeZone) return;
    deleteMutation.mutate(activeZone.id);
  };

  const handleBulkDeleteSubmit = () => {
    bulkDeleteMutation.mutate(selectedIds);
  };

  const openEditModal = (zone: HostedZone) => {
    setActiveZone(zone);
    setEditComment(zone.comment || "");
    setIsEditOpen(true);
  };

  const openDeleteModal = (zone: HostedZone) => {
    setActiveZone(zone);
    setIsDeleteOpen(true);
  };

  const columns: Column<HostedZone>[] = [
    {
      key: "name",
      header: "Domain name",
      sortable: true,
      render: (row) => (
        <Link
          href={`/hosted-zones/${row.id}`}
          className="text-[var(--link-color)] hover:underline font-bold flex items-center gap-1.5"
        >
          {row.name}
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => <StatusBadge type={row.type} />,
    },
    {
      key: "record_count",
      header: "Records",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="font-mono bg-[var(--page-bg)] border border-[var(--border-color)] px-2 py-0.5 rounded text-xs">
          {row.record_count}
        </span>
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: (row) => (
        <span className="text-[var(--text-muted)] truncate max-w-xs block" title={row.comment}>
          {row.comment || "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (row) => (
        <span className="text-xs text-[var(--text-muted-darker)] font-mono">
          {row.created_at ? row.created_at.split(".")[0] : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/hosted-zones/${row.id}`}
            className="px-2.5 py-1 text-xs font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)] rounded transition-all"
            title="Manage Records"
          >
            Manage
          </Link>
          <button
            onClick={() => openEditModal(row)}
            className="p-1 text-[var(--text-muted)] hover:text-[#FF9900] hover:bg-[var(--page-bg)] rounded transition-colors cursor-pointer"
            title="Edit Comment"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteModal(row)}
            className="p-1 text-[var(--text-muted)] hover:text-[#F85149] hover:bg-[var(--page-bg)] rounded transition-colors cursor-pointer"
            title="Delete Hosted Zone"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Breadcrumb
            items={[{ label: "Route 53", href: "/hosted-zones" }, { label: "Hosted Zones" }]}
          />
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Hosted Zones</h1>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#0F1923] text-sm font-extrabold rounded shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Hosted Zone
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Zones", value: stats?.total_zones ?? 0 },
          { label: "Total Records", value: stats?.total_records ?? 0 },
          { label: "Public Zones", value: stats?.public_zones ?? 0 },
          { label: "Private Zones", value: stats?.private_zones ?? 0 },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4 flex flex-col justify-between transition-colors duration-200"
          >
            <span className="text-xs font-semibold text-[var(--text-muted-darker)] uppercase tracking-wider">
              {item.label}
            </span>
            <span className="text-2xl font-extrabold text-[var(--text-primary)] mt-1 font-mono">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-t-lg p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="flex rounded-md border border-[var(--border-color)] p-0.5 bg-[var(--table-header-bg)] self-start transition-colors duration-200">
            {[
              { label: "All", value: "" },
              { label: "Public", value: "Public" },
              { label: "Private", value: "Private" },
            ].map((tab) => {
              const active = typeFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setTypeFilter(tab.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                    active
                      ? "bg-[var(--border-color)] text-[#FF9900]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <SearchInput
            placeholder="Search zones by domain name..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={() => setIsBulkDeleteOpen(true)}
            className="px-3 py-1.5 bg-[#F85149] hover:bg-[#d83c35] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-all self-stretch sm:self-auto cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] border-t-0 rounded-b-lg transition-colors duration-200">
        <DataTable<HostedZone>
          columns={columns}
          data={zoneData?.data || []}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyState={{
            title: "No hosted zones found",
            description: "Get started by creating your first hosted DNS zone.",
            actionLabel: "Create Hosted Zone",
            onAction: () => setIsCreateOpen(true),
          }}
        />
        
        {zoneData && zoneData.total_pages > 1 && (
          <Pagination
            page={page}
            totalPages={zoneData.total_pages}
            totalItems={zoneData.total}
            limit={20}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Hosted Zone"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-[#F85149]/10 border border-[#F85149]/30 rounded text-xs text-[#F85149] font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Domain name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200"
              placeholder="e.g. example.com"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <p className="text-[10px] text-[var(--text-muted-darker)] mt-1">
              Enter the domain name that you want to route traffic for.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Type *
            </label>
            <select
              className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              required
            >
              <option value="Public">Public hosted zone</option>
              <option value="Private">Private hosted zone</option>
            </select>
            <p className="text-[10px] text-[var(--text-muted-darker)] mt-1">
              Select whether to route traffic on the public internet or within a VPC network.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Comment
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200"
              placeholder="Optional comment about this zone"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded text-sm font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded text-sm font-extrabold bg-[#FF9900] text-[#0F1923] hover:bg-[#e68a00] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {createMutation.isPending ? "Creating..." : "Create hosted zone"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Comment for ${activeZone?.name}`}
        size="sm"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Comment
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200"
              placeholder="Optional comment"
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-1.5 rounded text-sm font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="px-4 py-1.5 rounded text-sm font-semibold bg-[#FF9900] text-[#0F1923] hover:bg-[#e68a00] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {editMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Delete Hosted Zone"
        itemName={activeZone?.name || ""}
        itemType="hosted zone"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteSubmit}
        title="Bulk Delete Hosted Zones"
        itemName="Delete selected"
        itemType="selected items"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
