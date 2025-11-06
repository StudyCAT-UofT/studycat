'use client';

import React, { useState } from 'react';

export default function DataPage() {
    const [courseOfferingId, setCourseOfferingId] = useState<string>('');
    const [quizId, setQuizId] = useState<string>('');
    const [loadingTheta, setLoadingTheta] = useState(false);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const downloadFromResponse = async (res: Response, defaultFilename: string) => {
        if (!res.ok) {
            let errMsg = `${res.status} ${res.statusText}`;
            try {
                const j = await res.json();
                errMsg = j?.error ?? JSON.stringify(j);
            } catch {
                /* ignore */
            }
            throw new Error(errMsg);
        }

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;

        const cd = res.headers.get('Content-Disposition') ?? '';
        let filename = defaultFilename;
        const match = cd.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);

        return filename;
    };

    const handleDownload = async (
        e: React.FormEvent | undefined,
        type: 'theta' | 'quiz'
    ) => {
        if (e) e.preventDefault();
        setStatus(null);

        let idParam = type === 'theta' ? courseOfferingId.trim() : quizId.trim();
        if (!idParam) {
            setStatus(
                `Please enter a ${type === 'theta' ? 'course offering ID' : 'quiz ID'}.`
            );
            return;
        }

        if (type === 'theta') setLoadingTheta(true);
        else setLoadingQuiz(true);

        try {
            const endpoint =
                type === 'theta'
                    ? `/api/data/theta?courseOfferingId=${encodeURIComponent(idParam)}`
                    : `/api/data/attempt?quizId=${encodeURIComponent(idParam)}`;

            const res = await fetch(endpoint, { method: 'GET', credentials: 'same-origin' });
            const filename = await downloadFromResponse(
                res,
                type === 'theta'
                    ? `thetas_${idParam}.csv`
                    : `quiz_${idParam}_completed_attempts.csv`
            );
            setStatus(`Download started: ${filename}`);
        } catch (err) {
            setStatus(`Error: ${(err as Error).message}`);
        } finally {
            if (type === 'theta') setLoadingTheta(false);
            else setLoadingQuiz(false);
        }
    };

    const handleDownloadQuestionStats = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus(null);

        const idParam = quizId.trim();
        if (!idParam) {
            setStatus('Please enter a quiz ID.');
            return;
        }

        setLoadingQuestions(true);
        try {
            const endpoint = `/api/data/question?quizId=${encodeURIComponent(idParam)}`;
            const res = await fetch(endpoint, { method: 'GET', credentials: 'same-origin' });
            const filename = await downloadFromResponse(res, `item_stats_quiz_${idParam}.csv`);
            setStatus(`Download started: ${filename}`);
        } catch (err) {
            setStatus(`Error: ${(err as Error).message}`);
        } finally {
            setLoadingQuestions(false);
        }
    };

    return (
        <div
            style={{
                maxWidth: 800,
                margin: '2rem auto',
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            }}
        >
            <h1>Export Data (CSV)</h1>

            {/* --- Theta CSV --- */}
            <section style={{ marginBottom: 40 }}>
                <h2>Export Student Thetas</h2>
                <p>
                    Enter a <strong>Course Offering ID</strong> and download a CSV containing{' '}
                    <code>studentID,module,theta</code>.
                </p>

                <form
                    onSubmit={(e) => handleDownload(e, 'theta')}
                    style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        marginTop: 12,
                    }}
                >
                    <label style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, marginBottom: 6 }}>Course Offering ID</div>
                        <input
                            value={courseOfferingId}
                            onChange={(e) => setCourseOfferingId(e.target.value)}
                            placeholder="Enter course offering ID (e.g., cok1abc123...)"
                            style={{ width: '100%', padding: '8px 10px', fontSize: 16 }}
                            aria-label="course-offering-id"
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={loadingTheta}
                        style={{
                            padding: '10px 14px',
                            fontSize: 16,
                            cursor: loadingTheta ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loadingTheta ? 'Preparing...' : 'Download CSV'}
                    </button>
                </form>
            </section>

            {/* --- Quiz CSV & Question Stats --- */}
            <section>
                <h2>Quiz exports (by Quiz ID)</h2>
                <p>
                    Use the Quiz ID to download either completed attempts (<code>userId,score,questionSequence</code>)
                    or question-level statistics (<code>questionId,stem,average,averageA..D,numAttempts</code>).
                </p>

                <form
                    onSubmit={(e) => handleDownload(e, 'quiz')}
                    style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        marginTop: 12,
                        marginBottom: 8,
                    }}
                >
                    <label style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, marginBottom: 6 }}>Quiz ID</div>
                        <input
                            value={quizId}
                            onChange={(e) => setQuizId(e.target.value)}
                            placeholder="Enter quiz ID (e.g., qz123abc...)"
                            style={{ width: '100%', padding: '8px 10px', fontSize: 16 }}
                            aria-label="quiz-id"
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={loadingQuiz}
                        style={{
                            padding: '10px 14px',
                            fontSize: 16,
                            cursor: loadingQuiz ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loadingQuiz ? 'Preparing...' : 'Download Attempts CSV'}
                    </button>

                    <button
                        type="button"
                        onClick={handleDownloadQuestionStats}
                        disabled={loadingQuestions}
                        style={{
                            padding: '10px 14px',
                            fontSize: 16,
                            cursor: loadingQuestions ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loadingQuestions ? 'Preparing...' : 'Download Question Stats'}
                    </button>
                </form>
            </section>

            {status && (
                <div
                    style={{
                        marginTop: 24,
                        color: status.startsWith('Error') ? 'crimson' : 'inherit',
                    }}
                >
                    {status}
                </div>
            )}

            <hr style={{ marginTop: 30 }} />

            <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
                Tip: you can also call the endpoints directly:
                <div style={{ marginTop: 6 }}>
                    <code>/api/data/theta?courseOfferingId=&lt;id&gt;</code> •{' '}
                    <code>/api/data/attempt?quizId=&lt;id&gt;</code> •{' '}
                    <code>/api/items-stats?quizId=&lt;id&gt;</code>
                </div>
            </div>
        </div>
    );
}
