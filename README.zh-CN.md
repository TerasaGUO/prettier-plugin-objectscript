# ObjectScript 的 Prettier 插件

[English](README.md) | 简体中文

为 InterSystems ObjectScript 类文件（`.cls`）和 MAC 例程（`.mac`）统一缩进。解析与排版代码在本项目内独立实现，运行时只需要 Prettier 3。本地验证使用 Node.js 23.11 和 Prettier 3.10.1。

## 本地试用

在插件目录运行以下命令。examples 内的两个求和样例特意使用不一致的缩进，以便观察差异。

```sh
npm ci
npm test
npx prettier --plugin ./index.js "examples/*" --check
npx prettier --plugin ./index.js examples/FormatRoutine.mac
```

第三条命令预期返回退出码 1。最后一条将排版结果输出到终端。

## 通过 InterSystems 包管理器（IPM）安装

把 **IPM 离线包** `prettier-plugin-objectscript-ipm-0.2.0.tgz` 放到 IRIS 服务器可读的目录。在目标命名空间打开 IRIS 终端并执行以下命令，将 `/packages` 换成实际目录。

```objectscript
zpm "load /packages/prettier-plugin-objectscript-ipm-0.2.0.tgz -v"
zpm "list"
```

从源码安装时，也可以执行 `zpm "load /path/to/prettier-plugin-objectscript -v"`，路径指向包含 `module.xml` 的目录。IPM 会把两个 JS 文件、包描述及两版 README 部署到实例的 `lib/prettier-plugin-objectscript/<命名空间>/` 下。详细安装输出会显示实际路径。

格式化命令在安装了 Node.js 和 Prettier 3 的机器上执行。如果该机器能读取部署目录，就可以直接使用其中的入口。下面以 Linux 实例的 USER 命名空间为例。如果 CI 在另一台机器运行，将整个已部署目录复制到 CI 机器，并替换命令中的路径。

```sh
npx prettier --plugin /usr/irissys/lib/prettier-plugin-objectscript/USER/index.js --check "**/*.{cls,mac}"
```

卸载时在同一命名空间执行 `zpm "uninstall prettier-plugin-objectscript"`。下一节使用的 npm 安装包供 Node.js 包管理器使用。

## 团队项目和 Git 检查

在插件目录运行 `npm pack`。将生成的 `prettier-plugin-objectscript-0.2.0.tgz` 放入目标仓库的 `vendor/` 目录，并在目标仓库安装。

```sh
npm install --save-dev prettier@3 ./vendor/prettier-plugin-objectscript-0.2.0.tgz
```

将以下插件配置合并到目标仓库的 `.prettierrc.json`，将配置、安装包、package.json 和锁文件一同提交到 Git。

```json
{
  "plugins": ["prettier-plugin-objectscript"],
  "overrides": [
    { "files": ["*.cls", "*.mac"], "options": { "tabWidth": 4 } }
  ]
}
```

开发者执行写入命令并审阅 Git 差异。CI 在 `npm ci` 后运行检查命令，发现差异时检查失败。

```sh
npx prettier --write "**/*.{cls,mac}"
npx prettier --check "**/*.{cls,mac}"
```

## 0.2 的排版范围

- 类声明、单行成员声明及方法外层花括号顶格。方法内命令按块缩进，默认四个空格，支持 `tabWidth` 和 `useTabs`。
- MAC 例程的第一列标签保留。同一行的多条命令、无参数命令后的空格、点号 DO 层级、字符串、大小写和行末注释保留。Prettier 按 `endOfLine` 处理换行。
- 独立的常见 XML XData、独占命令行的 `&sql(...)`、块注释和常见宏定义可原样跳过，再继续排版。边界不明确时，从该处到文件末尾保留原有布局。例如外语方法、复杂 XData、条件编译和多行方法签名会触发这种处理。`--check` 仅覆盖实际执行的排版规则。
- 采用行级扫描，不展开宏、不重排表达式、不拆分命令。读取源码文本本身的程序（例如使用 `$TEXT`）可以观察到缩进变化。
- 标准输入可用 `--stdin-filepath Sum.mac` 推断语言，或显式传入 `--parser objectscript-class` / `--parser objectscript-routine`。

接口与语法参考 [Prettier 插件文档](https://prettier.io/docs/plugins) 和 [InterSystems ObjectScript 语法文档](https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GCOS_syntax)。
