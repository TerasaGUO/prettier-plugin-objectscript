import { formatLines } from "./format.js";

export const languages = [
  {
    name: "ObjectScript class",
    parsers: ["objectscript-class"],
    extensions: [".cls"],
  },
  {
    name: "ObjectScript routine",
    parsers: ["objectscript-routine"],
    extensions: [".mac"],
  },
];

// Expose separate class and routine parsers so stdin callers can select either explicitly.
function parser(kind) {
  return {
    astFormat: "objectscript-lines",
    parse: (text) => ({ kind, lines: text.split("\n"), length: text.length }),
    locStart: () => 0,
    locEnd: (node) => node.length,
  };
}

export const parsers = {
  "objectscript-class": parser("class"),
  "objectscript-routine": parser("routine"),
};

export const printers = {
  "objectscript-lines": {
    // Keep the original command text, including significant spaces between commands.
    print: (path, options) => formatLines(path.node, options),
    getVisitorKeys: () => [],
  },
};

export const defaultOptions = { tabWidth: 4 };
