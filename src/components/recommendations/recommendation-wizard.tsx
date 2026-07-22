"use client";

import {
  ArrowRight,
  Bot,
  CalendarPlus,
  CalendarRange,
  Check,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  RecommendationAnswer,
  RecommendationQuestion,
  RecommendationSlotView,
  RecommendedTableView,
} from "@/domain/recommendation-contract";
import { cn } from "@/lib/utils";

type Phase =
  | "restoring"
  | "idle"
  | "search"
  | "searching"
  | "search-results"
  | "loading-questions"
  | "questions"
  | "building"
  | "results";

type QuestionResponse = {
  question: RecommendationQuestion;
  usedLlm: boolean;
  error?: string;
};

const QUESTION_COUNT = 4;

type RecommendationResponse = {
  profileSummary: string;
  usedLlm: boolean;
  slots: RecommendationSlotView[];
  error?: string;
};

type SearchResponse = {
  profileSummary: string;
  usedLlm: boolean;
  matches: RecommendedTableView[];
  error?: string;
};

type WorkspaceResponse = {
  plan: Omit<RecommendationResponse, "error"> | null;
  search: (Omit<SearchResponse, "error"> & { query: string }) | null;
  error?: string;
};

type WorkspaceConflictResponse = {
  error?: string;
  conflicts?: Array<{
    type: "overlap" | "duplicate-scenario" | "meal-break";
    tableIds: number[];
  }>;
};

type PendingAdd = {
  table: RecommendedTableView;
  message: string;
  conflictingIds: number[];
};

type ReplacementPickerState = {
  slotId: number;
  currentTitle: string;
  loading: boolean;
  alternatives: RecommendedTableView[];
  error?: string;
};

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Paris",
});

export function RecommendationWizard() {
  const [phase, setPhase] = useState<Phase>("restoring");
  const [questions, setQuestions] = useState<RecommendationQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [planSummary, setPlanSummary] = useState("");
  const [slots, setSlots] = useState<RecommendationSlotView[]>([]);
  const [planUsedLlm, setPlanUsedLlm] = useState(true);
  const questionnaireUsedLlm = useRef(true);
  const [freeText, setFreeText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<RecommendedTableView[]>(
    [],
  );
  const [searchSummary, setSearchSummary] = useState("");
  const [searchUsedLlm, setSearchUsedLlm] = useState(true);
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);
  const [replacementPicker, setReplacementPicker] =
    useState<ReplacementPickerState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyWorkspace = useCallback((data: WorkspaceResponse) => {
    if (data.plan) {
      setPlanSummary(data.plan.profileSummary);
      setPlanUsedLlm(data.plan.usedLlm);
      setSlots(data.plan.slots);
    } else {
      setPlanSummary("");
      setSlots([]);
    }
    if (data.search) {
      setSearchQuery(data.search.query);
      setSearchSummary(data.search.profileSummary);
      setSearchUsedLlm(data.search.usedLlm);
      setSearchMatches(data.search.matches);
    } else {
      setSearchSummary("");
      setSearchMatches([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/recommendation-workspace")
      .then(async (response) => {
        if (!response.ok) throw new Error("Chargement impossible");
        return (await response.json()) as WorkspaceResponse;
      })
      .then((data) => {
        if (cancelled) return;
        applyWorkspace(data);
        setPhase(
          data.plan ? "results" : data.search ? "search-results" : "idle",
        );
      })
      .catch(() => {
        if (!cancelled) setPhase("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [applyWorkspace]);

  async function start() {
    setPhase("loading-questions");
    setError(null);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "question",
          questions: [],
          answers: [],
        }),
      });
      if (!response.ok) {
        const failure = (await response.json()) as QuestionResponse;
        throw new Error(failure.error ?? "Impossible de démarrer.");
      }
      const data = (await response.json()) as QuestionResponse;
      setQuestions([data.question]);
      setQuestionIndex(0);
      questionnaireUsedLlm.current = data.usedLlm;
      setPhase("questions");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Impossible de démarrer.",
      );
      setPhase("idle");
    }
  }

  async function runSearch() {
    if (searchQuery.trim().length < 3) return;
    setPhase("searching");
    setError(null);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: searchQuery }),
      });
      if (!response.ok) {
        const failure = (await response.json()) as SearchResponse;
        throw new Error(failure.error ?? "Impossible de chercher les parties.");
      }
      const data = (await response.json()) as SearchResponse;
      setSearchSummary(data.profileSummary);
      setSearchMatches(data.matches);
      setSearchUsedLlm(data.usedLlm);
      setPhase("search-results");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de chercher les parties.",
      );
      setPhase("search");
    }
  }

  function toggleOption(question: RecommendationQuestion, optionId: string) {
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      if (!question.multiple) return { ...current, [question.id]: [optionId] };
      return {
        ...current,
        [question.id]: selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      };
    });
  }

  async function next() {
    const answeredQuestions = questions.slice(0, questionIndex + 1);
    const serializedAnswers = serializeAnswers(answeredQuestions, answers);

    if (questionIndex < QUESTION_COUNT - 1) {
      setPhase("loading-questions");
      setError(null);
      try {
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "question",
            questions: answeredQuestions,
            answers: serializedAnswers,
          }),
        });
        if (!response.ok) {
          const failure = (await response.json()) as QuestionResponse;
          throw new Error(failure.error ?? "Impossible de continuer.");
        }
        const data = (await response.json()) as QuestionResponse;
        setQuestions([...answeredQuestions, data.question]);
        setAnswers((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([questionId]) =>
              answeredQuestions.some(({ id }) => id === questionId),
            ),
          ),
        );
        questionnaireUsedLlm.current =
          questionnaireUsedLlm.current && data.usedLlm;
        setQuestionIndex((index) => index + 1);
        setPhase("questions");
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Impossible de continuer.",
        );
        setPhase("questions");
      }
      return;
    }
    setPhase("building");
    setError(null);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recommend",
          questions,
          answers: serializedAnswers,
          freeText: freeText.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const failure = (await response.json()) as RecommendationResponse;
        throw new Error(failure.error ?? "Impossible de créer le programme.");
      }
      const data = (await response.json()) as RecommendationResponse;
      setPlanSummary(data.profileSummary);
      setSlots(data.slots);
      setPlanUsedLlm(questionnaireUsedLlm.current && data.usedLlm);
      setPhase("results");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de créer le programme.",
      );
      setPhase("questions");
    }
  }

  function resetQuestionnaire() {
    setQuestions([]);
    setQuestionIndex(0);
    setAnswers({});
    questionnaireUsedLlm.current = true;
    setFreeText("");
    setPendingAdd(null);
    setError(null);
  }

  async function clearPart(part: "plan" | "search") {
    const response = await fetch("/api/recommendation-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: part === "plan" ? "clear-plan" : "clear-search",
      }),
    });
    if (!response.ok) {
      setError("Impossible d’effacer cette sélection.");
      return;
    }
    if (part === "plan") {
      setPlanSummary("");
      setSlots([]);
      setPlanUsedLlm(true);
      resetQuestionnaire();
      setPhase(searchMatches.length > 0 ? "search-results" : "idle");
    } else {
      setSearchQuery("");
      setSearchMatches([]);
      setSearchSummary("");
      setSearchUsedLlm(true);
      setPendingAdd(null);
      setPhase(slots.length > 0 ? "results" : "idle");
    }
  }

  async function mutatePlan(
    body: Record<string, string | number>,
    tableForConflict?: RecommendedTableView,
  ): Promise<boolean> {
    setError(null);
    const response = await fetch("/api/recommendation-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const conflict = (await response.json()) as WorkspaceConflictResponse;
      if (response.status === 409 && tableForConflict) {
        setPendingAdd({
          table: tableForConflict,
          message: conflict.error ?? "Cette table demande un remplacement.",
          conflictingIds: [
            ...new Set(
              (conflict.conflicts ?? []).flatMap(({ tableIds }) => tableIds),
            ),
          ],
        });
      } else {
        setError(conflict.error ?? "Impossible de modifier le planning.");
      }
      return false;
    }
    const data = (await response.json()) as WorkspaceResponse;
    applyWorkspace(data);
    setPendingAdd(null);
    return true;
  }

  async function addToPlan(
    table: RecommendedTableView,
    replaceTableId?: number,
  ) {
    const success = await mutatePlan(
      {
        action: "add",
        tableId: table.id,
        ...(replaceTableId ? { replaceTableId } : {}),
      },
      table,
    );
    if (success) setPhase("results");
  }

  async function openReplacementPicker(slotId: number) {
    const slot = slots.find((candidate) => candidate.slotId === slotId);
    if (!slot) return;
    setReplacementPicker({
      slotId,
      currentTitle: slot.selected.title,
      loading: true,
      alternatives: [],
    });
    try {
      const response = await fetch("/api/recommendation-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "alternatives", tableId: slotId }),
      });
      if (!response.ok) {
        const failure = (await response.json()) as { error?: string };
        throw new Error(
          failure.error ?? "Impossible de chercher des alternatives.",
        );
      }
      const data = (await response.json()) as {
        alternatives?: RecommendedTableView[];
      };
      setReplacementPicker({
        slotId,
        currentTitle: slot.selected.title,
        loading: false,
        alternatives: data.alternatives ?? [],
      });
    } catch (cause) {
      setReplacementPicker({
        slotId,
        currentTitle: slot.selected.title,
        loading: false,
        alternatives: [],
        error:
          cause instanceof Error
            ? cause.message
            : "Impossible de chercher des alternatives.",
      });
    }
  }

  async function chooseReplacement(replacementId: number) {
    if (!replacementPicker) return;
    const success = await mutatePlan({
      action: "replace",
      tableId: replacementPicker.slotId,
      replacementId,
    });
    if (success) setReplacementPicker(null);
  }

  async function removeFromPlan(tableId: number) {
    await mutatePlan({ action: "remove", tableId });
  }

  if (phase === "idle") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceCard
          icon={Search}
          title="Je cherche une partie précise"
          description="Décris un univers, un système, une ambiance ou une envie : on trouve les tables les plus proches."
          onClick={() => setPhase("search")}
        />
        <ChoiceCard
          icon={CalendarRange}
          title="J’ai besoin d’un planning"
          description="Réponds à quatre questions et obtiens un programme cohérent pour les trois jours."
          onClick={start}
        />
        {error && (
          <div className="sm:col-span-2">
            <ErrorMessage message={error} />
          </div>
        )}
      </div>
    );
  }

  if (phase === "restoring") {
    return <WorkspaceRestoringState />;
  }

  if (phase === "search") {
    return (
      <SearchForm
        query={searchQuery}
        error={error}
        onChange={setSearchQuery}
        onSubmit={runSearch}
        onBack={() => setPhase(slots.length > 0 ? "results" : "idle")}
      />
    );
  }

  if (phase === "searching") {
    return <SearchThinkingState />;
  }

  if (phase === "search-results") {
    return (
      <SearchResults
        query={searchQuery}
        profileSummary={searchSummary}
        matches={searchMatches}
        usedLlm={searchUsedLlm}
        planSlots={slots}
        pendingAdd={pendingAdd}
        onAdd={addToPlan}
        onCancelAdd={() => setPendingAdd(null)}
        onOpenPlan={() => setPhase("results")}
        onEdit={() => setPhase("search")}
        onRestart={() => clearPart("search")}
      />
    );
  }

  if (phase === "loading-questions" || phase === "building") {
    return (
      <ThinkingState
        building={phase === "building"}
        continuing={questions.length > 0}
      />
    );
  }

  if (phase === "results") {
    return (
      <Results
        profileSummary={planSummary}
        slots={slots}
        usedLlm={planUsedLlm}
        replacementPicker={replacementPicker}
        onReplace={openReplacementPicker}
        onChooseReplacement={chooseReplacement}
        onCloseReplacement={() => setReplacementPicker(null)}
        onRemove={removeFromPlan}
        onSearch={() =>
          setPhase(searchMatches.length > 0 ? "search-results" : "search")
        }
        onRestart={() => clearPart("plan")}
      />
    );
  }

  const currentQuestion = questions[questionIndex];
  const currentAnswer = answers[currentQuestion.id] ?? [];
  const currentAnswerSet = new Set(currentAnswer);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
      <Card className="min-h-[28rem]">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-4">
            <Badge variant="secondary">
              Question {questionIndex + 1} / {QUESTION_COUNT}
            </Badge>
            <div
              className="h-1.5 w-28 overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <div
                className="h-full origin-left rounded-full bg-primary transition-transform"
                style={{
                  transform: `scaleX(${(questionIndex + 1) / QUESTION_COUNT})`,
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-5 sm:px-7">
          <div className="flex gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-snug">
                {currentQuestion.prompt}
              </h2>
              {currentQuestion.hint && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentQuestion.hint}
                </p>
              )}
            </div>
          </div>

          <fieldset className="mt-7 grid gap-2.5" aria-label="Réponses">
            {currentQuestion.options.map((option) => {
              const selected = currentAnswerSet.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleOption(currentQuestion, option.id)}
                  className={cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-[border-color,background-color,transform] active:scale-[0.99]",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/40 hover:bg-muted/50",
                  )}
                >
                  {option.label}
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {selected && <Check className="size-3" aria-hidden />}
                  </span>
                </button>
              );
            })}
          </fieldset>

          {questionIndex === QUESTION_COUNT - 1 && (
            <div className="mt-6">
              <label
                htmlFor="recommendation-free-text"
                className="text-sm font-medium"
              >
                Une dernière envie à préciser ?
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Facultatif — une ambiance, une contrainte ou quelque chose que
                tu veux absolument découvrir ou éviter.
              </p>
              <Textarea
                id="recommendation-free-text"
                value={freeText}
                maxLength={500}
                rows={3}
                onChange={(event) => setFreeText(event.target.value)}
                placeholder="Ex. : j’aimerais une partie légère, avec beaucoup d’enquête et peu de combat…"
                className="mt-2 resize-none"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
                {freeText.length}/500
              </p>
            </div>
          )}

          {error && <ErrorMessage message={error} />}

          <div className="mt-auto flex items-center justify-between gap-3 pt-8">
            <Button
              variant="ghost"
              disabled={questionIndex === 0}
              onClick={() => setQuestionIndex((index) => index - 1)}
            >
              Retour
            </Button>
            <Button disabled={currentAnswer.length === 0} onClick={next}>
              {questionIndex === QUESTION_COUNT - 1
                ? "Créer mon week-end"
                : "Continuer"}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>

      <aside className="hidden rounded-2xl border border-border/80 bg-muted/25 p-4 lg:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tes réponses
        </p>
        <ol className="mt-3 space-y-3">
          {questions.slice(0, questionIndex).map((question) => (
            <li key={question.id} className="text-sm">
              <p className="line-clamp-2 text-muted-foreground">
                {question.prompt}
              </p>
              <p className="mt-0.5 font-medium">
                {answerLabels(question, answers[question.id] ?? []).join(", ")}
              </p>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="group text-left">
      <Card className="h-full border-primary/15 transition-[border-color,box-shadow,transform] group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
        <CardHeader>
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
          <CardTitle className="mt-2 text-xl">{title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto flex items-center gap-1 text-sm font-semibold text-primary">
          Choisir
          <ArrowRight className="size-4" aria-hidden />
        </CardContent>
      </Card>
    </button>
  );
}

function WorkspaceRestoringState() {
  return (
    <Card className="min-h-64 place-content-center text-center">
      <CardContent className="flex flex-col items-center py-10">
        <LoaderCircle
          className="size-6 animate-spin text-primary"
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted-foreground">
          On retrouve ta dernière sélection…
        </p>
      </CardContent>
    </Card>
  );
}

function SearchForm({
  query,
  error,
  onChange,
  onSubmit,
  onBack,
}: {
  query: string;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <CardHeader>
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Search className="size-5" aria-hidden />
          </span>
          <CardTitle className="mt-2 text-xl sm:text-2xl">
            Quelle partie cherches-tu ?
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-relaxed">
            Tu peux citer un jeu, un thème, une ambiance, un MJ ou simplement
            décrire l’expérience que tu aimerais vivre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label htmlFor="specific-table-search" className="sr-only">
            Description de la partie recherchée
          </label>
          <Textarea
            id="specific-table-search"
            value={query}
            maxLength={500}
            rows={5}
            autoFocus
            onChange={(event) => onChange(event.target.value)}
            placeholder="Ex. : une enquête horrifique accessible aux débutants, plutôt vendredi soir…"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>3 caractères minimum</span>
            <span className="tabular-nums">{query.length}/500</span>
          </div>
          {error && <ErrorMessage message={error} />}
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={onBack}>
              Retour
            </Button>
            <Button type="submit" disabled={query.trim().length < 3}>
              Rechercher
              <Search aria-hidden />
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function SearchThinkingState() {
  return (
    <Card className="min-h-80 place-content-center text-center">
      <CardContent className="flex flex-col items-center py-12">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LoaderCircle className="size-6 animate-spin" aria-hidden />
        </span>
        <h2 className="mt-5 text-xl font-semibold" aria-live="polite">
          On cherche dans toutes les tables…
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          L’assistant compare ta demande aux systèmes, descriptions, horaires et
          ambiances disponibles.
        </p>
      </CardContent>
    </Card>
  );
}

function SearchResults({
  query,
  profileSummary,
  matches,
  usedLlm,
  planSlots,
  pendingAdd,
  onAdd,
  onCancelAdd,
  onOpenPlan,
  onEdit,
  onRestart,
}: {
  query: string;
  profileSummary: string;
  matches: RecommendedTableView[];
  usedLlm: boolean;
  planSlots: RecommendationSlotView[];
  pendingAdd: PendingAdd | null;
  onAdd: (table: RecommendedTableView, replaceTableId?: number) => void;
  onCancelAdd: () => void;
  onOpenPlan: () => void;
  onEdit: () => void;
  onRestart: () => void;
}) {
  const conflictingIdSet = new Set(pendingAdd?.conflictingIds ?? []);
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/8 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Search className="size-4" aria-hidden />
              Les parties les plus proches
            </p>
            <p className="mt-2 text-sm text-muted-foreground">« {query} »</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
              {profileSummary}
            </p>
            {!usedLlm && (
              <p className="mt-2 text-xs text-muted-foreground">
                Gemini n’était pas disponible : les résultats ont été classés
                localement à partir des mots-clés.
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {planSlots.length > 0 && (
              <Button variant="outline" size="sm" onClick={onOpenPlan}>
                <CalendarRange aria-hidden />
                Mon planning ({planSlots.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>
              Modifier
            </Button>
            <Button variant="ghost" size="sm" onClick={onRestart}>
              <RotateCcw aria-hidden />
              Recommencer
            </Button>
          </div>
        </div>
      </div>

      {pendingAdd && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Un choix est nécessaire</CardTitle>
            <CardDescription>{pendingAdd.message}</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingAdd.conflictingIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {planSlots
                  .filter(({ selected }) => conflictingIdSet.has(selected.id))
                  .map(({ selected }) => (
                    <Button
                      key={selected.id}
                      size="sm"
                      onClick={() => onAdd(pendingAdd.table, selected.id)}
                    >
                      Remplacer « {selected.title} »
                    </Button>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cette table n’est plus disponible pour le moment.
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={onCancelAdd}
            >
              Annuler
            </Button>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune table disponible ne correspond à cette recherche.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((table) => (
            <SpecificTableCard
              key={table.id}
              table={table}
              isInPlan={planSlots.some(
                ({ selected }) => selected.id === table.id,
              )}
              onAdd={() => onAdd(table)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecificTableCard({
  table,
  isInPlan,
  onAdd,
}: {
  table: RecommendedTableView;
  isInPlan: boolean;
  onAdd: () => void;
}) {
  return (
    <Card className="gap-4 py-5 shadow-sm">
      <CardHeader className="px-5">
        <p className="text-xs font-semibold capitalize text-primary">
          {dayFormatter.format(new Date(table.start))} ·{" "}
          {formatTimeRange(table.start, table.end)}
        </p>
        <CardTitle className="mt-1 text-lg">
          <Link
            href={`/tables/${table.id}`}
            className="hover:text-primary hover:underline"
          >
            {table.title}
          </Link>
        </CardTitle>
        <CardDescription>
          {table.system} · MJ {table.gameMaster}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 px-5">
        <p className="rounded-lg bg-primary/7 px-3 py-2 text-sm leading-relaxed">
          <Sparkles
            className="mr-1.5 inline size-3.5 text-primary"
            aria-hidden
          />
          {table.reason}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {table.room}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {table.seatsLeft} place{table.seatsLeft > 1 ? "s" : ""}
          </span>
        </div>
        <Button
          type="button"
          variant={isInPlan ? "secondary" : "default"}
          size="sm"
          disabled={isInPlan}
          onClick={onAdd}
          className="w-full"
        >
          <CalendarPlus aria-hidden />
          {isInPlan ? "Déjà dans mon planning" : "Ajouter à mon planning"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ThinkingState({
  building,
  continuing,
}: {
  building: boolean;
  continuing: boolean;
}) {
  return (
    <Card className="min-h-80 place-content-center text-center">
      <CardContent className="flex flex-col items-center py-12">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LoaderCircle className="size-6 animate-spin" aria-hidden />
        </span>
        <h2 className="mt-5 text-xl font-semibold" aria-live="polite">
          {building
            ? "On assemble ton week-end…"
            : continuing
              ? "On affine la prochaine question…"
              : "On parcourt les parties…"}
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {building
            ? "Goûts, horaires, places disponibles : on cherche la meilleure combinaison."
            : continuing
              ? "Elle tient compte de tes réponses précédentes sans te faire répéter."
              : "L’assistant repère les univers et styles réellement proposés cette année."}
        </p>
      </CardContent>
    </Card>
  );
}

function Results({
  profileSummary,
  slots,
  usedLlm,
  replacementPicker,
  onReplace,
  onChooseReplacement,
  onCloseReplacement,
  onRemove,
  onSearch,
  onRestart,
}: {
  profileSummary: string;
  slots: RecommendationSlotView[];
  usedLlm: boolean;
  replacementPicker: ReplacementPickerState | null;
  onReplace: (slotId: number) => void | Promise<void>;
  onChooseReplacement: (tableId: number) => void | Promise<void>;
  onCloseReplacement: () => void;
  onRemove: (tableId: number) => void | Promise<void>;
  onSearch: () => void;
  onRestart: () => void;
}) {
  const days = useMemo(() => groupSlotsByDay(slots), [slots]);
  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-primary/20 bg-primary/8 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="size-4" aria-hidden />
              Ta sélection personnalisée
            </p>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed sm:text-base">
              {profileSummary}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Le programme réserve au moins une heure pour déjeuner et dîner.
            </p>
            {!usedLlm && (
              <p className="mt-2 text-xs text-muted-foreground">
                Mode local utilisé : Gemini n’était pas disponible, mais le
                planning reste cohérent et modifiable.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onSearch}>
              <Search aria-hidden />
              Chercher une table
            </Button>
            <Button variant="ghost" size="sm" onClick={onRestart}>
              <RotateCcw aria-hidden />
              Recommencer
            </Button>
          </div>
        </div>
      </div>

      {replacementPicker && (
        <ReplacementPicker
          state={replacementPicker}
          onChoose={onChooseReplacement}
          onClose={onCloseReplacement}
        />
      )}

      {slots.length > 0 && <RegistrationPanel slots={slots} />}

      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune partie disponible ne permet de composer ce planning pour le
            moment.
          </CardContent>
        </Card>
      ) : (
        days.map(({ key, label, slots: daySlots }) => (
          <section key={key} aria-labelledby={`recommendation-day-${key}`}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Ton programme
                </p>
                <h2
                  id={`recommendation-day-${key}`}
                  className="mt-0.5 text-xl font-semibold capitalize"
                >
                  {label}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {daySlots.length} partie{daySlots.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              {dayAgenda(daySlots).map((item) =>
                item.kind === "table" ? (
                  <RecommendationCard
                    key={item.slot.slotId}
                    slot={item.slot}
                    onReplace={() => onReplace(item.slot.slotId)}
                    onRemove={() => onRemove(item.slot.selected.id)}
                  />
                ) : (
                  <MealBreakCard key={item.kind} item={item} />
                ),
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function ReplacementPicker({
  state,
  onChoose,
  onClose,
}: {
  state: ReplacementPickerState;
  onChoose: (tableId: number) => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <Card className="border-primary/30">
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Remplacer « {state.currentTitle} »</CardTitle>
          <CardDescription className="mt-1">
            Ces tables restent compatibles avec le reste du planning, pauses
            repas comprises.
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fermer
        </Button>
      </CardHeader>
      <CardContent>
        {state.loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Recherche des meilleures alternatives…
          </p>
        ) : state.error ? (
          <ErrorMessage message={state.error} />
        ) : state.alternatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune autre table disponible ne peut remplacer celle-ci sans créer
            de conflit. Tu peux retirer une partie ou chercher une table avec
            d’autres horaires.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {state.alternatives.map((table) => (
              <div
                key={table.id}
                className="rounded-xl border bg-card p-4 text-sm"
              >
                <p className="text-xs font-semibold text-primary">
                  {dayFormatter.format(new Date(table.start))} ·{" "}
                  {formatTimeRange(table.start, table.end)}
                </p>
                <Link
                  href={`/tables/${table.id}`}
                  className="mt-1 block font-semibold hover:text-primary hover:underline"
                >
                  {table.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {table.system} · MJ {table.gameMaster}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{table.reason}</p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => onChoose(table.id)}
                >
                  Choisir cette table
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type RegistrationResult = {
  tableId: number;
  status: "registered" | "already-registered" | "failed";
  message?: string;
};

function RegistrationPanel({ slots }: { slots: RecommendationSlotView[] }) {
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RegistrationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function registerAll() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/recommendation-workspace/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) {
        const failure = (await response.json()) as { error?: string };
        throw new Error(
          failure.error ?? "Impossible de confirmer les inscriptions.",
        );
      }
      const data = (await response.json()) as {
        results?: RegistrationResult[];
      };
      setResults(data.results ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de confirmer les inscriptions.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!reviewing) {
    return (
      <Button size="lg" className="w-full" onClick={() => setReviewing(true)}>
        <CheckCircle2 aria-hidden />
        Vérifier et confirmer mes inscriptions
      </Button>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Confirmer les inscriptions</CardTitle>
        <CardDescription>
          Les places et tes inscriptions existantes seront vérifiées une
          dernière fois. Une réussite peut être partielle si une table se
          remplit pendant l’opération.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-xl border">
          {slots.map(({ selected }) => {
            const result = results.find(
              ({ tableId }) => tableId === selected.id,
            );
            return (
              <li
                key={selected.id}
                className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <Link
                    href={`/tables/${selected.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {selected.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dayFormatter.format(new Date(selected.start))} ·{" "}
                    {formatTimeRange(selected.start, selected.end)}
                  </p>
                  {result?.message && (
                    <p className="mt-1 text-xs text-destructive">
                      {result.message}
                    </p>
                  )}
                </div>
                {result && (
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 text-xs font-medium",
                      result.status === "failed"
                        ? "text-destructive"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {result.status === "failed" ? (
                      <CircleAlert className="size-3.5" aria-hidden />
                    ) : (
                      <CheckCircle2 className="size-3.5" aria-hidden />
                    )}
                    {result.status === "registered"
                      ? "Inscrit·e"
                      : result.status === "already-registered"
                        ? "Déjà inscrit·e"
                        : "Échec"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {error && <ErrorMessage message={error} />}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            disabled={loading}
            onClick={() => setReviewing(false)}
          >
            Fermer
          </Button>
          <Button disabled={loading} onClick={registerAll}>
            {loading && <LoaderCircle className="animate-spin" aria-hidden />}
            Confirmer {slots.length} inscription
            {slots.length > 1 ? "s" : ""}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type MealBreakItem = {
  kind: "lunch" | "dinner";
  label: string;
  startMinute: number;
  endMinute: number;
};

function MealBreakCard({ item }: { item: MealBreakItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background text-primary">
        <Utensils className="size-4" aria-hidden />
      </span>
      <div>
        <p className="font-medium">Pause {item.label}</p>
        <p className="text-xs text-muted-foreground">
          {formatMinute(item.startMinute)}–{formatMinute(item.endMinute)} · 1 h
        </p>
      </div>
    </div>
  );
}

function RecommendationCard({
  slot,
  onReplace,
  onRemove,
}: {
  slot: RecommendationSlotView;
  onReplace: () => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const table = slot.selected;
  return (
    <Card className="gap-4 py-4 shadow-sm sm:py-5">
      <CardHeader className="gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">
            {formatTimeRange(table.start, table.end)} · {table.room}
          </p>
          <CardTitle className="mt-1 text-lg sm:text-xl">
            <Link
              href={`/tables/${table.id}`}
              className="hover:text-primary hover:underline"
            >
              {table.title}
            </Link>
          </CardTitle>
          <CardDescription className="mt-1">
            {table.system} · MJ {table.gameMaster}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReplace}
            className="w-fit"
          >
            <RefreshCw aria-hidden />
            Changer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Retirer ${table.title} du planning`}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:px-5">
        <p className="rounded-lg bg-primary/7 px-3 py-2 text-sm leading-relaxed">
          <Sparkles
            className="mr-1.5 inline size-3.5 text-primary"
            aria-hidden
          />
          {table.reason}
        </p>
        {table.description && (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {table.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {table.location}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {table.seatsLeft} place{table.seatsLeft > 1 ? "s" : ""} publique
            {table.seatsLeft > 1 ? "s" : ""}
          </span>
        </div>
        {table.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {table.labels.slice(0, 5).map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

function answerLabels(question: RecommendationQuestion, selectedIds: string[]) {
  const selected = new Set(selectedIds);
  return question.options
    .filter(({ id }) => selected.has(id))
    .map(({ label }) => label);
}

function serializeAnswers(
  questions: RecommendationQuestion[],
  answers: Record<string, string[]>,
): RecommendationAnswer[] {
  return questions.map((question) => ({
    questionId: question.id,
    optionIds: answers[question.id] ?? [],
  }));
}

function dayAgenda(daySlots: RecommendationSlotView[]) {
  const selectedTables = daySlots.map(({ selected }) => selected);
  const tables = daySlots.map((slot) => ({
    kind: "table" as const,
    startMinute: localMinute(new Date(slot.selected.start)),
    slot,
  }));
  const meals = [
    findMealBreak(selectedTables, "lunch", "déjeuner", 11 * 60, 15 * 60),
    findMealBreak(selectedTables, "dinner", "dîner", 17 * 60, 22 * 60),
  ].filter((item): item is MealBreakItem => item !== null);
  return [...tables, ...meals].toSorted(
    (left, right) => left.startMinute - right.startMinute,
  );
}

function findMealBreak(
  tables: RecommendedTableView[],
  kind: MealBreakItem["kind"],
  label: string,
  windowStart: number,
  windowEnd: number,
): MealBreakItem | null {
  const day = eventDayKey(tables[0].start);
  const busy = tables
    .map((table) => ({
      start:
        eventDayKey(table.start) === day
          ? localMinute(new Date(table.start))
          : 0,
      end:
        eventDayKey(table.end) === day
          ? localMinute(new Date(table.end))
          : 24 * 60,
    }))
    .map(({ start, end }) => ({
      start: Math.max(start, windowStart),
      end: Math.min(end, windowEnd),
    }))
    .filter(({ start, end }) => start < end)
    .toSorted((left, right) => left.start - right.start);

  let cursor = windowStart;
  for (const interval of busy) {
    if (interval.start - cursor >= 60) {
      return { kind, label, startMinute: cursor, endMinute: cursor + 60 };
    }
    cursor = Math.max(cursor, interval.end);
  }
  return windowEnd - cursor >= 60
    ? { kind, label, startMinute: cursor, endMinute: cursor + 60 }
    : null;
}

function localMinute(date: Date) {
  const parts = timeFormatter.formatToParts(date);
  const hour = Number(parts.find(({ type }) => type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find(({ type }) => type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

function formatMinute(value: number) {
  const hour = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minute = (value % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function eventDayKey(value: string) {
  return new Date(value).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Paris",
  });
}

function groupSlotsByDay(slots: RecommendationSlotView[]) {
  const groups = new Map<string, RecommendationSlotView[]>();
  for (const slot of slots) {
    const key = eventDayKey(slot.selected.start);
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  return [...groups.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, daySlots]) => ({
      key,
      label: dayFormatter.format(new Date(daySlots[0].selected.start)),
      slots: daySlots.toSorted(
        (left, right) =>
          new Date(left.selected.start).getTime() -
          new Date(right.selected.start).getTime(),
      ),
    }));
}

function formatTimeRange(start: string, end: string) {
  return `${timeFormatter.format(new Date(start))}–${timeFormatter.format(new Date(end))}`;
}
