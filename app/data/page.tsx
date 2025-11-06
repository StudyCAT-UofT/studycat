'use client'

import React, { useState } from "react";

export default function DataPage() {
    const [courseOfferingId, setCourseOfferingId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleDownload = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!courseOfferingId.trim()) {
            setStatus("Please enter a course offering ID.");
            return;
        }
        setLoading(true);
        setStatus(null);

        try {
            // Fetch CSV from server
            const url = `/api/data/theta?courseOfferingId=${encodeURIComponent(courseOfferingId.trim())}`;
            const res = await fetch(url, {
                method: "GET",
                credentials: "same-origin",
            });

            if (!res.ok) {
                // Try to parse JSON error
                let errMsg = `${res.status} ${res.statusText}`;
                try {
                    const j = await res.json();
                    errMsg = j?.error ?? JSON.stringify(j);
                } catch {
                    /* ignore */
                }
                setStatus(`Error: ${errMsg}`);
                setLoading(false);
                return;
            }

            // Get blob and trigger download
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;

            // attempt to read filename from Content-Disposition (fallback below)
            const cd = res.headers.get("Content-Disposition") ?? "";
            let filename = `thetas_${courseOfferingId.trim()}.csv`;
            const match = cd.match(/filename="?([^"]+)"?/);
            if (match && match[1]) filename = match[1];

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);

            setStatus(`Download started: ${filename}`);
        } catch (err) {
            setStatus(`Network error: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
            <h1>Export student thetas (CSV)</h1>

            <p>
                Enter a <strong>Course Offering ID</strong> and click <em>Download CSV</em>. The generated CSV will contain
                headers <code>studentID,module,theta</code>.
            </p>

            <form onSubmit={handleDownload} style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
                <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, marginBottom: 6 }}>Course Offering ID</div>
                    <input
                        value={courseOfferingId}
                        onChange={(e) => setCourseOfferingId(e.target.value)}
                        placeholder="Enter course offering ID (e.g., cok1abc123...)"
                        style={{ width: "100%", padding: "8px 10px", fontSize: 16 }}
                        aria-label="course-offering-id"
                    />
                </label>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: "10px 14px",
                            fontSize: 16,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Preparing..." : "Download CSV"}
                    </button>
                </div>
            </form>

            {status && (
                <div style={{ marginTop: 16, color: status.startsWith("Error") ? "crimson" : "inherit" }}>
                    {status}
                </div>
            )}

            <hr style={{ marginTop: 20 }} />

            <div style={{ marginTop: 10, fontSize: 13, color: "#555" }}>
                Tip: you can also call <code>/api/data/theta?courseOfferingId=&lt;id&gt;</code> directly (GET) to download the CSV.
            </div>
        </div>
    );
}