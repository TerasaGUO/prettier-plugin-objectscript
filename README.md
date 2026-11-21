# Prettier plugin for ObjectScript

English | [简体中文](README.zh-CN.md)

Apply consistent indentation to InterSystems ObjectScript class files (`.cls`) and MAC routines (`.mac`). The parser and printer were written for this project. The plugin runs with Prettier 3. The local validation used Node.js 23.11 and Prettier 3.10.1.

## Try it from the source directory

The two examples deliberately use uneven indentation. Run these commands in the plugin source directory.

```sh
npm ci
npm test
npx prettier --plugin ./index.js "examples/*" --check
npx prettier --plugin ./index.js examples/FormatRoutine.mac
```

The check should exit with status 1 for the original examples. The last command prints the formatted routine to the terminal.

## Install with InterSystems Package Manager (IPM)

Copy the **IPM archive** `prettier-plugin-objectscript-ipm-0.2.0.tgz` to a path readable by the IRIS server. In the desired namespace, load the archive from the IRIS terminal. Replace `/packages` with your directory.

```objectscript
zpm "load /packages/prettier-plugin-objectscript-ipm-0.2.0.tgz -v"
zpm "list"
```

For a source checkout you can instead run `zpm "load /path/to/prettier-plugin-objectscript -v"` against the directory containing `module.xml`. IPM installs the two JS files, package metadata, and both READMEs under the instance's `lib/prettier-plugin-objectscript/<namespace>/` directory. The verbose output shows the resolved path.

Run Prettier on a machine with Node.js and Prettier 3. If that machine can read the deployed files, pass the installed entry point directly, as below for a Linux instance and the USER namespace. For a separate CI runner, copy the installed directory to the runner and adjust the path.

```sh
npx prettier --plugin /usr/irissys/lib/prettier-plugin-objectscript/USER/index.js --check "**/*.{cls,mac}"
```

To remove the installed files, run `zpm "uninstall prettier-plugin-objectscript"` in the same namespace. The separate npm tarball in the next section is intended for Node.js package managers.

## Use it in a team repository

Run `npm pack` in the plugin directory. Copy `prettier-plugin-objectscript-0.2.0.tgz` into the target repository's `vendor/` directory and install it from the repository root.

```sh
npm install --save-dev prettier@3 ./vendor/prettier-plugin-objectscript-0.2.0.tgz
```

Merge these settings into `.prettierrc.json`. Commit the configuration, tarball, package.json, and lockfile together so CI can install the same plugin.

```json
{
  "plugins": ["prettier-plugin-objectscript"],
  "overrides": [
    { "files": ["*.cls", "*.mac"], "options": { "tabWidth": 4 } }
  ]
}
```

Run the first command locally and review the Git diff. Run the second in CI after `npm ci`. The check fails when tracked formatting rules would change the input.

```sh
npx prettier --write "**/*.{cls,mac}"
npx prettier --check "**/*.{cls,mac}"
```

## Formatting scope in 0.2

- Recognized class declarations, single-line members, and outer method braces start in column one. Commands inside methods follow their block depth. Indentation defaults to four spaces and supports `tabWidth` and `useTabs`.
- Routine labels stay in column one. The printer preserves command spacing within a line, including spaces after argumentless commands, dotted DO levels, strings, case, and trailing comments. Prettier applies the configured `endOfLine` setting.
- The scanner can skip simple XML XData, standalone `&sql(...)` commands, block comments, and common macro definitions, then resume indentation. If it cannot determine the boundary, it preserves the layout from that point to the end of the file. Examples include foreign-language methods, complex XData, conditional compilation, and multiline method signatures. A passing check covers only the rules applied.
- The scanner works line by line. Expressions, command layout within a line, and macro calls retain their spelling. Code that reads its own source text with facilities such as `$TEXT` can observe indentation changes.
- For stdin, pass `--stdin-filepath Sum.mac` to infer the parser, or select `--parser objectscript-class` or `--parser objectscript-routine`.

See the [Prettier plugin API](https://prettier.io/docs/plugins) and [InterSystems ObjectScript syntax guide](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GCOS_syntax).
