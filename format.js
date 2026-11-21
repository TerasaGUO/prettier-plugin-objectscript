// Mask quoted text and stop at line comments so their braces cannot change the nesting depth.
function structure(line) {
  let code = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const pair = line.slice(i, i + 2);
    if (ch === ";" || pair === "//" || pair === "#;") break;
    if (pair === "/*" || /^&[a-z]/i.test(pair)) return null;
    if (ch !== '"') {
      code += ch;
      continue;
    }
    code += '""';
    let closed = false;
    while (++i < line.length) {
      if (line[i] !== '"') continue;
      if (line[i + 1] === '"') i++;
      else {
        closed = true;
        break;
      }
    }
    if (!closed) return null;
  }
  return code.trim();
}

// Recognize class declarations whose language and body boundaries can be determined locally.
function classLine(body, code, state) {
  if (state.opening && code === "{") {
    state.method = state.opening === "method";
    state.depth = state.method ? 1 : 0;
    state.opening = null;
    return body;
  }
  if (state.opening) return null;
  if (/^(?:ClassMethod|Method|ClientMethod)\s/i.test(code)) {
    if (
      /^ClientMethod\b/i.test(code) ||
      (/\bLanguage\s*=/i.test(code) &&
        !/\bLanguage\s*=\s*objectscript\b/i.test(code))
    )
      return null;
    if (/;\s*$/.test(body)) return body;
    state.method = code.endsWith("{");
    state.depth = state.method ? 1 : 0;
    state.opening = state.method ? null : "method";
    return body;
  }
  if (/^Class\s/i.test(code)) {
    if (/\bLanguage\s*=/i.test(code)) return null;
    state.opening = code.endsWith("{") ? null : "class";
    return body;
  }
  if (
    /^(?:Property|Parameter|Index|Relationship|ForeignKey)\s/i.test(code) &&
    body.trimEnd().endsWith(";")
  )
    return body;
  if (code === "}" || /^(?:Include|Import)\s/i.test(code)) return body;
  return null;
}

// Replace leading indentation while preserving labels, command separators, and dotted DO levels.
function commandLine(line, body, code, state, unit) {
  const label = line === body && /^[%\p{L}\d]/u.test(body);
  const closes = code.match(/^}+/)?.[0].length ?? 0;
  const level = Math.max(0, state.depth - closes);
  const routine = state.kind === "routine";
  if (routine && label) {
    // A routine label can also open a brace-delimited procedure.
    state.procedure = code.endsWith("{");
    state.depth = 0;
  }
  const base = routine && !state.procedure ? 1 : 0;
  const output = label ? line : unit.repeat(base + level) + body;
  for (const ch of code) {
    if (ch === "{") state.depth++;
    if (ch === "}") state.depth = Math.max(0, state.depth - 1);
  }
  if (!state.depth) {
    state.method = false;
    state.procedure = false;
  }
  return output;
}

// Find the end of a standalone &sql(...) command, ignoring parentheses in quoted text and SQL comments.
function sqlEnd(lines, start) {
  let depth = 0,
    quote = "",
    comment = false;
  for (let row = start; row < lines.length; row++) {
    const line = lines[row];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i],
        pair = line.slice(i, i + 2);
      if (comment) {
        if (pair === "*/") {
          comment = false;
          i++;
        }
      } else if (quote) {
        if (ch === quote && line[i + 1] === quote) i++;
        else if (ch === quote) quote = "";
      } else if (pair === "--") break;
      else if (pair === "/*") {
        comment = true;
        i++;
      } else if (ch === "'" || ch === '"') quote = ch;
      else if (ch === "(") depth++;
      else if (ch === ")" && --depth === 0) {
        return /^\s*(?:;.*)?$/.test(line.slice(i + 1)) ? row : lines.length;
      }
    }
  }
  return lines.length;
}

// Resume after a simple XML root closes and the next line closes the XData member.
// Use the end of the file as the fallback for CDATA, declarations, or ambiguous markup.
function xmlEnd(lines, start) {
  let row = start;
  if (!lines[row].trimEnd().endsWith("{")) {
    if (lines[++row]?.trim() !== "{") return lines.length;
  }
  const root = lines[++row]?.trim().match(/^<([\w:.-]+)(?:\s+[^<>]*)?>$/);
  if (!root) return lines.length;
  const close = "</" + root[1] + ">";
  for (; ++row < lines.length;) {
    const line = lines[row].trim();
    if (line === close)
      return lines[row + 1]?.trim() === "}" ? row + 1 : lines.length;
    if (/[<>]/.test(line) && !/^(?:<[^!?<>][^<>]*>[^<>]*)+$/.test(line)) break;
  }
  return lines.length;
}

// Indent recognized ObjectScript lines and retain the original suffix once the context is uncertain.
export function formatLines(node, options) {
  const unit = options.useTabs
    ? "\t"
    : " ".repeat(Math.max(1, options.tabWidth));
  const state = {
    kind: node.kind,
    depth: 0,
    method: false,
    procedure: false,
    opening: null,
  };
  const result = [...node.lines];
  for (let i = 0; i < node.lines.length; i++) {
    const line = node.lines[i];
    const body = line.replace(/^[ \t]*/, "");
    if (!body) continue;
    // Skip sections with a known end before scanning ObjectScript commands.
    if (
      node.kind === "class" &&
      !state.method &&
      !state.opening &&
      /^XData\s/i.test(body)
    ) {
      i = xmlEnd(node.lines, i);
      continue;
    }
    if (/^&sql\s*\(/i.test(body)) {
      i = sqlEnd(node.lines, i);
      continue;
    }
    if (body.startsWith("/*")) {
      while (i < node.lines.length && !node.lines[i].includes("*/")) i++;
      if (!node.lines[i] || node.lines[i].split(/\*\/(.*)/s)[1].trim()) break;
      continue;
    }
    if (/^#(?:define|def1arg|include)\s/i.test(body)) {
      while (/##continue\s*$/i.test(node.lines[i] ?? "")) i++;
      if (/##continue/i.test(node.lines[i] ?? "")) break;
      continue;
    }
    if (/^#(?![;$])/.test(body)) break;
    const code = structure(body);
    if (code === null) break;
    if (node.kind === "class" && !state.method) {
      if (!code) continue;
      const output = classLine(body, code, state);
      if (output === null) break;
      result[i] = output;
    } else {
      result[i] = commandLine(line, body, code, state, unit);
    }
  }
  const output = result.join("\n");
  return output && !output.endsWith("\n") ? output + "\n" : output;
}
