# Formatting ObjectScript with Prettier while keeping routine labels in column one

[简体中文](formatting-objectscript.zh-CN.md)

When reviewing a sum routine, I want to see which command runs inside the loop and where execution continues afterward. Here is the function from the project's `FormatRoutine.mac` example. Two extra spaces distinguish the addition from the surrounding commands, and the closing brace is easy to miss.

```objectscript
Sum(n)
 new i,total
 set total=0
 for i=1:1:n {
   set total=total+i
 }
 quit total
```

After running `npm ci` in the plugin's source directory, preview the routine with this command.

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

The addition now sits one level inside the loop. The final `quit total` lines up with `for`, and the entry label `Sum(n)` still starts in column one. The same command accepts `examples/FormatDemo.cls`. In that class, the method declaration and its outer braces start in column one, and the body starts one indentation level in.

## Why the printer edits leading whitespace

ObjectScript allows multiple commands on one line. In `do  quit`, the two spaces between the commands mark the preceding `do` as argumentless. Collapsing the spaces across the whole line could change how the code is parsed. The plugin replaces the leading indentation on recognized command lines and copies the rest of each line. The scanner also skips braces inside quoted strings and trailing comments, so a brace in a diagnostic message cannot push the next command one level deeper.

A class can contain embedded SQL, XML XData, and Python methods alongside ObjectScript. The scanner skips standalone SQL commands and simple XData members when it can identify their ends, then resumes indentation on the next line. At a Python method or an uncertain boundary, it preserves the layout through the end of the file. A file can therefore pass a formatting check with its original indentation still visible in later members.

## Checking a team's convention in Git

A team can pack the plugin from source, commit the local tarball as a development dependency, and register it in the repository's Prettier configuration. Developers can apply changes with `--write` and review the Git diff. CI runs the following read-only check after `npm ci`, giving everyone the same formatting check regardless of editor. [Installation and configuration](../README.md)

```sh
npx prettier --check "**/*.{cls,mac}"
```

For the two examples, we compiled both the original and formatted sources on IRIS for Health 2026.2. Calling the class method and the routine function with 10 returned 55 in all four runs. Separate automated tests compare the printed text with expected output for cases such as command separators, dotted DO levels, and embedded sections. They also format the result a second time. The runtime check tells us whether these examples still execute as expected. The second formatting pass tells us whether the same indentation change will appear again in the next review.
