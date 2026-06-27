"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useToast } from "../../../components/Notification";
import { validateRecordValue, validateTTL } from "../../../lib/validators";
import Breadcrumb from "../../../components/Breadcrumb";
import DataTable, { Column } from "../../../components/DataTable";
import SearchInput from "../../../components/SearchInput";
import Pagination from "../../../components/Pagination";
import Modal from "../../../components/Modal";
import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import { ArrowLeft, Plus, Download, Upload, Trash2, Edit2, Info } from "lucide-react";

interface HostedZone {
  id: string;
  name: string;
  type: string;
  comment?: string;
  record_count: number;
  created_at: string;
}

interface DNSRecord {
  id: string;
  zone_id: string;
  name: string;
  type: string;
  ttl: number;
  value: string;
  routing_policy: string;
  weight?: number;
  region?: string;
  failover?: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedRecords {
  data: DNSRecord[];
  total: number;
  page: number;
  total_pages: number;
}

const AWS_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-central-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
  "sa-east-1"
];

export default function ZoneDetailsPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const resolvedParams = use(params);
  const zoneId = resolvedParams.zoneId;

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  const [activeRecord, setActiveRecord] = useState<DNSRecord | null>(null);

  const [recName, setRecName] = useState("");
  const [recType, setRecType] = useState("A");
  const [recTTL, setRecTTL] = useState(300);
  const [recValue, setRecValue] = useState("");
  const [recRouting, setRecRouting] = useState("Simple");
  const [recWeight, setRecWeight] = useState<number | "">("");
  const [recRegion, setRecRegion] = useState("");
  const [recFailover, setRecFailover] = useState("");
  const [formError, setFormError] = useState("");

  const [importContent, setImportContent] = useState("");
  const [importLoading, setImportLoading] = useState(false);

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
        setRecName("");
        setRecType("A");
        setRecTTL(300);
        setRecValue("");
        setRecRouting("Simple");
        setRecWeight("");
        setRecRegion("");
        setRecFailover("");
        setFormError("");
        setIsCreateOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: zone } = useQuery<HostedZone>({
    queryKey: ["hostedZoneDetails", zoneId],
    queryFn: () => api.get<HostedZone>(`/api/zones/${zoneId}`),
  });

  const { data: recordData, isLoading } = useQuery<PaginatedRecords>({
    queryKey: ["dnsRecords", zoneId, search, typeFilter, page],
    queryFn: () =>
      api.get<PaginatedRecords>(`/api/zones/${zoneId}/records`, {
        search,
        type: typeFilter,
        page,
        limit: 20,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post<DNSRecord>(`/api/zones/${zoneId}/records`, body),
    onSuccess: () => {
      addToast("DNS record created successfully", "success");
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["dnsRecords", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["hostedZoneDetails", zoneId] });
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create record.");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put<DNSRecord>(`/api/zones/${zoneId}/records/${id}`, body),
    onSuccess: () => {
      addToast("DNS record updated successfully", "success");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["dnsRecords", zoneId] });
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to update record.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/zones/${zoneId}/records/${id}`),
    onSuccess: () => {
      addToast("DNS record deleted successfully", "success");
      setIsDeleteOpen(false);
      setSelectedIds((prev) => prev.filter((id) => id !== activeRecord?.id));
      queryClient.invalidateQueries({ queryKey: ["dnsRecords", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["hostedZoneDetails", zoneId] });
    },
    onError: (err: any) => {
      addToast(err.message || "Failed to delete record", "error");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await api.delete<void>(`/api/zones/${zoneId}/records/${id}`);
      }
    },
    onSuccess: () => {
      addToast(`Deleted ${selectedIds.length} records successfully`, "success");
      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["dnsRecords", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["hostedZoneDetails", zoneId] });
    },
    onError: (err: any) => {
      addToast(err.message || "Failed to delete some records", "error");
      queryClient.invalidateQueries({ queryKey: ["dnsRecords", zoneId] });
    },
  });

  const handleRecordSubmit = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    setFormError("");

    const valErr = validateRecordValue(recType, recValue);
    if (valErr) {
      setFormError(valErr);
      return;
    }

    const ttlErr = validateTTL(recTTL);
    if (ttlErr) {
      setFormError(ttlErr);
      return;
    }

    const payload: any = {
      name: recName.trim() || "@",
      type: recType,
      ttl: Number(recTTL),
      value: recValue.trim(),
      routing_policy: recRouting,
      weight: recRouting === "Weighted" && recWeight !== "" ? Number(recWeight) : undefined,
      region: recRouting === "Latency" && recRegion ? recRegion : undefined,
      failover: recRouting === "Failover" && recFailover ? recFailover : undefined,
    };

    if (isEdit && activeRecord) {
      editMutation.mutate({ id: activeRecord.id, body: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleImport = async () => {
    if (!importContent.trim()) {
      addToast("Please paste BIND zone content", "error");
      return;
    }
    setImportLoading(true);
    try {
      const res = await api.post<any>(`/api/zones/${zoneId}/records/import`, {
        zone_file_content: importContent,
      });
      addToast(
        `Import complete: ${res.imported_count} imported, ${res.failed_count} failed`,
        res.failed_count > 0 ? "error" : "success"
      );
      setIsImportOpen(false);
      setImportContent("");
      queryClient.invalidateQueries({ queryKey: ["dnsRecords", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["hostedZoneDetails", zoneId] });
    } catch (err: any) {
      addToast(err.message || "Failed to import zone file", "error");
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async (format: "bind" | "json") => {
    try {
      const data = await api.get<any>(`/api/zones/${zoneId}/records/export`, { format });
      
      let content = "";
      let filename = `${zone?.name ?? "zone"}.zone`;

      if (format === "json") {
        content = JSON.stringify(data, null, 2);
        filename = `${zone?.name ?? "zone"}.json`;
      } else {
        content = data.bind_content;
        filename = data.filename;
      }

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast(`Zone exported successfully as ${format.toUpperCase()}`, "success");
      setIsExportOpen(false);
    } catch (err: any) {
      addToast(err.message || "Failed to export zone", "error");
    }
  };

  const openEditModal = (rec: DNSRecord) => {
    setActiveRecord(rec);
    setRecName(rec.name);
    setRecType(rec.type);
    setRecTTL(rec.ttl);
    setRecValue(rec.value);
    setRecRouting(rec.routing_policy);
    setRecWeight(rec.weight ?? "");
    setRecRegion(rec.region || "");
    setRecFailover(rec.failover || "");
    setFormError("");
    setIsEditOpen(true);
  };

  const openDeleteModal = (rec: DNSRecord) => {
    setActiveRecord(rec);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = () => {
    if (!activeRecord) return;
    deleteMutation.mutate(activeRecord.id);
  };

  const handleBulkDeleteSubmit = () => {
    bulkDeleteMutation.mutate(selectedIds);
  };

  const columns: Column<DNSRecord>[] = [
    {
      key: "name",
      header: "Record name",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-[var(--text-primary)] font-semibold select-all break-all">
          {row.name}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--page-bg)] border border-[var(--border-color)] text-[#FF9900]">
          {row.type}
        </span>
      ),
    },
    {
      key: "ttl",
      header: "TTL (seconds)",
      sortable: true,
      align: "center",
      render: (row) => <span className="font-mono text-xs">{row.ttl}</span>,
    },
    {
      key: "value",
      header: "Value / Route target",
      render: (row) => (
        <span
          className="font-mono text-xs text-[var(--text-muted)] max-w-sm md:max-w-md block whitespace-pre-wrap truncate break-all select-all"
          title={row.value}
        >
          {row.value}
        </span>
      ),
    },
    {
      key: "routing_policy",
      header: "Routing policy",
      render: (row) => {
        let text = row.routing_policy;
        if (row.routing_policy === "Weighted") text += ` (Weight: ${row.weight})`;
        if (row.routing_policy === "Latency") text += ` (Region: ${row.region})`;
        if (row.routing_policy === "Failover") text += ` (${row.failover})`;
        return <span className="text-xs font-semibold">{text}</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => {
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openEditModal(row)}
              className="p-1 text-[var(--text-muted)] hover:text-[#FF9900] hover:bg-[var(--page-bg)] rounded transition-colors cursor-pointer"
              title="Edit Record"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => openDeleteModal(row)}
              className="p-1 text-[var(--text-muted)] hover:text-[#F85149] hover:bg-[var(--page-bg)] rounded transition-colors cursor-pointer"
              title="Delete Record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: "Route 53", href: "/hosted-zones" },
              { label: "Hosted Zones", href: "/hosted-zones" },
              { label: zone?.name || "Loading...", href: `/hosted-zones/${zoneId}` },
              { label: "Records" },
            ]}
          />
          <div className="flex items-center gap-3">
            <Link
              href="/hosted-zones"
              className="p-1 text-[var(--text-muted)] hover:text-[#FF9900] hover:bg-[var(--page-bg)] rounded transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight truncate max-w-sm md:max-w-md">
              {zone?.name || "Loading Zone Details..."}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3 py-2 border border-[var(--border-color)] hover:bg-[var(--page-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import Zone
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="px-3 py-2 border border-[var(--border-color)] hover:bg-[var(--page-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Zone
          </button>
          <button
            onClick={() => {
              setRecName("");
              setRecType("A");
              setRecTTL(300);
              setRecValue("");
              setRecRouting("Simple");
              setRecWeight("");
              setRecRegion("");
              setRecFailover("");
              setFormError("");
              setIsCreateOpen(true);
            }}
            className="px-4 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#0F1923] text-sm font-extrabold rounded shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Record
          </button>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4 flex flex-col md:flex-row gap-6 text-sm text-[var(--text-muted)] transition-colors duration-200">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--text-muted-darker)] uppercase tracking-wider">
            Hosted Zone ID
          </span>
          <span className="font-mono text-[var(--text-primary)] mt-1 select-all">{zoneId}</span>
        </div>
        <div className="w-px bg-[var(--border-color)] hidden md:block" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--text-muted-darker)] uppercase tracking-wider">
            Type
          </span>
          <span className="mt-1 font-semibold text-[var(--text-primary)]">{zone?.type || "—"}</span>
        </div>
        <div className="w-px bg-[var(--border-color)] hidden md:block" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--text-muted-darker)] uppercase tracking-wider">
            Record count
          </span>
          <span className="font-mono text-[var(--text-primary)] mt-1 font-extrabold">
            {zone?.record_count ?? 0}
          </span>
        </div>
        {zone?.comment && (
          <>
            <div className="w-px bg-[var(--border-color)] hidden md:block" />
            <div className="flex flex-col flex-1">
              <span className="text-xs font-semibold text-[var(--text-muted-darker)] uppercase tracking-wider">
                Comment
              </span>
              <span className="text-[var(--text-primary)] mt-1 italic">{zone.comment}</span>
            </div>
          </>
        )}
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-t-lg p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted-darker)] whitespace-nowrap">Filter type:</span>
            <select
              className="px-2.5 py-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded text-xs font-semibold text-[var(--text-muted)] focus:outline-none focus:border-[#FF9900] cursor-pointer"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              {["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <SearchInput
            placeholder="Search records by name or target value..."
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
        <DataTable<DNSRecord>
          columns={columns}
          data={recordData?.data || []}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyState={{
            title: "No records found",
            description: "Define DNS routing rules for your subdomains by adding records.",
            actionLabel: "Create Record",
            onAction: () => setIsCreateOpen(true),
          }}
        />

        {recordData && recordData.total_pages > 1 && (
          <Pagination
            page={page}
            totalPages={recordData.total_pages}
            totalItems={recordData.total}
            limit={20}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Record"
        size="lg"
      >
        <form onSubmit={(e) => handleRecordSubmit(e, false)} className="space-y-5">
          {formError && (
            <div className="p-3 bg-[#F85149]/10 border border-[#F85149]/30 rounded text-xs text-[#F85149] font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Record name
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  className="flex-1 min-w-0 px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-l-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] font-mono text-right transition-colors duration-200"
                  placeholder="www"
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                />
                <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-[var(--border-color)] bg-[var(--table-header-bg)] text-xs text-[var(--text-muted-darker)] font-mono transition-colors duration-200">
                  .{zone?.name || "example.com"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Record type
              </label>
              <select
                className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200 cursor-pointer"
                value={recType}
                onChange={(e) => setRecType(e.target.value)}
              >
                {["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"].map((t) => (
                  <option key={t} value={t}>
                    {t} - {t === "A" ? "Routes IPv4 address" : t === "AAAA" ? "Routes IPv6 address" : t === "CNAME" ? "Alias subdomain" : t === "MX" ? "Mail server exchange" : "Standard DNS rule"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                TTL (seconds)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] font-mono transition-colors duration-200"
                value={recTTL}
                onChange={(e) => setRecTTL(Number(e.target.value))}
                min={1}
                max={2147483647}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Value *
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] font-mono whitespace-pre transition-colors duration-200"
              placeholder={
                recType === "A"
                  ? "e.g. 192.0.2.44"
                  : recType === "CNAME"
                  ? "e.g. web.anotherdomain.com"
                  : recType === "MX"
                  ? "e.g. 10 mail.example.com"
                  : "Enter record values, one per line."
              }
              value={recValue}
              onChange={(e) => setRecValue(e.target.value)}
              required
            />
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-[var(--text-muted-darker)]">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {recType === "A" && "Enter a standard dotted-quad IPv4 address."}
                {recType === "AAAA" && "Enter a valid colon-separated IPv6 address."}
                {recType === "CNAME" && "Enter a valid canonical domain hostname target."}
                {recType === "MX" && "Enter priority integer followed by host hostname (e.g. 10 mailserver.com)."}
                {recType === "TXT" && "Enter any text string. Wrap multi-line arrays in quotes."}
              </span>
            </div>
          </div>

          <div className="p-4 bg-[var(--table-header-bg)] border border-[var(--border-color)] rounded-lg space-y-4 transition-colors duration-200">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Routing policy
              </label>
              <select
                className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200 cursor-pointer"
                value={recRouting}
                onChange={(e) => setRecRouting(e.target.value)}
              >
                <option value="Simple">Simple routing</option>
                <option value="Weighted">Weighted routing</option>
                <option value="Latency">Latency routing</option>
                <option value="Failover">Failover routing</option>
              </select>
            </div>

            {recRouting === "Weighted" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Weight (0–255) *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200"
                    placeholder="e.g. 100"
                    value={recWeight}
                    onChange={(e) => setRecWeight(e.target.value === "" ? "" : Number(e.target.value))}
                    min={0}
                    max={255}
                    required
                  />
                  <p className="text-[10px] text-[var(--text-muted-darker)] mt-1">
                    DNS traffic will be split proportionally based on this weight value.
                  </p>
                </div>
              </div>
            )}

            {recRouting === "Latency" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    AWS Region *
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200 cursor-pointer"
                    value={recRegion}
                    onChange={(e) => setRecRegion(e.target.value)}
                    required
                  >
                    <option value="">Select Region</option>
                    {AWS_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--text-muted-darker)] mt-1">
                    Route requests to this endpoint based on lowest latency distance.
                  </p>
                </div>
              </div>
            )}

            {recRouting === "Failover" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Failover Record Type *
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200 cursor-pointer"
                    value={recFailover}
                    onChange={(e) => setRecFailover(e.target.value)}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="PRIMARY">PRIMARY (Main endpoint)</option>
                    <option value="SECONDARY">SECONDARY (Backup endpoint)</option>
                  </select>
                  <p className="text-[10px] text-[var(--text-muted-darker)] mt-1">
                    Backup secondary target takes over traffic if primary fails health check.
                  </p>
                </div>
              </div>
            )}
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
              {createMutation.isPending ? "Creating..." : "Create record"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit DNS Record"
        size="lg"
      >
        <form onSubmit={(e) => handleRecordSubmit(e, true)} className="space-y-5">
          {formError && (
            <div className="p-3 bg-[#F85149]/10 border border-[#F85149]/30 rounded text-xs text-[#F85149] font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Record name
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  className="flex-1 min-w-0 px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-l-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] font-mono text-right transition-colors duration-200"
                  placeholder="www"
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                />
                <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-[var(--border-color)] bg-[var(--table-header-bg)] text-xs text-[var(--text-muted-darker)] font-mono transition-colors duration-200">
                  .{zone?.name || "example.com"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Record type
              </label>
              <select
                className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] opacity-75 cursor-not-allowed transition-colors duration-200"
                value={recType}
                disabled
              >
                <option value={recType}>{recType}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                TTL (seconds)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] font-mono transition-colors duration-200"
                value={recTTL}
                onChange={(e) => setRecTTL(Number(e.target.value))}
                min={1}
                max={2147483647}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Value *
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] font-mono whitespace-pre transition-colors duration-200"
              value={recValue}
              onChange={(e) => setRecValue(e.target.value)}
              required
            />
          </div>

          <div className="p-4 bg-[var(--table-header-bg)] border border-[var(--border-color)] rounded-lg space-y-4 transition-colors duration-200">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Routing policy
              </label>
              <select
                className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200 cursor-pointer"
                value={recRouting}
                onChange={(e) => setRecRouting(e.target.value)}
              >
                <option value="Simple">Simple routing</option>
                <option value="Weighted">Weighted routing</option>
                <option value="Latency">Latency routing</option>
                <option value="Failover">Failover routing</option>
              </select>
            </div>

            {recRouting === "Weighted" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Weight (0–255) *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200"
                    placeholder="e.g. 100"
                    value={recWeight}
                    onChange={(e) => setRecWeight(e.target.value === "" ? "" : Number(e.target.value))}
                    min={0}
                    max={255}
                    required
                  />
                </div>
              </div>
            )}

            {recRouting === "Latency" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    AWS Region *
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200 cursor-pointer"
                    value={recRegion}
                    onChange={(e) => setRecRegion(e.target.value)}
                    required
                  >
                    <option value="">Select Region</option>
                    {AWS_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {recRouting === "Failover" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Failover Record Type *
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] transition-colors duration-200 cursor-pointer"
                    value={recFailover}
                    onChange={(e) => setRecFailover(e.target.value)}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="PRIMARY">PRIMARY (Main endpoint)</option>
                    <option value="SECONDARY">SECONDARY (Backup endpoint)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded text-sm font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="px-4 py-2 rounded text-sm font-extrabold bg-[#FF9900] text-[#0F1923] hover:bg-[#e68a00] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {editMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Delete DNS Record"
        itemName={activeRecord?.name || ""}
        itemType="DNS record"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteSubmit}
        title="Bulk Delete DNS Records"
        itemName="Delete selected"
        itemType="selected items"
        isLoading={bulkDeleteMutation.isPending}
      />

      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import DNS Records from BIND Zone File"
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-xs text-[var(--text-muted)] space-y-1">
            <p>Paste the contents of a standard RFC 1035 BIND zone file below.</p>
            <p>Example syntax supported:</p>
            <pre className="p-3 bg-[var(--table-header-bg)] border border-[var(--border-color)] rounded text-[10px] text-[#FF9900] font-mono whitespace-pre-wrap transition-colors duration-200">
              {`$TTL 300\n@   IN  A     192.0.2.1\nwww     CNAME example.com\nmail    MX    10 mailserver.com`}
            </pre>
          </div>
          
          <textarea
            rows={10}
            className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#FF9900] font-mono whitespace-pre transition-colors duration-200"
            placeholder="Paste your BIND zone file content here..."
            value={importContent}
            onChange={(e) => setImportContent(e.target.value)}
            disabled={importLoading}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="px-4 py-2 rounded text-sm font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] transition-colors cursor-pointer"
              disabled={importLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importLoading}
              className="px-4 py-2 rounded text-sm font-extrabold bg-[#FF9900] text-[#0F1923] hover:bg-[#e68a00] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {importLoading ? "Importing..." : "Import records"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Hosted Zone Records"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Choose a format to export all DNS records for <span className="font-bold text-[var(--text-primary)]">{zone?.name}</span>:
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => handleExport("bind")}
              className="w-full py-3 bg-[var(--card-bg)] hover:bg-[var(--page-bg)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-sm rounded-md transition-colors duration-200 flex items-center justify-between px-4 cursor-pointer"
            >
              <span>BIND Zone File format (.zone)</span>
              <Download className="w-4 h-4 text-[#FF9900]" />
            </button>

            <button
              onClick={() => handleExport("json")}
              className="w-full py-3 bg-[var(--card-bg)] hover:bg-[var(--page-bg)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-sm rounded-md transition-colors duration-200 flex items-center justify-between px-4 cursor-pointer"
            >
              <span>JSON Backup format (.json)</span>
              <Download className="w-4 h-4 text-[#FF9900]" />
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => setIsExportOpen(false)}
              className="px-4 py-1.5 rounded text-sm font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
