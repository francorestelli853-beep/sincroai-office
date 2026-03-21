"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, Mail, RefreshCw, CheckCircle, Clock } from "lucide-react";

interface Lead {
  id: string;
  clinic_name: string;
  location: string | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  stage: string;
  notes: string | null;
  last_contact: string | null;
  created_at: string;
}

const stageColors: Record<string, string> = {
  prospecto: "bg-gray-700 text-gray-300",
  contactado: "bg-blue-500/20 text-blue-400",
  calificado: "bg-yellow-500/20 text-yellow-400",
  negociacion: "bg-purple-500/20 text-purple-400",
  cliente: "bg-green-500/20 text-green-400",
};

export default function ProspectsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clinic_name: "",
    location: "",
    contact_name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      console.error("Error fetching leads:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ clinic_name: "", location: "", contact_name: "", email: "", phone: "", notes: "" });
        setShowForm(false);
        fetchLeads();
      }
    } catch (e) {
      console.error("Error creating lead:", e);
    }
  };

  const sendEmail = async (lead: Lead) => {
    setSending(lead.id);
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          toEmail: lead.email,
          toName: lead.contact_name || lead.clinic_name,
          clinicName: lead.clinic_name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      } else {
        alert("Error enviando email: " + (data.error || "Error desconocido"));
      }
    } catch (e) {
      console.error("Error sending email:", e);
      alert("Error enviando email");
    }
    setSending(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="mb-2 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300">
            <ArrowLeft className="h-4 w-4" />
            Volver al dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">Prospectos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de leads para outreach en frío
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchLeads}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            Nuevo prospecto
          </button>
        </div>
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Agregar nuevo prospecto</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Nombre de clínica *</label>
              <input
                type="text"
                required
                value={formData.clinic_name}
                onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                placeholder="Clínica Bella Derma"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                placeholder="contacto@clinicabelladerma.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Contacto</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                placeholder="María García"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Ubicación</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                placeholder="Buenos Aires, Argentina"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Teléfono</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                placeholder="+54 11 1234-5678"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Notas</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                placeholder="Encontrado en Instagram..."
              />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Guardar prospecto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando prospectos...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay prospectos todavía. Agregá el primero.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="p-4">Clínica</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Último contacto</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="p-4">
                    <p className="font-medium text-white">{lead.clinic_name}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {lead.contact_name || <span className="text-gray-600">Sin nombre</span>}
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {lead.location || <span className="text-gray-600">—</span>}
                  </td>
                  <td className="p-4">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", stageColors[lead.stage] || stageColors.prospecto)}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {lead.last_contact ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {new Date(lead.last_contact).toLocaleDateString("es-AR")}
                      </span>
                    ) : (
                      <span className="text-gray-600">Nunca</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => sendEmail(lead)}
                      disabled={sending === lead.id}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        lead.stage !== "prospecto"
                          ? "bg-gray-800 text-gray-500"
                          : "bg-violet-600/15 text-violet-400 hover:bg-violet-600/25"
                      )}
                    >
                      {sending === lead.id ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Enviando...
                        </>
                      ) : lead.stage !== "prospecto" ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Enviado
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3" />
                          Enviar email
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
