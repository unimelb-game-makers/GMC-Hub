"use client";

import { useId, useState } from "react";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

interface QuestionState {
  title: string;
  description: string;
  options: string[];
}

const EMPTY_QUESTION: QuestionState = { title: "", description: "", options: ["", ""] };

// Serialises to a hidden "structure" JSON field on submit: a plain
// FormData naming scheme can't express a variable number of questions each
// with a variable number of options, so this is the one form in the app
// that hands the server a JSON blob instead of flat fields (see
// parseStructure in app/voting/elections/actions.ts).
export function ElectionQuestionsInput() {
  const [questions, setQuestions] = useState<QuestionState[]>([{ ...EMPTY_QUESTION }]);
  const formId = useId();

  const updateQuestion = (i: number, patch: Partial<QuestionState>) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };
  const addQuestion = () => setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }]);
  const removeQuestion = (i: number) =>
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q
      )
    );
  };
  const addOption = (qi: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qi ? { ...q, options: [...q.options, ""] } : q))
    );
  };
  const removeOption = (qi: number, oi: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q
      )
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="structure" value={JSON.stringify(questions)} />
      {questions.map((q, qi) => (
        <div
          key={`${formId}-${qi}`}
          className="flex flex-col gap-2 rounded-md border border-line bg-bg p-3"
        >
          <div className="flex items-start gap-2">
            <input
              placeholder={`Question ${qi + 1}, e.g. President`}
              value={q.title}
              onChange={(e) => updateQuestion(qi, { title: e.target.value })}
              className={`${inputClass} flex-1`}
            />
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => removeQuestion(qi)}
                aria-label={`Remove question ${qi + 1}`}
                className="flex-none rounded-md border border-line px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-surface hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>
          <input
            placeholder="Description (optional)"
            value={q.description}
            onChange={(e) => updateQuestion(qi, { description: e.target.value })}
            className={inputClass}
          />

          <div className="flex flex-col gap-1 pl-3 text-sm">
            <span className="text-xs font-medium text-ink-soft">Candidates / options</span>
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex gap-2">
                <input
                  placeholder={`Option ${oi + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(qi, oi)}
                    aria-label={`Remove option ${oi + 1}`}
                    className="flex-none rounded-md border border-line px-3 text-sm text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(qi)}
              className="mt-1 self-start text-xs font-medium text-accent underline-offset-2 hover:underline"
            >
              + Add option
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addQuestion}
        className="self-start text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        + Add question
      </button>
    </div>
  );
}
