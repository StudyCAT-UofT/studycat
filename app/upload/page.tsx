'use client'

import React, { useState } from "react";

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [courseId, setCourseId] = useState("");
    const [offeringId, setOfferingId] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return setStatus("Please choose a file");
        if (!courseId) return setStatus("Please provide courseId");
        if (!offeringId) return setStatus("Please provide offeringId");

        setLoading(true);
        setStatus(null);

        const form = new FormData();
        form.append("file", file);
        form.append("courseId", courseId);
        form.append("offeringId", offeringId);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: form,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Upload failed");

            setStatus(`Imported ${data.importedCount} items. ${data.details ? JSON.stringify(data.details) : ""}`);
        } catch (err: any) {
            setStatus(`Error: ${err.message || err}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Upload question spreadsheet</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block font-medium">Course ID</label>
                    <input
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        placeholder="prisma Course.id"
                        className="mt-1 block w-full border rounded p-2"
                    />
                </div>

                <div>
                    <label className="block font-medium">Course Offering ID</label>
                    <input
                        value={offeringId}
                        onChange={(e) => setOfferingId(e.target.value)}
                        placeholder="prisma CourseOffering.id (used to create/find Modules)"
                        className="mt-1 block w-full border rounded p-2"
                    />
                </div>

                <div>
                    <label className="block font-medium">Spreadsheet (.xlsx)</label>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                        className="mt-1"
                    />
                </div>

                <div>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                        {loading ? "Importing..." : "Upload & Import"}
                    </button>
                </div>

                {status && (
                    <div className="mt-4 p-3 bg-gray-50 border rounded">
                        <pre className="whitespace-pre-wrap">{status}</pre>
                    </div>
                )}
            </form>

            <div className="mt-6 text-sm text-gray-600">
                <p>Expected columns (case-insensitive):</p>
                <ul className="list-disc ml-5">
                    <li>Module, Question_ID, Bloom_Cat, Stem, Reference, Response_A..D, Justification_A..D, Figure, PtBi, Average, Attempts, IRT_a, IRT_b, IRT_c, Correct</li>
                </ul>
                <p className="mt-2">The "Correct" column may contain either the option label (A/B/C/D) or the option text; the uploader will attempt to match both.</p>
            </div>
        </div>
    );
}
