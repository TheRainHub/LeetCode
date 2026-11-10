---
slug: shell-bash
title: Shell, Bash and text processing
path: linux-networking
module: linux-shell
order: 1
minutes: 40
depth: concise
practice: conceptual
summary: Pipes, redirection, exit codes, quoting and the grep/awk/sed/sort toolbox — enough to analyse logs and automate safely.
prerequisites: [processes-threads]
problems: []
objectives:
  - Use pipes, redirection and exit codes correctly
  - Write safer scripts with set -euo pipefail and proper quoting
  - Answer log-analysis questions with grep, awk, sort, uniq, cut and jq
readings:
  - title: "GNU Bash Reference Manual"
    url: https://www.gnu.org/software/bash/manual/bash.html
    kind: docs
  - title: "ShellCheck — a static analysis tool for shell scripts"
    url: https://www.shellcheck.net/
    kind: docs
interview:
  - q: "Find the 10 IP addresses with the most requests in an access log."
    a: "awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10 — extract field, sort to group, count, sort numerically descending."
  - q: "What does set -euo pipefail do?"
    a: "-e exits on an unhandled non-zero status, -u errors on unset variables, -o pipefail makes a pipeline fail if any command fails (not just the last). Together they stop scripts from silently continuing after errors."
selfAssessment:
  - I can write a one-liner to count HTTP status codes in a log
  - I quote variables by default
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "cmd > out.log 2>&1 does:"
    options: ["Sends stderr to the terminal", "Redirects both stdout and stderr to out.log", "Appends to out.log", "Discards output"]
    answer: 1
    why: "Order matters: 2>&1 after the file redirect points stderr where stdout now goes."
  - q: "Why is rm -rf $DIR/ dangerous?"
    options: ["It's slow", "If DIR is empty or unset it becomes rm -rf /", "It needs sudo", "It follows symlinks"]
    answer: 1
    why: "Use set -u, quote \"${DIR:?}\" to fail when unset."
  - q: "$? holds:"
    options: ["The PID of the shell", "The exit status of the last command", "The number of arguments", "The last argument"]
    answer: 1
    why: "0 means success."
explain:
  prompt: "Given a 2 GB nginx access log, how would you find which endpoints return the most 5xx errors, using only standard command-line tools?"
  rubric:
    - "Filters 5xx status codes (by field, not loose grep)"
    - "Extracts the endpoint/path field with awk (and strips query strings if needed)"
    - "Counts with sort | uniq -c | sort -rn | head"
    - "Mentions streaming efficiency (no loading into memory) and checking the log format"
  model: "I'd first look at a couple of lines to confirm the log format and which fields hold the status code and the request path. Then stream it: awk '$9 ~ /^5/ {split($7, p, \"?\"); print p[1]}' access.log | sort | uniq -c | sort -rn | head -20. awk filters lines whose status field starts with 5 and prints the path without the query string; sort groups identical paths, uniq -c counts them, and the second sort orders by count. All tools stream, so a 2 GB file isn't loaded into memory. If the logs are JSON, I'd use jq for the same pipeline."
cards:
  - q: "Top-N counting pipeline"
    a: "… | sort | uniq -c | sort -rn | head -N"
  - q: "Safe script header"
    a: "#!/usr/bin/env bash + set -euo pipefail; quote variables."
---

## Explanation

### Plumbing

- `|` connects stdout to the next stdin; `>` overwrite, `>>` append, `2>` stderr, `2>&1` stderr to stdout, `< file` stdin, `/dev/null` sink.
- Exit status `$?`: 0 success; `cmd1 && cmd2`, `cmd1 || fallback`.
- Command substitution `$(cmd)`; process substitution `<(cmd)`.

### Safer scripts

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
dir="${1:?usage: script <dir>}"
for f in "$dir"/*.log; do        # quote expansions to survive spaces
  gzip -- "$f"
done
```
Run **ShellCheck** on scripts.

### Text-processing toolbox

| Tool | Use |
|---|---|
| `grep -E`, `grep -c`, `grep -v` | filter lines |
| `awk '{print $1}'`, `awk -F,` | fields, conditions, sums |
| `sed 's/old/new/g'` | substitutions |
| `sort -n -k2`, `uniq -c` | ordering, counting |
| `cut -d: -f1`, `tr`, `wc -l` | slicing, counting |
| `head`, `tail -f`, `less` | viewing |
| `xargs` | build commands from input |
| `jq '.status'` | JSON logs |
| `find . -name '*.log' -mtime +7` | locate files |

## Worked examples

```bash
# Status code histogram
awk '{print $9}' access.log | sort | uniq -c | sort -rn
# Requests per minute
awk '{print substr($4, 2, 17)}' access.log | uniq -c | tail
# Average response time (last field, seconds)
awk '{sum += $NF; n++} END {printf "%.3f\n", sum / n}' access.log
# Errors in JSON logs in the last hour
jq -r 'select(.level == "error") | .msg' app.log | sort | uniq -c | sort -rn | head
```

## Common misconceptions

- **"Unquoted variables are fine."** — Spaces and globbing break them.
- **"`set -e` catches everything."** — Not inside some conditionals/subshells; still check critical commands.
- **"`cat file | grep x` is required."** — `grep x file` avoids an extra process (harmless, but good to know).

## Practical exercises

1. Write one-liners for: top 10 IPs, 5xx count per path, slowest 5 requests.
2. Write a backup script with `set -euo pipefail`, argument validation, and run ShellCheck on it.
