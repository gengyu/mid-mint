import type { TemplateSchema } from "@/lib/templates/types";
import { stripUnsupportedText } from "@/lib/utils/text";
import { buildSvg, parseSvg } from "./parse-svg";
import { layoutText } from "./layout-text";

type SvgNode = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function findSlotNodes(node: SvgNode, acc: SvgNode[] = []): SvgNode[] {
  for (const [key, value] of Object.entries(node)) {
    if (key === "text") {
      for (const item of asArray(value as SvgNode | SvgNode[] | undefined)) {
        if (item?.["@_data-slot"]) {
          acc.push(item);
        }
      }
    }

    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === "object") {
            findSlotNodes(child as SvgNode, acc);
          }
        }
      } else {
        findSlotNodes(value as SvgNode, acc);
      }
    }
  }

  return acc;
}

export function injectText(
  svg: string,
  schema: TemplateSchema,
  values: Record<string, string>
) {
  const ast = parseSvg(svg) as { svg: SvgNode };
  const slotNodes = findSlotNodes(ast.svg);

  for (const slot of schema.slots) {
    const node = slotNodes.find((item) => item["@_data-slot"] === slot.id);
    if (!node) {
      continue;
    }

    const layout = layoutText(slot, stripUnsupportedText(values[slot.id] ?? ""));
    node["@_x"] = String(slot.x);
    node["@_y"] = String(slot.y);
    node["@_fill"] = slot.fill ?? "#FFF8EF";
    node["@_font-family"] = "'PingFang SC', 'Microsoft YaHei', sans-serif";
    node["@_font-size"] = String(layout.fontSize);
    node["@_font-weight"] = String(slot.fontWeight ?? 500);
    node["@_text-anchor"] = slot.textAnchor ?? "start";
    node["tspan"] = layout.lines.map((line, index) => ({
      "#text": line,
      "@_x": String(slot.x),
      "@_dy": index === 0 ? "0" : String(slot.lineHeight)
    }));
  }

  return buildSvg(ast);
}
