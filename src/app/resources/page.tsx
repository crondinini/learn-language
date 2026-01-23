"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";

interface Resource {
  id: number;
  url: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formUrl, setFormUrl] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    const res = await fetch("/api/resources");
    const data = await res.json();
    setResources(data);
    setIsLoading(false);
  }

  function openCreateModal() {
    setEditingResource(null);
    setFormUrl("");
    setFormTitle("");
    setFormDescription("");
    setShowModal(true);
  }

  function openEditModal(resource: Resource) {
    setEditingResource(resource);
    setFormUrl(resource.url);
    setFormTitle(resource.title);
    setFormDescription(resource.description || "");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formUrl.trim() || !formTitle.trim()) return;

    if (editingResource) {
      await fetch(`/api/resources/${editingResource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          title: formTitle,
          description: formDescription || null,
        }),
      });
    } else {
      await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          title: formTitle,
          description: formDescription || null,
        }),
      });
    }

    setShowModal(false);
    setEditingResource(null);
    setFormUrl("");
    setFormTitle("");
    setFormDescription("");
    fetchResources();
  }

  async function deleteResource(id: number) {
    if (!confirm("Delete this resource?")) return;
    await fetch(`/api/resources/${id}`, { method: "DELETE" });
    fetchResources();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header
        actions={
          <button
            onClick={openCreateModal}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            + Add Resource
          </button>
        }
      />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {isLoading ? (
          <div className="text-center text-slate-500">Loading...</div>
        ) : resources.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-600">
            <p className="text-lg text-slate-500 dark:text-slate-400">No resources yet</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Add useful websites for learning Arabic
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Add Resource
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="group relative flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {resource.title}
                  </a>
                  {resource.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {resource.description}
                    </p>
                  )}
                  <p className="mt-2 truncate text-xs text-slate-400 dark:text-slate-500">
                    {resource.url}
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEditModal(resource)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteResource(resource.id)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Resource Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
              {editingResource ? "Edit Resource" : "Add New Resource"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Arabic Conjugation Tool"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  URL
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description (optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="A tool for conjugating Arabic verbs in all forms and tenses"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingResource(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  {editingResource ? "Save" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
