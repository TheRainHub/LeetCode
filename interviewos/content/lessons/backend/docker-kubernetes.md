---
slug: docker-kubernetes
title: Docker and Kubernetes
path: backend
module: be-delivery
order: 1
minutes: 55
depth: full
practice: conceptual
summary: Images, layers and containers; Kubernetes Pods, Deployments, Services, probes, resources, config and rollouts — what you need to run and debug a service.
prerequisites: [processes-threads]
problems: []
objectives:
  - Write a small, cache-friendly, secure Dockerfile (multi-stage, non-root)
  - Explain Pods, Deployments, Services, Ingress, ConfigMaps/Secrets and how a request reaches a container
  - Configure readiness/liveness probes, resource requests/limits and rolling updates
  - Debug common failures (CrashLoopBackOff, OOMKilled, ImagePullBackOff, failing readiness)
readings:
  - title: "Docker docs — Dockerfile best practices"
    url: https://docs.docker.com/build/building/best-practices/
    kind: docs
  - title: "Kubernetes docs — Concepts overview"
    url: https://kubernetes.io/docs/concepts/overview/
    kind: docs
  - title: "Kubernetes docs — Liveness, readiness and startup probes"
    url: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
    kind: docs
  - title: "Kubernetes docs — Resource management for Pods and containers"
    url: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
    kind: docs
interview:
  - q: "What's the difference between a container and a VM?"
    a: "Containers share the host kernel and are isolated with namespaces and cgroups; they start fast and are lightweight. VMs virtualise hardware and run their own kernel — stronger isolation, more overhead."
  - q: "Readiness vs liveness probe?"
    a: "Readiness decides whether the pod receives traffic (removed from Service endpoints when failing — e.g. warming up, dependency down). Liveness decides whether to restart the container (deadlocked). A liveness probe that checks dependencies can cause restart cascades."
  - q: "A pod is in CrashLoopBackOff. How do you debug it?"
    a: "kubectl describe pod (events, exit code, OOMKilled?), kubectl logs --previous for the crashed container's logs, check config/secrets/env, command and probes, resource limits; reproduce locally with the same image."
selfAssessment:
  - I can write a multi-stage Dockerfile for a Node or Java app
  - I can explain how a request reaches a pod through Ingress and Service
  - I can debug the four common pod failure states
completion:
  - Score at least 70% on the quiz
  - Explain a rolling deployment with probes in interview mode
quiz:
  - q: "Ordering Dockerfile instructions so dependency installation comes before copying source code:"
    options: ["Is irrelevant", "Maximises layer cache reuse when only source changes", "Makes images larger", "Is required by Docker"]
    answer: 1
    why: "COPY package*.json → npm ci → COPY . — source edits don't invalidate the dependency layer."
  - q: "A container exceeding its memory limit is:"
    options: ["Throttled", "OOMKilled", "Moved to another node", "Ignored"]
    answer: 1
    why: "CPU over limit is throttled; memory over limit is killed."
  - q: "A Kubernetes Service provides:"
    options: ["A container image", "A stable virtual IP/DNS name load-balancing to matching pods", "Persistent storage", "A CI pipeline"]
    answer: 1
    why: "Selectors match pod labels; kube-proxy or eBPF routes traffic."
  - q: "During a rolling update, readiness probes ensure:"
    options: ["Faster builds", "New pods receive traffic only when ready, so capacity isn't lost", "Old pods are deleted first", "Secrets rotate"]
    answer: 1
    why: "maxUnavailable/maxSurge plus readiness give zero-downtime rollouts."
explain:
  prompt: "Explain how you'd deploy a Node.js API on Kubernetes so that deployments cause no downtime."
  rubric:
    - "Image: multi-stage, non-root, small; config via env/ConfigMap/Secret"
    - "Deployment with replicas ≥2, rolling update (maxUnavailable 0, maxSurge)"
    - "Readiness probe; graceful shutdown handling SIGTERM; preStop/terminationGracePeriod"
    - "Resource requests/limits, PodDisruptionBudget; Service + Ingress"
  model: "I'd build a multi-stage image running as a non-root user with only production dependencies, and inject configuration via environment variables from a ConfigMap and Secrets. The Deployment runs at least two replicas with a rolling update strategy of maxUnavailable zero and maxSurge one, so a new pod must become ready before an old one is removed. A readiness probe on a lightweight /ready endpoint keeps traffic away until the app has connected to its dependencies. On SIGTERM the app stops accepting new connections, finishes in-flight requests and exits within the termination grace period; a short preStop sleep covers the delay before endpoints update. I'd set CPU and memory requests for scheduling and a memory limit, add a PodDisruptionBudget for node maintenance, and expose it through a Service and Ingress. With ArgoCD the manifests live in Git and sync automatically."
cards:
  - q: "Readiness vs liveness"
    a: "Readiness → traffic routing. Liveness → restart. Startup → protect slow starts."
  - q: "CPU vs memory limit exceeded"
    a: "CPU → throttled; memory → OOMKilled."
  - q: "Zero-downtime rolling update"
    a: "maxUnavailable 0, readiness probe, graceful SIGTERM handling, ≥2 replicas."
---

## Explanation

### Docker

- **Image** = layered read-only filesystem + metadata; **container** = running instance with a writable layer, namespaces (pid, net, mnt…) and cgroups (CPU/memory limits).
- Layers are cached by instruction; order from least to most frequently changing.
- **Multi-stage builds**: compile in a builder stage, copy artefacts into a slim runtime stage.
- Security: non-root `USER`, minimal base (distroless/alpine/slim), no secrets in layers, pin versions, scan images.

### Kubernetes objects

| Object | Purpose |
|---|---|
| Pod | one or more containers sharing network/volumes |
| Deployment / ReplicaSet | desired replicas, rolling updates |
| Service | stable name/IP, load balancing to pods by label |
| Ingress / Gateway | HTTP routing from outside |
| ConfigMap / Secret | configuration (Secrets are base64, not encrypted by default — enable encryption at rest / external secret stores) |
| HPA | autoscale replicas on metrics |
| Job / CronJob | batch work |

### Probes and lifecycle

Readiness, liveness, startup probes. Termination: pod removed from endpoints and sent SIGTERM concurrently → app must drain gracefully within `terminationGracePeriodSeconds`.

### Resources

**Requests** drive scheduling; **limits** cap usage. Set memory limit = request for predictability. JVM/Node need heap sizes aware of container limits.

### GitOps

ArgoCD syncs cluster state from Git manifests (Helm/Kustomize). Rollback = revert the commit.

## Worked examples

### Node.js Dockerfile

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Debugging cheat sheet

```bash
kubectl get pods -o wide
kubectl describe pod api-7d9f…      # events: OOMKilled, probe failures, image pull errors
kubectl logs api-7d9f… --previous   # logs of the crashed container
kubectl get events --sort-by=.lastTimestamp
kubectl exec -it api-7d9f… -- sh
```

## Common misconceptions

- **"Containers are secure sandboxes by default."** — Shared kernel; drop capabilities, run non-root.
- **"Liveness probes should check the database."** — A DB outage would restart every pod; use readiness.
- **"Secrets are encrypted."** — Base64 is encoding; configure encryption/external secrets.
- **"Limits = requests is wasteful."** — For memory it avoids surprises; tune CPU separately.

## Practical exercises

1. Write a Dockerfile for InterviewOS (Next.js standalone output) and measure the image size.
2. Write a Deployment with probes and resources for it; explain each field.
3. Simulate an OOMKilled pod in a local cluster (kind/minikube) and read the events.
