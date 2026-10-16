# Basic programming lessons

The four existing DSA Step 1 subtopics now provide public Learn, Visualize,
and Practice views. New topic visits default to Learn. A bookmarked question
opens Practice; explicit `view=learn`, `view=visualize`, and `view=practice`
values support sharing and browser history. Search remains global from every
view, and the question's Content → Learn action opens its matching article.

Articles contain original explanations, C++ examples, common mistakes,
optional exercise explanations, and primary-source further reading. Each
subtopic has three guided visualization scenes. Playback starts paused and
supports previous/next steps, play/pause, replay, and reset. Changing an input
resets the trace; leaving a visualization cancels playback. Native buttons,
labels, disclosures, text alternatives, and theme tokens support keyboard
access, reduced motion, and the existing light/dark themes.

## Source organization

- `frontend/src/learning/lessons.ts`: typed article content and mapping by
  sheet, step, and topic stable keys.
- `frontend/src/learning/traces.ts`: deterministic C++ teaching traces and
  bounded example inputs. These are simulations of supplied examples, not an
  arbitrary-code execution service.
- `LessonArticle.tsx`, `LessonLab.tsx`, and `learning.css`: article, playback,
  visualization, and responsive presentation.
- `frontend/tests/learning.test.tsx`: mathematical and boundary checks,
  playback lifecycle, published-topic coverage, navigation, guest access,
  search, direct question links, and draft preservation across views.

The catalog manifest, stable question identifiers, backend, migrations,
authentication, and account APIs are unchanged. The 241 existing practice
questions keep their progress and notes. Learning exercises do not create
account progress records or save answers. Unsaved note drafts remain in the
workspace while switching views, with the existing warning before unloading.

## Validation

Run `npm test`, `npm run lint`, `npm run format:check`, and
`VITE_STATIC_SITE=1 npm run build` from `frontend/`. Existing CI and Pages
workflows run the new tests automatically. Review article accordions and all
three scenes per subtopic on the live site after deployment. Check both themes,
the zero-iteration loop, empty string, invalid array index, faulty/corrected
boundary, and direct question URLs.

For later lessons, add an explicit matching topic entry and scenes. Do not edit
the published question manifest merely to attach teaching material: a manifest
change is a separately reviewed content publication with its own API release
checks.
