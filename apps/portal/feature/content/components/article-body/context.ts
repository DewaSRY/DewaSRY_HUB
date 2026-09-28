import type { ReactNode } from "react";
import type { BodyImageMap } from "../../article-schema/types";
import type { HeadingIdAllocator } from "../../utils/heading-id";
import type { ArticleBodyLabels } from "./labels";

export interface SkippedNode {
  path: string;
  reason: string;
}

export interface RenderContext {
  images: BodyImageMap;
  labels: ArticleBodyLabels;
  headingIds: HeadingIdAllocator;
  /** Ids already given to top-level headings, by block index. */
  topLevelHeadingIds: Map<number, string>;
  skip: (path: string, reason: string) => void;
}

export interface RenderDocOptions {
  images?: BodyImageMap;
  labels?: Partial<ArticleBodyLabels>;
  /** Renders an ad slot (site: `<AdSlot>`, admin preview: a grey placeholder). */
  renderAdSlot?: (slotId: string) => ReactNode;
  /** Called for every node or mark that is not rendered. Defaults to a console warning. */
  onSkip?: (skipped: SkippedNode) => void;
}
