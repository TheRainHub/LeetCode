---
slug: performance-monitoring
title: Linux performance monitoring
path: linux-networking
module: linux-shell
order: 3
minutes: 35
depth: concise
practice: conceptual
summary: A systematic first look at a slow machine — load, CPU, memory, disk and network — with top, vmstat, iostat and friends.
prerequisites: [processes-threads]
problems: []
objectives:
  - Interpret load average, CPU time categories and memory (including page cache)
  - Use a checklist (USE method) to find saturated resources
  - Choose the right tool for CPU, memory, disk and network questions
readings:
  - title: "Brendan Gregg — The USE Method"
    url: https://www.brendangregg.com/usemethod.html
    kind: article
  - title: "Brendan Gregg — Linux Performance Analysis in 60,000 Milliseconds"
    url: https://www.brendangregg.com/Articles/Netflix_Linux_Perf_Analysis_60s.pdf
    kind: article
  - title: "man7 — top(1)"
    url: https://man7.org/linux/man-pages/man1/top.1.html
    kind: docs
interview:
  - q: "Load average is 16 on an 8-core machine. What does that mean?"
    a: "On average 16 tasks were runnable or in uninterruptible sleep (often I/O), so demand exceeds CPU capacity or tasks are blocked on disk. Check CPU utilisation vs iowait to distinguish CPU saturation from I/O."
  - q: "free shows almost no free memory. Is that a problem?"
    a: "Usually not: Linux uses spare RAM for page cache, which is reclaimable. Look at 'available', swap activity (vmstat si/so) and OOM-killer messages in dmesg."
selfAssessment:
  - I can run a 60-second triage on a slow box
  - I can tell CPU saturation from I/O wait using vmstat and iostat output
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "High %wa (iowait) in top suggests:"
    options: ["CPU-bound code", "CPUs idle while waiting for I/O — check disk with iostat", "Too much memory", "Network saturation only"]
    answer: 1
    why: "iowait is idle time with outstanding I/O."
  - q: "The USE method checks each resource for:"
    options: ["Uptime, Speed, Errors", "Utilization, Saturation, Errors", "Users, Sessions, Events", "Usage, Swap, Entropy"]
    answer: 1
    why: "A fast checklist to find the bottleneck."
  - q: "Which shows per-disk utilisation and latency?"
    options: ["ps", "iostat -xz 1", "ss", "uname"]
    answer: 1
    why: "Look at %util and await."
explain:
  prompt: "A server is suddenly slow. Walk through your first five minutes of investigation."
  rubric:
    - "Checks load and uptime, then CPU breakdown (user/sys/iowait/steal)"
    - "Checks memory: available, swapping, OOM kills (dmesg)"
    - "Checks disk utilisation and latency (iostat) and network errors/saturation"
    - "Identifies the top processes and correlates with recent changes/logs"
    - "Applies a structured method (USE) rather than guessing"
  model: "I'd follow a checklist rather than guess. uptime gives load averages and whether it's rising. top or mpstat shows the CPU breakdown: high user time means application CPU, high system time kernel work, high iowait means waiting on disk, high steal means a noisy neighbour on a VM. vmstat 1 shows run-queue length, swapping and context switches; free and dmesg tell me about memory pressure and OOM kills. iostat -xz 1 shows disk utilisation and await, and ss or sar -n DEV shows network saturation and errors. Then I'd look at the top processes, recent deploys and logs, applying the USE method — utilisation, saturation and errors — to each resource until one stands out."
cards:
  - q: "60-second triage commands"
    a: "uptime, dmesg | tail, vmstat 1, mpstat -P ALL 1, pidstat 1, iostat -xz 1, free -m, sar -n DEV 1, sar -n TCP,ETCP 1, top."
  - q: "Linux 'free' memory"
    a: "Page cache uses spare RAM; look at 'available', not 'free'."
---

## Explanation

### Key signals

- **Load average** (1/5/15 min): runnable + uninterruptible tasks. Compare with core count.
- **CPU**: `us` user, `sy` system, `wa` iowait, `st` steal (VM), `id` idle.
- **Memory**: `available` matters; page cache is reclaimable; swapping (`si/so` in vmstat) hurts latency; `dmesg` shows OOM kills.
- **Disk**: `iostat -xz 1` → `%util`, `await` (ms per I/O), queue size.
- **Network**: throughput vs link capacity, retransmits (`ss -ti`, `netstat -s`), errors/drops (`ip -s link`).

### USE method

For every resource (CPU, memory, disk, network, file descriptors, connection pools): **Utilization**, **Saturation** (queueing), **Errors**. Saturated resources explain latency.

### Tools

`top`/`htop` (per process), `pidstat` (per process over time), `vmstat` (system-wide), `iostat`, `sar` (history), `perf`/flame graphs (where CPU time goes), `strace -c -p` (syscalls).

## Worked examples

```text
$ vmstat 1
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
12  0      0 210000  52000 9800000   0    0     5    12 4100 9800 92  6  2  0  0
```
`r = 12` runnable tasks on (say) 8 CPUs, 92% user, no iowait or swapping → CPU-bound application. Next: `pidstat 1` to find the process, then a profiler/flame graph.

## Common misconceptions

- **"Low free memory = memory problem."** — Cache makes "free" low by design.
- **"Load average = CPU usage."** — It includes tasks blocked on I/O.
- **"Average latency tells the story."** — Saturation shows in tail percentiles.

## Practical exercises

1. Run the 60-second checklist on your machine while running a CPU-heavy loop and a disk-heavy `dd`.
2. Generate a CPU flame graph for a small Java or Node program (async-profiler or `perf`).
