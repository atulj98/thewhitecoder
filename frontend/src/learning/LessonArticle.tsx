import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import type { ProgrammingLesson } from "./lessons";
import "./learning.css";

function InlineText({ text }: { text: string }) {
  return text
    .split(/(`[^`]+`)/g)
    .map((part, index) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : (
        part
      ),
    );
}

export default function LessonArticle({
  lesson,
  onVisualize,
}: {
  lesson: ProgrammingLesson;
  onVisualize: () => void;
}) {
  return (
    <article className="programming-article" aria-label={lesson.title}>
      <div className="lesson-eyebrow">
        <BookOpen size={15} /> THE IDEA / C++
      </div>
      <h3>{lesson.title}</h3>
      <p className="lesson-introduction">{lesson.introduction}</p>
      <div className="lesson-outcomes">
        <h4>By the end, you can…</h4>
        <ul>
          {lesson.outcomes.map((outcome) => (
            <li key={outcome}>{outcome}</li>
          ))}
        </ul>
      </div>
      <p className="lesson-reading-hint">
        Open a section to read its explanation and example. Take one idea at a
        time.
      </p>
      <div className="lesson-chapters">
        {lesson.sections.map((section, index) => (
          <details
            className="lesson-chapter"
            key={section.title}
            open={index === 0}
          >
            <summary>
              <span className="lesson-section-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4>{section.title}</h4>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className="lesson-chapter-body">
              {section.paragraphs.map((text) => (
                <p key={text}>
                  <InlineText text={text} />
                </p>
              ))}
              {section.code && (
                <pre className="lesson-code" aria-label="C++ example">
                  <code>{section.code}</code>
                </pre>
              )}
              {section.table && (
                <div className="lesson-table-scroll">
                  <table>
                    <caption className="sr-only">
                      {section.title} examples
                    </caption>
                    <thead>
                      <tr>
                        {section.table.headings.map((heading) => (
                          <th scope="col" key={heading}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>
                              <InlineText text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {section.takeaway && (
                <p className="lesson-takeaway">
                  <strong>Keep this idea:</strong> {section.takeaway}
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
      <section className="lesson-mistakes" aria-label="Common mistakes">
        <h4>Watch for these mistakes</h4>
        <ul>
          {lesson.mistakes.map((mistake) => (
            <li key={mistake}>{mistake}</li>
          ))}
        </ul>
      </section>
      <section
        className="lesson-exercises"
        aria-label="Check your understanding"
      >
        <span className="lesson-eyebrow">PAUSE & THINK</span>
        <h4>Check your understanding</h4>
        <p>
          Try each prompt before opening its explanation. These checks are for
          practice and do not change your question progress.
        </p>
        {lesson.exercises.map((exercise, index) => (
          <div className="lesson-exercise" key={exercise.prompt}>
            <p>
              <strong>{index + 1}.</strong> {exercise.prompt}
            </p>
            <details>
              <summary>
                Show explanation <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <p>{exercise.explanation}</p>
              {exercise.code && (
                <pre className="lesson-code">
                  <code>{exercise.code}</code>
                </pre>
              )}
            </details>
          </div>
        ))}
      </section>
      <div className="lesson-practice-advice">
        <h4>Connect this to the questions</h4>
        <p>{lesson.practiceAdvice}</p>
      </div>
      <section className="lesson-references" aria-label="Further reading">
        <h4>Further reading</h4>
        <ul>
          {lesson.references.map((reference) => (
            <li key={reference.url}>
              <a href={reference.url} target="_blank" rel="noopener noreferrer">
                {reference.title}{" "}
                <span className="sr-only">(opens in a new tab)</span>↗
              </a>
            </li>
          ))}
        </ul>
      </section>
      <div className="lesson-next">
        <p>Now make the idea move.</p>
        <button className="primary-button" onClick={onVisualize}>
          Explore the visual lab <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
