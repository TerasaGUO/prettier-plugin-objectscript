# 用 Prettier 统一 ObjectScript 缩进，同时保留例程标签

[English](formatting-objectscript.md)

审阅一个求和例程时，我最想一眼看清的是哪条命令属于循环，以及循环在哪一行结束。下面是项目自带的 `FormatRoutine.mac` 中的函数。内部累加只比外层命令多缩进两个空格，右花括号也很容易看漏。

```objectscript
Sum(n)
 new i,total
 set total=0
 for i=1:1:n {
   set total=total+i
 }
 quit total
```

在插件源码目录执行 `npm ci` 后，可以先预览这个文件的排版结果。

```sh
npx prettier --plugin ./index.js examples/FormatRoutine.mac
```

```objectscript
Sum(n)
    new i,total
    set total=0
    for i=1:1:n {
        set total=total+i
    }
    quit total
```

现在，累加语句比 `for` 多缩进一级，最后的 `quit total` 和 `for` 对齐。函数入口 `Sum(n)` 仍在第一列。类文件也能用同一条命令预览，只需把路径换成 `examples/FormatDemo.cls`。在类方法里，方法声明和最外层花括号顶格，方法体从第一级缩进开始。

## 为什么只改行首

ObjectScript 一行可以写多条命令。在 `do  quit` 中，两个命令之间的两个空格标明前面的 `do` 没有参数。如果把整行里的连续空格都压成一个，就可能改变解析结果。插件只替换识别出的命令行的前导缩进，保留命令之间的原文。遇到字符串或行末注释中的花括号时，扫描器也会跳过它们，以免下一行被多缩进一级。

一个类还可能同时包含嵌入 SQL、XML XData 和 Python 方法。插件可以跳过边界清楚的独立 SQL 命令和简单 XData，再从下一行继续排版。遇到 Python 方法或无法可靠识别的边界时，它会保留从该处到文件末尾的布局。审阅这类文件时，即使格式检查通过，后半段也可能保留旧缩进。

## 把缩进约定放进 Git

团队接入时，可以从源码打包，把本地安装包作为开发依赖提交，随后在仓库的 Prettier 配置中登记插件。开发者用 `--write` 更新文件并查看 Git 差异，CI 在 `npm ci` 后执行下面这条只读检查。这样的流程让编辑器不同的团队成员也能复现同一次格式检查。[安装步骤与配置](../README.zh-CN.md)

```sh
npx prettier --check "**/*.{cls,mac}"
```

为了验证这两个入口，我们在 IRIS for Health 2026.2 上分别编译了格式化前后的示例类和例程。用 10 调用两份源码里的求和函数，四次结果都是 55。对命令间距、点号 DO 层级和嵌入段等边界，另有自动化测试逐行对照预期输出，并检查再次排版结果是否一致。这两种验证分别回答了代码审阅里的两个问题：示例还能否按原样运行，以及下次提交还会不会出现同一处缩进差异。
