import { XMLParser, XMLBuilder } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: false
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: false,
  format: true
});

export function parseSvg(svg: string) {
  return parser.parse(svg);
}

export function buildSvg(ast: unknown) {
  return builder.build(ast);
}
