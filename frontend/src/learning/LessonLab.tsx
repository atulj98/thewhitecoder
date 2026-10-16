import { useEffect, useId, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type { ProgrammingLesson } from "./lessons";
import {
  buildTrace,
  initialLabSettings,
  labScenes,
  type GuidedTrace,
  type LabSettings,
} from "./traces";
import "./learning.css";

export function TracePlayer({ trace }: { trace: GuidedTrace }) {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = trace.frames.length - 1;
  const active = trace.frames[position];
  const isPlaying = playing && position < last;
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(
      () => setPosition((index) => Math.min(last, index + 1)),
      1100,
    );
    return () => window.clearTimeout(timer);
  }, [isPlaying, position, last]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  function move(delta: number) {
    setPlaying(false);
    setPosition((index) => Math.max(0, Math.min(last, index + delta)));
  }
  return (
    <div className="lesson-trace-player">
      <div className="lesson-playback" aria-label="Visualization playback">
        <button
          className="lesson-button"
          onClick={() => {
            if (position === last) setPosition(0);
            setPlaying(!isPlaying);
          }}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isPlaying ? "Pause" : position === last ? "Replay" : "Play"}
        </button>
        <button
          className="lesson-button"
          aria-label="Previous step"
          disabled={position === 0}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <button
          className="lesson-button"
          aria-label="Next step"
          disabled={position === last}
          onClick={() => move(1)}
        >
          Next <ChevronRight size={16} />
        </button>
        <button
          className="lesson-button lesson-reset"
          onClick={() => {
            setPlaying(false);
            setPosition(0);
          }}
        >
          <RotateCcw size={14} /> Reset
        </button>
        <span className="lesson-step-count">
          Step {position + 1} of {trace.frames.length}
        </span>
      </div>
      <progress
        aria-label="Visualization progress"
        value={position}
        max={last || 1}
      />
      <div className="lesson-trace-layout">
        <div className="lesson-source">
          <span className="lesson-eyebrow">C++ / GUIDED EXCERPT</span>
          <pre className="lesson-trace-code">
            <code>
              {trace.code.map((line, index) => (
                <span
                  className={active.line === index ? "is-current" : ""}
                  key={index}
                  aria-current={active.line === index ? "step" : undefined}
                >
                  <span className="lesson-line-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{line || " "}</span>
                </span>
              ))}
            </code>
          </pre>
        </div>
        <div className="lesson-state" aria-label="Current program state">
          <span className="lesson-eyebrow">WATCH THE STATE</span>
          <dl className="lesson-variables">
            {Object.entries(active.variables).map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
          {active.groups?.map((group) => (
            <div className="lesson-memory-group" key={group.label}>
              <span>{group.label}</span>
              <div
                className="lesson-cells"
                role="list"
                aria-label={group.label}
              >
                {group.values.length ? (
                  group.values.map((value, index) => (
                    <div
                      className={
                        index === group.active
                          ? "lesson-cell is-current"
                          : "lesson-cell"
                      }
                      key={index}
                      role="listitem"
                      aria-label={`${group.label} index ${index}: ${value}`}
                    >
                      <small>index {index}</small>
                      <strong>{value}</strong>
                    </div>
                  ))
                ) : (
                  <p className="lesson-empty-string">
                    Empty string · no character elements
                  </p>
                )}
              </div>
            </div>
          ))}
          {active.relation && (
            <p className="lesson-relation">{active.relation}</p>
          )}
          {active.bars && (
            <div
              className="lesson-operation-bars"
              role="img"
              aria-label={active.bars
                .map((bar) => `${bar.label}: ${bar.value}`)
                .join("; ")}
            >
              {active.bars.map((bar) => (
                <div key={bar.label}>
                  <div className="lesson-bar-label">
                    <span>{bar.label}</span>
                    <strong>{bar.value}</strong>
                  </div>
                  <div className="lesson-bar-track">
                    <div
                      style={{
                        width: `${(100 * bar.value) / Math.max(...active.bars!.map((item) => item.value), 1)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {active.output !== undefined && (
            <div className="lesson-output">
              <span>Output / result</span>
              <pre>{active.output === "" ? "(empty)" : active.output}</pre>
            </div>
          )}
        </div>
      </div>
      <p
        className={`lesson-trace-message ${active.blocked ? "is-blocked" : ""}`}
        role="status"
        aria-live={isPlaying ? "off" : "polite"}
        aria-atomic="true"
      >
        <strong>{active.blocked ? "Boundary caught. " : ""}</strong>
        {active.message}
      </p>
    </div>
  );
}

export default function LessonLab({
  lesson,
  onPractice,
}: {
  lesson: ProgrammingLesson;
  onPractice: () => void;
}) {
  const scenes = labScenes[lesson.id];
  const [sceneId, setSceneId] = useState(scenes[0].id);
  const [settings, setSettings] = useState<LabSettings>(initialLabSettings);
  const id = useId();
  const scene = scenes.find((item) => item.id === sceneId)!;
  const trace = buildTrace(scene.id, settings);
  function update(change: Partial<LabSettings>) {
    setSettings((current) => ({ ...current, ...change }));
  }
  return (
    <section className="lesson-lab" aria-label="Interactive visualization lab">
      <span className="lesson-eyebrow">EXPLORE / STEP BY STEP</span>
      <div
        className="lesson-scenes"
        role="group"
        aria-label="Visualization examples"
      >
        {scenes.map((item) => (
          <button
            className="lesson-button"
            key={item.id}
            aria-pressed={scene.id === item.id}
            onClick={() => {
              setSceneId(item.id);
              setSettings(initialLabSettings);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <h3>{scene.title}</h3>
      <p className="lesson-introduction">{scene.description}</p>
      <div className="lesson-inputs">
        {scene.numberRange && (
          <label htmlFor={`${id}-number`}>
            <span>
              {scene.id === "loop" || scene.id === "growth"
                ? "n"
                : "Input value"}{" "}
              <strong>{settings.number}</strong>
            </span>
            <input
              id={`${id}-number`}
              type="range"
              min={scene.numberRange[0]}
              max={scene.numberRange[1]}
              step="1"
              value={settings.number}
              onChange={(event) =>
                update({ number: Number(event.target.value) })
              }
            />
          </label>
        )}
        {scene.id === "array" && (
          <>
            <label htmlFor={`${id}-index`}>
              <span>Element index</span>
              <select
                id={`${id}-index`}
                value={settings.index}
                onChange={(event) =>
                  update({ index: Number(event.target.value) })
                }
              >
                {[0, 1, 2, 3, 4].map((index) => (
                  <option key={index} value={index}>
                    {index}
                    {index === 4 ? " · outside the array" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${id}-replacement`}>
              <span>
                New value <strong>{settings.replacement}</strong>
              </span>
              <input
                id={`${id}-replacement`}
                type="range"
                min="0"
                max="99"
                value={settings.replacement}
                onChange={(event) =>
                  update({ replacement: Number(event.target.value) })
                }
              />
            </label>
          </>
        )}
        {scene.id === "string" && (
          <label htmlFor={`${id}-word`}>
            <span>Word to traverse</span>
            <select
              id={`${id}-word`}
              value={settings.word}
              onChange={(event) => update({ word: event.target.value })}
            >
              <option value="CODE">CODE</option>
              <option value="DSA">DSA</option>
              <option value="A">A</option>
              <option value="">Empty string</option>
            </select>
          </label>
        )}
        {scene.id === "boundary" && (
          <label className="lesson-correction">
            <input
              type="checkbox"
              checked={settings.corrected}
              onChange={(event) => update({ corrected: event.target.checked })}
            />{" "}
            Use the corrected condition: i &lt; size
          </label>
        )}
      </div>
      <TracePlayer key={JSON.stringify([scene.id, settings])} trace={trace} />
      <p className="lesson-lab-hint">
        Predict the next state, then press Next. Changing an input starts a
        fresh trace. Playback starts only when you press Play. Code excerpts
        focus on the current idea; complete examples are in Learn.
      </p>
      <div className="lesson-next">
        <p>Ready to apply the idea?</p>
        <button className="primary-button" onClick={onPractice}>
          Go to practice <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
