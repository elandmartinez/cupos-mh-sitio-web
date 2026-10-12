/**
 * The `ui/` barrel — the one import path for cross-screen primitives.
 *
 * Import from here (`import { SkeletonText } from './ui'`) rather than reaching
 * into the file, so a primitive can be moved or split without touching call
 * sites. Screen-specific components stay flat in `src/components/` and are
 * imported by name; the leaf/`ui/` split is described in `DOCUMENTATION.md` §6.
 *
 * Dependency rule: nothing in `ui/` may import a screen component. The arrows
 * point one way — screens depend on primitives, never the reverse.
 *
 * House rules for a new primitive, in `DESIGN.md` §4: one primitive per file
 * (a variant is a prop, never a `_v2` filename), a JSDoc header that says why it
 * exists and what its accessibility contract is, and no PropTypes — the repo is
 * strict TypeScript.
 */

export { SkeletonText, SkeletonCard, SkeletonRow, SkeletonCardGrid, SkeletonList } from './skeleton';
export type {
  SkeletonProps,
  SkeletonTextProps,
  SkeletonListProps,
  SkeletonCardGridProps,
} from './skeleton';

export { default as LanguageSwitch } from './languageSwitch';

