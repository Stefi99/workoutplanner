"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { Difficulty, ExerciseItem, RepMode, WorkoutPlannerState } from "@/lib/types";
import { loadState, saveState, uid } from "@/lib/workout-storage";

type ParsedExerciseDraft = {
  workoutName: string;
  reps: number;
  repMode: RepMode;
};

const difficultyLabels: Record<Difficulty, string> = {
  light: "Leicht",
  medium: "Mittel",
  hard: "Schwierig",
};

export default function Home() {
  const [state, setState] = useState<WorkoutPlannerState>(loadState);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(() => loadState().weeks[0]?.id ?? null);
  const [newWeekName, setNewWeekName] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseReps, setExerciseReps] = useState(10);
  const [exerciseRepMode, setExerciseRepMode] = useState<RepMode>("count");
  const [exercisePicture, setExercisePicture] = useState("");
  const [isWorkoutMode, setIsWorkoutMode] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [plannedRounds, setPlannedRounds] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(1);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [ratingDifficulty, setRatingDifficulty] = useState<Difficulty>("medium");
  const [ratingNote, setRatingNote] = useState("");
  const [importDocName, setImportDocName] = useState("");
  const [importDrafts, setImportDrafts] = useState<ParsedExerciseDraft[]>([]);
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [editingWeekName, setEditingWeekName] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState("");
  const [editingExerciseReps, setEditingExerciseReps] = useState(10);
  const [editingExerciseRepMode, setEditingExerciseRepMode] = useState<RepMode>("count");
  const [editingExercisePicture, setEditingExercisePicture] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const selectedWeek = useMemo(
    () => state.weeks.find((week) => week.id === selectedWeekId) ?? null,
    [state.weeks, selectedWeekId],
  );

  const activeExercises = selectedWeek?.exercises ?? [];
  const currentExercise = activeExercises[currentExerciseIndex] ?? null;

  function createWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newWeekName.trim();
    if (!trimmed) return;

    const week = {
      id: uid("week"),
      name: trimmed,
      order: state.weeks.length + 1,
      exercises: [],
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, weeks: [...prev.weeks, week] }));
    setSelectedWeekId(week.id);
    setNewWeekName("");
  }

  function addExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWeek || !exerciseName.trim()) return;

    const exercise: ExerciseItem = {
      id: uid("exercise"),
      workoutName: exerciseName.trim(),
      picture: exercisePicture.trim() || undefined,
      reps: exerciseReps,
      repMode: exerciseRepMode,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) =>
        week.id === selectedWeek.id
          ? { ...week, exercises: [...week.exercises, exercise] }
          : week,
      ),
    }));

    setExerciseName("");
    setExercisePicture("");
    setExerciseReps(10);
    setExerciseRepMode("count");
  }

  function startWeekEdit(weekId: string, currentName: string) {
    setEditingWeekId(weekId);
    setEditingWeekName(currentName);
  }

  function saveWeekEdit(weekId: string) {
    const trimmed = editingWeekName.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) => (week.id === weekId ? { ...week, name: trimmed } : week)),
    }));
    setEditingWeekId(null);
    setEditingWeekName("");
  }

  function deleteWeek(weekId: string) {
    setState((prev) => ({
      ...prev,
      weeks: prev.weeks.filter((week) => week.id !== weekId),
      sessions: prev.sessions.filter((session) => session.weekId !== weekId),
    }));
    if (selectedWeekId === weekId) {
      const nextWeek = state.weeks.find((week) => week.id !== weekId);
      setSelectedWeekId(nextWeek?.id ?? null);
    }
    if (editingWeekId === weekId) {
      setEditingWeekId(null);
      setEditingWeekName("");
    }
  }

  function startExerciseEdit(exercise: ExerciseItem) {
    setEditingExerciseId(exercise.id);
    setEditingExerciseName(exercise.workoutName);
    setEditingExerciseReps(exercise.reps);
    setEditingExerciseRepMode(exercise.repMode);
    setEditingExercisePicture(exercise.picture ?? "");
  }

  function saveExerciseEdit(exerciseId: string) {
    if (!selectedWeek) return;
    const trimmed = editingExerciseName.trim();
    if (!trimmed) return;

    setState((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) =>
        week.id === selectedWeek.id
          ? {
              ...week,
              exercises: week.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      workoutName: trimmed,
                      reps: editingExerciseReps,
                      repMode: editingExerciseRepMode,
                      picture: editingExercisePicture.trim() || undefined,
                    }
                  : exercise,
              ),
            }
          : week,
      ),
    }));
    cancelExerciseEdit();
  }

  function cancelExerciseEdit() {
    setEditingExerciseId(null);
    setEditingExerciseName("");
    setEditingExerciseReps(10);
    setEditingExerciseRepMode("count");
    setEditingExercisePicture("");
  }

  function deleteExercise(exerciseId: string) {
    if (!selectedWeek) return;
    setState((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) =>
        week.id === selectedWeek.id
          ? { ...week, exercises: week.exercises.filter((exercise) => exercise.id !== exerciseId) }
          : week,
      ),
    }));
    if (editingExerciseId === exerciseId) {
      cancelExerciseEdit();
    }
  }

  function startWorkout() {
    if (!selectedWeek || selectedWeek.exercises.length === 0) return;
    const safeRounds = Math.max(1, plannedRounds || 1);
    const sessionId = uid("session");
    setState((prev) => ({
      ...prev,
      sessions: [
        ...prev.sessions,
        {
          id: sessionId,
          weekId: selectedWeek.id,
          weekName: selectedWeek.name,
          startedAt: new Date().toISOString(),
          endedAt: "",
          completedExerciseIds: [],
        },
      ],
    }));
    setActiveSessionId(sessionId);
    setCurrentExerciseIndex(0);
    setCurrentRound(1);
    setTotalRounds(safeRounds);
    setIsWorkoutMode(true);
  }

  const finishWorkout = useCallback(() => {
    if (!activeSessionId) return;
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, endedAt: new Date().toISOString() }
          : session,
      ),
    }));
    setIsWorkoutMode(false);
    setCurrentRound(1);
    setTotalRounds(1);
  }, [activeSessionId]);

  const nextExercise = useCallback(() => {
    if (!selectedWeek) return;
    const lastIndex = selectedWeek.exercises.length - 1;
    const current = selectedWeek.exercises[currentExerciseIndex];
    if (!current || !activeSessionId) return;

    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              completedExerciseIds: [...session.completedExerciseIds, current.id],
            }
          : session,
      ),
    }));

    if (currentExerciseIndex >= lastIndex) {
      if (currentRound >= totalRounds) {
        finishWorkout();
        return;
      }
      setCurrentRound((prev) => prev + 1);
      setCurrentExerciseIndex(0);
      return;
    }

    setCurrentExerciseIndex((prev) => prev + 1);
  }, [activeSessionId, currentExerciseIndex, currentRound, finishWorkout, selectedWeek, totalRounds]);

  function saveRating() {
    if (!activeSessionId) return;
    setState((prev) => ({
      ...prev,
      ratings: [
        ...prev.ratings,
        {
          id: uid("rating"),
          sessionId: activeSessionId,
          difficulty: ratingDifficulty,
          note: ratingNote.trim() || undefined,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setActiveSessionId(null);
    setRatingDifficulty("medium");
    setRatingNote("");
  }

  async function handleDocUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedWeek) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await readUploadText(file);
    const parsed = parseDocumentText(text);
    setImportDocName(file.name);
    setImportDrafts(parsed);
  }

  function importDraftsToWeek() {
    if (!selectedWeek || importDrafts.length === 0) return;
    const now = new Date().toISOString();
    const imported: ExerciseItem[] = importDrafts.map((draft) => ({
      id: uid("exercise"),
      workoutName: draft.workoutName,
      reps: draft.reps,
      repMode: draft.repMode,
      sourceDocName: importDocName,
      createdAt: now,
    }));

    setState((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) =>
        week.id === selectedWeek.id
          ? { ...week, exercises: [...week.exercises, ...imported] }
          : week,
      ),
    }));

    setImportDrafts([]);
    setImportDocName("");
  }

  useEffect(() => {
    if (!isWorkoutMode) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        nextExercise();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isWorkoutMode, nextExercise]);

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[300px_1fr]">
        <aside className="rounded-xl bg-white p-4 shadow">
          <h1 className="text-xl font-bold">Workoutplaner</h1>
          <p className="mb-4 text-sm text-slate-500">{state.user.email}</p>

          <form onSubmit={createWeek} className="mb-4 space-y-2">
            <input
              value={newWeekName}
              onChange={(event) => setNewWeekName(event.target.value)}
              placeholder="Neue Woche (z.B. Week 1)"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            <button className="w-full rounded bg-slate-900 px-3 py-2 text-white">
              Woche hinzufügen
            </button>
          </form>

          <ul className="space-y-2">
            {state.weeks.map((week) => (
              <li key={week.id} className="rounded bg-slate-100 p-2">
                {editingWeekId === week.id ? (
                  <div className="space-y-2">
                    <input
                      value={editingWeekName}
                      onChange={(event) => setEditingWeekName(event.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2"
                    />
                    <div className="flex gap-2">
                      <button
                        className="flex-1 rounded bg-emerald-600 px-3 py-2 text-white"
                        onClick={() => saveWeekEdit(week.id)}
                      >
                        Speichern
                      </button>
                      <button
                        className="flex-1 rounded bg-slate-500 px-3 py-2 text-white"
                        onClick={() => setEditingWeekId(null)}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      className={`w-full rounded px-3 py-2 text-left ${
                        selectedWeekId === week.id ? "bg-slate-900 text-white" : "bg-white"
                      }`}
                      onClick={() => setSelectedWeekId(week.id)}
                    >
                      {week.name} ({week.exercises.length})
                    </button>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 rounded bg-blue-600 px-2 py-1 text-sm text-white"
                        onClick={() => startWeekEdit(week.id, week.name)}
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="flex-1 rounded bg-red-600 px-2 py-1 text-sm text-white"
                        onClick={() => deleteWeek(week.id)}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <main className="rounded-xl bg-white p-4 shadow">
          {!selectedWeek ? (
            <p>Erstelle links zuerst eine Woche.</p>
          ) : (
            <>
              <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{selectedWeek.name}</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600" htmlFor="rounds-input">
                    Runden
                  </label>
                  <input
                    id="rounds-input"
                    type="number"
                    min={1}
                    value={plannedRounds}
                    onChange={(event) => setPlannedRounds(Math.max(1, Number(event.target.value) || 1))}
                    className="w-20 rounded border border-slate-300 px-2 py-2"
                  />
                  <button
                    className="rounded bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
                    onClick={startWorkout}
                    disabled={selectedWeek.exercises.length === 0}
                  >
                    Workout starten
                  </button>
                </div>
              </header>

              <form onSubmit={addExercise} className="mb-6 grid gap-2 md:grid-cols-4">
                <input
                  value={exerciseName}
                  onChange={(event) => setExerciseName(event.target.value)}
                  placeholder="Workoutname"
                  className="rounded border border-slate-300 px-3 py-2"
                />
                <input
                  type="number"
                  min={1}
                  value={exerciseReps}
                  onChange={(event) => setExerciseReps(Number(event.target.value))}
                  className="rounded border border-slate-300 px-3 py-2"
                />
                <select
                  value={exerciseRepMode}
                  onChange={(event) => setExerciseRepMode(event.target.value as RepMode)}
                  className="rounded border border-slate-300 px-3 py-2"
                >
                  <option value="count">Wiederholungen</option>
                  <option value="time_seconds">Sekunden</option>
                  <option value="time_minutes">Minuten</option>
                </select>
                <button className="rounded bg-slate-900 px-3 py-2 text-white">Hinzufügen</button>
                <input
                  value={exercisePicture}
                  onChange={(event) => setExercisePicture(event.target.value)}
                  placeholder="Bild-URL (optional)"
                  className="rounded border border-slate-300 px-3 py-2 md:col-span-4"
                />
              </form>

              <section className="mb-6 rounded border border-slate-200 p-3">
                <h3 className="mb-2 font-semibold">Dokumentimport</h3>
                <input type="file" accept=".txt,.docx,.pdf" onChange={handleDocUpload} className="mb-3" />
                {importDrafts.length > 0 ? (
                  <div className="space-y-2">
                    {importDrafts.map((draft, index) => (
                      <div key={`${draft.workoutName}-${index}`} className="rounded bg-slate-50 p-2 text-sm">
                        {draft.workoutName} - {draft.reps} ({draft.repMode})
                      </div>
                    ))}
                    <button
                      className="rounded bg-blue-600 px-3 py-2 text-white"
                      onClick={importDraftsToWeek}
                    >
                      In {selectedWeek.name} importieren
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Datei hochladen, dann Vorschau prüfen.</p>
                )}
              </section>

              <ul className="space-y-2">
                {selectedWeek.exercises.map((exercise) => (
                  <li key={exercise.id} className="rounded border border-slate-200 p-3">
                    {editingExerciseId === exercise.id ? (
                      <div className="space-y-2">
                        <input
                          value={editingExerciseName}
                          onChange={(event) => setEditingExerciseName(event.target.value)}
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            type="number"
                            min={1}
                            value={editingExerciseReps}
                            onChange={(event) => setEditingExerciseReps(Number(event.target.value))}
                            className="rounded border border-slate-300 px-3 py-2"
                          />
                          <select
                            value={editingExerciseRepMode}
                            onChange={(event) => setEditingExerciseRepMode(event.target.value as RepMode)}
                            className="rounded border border-slate-300 px-3 py-2"
                          >
                            <option value="count">Wiederholungen</option>
                            <option value="time_seconds">Sekunden</option>
                            <option value="time_minutes">Minuten</option>
                          </select>
                        </div>
                        <input
                          value={editingExercisePicture}
                          onChange={(event) => setEditingExercisePicture(event.target.value)}
                          placeholder="Bild-URL (optional)"
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded bg-emerald-600 px-3 py-2 text-white"
                            onClick={() => saveExerciseEdit(exercise.id)}
                          >
                            Speichern
                          </button>
                          <button
                            className="rounded bg-slate-500 px-3 py-2 text-white"
                            onClick={cancelExerciseEdit}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{exercise.workoutName}</div>
                        <div className="text-sm text-slate-500">
                          {exercise.reps} - {exercise.repMode}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {exercise.picture ? (
                            <a
                              className="text-sm text-blue-600"
                              href={exercise.picture}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Bild ansehen
                            </a>
                          ) : null}
                          <button
                            className="rounded bg-blue-600 px-2 py-1 text-sm text-white"
                            onClick={() => startExerciseEdit(exercise)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            className="rounded bg-red-600 px-2 py-1 text-sm text-white"
                            onClick={() => deleteExercise(exercise.id)}
                          >
                            Löschen
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </main>
      </div>

      {isWorkoutMode && currentExercise && (
        <div
          className="fixed inset-0 z-10 grid place-items-center bg-black/85 p-6 text-white"
          onClick={nextExercise}
        >
          <div className="max-w-xl text-center">
            <p className="mb-2 text-sm text-slate-200">Enter / Leertaste / Tap für nächste Übung</p>
            <p className="mb-3 text-sm text-slate-300">
              Runde {currentRound} von {totalRounds} - Übung {currentExerciseIndex + 1} von {activeExercises.length}
            </p>
            {currentExercise.picture ? (
              <img
                src={currentExercise.picture}
                alt={currentExercise.workoutName}
                className="mx-auto mb-4 max-h-72 w-full rounded-lg object-contain"
              />
            ) : null}
            <h2 className="mb-3 text-3xl font-bold">{currentExercise.workoutName}</h2>
            <p className="text-xl">
              {currentExercise.reps} ({currentExercise.repMode})
            </p>
          </div>
        </div>
      )}

      {!isWorkoutMode && activeSessionId && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-6">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <h3 className="mb-2 text-lg font-semibold">Wie war das Workout?</h3>
            <select
              value={ratingDifficulty}
              onChange={(event) => setRatingDifficulty(event.target.value as Difficulty)}
              className="mb-2 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="light">Leicht</option>
              <option value="medium">Mittel</option>
              <option value="hard">Schwierig</option>
            </select>
            <textarea
              value={ratingNote}
              onChange={(event) => setRatingNote(event.target.value)}
              placeholder="Optionales Feedback"
              className="mb-2 h-24 w-full rounded border border-slate-300 px-3 py-2"
            />
            <button className="w-full rounded bg-slate-900 px-3 py-2 text-white" onClick={saveRating}>
              Bewertung speichern
            </button>
          </div>
        </div>
      )}

      <section className="mx-auto mt-4 max-w-6xl rounded-xl bg-white p-4 shadow">
        <h3 className="mb-2 font-semibold">Workout-Verlauf</h3>
        {state.sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine abgeschlossenen Workouts.</p>
        ) : (
          <ul className="space-y-2">
            {state.sessions
              .filter((session) => session.endedAt)
              .map((session) => {
                const rating = state.ratings.find((entry) => entry.sessionId === session.id);
                return (
                  <li key={session.id} className="rounded border border-slate-200 p-2 text-sm">
                    {session.weekName} - {new Date(session.endedAt).toLocaleString("de-CH")} -{" "}
                    {rating ? difficultyLabels[rating.difficulty] : "Unbewertet"}
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}

function parseDocumentText(raw: string): ParsedExerciseDraft[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const drafts = lines
    .map((line) => {
      const parts = line.split(/[,;|-]/).map((segment) => segment.trim());
      if (parts.length < 2) return null;

      const workoutName = parts[0];
      const amount = Number(parts[1].replace(/[^\d]/g, "")) || 10;
      const modeRaw = parts[2]?.toLowerCase() ?? "";
      let repMode: RepMode = "count";
      if (modeRaw.includes("sec")) repMode = "time_seconds";
      if (modeRaw.includes("min")) repMode = "time_minutes";

      return { workoutName, reps: amount, repMode };
    })
    .filter((entry): entry is ParsedExerciseDraft => Boolean(entry));

  return drafts.slice(0, 30);
}

async function readUploadText(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();
  const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    lowerName.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (isPdf) {
    return readPdfText(file);
  }

  if (!isDocx) {
    return file.text().catch(() => "");
  }

  try {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("text");
    if (!documentXml) return "";
    return extractTextFromWordXml(documentXml);
  } catch {
    return "";
  }
}

function extractTextFromWordXml(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));

  const lines = paragraphs
    .map((paragraph) => {
      const textNodes = Array.from(paragraph.getElementsByTagName("w:t"));
      return textNodes.map((node) => node.textContent ?? "").join("").trim();
    })
    .filter(Boolean);

  return lines.join("\n");
}

async function readPdfText(file: File): Promise<string> {
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({
      data: buffer,
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise;

    const lines: string[] = [];

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();

      if (pageText) {
        lines.push(pageText);
      }
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}
