---
slug: tls
title: TLS and HTTPS
path: linux-networking
module: net-application
order: 2
minutes: 55
depth: full
practice: conceptual
summary: What TLS guarantees, the TLS 1.3 handshake, certificates and chains of trust, SNI, and the certificate errors you'll actually debug.
prerequisites: [tcp-ip, dns]
problems: []
objectives:
  - State what TLS provides (confidentiality, integrity, server authentication) and what it doesn't
  - Walk through a TLS 1.3 handshake including key exchange and certificate verification
  - Explain certificate chains, CAs, SNI, and where TLS terminates in typical architectures
  - Debug common certificate errors with openssl and curl
readings:
  - title: "RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3"
    url: https://www.rfc-editor.org/rfc/rfc8446
    kind: rfc
  - title: "Cloudflare Learning Center — What happens in a TLS handshake?"
    url: https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/
    kind: article
  - title: "High Performance Browser Networking — Transport Layer Security"
    url: https://hpbn.co/transport-layer-security-tls/
    kind: book
interview:
  - q: "How does the client know it's talking to the real server?"
    a: "The server presents a certificate binding its hostname to a public key, signed by a CA (through intermediates) that the client trusts. The client verifies the chain, validity dates, hostname (SAN) and that the server proves possession of the private key by signing the handshake transcript."
  - q: "What is SNI and why does it matter for CDNs?"
    a: "Server Name Indication: the client sends the hostname in the ClientHello so a server/IP hosting many sites can choose the right certificate. CDNs and reverse proxies rely on it to serve thousands of domains on shared IPs."
  - q: "What's new in TLS 1.3 compared with 1.2?"
    a: "1-RTT handshake (0-RTT resumption possible with replay caveats), only forward-secret (EC)DHE key exchange, removal of legacy ciphers and RSA key transport, and encryption of more of the handshake (including the certificate)."
selfAssessment:
  - I can explain the purpose of each handshake message at a high level
  - I can read openssl s_client output to find a chain problem
  - I know where TLS terminates in a CDN/load-balancer setup
completion:
  - Score at least 70% on the quiz
  - Explain the TLS 1.3 handshake in interview mode
quiz:
  - q: "Forward secrecy means:"
    options: ["Certificates never expire", "Compromise of the server's long-term key doesn't reveal past session keys", "Data is compressed", "Clients authenticate first"]
    answer: 1
    why: "Ephemeral (EC)DHE keys are discarded after the session."
  - q: "A certificate valid for api.example.com used on www.example.com fails because of:"
    options: ["Expiry", "Hostname mismatch (not in Subject Alternative Names)", "Weak cipher", "Wrong port"]
    answer: 1
    why: "Clients check SAN entries (wildcards cover one label)."
  - q: "'unable to get local issuer certificate' usually means:"
    options: ["The server is down", "The server didn't send the intermediate certificate(s), so the chain can't be built", "The client clock is wrong", "TLS 1.0 is disabled"]
    answer: 1
    why: "Serve the full chain (leaf + intermediates)."
  - q: "In a typical CDN setup, TLS is terminated:"
    options: ["Only at the origin", "At the CDN edge, with a separate TLS connection from edge to origin", "Never", "At the DNS resolver"]
    answer: 1
    why: "The edge needs plaintext to cache; edge-to-origin should also be encrypted and authenticated."
explain:
  prompt: "Explain what happens in a TLS 1.3 handshake and how the client decides to trust the server."
  rubric:
    - "ClientHello with supported versions/ciphers, key share and SNI"
    - "ServerHello with key share; both derive shared secrets via (EC)DHE (forward secrecy)"
    - "Server sends certificate chain and CertificateVerify (proof of private key), then Finished"
    - "Client validates chain to a trusted root, validity period, hostname/SAN"
    - "1 RTT before application data; mentions resumption/0-RTT trade-off"
  model: "After the TCP handshake, the client sends a ClientHello with the TLS versions and cipher suites it supports, an ephemeral key share for elliptic-curve Diffie-Hellman, and the hostname via SNI. The server answers with a ServerHello containing its own key share; from the two shares both sides derive the same secret without ever sending it, and because the keys are ephemeral, leaking the server's long-term key later can't decrypt this session. The rest of the handshake is encrypted: the server sends its certificate chain, a CertificateVerify signature over the handshake proving it holds the private key, and a Finished message. The client checks that the chain leads to a root CA in its trust store, that the certificates are within their validity period, and that the hostname matches a Subject Alternative Name. All of this takes one round trip; resumption can allow 0-RTT data, which can be replayed, so it's only safe for idempotent requests."
cards:
  - q: "TLS guarantees"
    a: "Confidentiality, integrity, server authentication (optionally client auth via mTLS)."
  - q: "TLS 1.3 handshake cost"
    a: "1 RTT (0-RTT resumption possible, replayable)."
  - q: "Debug a chain"
    a: "openssl s_client -connect host:443 -servername host -showcerts"
---

## Explanation

### What TLS gives you

- **Confidentiality** — symmetric encryption (AES-GCM, ChaCha20-Poly1305).
- **Integrity** — AEAD tags detect tampering.
- **Authentication** — the server proves its identity with a certificate; optionally the client too (**mTLS**, common between services).

It doesn't hide the destination IP, and (without ECH) the SNI hostname is visible.

### TLS 1.3 handshake (1-RTT)

```text
ClientHello  (versions, cipher suites, key_share, SNI, ALPN e.g. h2) →
             ← ServerHello (key_share)
             ← {EncryptedExtensions, Certificate, CertificateVerify, Finished}
{Finished} →
Application data (encrypted) ⇄
```
Both sides combine key shares via (EC)DHE → **forward secrecy**. **ALPN** negotiates HTTP/2 vs HTTP/1.1 during the handshake. TLS 1.2 needed 2 RTTs and allowed non-forward-secret RSA key exchange.

### Certificates and trust

- A **leaf certificate** binds a public key to names (SAN list), signed by an **intermediate CA**, signed by a **root CA** in the client's trust store.
- Servers must send leaf + intermediates; clients have roots.
- Validity dates are short (≤ 398 days; ACME/Let's Encrypt automates 90-day renewals).
- Revocation (OCSP, CRLs) is imperfect; short lifetimes reduce exposure.

### Where TLS terminates

Browser → **CDN/edge or load balancer** (terminates TLS, can cache and inspect) → new TLS connection → origin. Internal service-to-service traffic increasingly uses mTLS (service meshes).

## Worked examples

### Debugging a certificate problem

```bash
openssl s_client -connect api.example.com:443 -servername api.example.com -showcerts </dev/null
# Look for: "Verify return code: 0 (ok)", the chain depth, subject/issuer of each cert.
openssl x509 -noout -dates -subject -ext subjectAltName -in leaf.pem
curl -v https://api.example.com 2>&1 | grep -E 'SSL|subject|issuer|expire'
```

| Error | Likely cause |
|---|---|
| certificate has expired | renewal failed (automate + alert on expiry) |
| hostname mismatch | SAN missing the name, or SNI not sent / wrong vhost |
| unable to get local issuer certificate | intermediate missing from the served chain |
| self-signed certificate in chain | internal CA not in the client trust store |
| handshake failure / protocol version | client/server have no common version or cipher |

## Common misconceptions

- **"HTTPS hides which site I'm visiting."** — IP and (usually) SNI are visible.
- **"TLS is slow."** — TLS 1.3 adds one RTT; with resumption and connection reuse the cost is small; crypto is hardware-accelerated.
- **"curl -k fixes it."** — It disables verification and hides the real problem.
- **"The root CA should be in the served chain."** — Serve leaf + intermediates; roots come from the trust store.

## Practical exercises

1. Inspect the chains of three websites with `openssl s_client` and note the issuer hierarchy.
2. Create a local CA and a server certificate with `openssl`, serve it, and trigger the "self-signed certificate in chain" error, then fix trust.
3. Explain where TLS terminates in your Make infrastructure (ingress, service mesh) and why.
