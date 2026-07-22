"use client";

import {
  ArrowRight,
  Bot,
  CalendarRange,
  Check,
  LoaderCircle,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { type ComponentType, useEffect, useMemo, useState } from "react";
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
const SEARCH_STATE_KEY = "rpgers:specific-search";
const SEARCH_STATE_TTL_MS = 6 * 60 * 60_000;

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

type StoredSearchState = Omit<SearchResponse, "error"> & {
  query: string;
  savedAt: number;
};

function saveSearchState(state: Omit<StoredSearchState, "savedAt">): void {
  try {
    sessionStorage.setItem(
      SEARCH_STATE_KEY,
      JSON.stringify({ ...state, savedAt: Date.now() }),
    );
  } catch {
    // Le stockage peut être désactivé : la recherche continue normalement.
  }
}

function loadSearchState(): StoredSearchState | null {
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredSearchState>;
    const savedAt = value.savedAt;
    if (typeof savedAt !== "number") {
      clearSearchState();
      return null;
    }
    const isValid =
      typeof value.query === "string" &&
      typeof value.profileSummary === "string" &&
      typeof value.usedLlm === "boolean" &&
      Array.isArray(value.matches) &&
      value.matches.every(
        (table) =>
          typeof table === "object" &&
          table !== null &&
          typeof table.id === "number" &&
          typeof table.title === "string",
      );
    if (!isValid || Date.now() - savedAt > SEARCH_STATE_TTL_MS) {
      clearSearchState();
      return null;
    }
    return value as StoredSearchState;
  } catch {
    clearSearchState();
    return null;
  }
}

function clearSearchState(): void {
  try {
    sessionStorage.removeItem(SEARCH_STATE_KEY);
  } catch {
    // Aucun nettoyage possible si le stockage est désactivé.
  }
}

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<RecommendationQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [profileSummary, setProfileSummary] = useState("");
  const [slots, setSlots] = useState<RecommendationSlotView[]>([]);
  const [usedLlm, setUsedLlm] = useState(true);
  const [freeText, setFreeText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<RecommendedTableView[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadSearchState();
    if (!stored) return;
    setSearchQuery(stored.query);
    setProfileSummary(stored.profileSummary);
    setSearchMatches(stored.matches);
    setUsedLlm(stored.usedLlm);
    setPhase("search-results");
  }, []);

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
      const data = (await response.json()) as QuestionResponse;
      if (!response.ok)
        throw new Error(data.error ?? "Impossible de démarrer.");
      setQuestions([data.question]);
      setQuestionIndex(0);
      setUsedLlm(data.usedLlm);
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
      const data = (await response.json()) as SearchResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de chercher les parties.");
      }
      setProfileSummary(data.profileSummary);
      setSearchMatches(data.matches);
      setUsedLlm(data.usedLlm);
      saveSearchState({
        query: searchQuery.trim(),
        profileSummary: data.profileSummary,
        matches: data.matches,
        usedLlm: data.usedLlm,
      });
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
        const data = (await response.json()) as QuestionResponse;
        if (!response.ok) {
          throw new Error(data.error ?? "Impossible de continuer.");
        }
        setQuestions([...answeredQuestions, data.question]);
        setAnswers((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([questionId]) =>
              answeredQuestions.some(({ id }) => id === questionId),
            ),
          ),
        );
        setUsedLlm((current) => current && data.usedLlm);
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
      const data = (await response.json()) as RecommendationResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de créer le programme.");
      }
      setProfileSummary(data.profileSummary);
      setSlots(data.slots);
      setUsedLlm((current) => current && data.usedLlm);
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

  function restart() {
    clearSearchState();
    setPhase("idle");
    setQuestions([]);
    setQuestionIndex(0);
    setAnswers({});
    setProfileSummary("");
    setSlots([]);
    setUsedLlm(true);
    setFreeText("");
    setSearchQuery("");
    setSearchMatches([]);
    setError(null);
  }

  function replace(slotId: number) {
    setSlots((currentSlots) => {
      const slot = currentSlots.find(
        (candidate) => candidate.slotId === slotId,
      );
      if (!slot) return currentSlots;
      const usedIds = new Set(
        currentSlots
          .filter((candidate) => candidate.slotId !== slotId)
          .map(({ selected }) => selected.id),
      );
      const otherTables = currentSlots
        .filter((candidate) => candidate.slotId !== slotId)
        .map(({ selected }) => selected);
      const nextChoice = slot.alternatives.find(
        (candidate) =>
          !usedIds.has(candidate.id) &&
          otherTables.every((other) => !overlaps(candidate, other)) &&
          keepsMealBreaks([...otherTables, candidate]),
      );
      if (!nextChoice) return currentSlots;
      return currentSlots.map((candidate) =>
        candidate.slotId === slotId
          ? {
              ...candidate,
              selected: nextChoice,
              alternatives: [
                slot.selected,
                ...slot.alternatives.filter(({ id }) => id !== nextChoice.id),
              ],
            }
          : candidate,
      );
    });
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

  if (phase === "search") {
    return (
      <SearchForm
        query={searchQuery}
        error={error}
        onChange={setSearchQuery}
        onSubmit={runSearch}
        onBack={restart}
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
        profileSummary={profileSummary}
        matches={searchMatches}
        usedLlm={usedLlm}
        onEdit={() => {
          clearSearchState();
          setPhase("search");
        }}
        onRestart={restart}
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
        profileSummary={profileSummary}
        slots={slots}
        usedLlm={usedLlm}
        onReplace={replace}
        onRestart={restart}
      />
    );
  }

  const currentQuestion = questions[questionIndex];
  const currentAnswer = answers[currentQuestion.id] ?? [];

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
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${((questionIndex + 1) / QUESTION_COUNT) * 100}%`,
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
              const selected = currentAnswer.includes(option.id);
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
  onEdit,
  onRestart,
}: {
  query: string;
  profileSummary: string;
  matches: RecommendedTableView[];
  usedLlm: boolean;
  onEdit: () => void;
  onRestart: () => void;
}) {
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

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune table disponible ne correspond à cette recherche.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((table) => (
            <SpecificTableCard key={table.id} table={table} />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecificTableCard({ table }: { table: RecommendedTableView }) {
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
  onReplace,
  onRestart,
}: {
  profileSummary: string;
  slots: RecommendationSlotView[];
  usedLlm: boolean;
  onReplace: (slotId: number) => void;
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
          <Button variant="outline" size="sm" onClick={onRestart}>
            <RotateCcw aria-hidden />
            Recommencer
          </Button>
        </div>
      </div>

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
}: {
  slot: RecommendationSlotView;
  onReplace: () => void;
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={slot.alternatives.length === 0}
          onClick={onReplace}
          className="w-fit"
        >
          <RefreshCw aria-hidden />
          Changer
        </Button>
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

function keepsMealBreaks(tables: RecommendedTableView[]) {
  const byDay = Map.groupBy(tables, ({ start }) => eventDayKey(start));
  return [...byDay.values()].every(
    (dayTables) =>
      findMealBreak(dayTables, "lunch", "déjeuner", 11 * 60, 15 * 60) !==
        null &&
      findMealBreak(dayTables, "dinner", "dîner", 17 * 60, 22 * 60) !== null,
  );
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

function overlaps(left: RecommendedTableView, right: RecommendedTableView) {
  return (
    new Date(left.start) < new Date(right.end) &&
    new Date(right.start) < new Date(left.end)
  );
}
