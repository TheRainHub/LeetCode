---
slug: filesystems-permissions
title: Filesystems, inodes and permissions
path: linux-networking
module: linux-os
order: 2
minutes: 35
depth: concise
practice: conceptual
summary: Inodes and links, the permission model (rwx, ownership, setuid, umask), and the disk problems you meet in production.
prerequisites: [processes-threads]
problems: []
objectives:
  - Explain inodes, hard links and symbolic links
  - Read and set permissions with chmod/chown, including directories and umask
  - Diagnose 'disk full' cases — space vs inodes vs deleted-but-open files
readings:
  - title: "man7 — inode(7)"
    url: https://man7.org/linux/man-pages/man7/inode.7.html
    kind: docs
  - title: "man7 — chmod(1)"
    url: https://man7.org/linux/man-pages/man1/chmod.1.html
    kind: docs
interview:
  - q: "df says the disk is full, but du can't find the files. Why?"
    a: "A deleted file is still held open by a running process, so its space isn't freed. Find it with lsof +L1 (or ls -l /proc/*/fd | grep deleted) and restart/reopen the process (e.g. log rotation without reopening)."
  - q: "What does execute permission mean on a directory?"
    a: "Permission to traverse it (access entries by name / cd into it). Read lists names; write creates/deletes entries (combined with execute)."
selfAssessment:
  - I can interpret ls -l output fully
  - I can explain hard vs symbolic links
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "chmod 640 file gives:"
    options: ["rw-r-----", "rwxr-x---", "rw-rw----", "r--r--r--"]
    answer: 0
    why: "6 = rw-, 4 = r--, 0 = ---."
  - q: "A hard link:"
    options: ["Points to a path", "Is another directory entry for the same inode; data lives until all links are gone", "Works across filesystems", "Can point to a missing file"]
    answer: 1
    why: "Symlinks point to paths, can dangle and cross filesystems."
  - q: "'No space left on device' while df -h shows free space usually means:"
    options: ["Bad sectors", "Inodes are exhausted (check df -i)", "Wrong permissions", "Mount is read-only"]
    answer: 1
    why: "Millions of tiny files can use up all inodes."
explain:
  prompt: "A production server reports 'No space left on device'. Walk through how you'd diagnose it."
  rubric:
    - "Checks space with df -h and inodes with df -i"
    - "Finds large directories with du (and excludes other filesystems)"
    - "Considers deleted-but-open files (lsof +L1)"
    - "Proposes fixes: log rotation with reopen/copytruncate, cleanup, alerts"
  model: "First I'd run df -h to see which filesystem is full and df -i to rule out inode exhaustion from many small files. If space is the issue, du -xh --max-depth=1 on that mount shows where it goes. If du totals are far below df's usage, a process is probably holding deleted files open — common when logs are rotated by deletion — so lsof +L1 shows them, and restarting or signalling the process to reopen its logs frees the space. Then I'd fix the root cause with proper log rotation, retention and a disk usage alert well before 100%."
cards:
  - q: "df vs du mismatch"
    a: "Deleted files still open by a process — lsof +L1."
  - q: "Directory permissions"
    a: "r = list, w = create/delete (with x), x = traverse."
---

## Explanation

### Inodes and names

An **inode** stores metadata (owner, permissions, timestamps, size, block pointers) — not the name. Directories map names → inode numbers. `ls -i` shows inode numbers; `stat file` shows everything.

- **Hard link**: another name for the same inode (`ln a b`). Data is freed when the link count is 0 *and* no process has it open.
- **Symbolic link**: a file containing a path (`ln -s target link`); can dangle and cross filesystems.

### Permissions

`-rwxr-x---  1 alice devs  ...` → type, owner/group/other bits.

| | file | directory |
|---|---|---|
| r | read contents | list names |
| w | modify | create/delete entries (with x) |
| x | execute | traverse (cd, access by name) |

`chmod 750`, `chmod u+x`, `chown alice:devs`. **umask** (e.g. 022) removes bits from defaults (files 666, dirs 777). Special bits: **setuid/setgid** (run with owner's/group's privileges, e.g. `passwd`), **sticky** on `/tmp` (only owners can delete their files). Containers usually should not run as root.

### Disk problems

1. **Space**: `df -h`, `du -xh --max-depth=1 / | sort -h`.
2. **Inodes**: `df -i`.
3. **Deleted but open**: `lsof +L1`.
4. **Read-only remount** after filesystem errors: check `dmesg`.

## Worked examples

```bash
$ ls -l deploy.sh
-rw-r--r-- 1 ci ci 812 Nov 10 09:00 deploy.sh
$ ./deploy.sh
bash: ./deploy.sh: Permission denied
$ chmod u+x deploy.sh      # or run with: bash deploy.sh
```

## Common misconceptions

- **"Deleting a log file frees the space."** — Not while a process holds it open.
- **"777 fixes permission problems."** — It creates security problems; grant the minimum needed.
- **"Execute on a directory means running it."** — It means traversal.

## Practical exercises

1. Create a file, a hard link and a symlink; delete the original and observe each.
2. Reproduce the deleted-but-open case with `tail -f` on a file you delete; find it with `lsof +L1`.
