import { injectText } from "./inject-text";
import type { TemplateSchema } from "@/lib/templates/types";
import { buildSvg, parseSvg } from "./parse-svg";

type SvgNode = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function withBackground(svg: string, backgroundUrl?: string) {
  if (!backgroundUrl) {
    return svg;
  }

  const ast = parseSvg(svg) as { svg: SvgNode };
  const defs = asArray(ast.svg.defs as SvgNode | SvgNode[] | undefined);
  const clipPathId = "midmint-bg-clip";
  const clipPath = {
    clipPath: {
      "@_id": clipPathId,
      rect: {
        "@_x": "0",
        "@_y": "0",
        "@_width": "1242",
        "@_height": "1660",
        "@_rx": "60",
        "@_fill": "#fff"
      }
    }
  };

  if (defs.length === 0) {
    ast.svg.defs = clipPath;
  } else {
    const firstDefs = defs[0];
    const existing = firstDefs.clipPath
      ? asArray(firstDefs.clipPath as SvgNode | SvgNode[]).find(
          (item) => item["@_id"] === clipPathId
        )
      : null;
    if (!existing) {
      if (firstDefs.clipPath) {
        firstDefs.clipPath = [...asArray(firstDefs.clipPath as SvgNode | SvgNode[]), clipPath.clipPath];
      } else {
        firstDefs.clipPath = clipPath.clipPath;
      }
    }
  }

  const backgroundNode = {
    image: {
      "@_href": backgroundUrl,
      "@_x": "0",
      "@_y": "0",
      "@_width": "1242",
      "@_height": "1660",
      "@_preserveAspectRatio": "xMidYMid slice",
      "@_opacity": "0.28",
      "@_clip-path": `url(#${clipPathId})`
    }
  };

  const rootEntries = Object.entries(ast.svg);
  const nextSvg: SvgNode = {};
  let inserted = false;

  for (const [key, value] of rootEntries) {
    nextSvg[key] = value;
    if (!inserted && key === "rect") {
      nextSvg.image = backgroundNode.image;
      inserted = true;
    }
  }

  if (!inserted) {
    nextSvg.image = backgroundNode.image;
  }

  ast.svg = nextSvg;
  return buildSvg(ast);
}

export function exportSvg(
  template: TemplateSchema & { svg: string },
  values: Record<string, string>,
  options?: { backgroundUrl?: string }
) {
  const withText = injectText(template.svg, template, values);
  return withBackground(withText, options?.backgroundUrl);
}
