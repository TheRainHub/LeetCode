---
slug: processes-threads
title: Processes and threads in Linux
path: linux-networking
module: linux-os
order: 1
minutes: 55
depth: full
practice: lab
summary: fork/exec, process states, file descriptors, threads vs processes, and the /proc views you use when debugging a live system.
prerequisites: []
problems: []
objectives:
  - Explain process creation with fork and exec, and the parent/child relationship
  - Describe process states, zombies and orphans, and how to inspect them with ps and /proc
  - Compare processes and threads (memory sharing, isolation, cost) and context switching
  - Explain file descriptors and why 'too many open files' happens
readings:
  - title: "man7 — fork(2)"
    url: https://man7.org/linux/man-pages/man2/fork.2.html
    kind: docs
  - title: "man7 — proc(5): the /proc filesystem"
    url: https://man7.org/linux/man-pages/man5/proc.5.html
    kind: docs
  - title: "man7 — pthreads(7)"
    url: https://man7.org/linux/man-pages/man7/pthreads.7.html
    kind: docs
interview:
  - q: "What happens when a shell runs a command like ls?"
    a: "The shell fork()s a child (a copy-on-write copy of itself), the child exec()s /bin/ls replacing its program image while keeping file descriptors (stdin/stdout/stderr), the parent waits with waitpid() and reads the exit status."
  - q: "What is a zombie process and how do you get rid of it?"
    a: "A child that has exited but whose parent hasn't reaped it with wait(); only its process table entry remains. Fix the parent to reap children (or handle SIGCHLD); if the parent dies, init/systemd adopts and reaps it."
  - q: "Threads vs processes?"
    a: "Threads in a process share the address space, heap and file descriptors (cheap communication, but races and one crash kills all); processes have separate address spaces (isolation, more expensive creation and IPC). On Linux both are tasks created with clone() with different sharing flags."
selfAssessment:
  - I can explain fork/exec/wait without notes
  - I can find a process's open files and threads in /proc
  - I can explain context switches and why too many threads hurt
completion:
  - Score at least 70% on the quiz
  - Verify the Linux Networking lab (process inspection step)
quiz:
  - q: "After fork(), the child process:"
    options: ["Shares the parent's memory for writing", "Gets a copy-on-write copy of the parent's memory and inherits open file descriptors", "Starts with an empty memory image", "Runs the same PID"]
    answer: 1
    why: "Pages are shared until either process writes; FDs are duplicated."
  - q: "A process in state D (uninterruptible sleep) usually means:"
    options: ["It's a zombie", "It's waiting on I/O (often disk or NFS) and can't be killed until it returns", "It's using 100% CPU", "It's stopped by SIGSTOP"]
    answer: 1
    why: "Many D-state processes point to storage or kernel-level I/O problems."
  - q: "'Too many open files' indicates:"
    options: ["Disk full", "The process hit its file-descriptor limit (ulimit -n), often from leaked sockets/files", "Out of memory", "A permissions problem"]
    answer: 1
    why: "Check /proc/<pid>/fd and limits; fix leaks before raising limits."
  - q: "Which shows a process's threads?"
    options: ["ls /proc/<pid>/task", "cat /etc/passwd", "df -h", "uname -a"]
    answer: 0
    why: "Each thread appears as a task; ps -T -p <pid> and top -H also show them."
explain:
  prompt: "Explain how Linux creates and runs a new program from a shell, and how processes differ from threads."
  rubric:
    - "fork creates a child with a copy-on-write copy; exec replaces the program image"
    - "File descriptors are inherited (stdin/stdout/stderr, redirections)"
    - "Parent waits/reaps exit status; zombies if not reaped"
    - "Threads share address space and FDs; processes isolate memory"
    - "Trade-offs: creation cost, IPC, failure isolation, synchronization needs"
  model: "The shell calls fork, which creates a child that's a copy-on-write duplicate of the shell — same memory contents and the same open file descriptors. The child then calls exec with the program path, which replaces its code and data with the new program but keeps the descriptors, which is how redirections and pipes work. The parent calls waitpid to collect the exit status; if it never does, the finished child stays as a zombie entry. Threads, by contrast, live inside one process and share its address space, heap and descriptors, so they're cheaper to create and communicate through memory, but need synchronisation and a crash takes them all down. Processes are isolated, which costs more to create and requires IPC like pipes or sockets."
cards:
  - q: "fork vs exec"
    a: "fork duplicates the process (COW); exec replaces the program image in the current process."
  - q: "Zombie vs orphan"
    a: "Zombie: exited, not yet reaped by parent. Orphan: parent died; adopted by init/systemd."
  - q: "Where to see a process's FDs and threads"
    a: "/proc/<pid>/fd and /proc/<pid>/task (or lsof -p, ps -T)."
---

## Explanation

### Processes

A process is a running program with its own **virtual address space**, credentials (UID/GID), **file descriptor table**, signal handlers and at least one thread. Each has a PID and a parent (PPID).

### Creation: fork + exec

```c
pid_t pid = fork();
if (pid == 0) {                 // child
    execlp("ls", "ls", "-l", NULL);   // replaces the program; returns only on error
} else {
    int status; waitpid(pid, &status, 0);   // parent reaps the child
}
```
- `fork` is cheap thanks to **copy-on-write** pages.
- `exec` keeps the FD table → shell redirections (`> file`, pipes) are set up between fork and exec.
- Not reaping children leaves **zombies** (`Z` in `ps`).

### States (ps STAT)

`R` running/runnable, `S` interruptible sleep (waiting for an event), `D` uninterruptible sleep (usually I/O), `T` stopped, `Z` zombie.

### File descriptors

Small integers indexing the process's open files, sockets, pipes: 0 stdin, 1 stdout, 2 stderr. Limits via `ulimit -n` / `/proc/<pid>/limits`. Leaked sockets → `EMFILE: too many open files`.

### Threads

Linux implements threads and processes with the same primitive (`clone`) and different sharing flags. Threads of one process share memory, FDs and signal handlers but have their own stacks and registers.

| | Processes | Threads |
|---|---|---|
| Memory | isolated | shared |
| Creation | heavier | lighter |
| Communication | IPC (pipes, sockets, shared memory) | shared variables (needs synchronisation) |
| Failure | isolated | one crash kills the process |

**Context switches** save/restore CPU state and pollute caches; thousands of runnable threads waste CPU on switching.

### Inspecting a live system

```bash
ps -eo pid,ppid,user,stat,etime,%cpu,%mem,cmd --sort=-%cpu | head
ps -T -p <pid>            # threads
ls -l /proc/<pid>/fd      # open descriptors
cat /proc/<pid>/status    # memory, threads, state
pstree -p <pid>
```

## Worked examples

### Finding why a service runs out of descriptors

```bash
ls /proc/$(pgrep -f myservice)/fd | wc -l      # how many open
grep 'open files' /proc/$(pgrep -f myservice)/limits
lsof -p $(pgrep -f myservice) | awk '{print $5}' | sort | uniq -c | sort -rn   # by type
```
Thousands of `IPv4` entries in CLOSE_WAIT state (check with `ss -tanp`) usually mean the application doesn't close sockets after the peer closed — a code bug, not a limit problem.

### A pipeline is processes plus descriptors

`grep error app.log | sort | uniq -c` creates three processes; the shell connects stdout of each to stdin of the next with pipes before `exec`.

## Common misconceptions

- **"fork copies all memory immediately."** — Copy-on-write defers copying until a write.
- **"kill -9 removes zombies."** — Zombies are already dead; the parent must reap them.
- **"More threads = more throughput."** — Beyond the core count, CPU-bound threads only add switching.
- **"Raising ulimit fixes 'too many open files'."** — Usually a leak; find it first.

## Practical exercises

1. Complete the **Linux Networking lab** step that inspects the server process with `ps` and `/proc`.
2. Start `sleep 1000 &`, find it with `ps`, look at `/proc/<pid>/status` and `/proc/<pid>/fd`.
3. Write a 10-line program that creates a zombie, observe it in `ps`, then fix it with `wait`.
