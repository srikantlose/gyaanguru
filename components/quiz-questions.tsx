"use client"

import { cn } from "@/lib/utils"

export type QuizQuestionView = { question: string; options: string[] }
export type QuizResultView = { correctAnswer: number; explanation?: string }

type Props = {
  questions: QuizQuestionView[]
  selected: Record<number, number>
  onSelect: (questionIndex: number, optionIndex: number) => void
  /** Set after submitting: colours right and wrong picks and shows explanations. */
  results?: QuizResultView[] | null
  disabled?: boolean
  /** Number shown for the first question (e.g. continuing a list across sections). */
  startAt?: number
}

/** Multiple-choice question list shared by lesson quizzes and the placement test. */
export function QuizQuestions({ questions, selected, onSelect, results = null, disabled = false, startAt = 0 }: Props) {
  const submitted = Boolean(results)
  return (
    <>
      {questions.map((question, i) => {
        const qIndex = startAt + i
        const result = results?.[qIndex]
        return (
          <div key={qIndex} className="space-y-3" data-quiz-question={qIndex}>
            <h3 id={`quiz-q-${qIndex}`} className="font-semibold">
              {qIndex + 1}. {question.question}
            </h3>
            <div role="radiogroup" aria-labelledby={`quiz-q-${qIndex}`} className="space-y-2">
              {question.options.map((option, oIndex) => {
                const isSelected = selected[qIndex] === oIndex
                const isCorrect = result?.correctAnswer === oIndex
                return (
                  <button
                    key={oIndex}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelect(qIndex, oIndex)}
                    disabled={submitted || disabled}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                      !submitted && "hover:bg-muted/50",
                      isSelected && !submitted && "border-primary bg-primary/5",
                      submitted && isCorrect && "border-leaf bg-leaf-soft",
                      submitted && isSelected && !isCorrect && "border-coral bg-coral-soft",
                      submitted && "cursor-default",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                        isSelected && !submitted && "border-primary bg-primary",
                        submitted && isCorrect && "border-leaf bg-leaf",
                        submitted && isSelected && !isCorrect && "border-coral bg-coral",
                      )}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white"></div>}
                    </div>
                    <span className="flex-1">{option}</span>
                  </button>
                )
              })}
            </div>
            {result?.explanation && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="mb-1 font-semibold">Explanation:</p>
                <p className="text-muted-foreground">{result.explanation}</p>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
