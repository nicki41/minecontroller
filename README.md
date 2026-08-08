# minecraftpanel

Ein selbst gehostetes Management-Panel für mehrere Minecraft-Server. Jeder Server läuft in seinem eigenen Docker-Container (Basis-Image [`itzg/docker-minecraft-server`](https://github.com/itzg/docker-minecraft-server)), verwaltet über eine Fastify/TypeScript-API mit einer eingebetteten SQLite-Datenbank und einer React-Oberfläche. Ein einziger Container, kein separater Datenbankdienst — `docker compose up -d` reicht.

Funktionsumfang: Server-Erstellungs-Assistent (Vanilla/Paper/Fabric/Forge/NeoForge), Live-Konsole, Datei-Manager mit Monaco-Editor, Modrinth-Plugin-/Mod-Suche und -Installation, Spielerverwaltung (Whitelist/Op/Kick/Ban), mehrere Benutzer mit rollenbasierter und pro-Server-granularer Zugriffskontrolle, Audit-Log, Backups sowie RAM-/CPU-Limits pro Server.

## Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Setup](#setup)
- [.env-Konfiguration](#env-konfiguration)
- [Starten](#starten)
- [Admin-Account (Ersteinrichtung)](#admin-account-ersteinrichtung)
- [Backups](#backups)
- [Updates](#updates)
- [Troubleshooting](#troubleshooting)
- [Architektur](#architektur)
- [Security-Hinweise](#security-hinweise)
- [Development Setup](#development-setup)

## Voraussetzungen

- Docker Engine 24+ mit Docker Compose v2 (`docker compose`, nicht das alte `docker-compose`)
- Ein Linux-Host oder Docker Desktop (Windows/macOS) mit aktiviertem WSL2-Backend
- Mindestens so viel RAM, wie die Summe aller geplanten Minecraft-Server benötigt, plus ca. 256 MB für das Panel selbst (SQLite läuft eingebettet im selben Prozess, kein eigener DB-Dienst nötig)
- Freie Ports: der Panel-Port (Standard `3000`) sowie ein Port pro Minecraft-Server aus dem konfigurierten Bereich (Standard `25565`–`25664`)
- Kein separates Node.js nötig, sofern nur per Docker betrieben wird (siehe [Development Setup](#development-setup) für lokale Entwicklung ohne Container)

## Setup

```bash
git clone <dieses-repository>
cd minecraftpanel
cp .env.example .env
```

Danach `.env` bearbeiten (siehe nächster Abschnitt) — insbesondere `SESSION_SECRET` und `HOST_DATA_PATH` **müssen** angepasst werden. Für die Datenbank ist nichts zu konfigurieren.

## .env-Konfiguration

Alle Variablen sind in [`.env.example`](.env.example) kommentiert. Die wichtigsten:

| Variable | Bedeutung |
|---|---|
| `SESSION_SECRET` | Langer zufälliger Wert zum Signieren von Sessions, CSRF-Tokens und den pro-Server-RCON-Passwörtern. Erzeugen mit `openssl rand -hex 32`. **Vertraulich behandeln** — wer diesen Wert kennt, kann jede Session fälschen. |
| `WEB_ORIGIN` | Öffentlich erreichbare URL des Panels (für Cookie- und CORS-Einstellungen). In Produktion die echte `https://`-Domain eintragen. |
| `COOKIE_SECURE` | `true` lassen, sobald ein Reverse Proxy TLS terminiert. Nur bei reinem lokalen `http://`-Betrieb ohne TLS auf `false` setzen. |
| `HOST_DATA_PATH` | **Absoluter Pfad auf dem Docker-**Host** zum `./data`-Ordner dieses Projekts.** Siehe Erklärung unten — ein falscher Wert führt dazu, dass neu erstellte Minecraft-Container keine oder falsche Daten sehen. |
| `MC_PORT_RANGE_MIN` / `MC_PORT_RANGE_MAX` | Portbereich, aus dem das Panel beim Anlegen neuer Server automatisch einen freien Port wählt. |
| `MINECRAFT_IMAGE` | Docker-Image für Minecraft-Server-Container. Muss mit `itzg/docker-minecraft-server` kompatibel sein (VERSION/TYPE/EULA-Env-Var-Vertrag, RCON-Unterstützung). |

### Warum `HOST_DATA_PATH` ein eigener Wert ist (Docker-Host-Pfad-Problem)

Der API-Container mountet `./data` nach `/data` und arbeitet intern mit diesem Pfad (`DATA_PATH=/data`). Wenn die API aber selbst neue Minecraft-Server-Container erstellt (über den Docker-Socket), spricht sie dabei **direkt mit dem Docker-Daemon des Hosts** — und der Daemon kennt den Pfad `/data` aus Sicht des API-Containers nicht, sondern braucht den Pfad, wie er auf dem **Host** liegt, um den passenden Bind-Mount für den neuen Minecraft-Container anzulegen ("Sibling Container"-Problem). Deshalb muss `HOST_DATA_PATH` explizit auf den absoluten Host-Pfad zu `./data` gesetzt werden, z. B.:

```
# Linux/macOS:
HOST_DATA_PATH=/home/youruser/minecraftpanel/data
# Windows + Docker Desktop:
HOST_DATA_PATH=//c/Users/you/minecraftpanel/data
```

## Starten

```bash
docker compose up -d
```

Das baut/startet den einzigen `api`-Container (der beim Boot automatisch die SQLite-Datenbank unter `data/db.sqlite` anlegt bzw. migriert via `prisma migrate deploy`) und stellt das Panel unter `http://localhost:<PANEL_PORT>` (Standard `3000`) bereit — Frontend, API und Datenbank laufen alle im selben Container/Prozess.

Logs verfolgen:

```bash
docker compose logs -f api
```

Panel stoppen (Daten bleiben erhalten):

```bash
docker compose down
```

## Admin-Account (Ersteinrichtung)

Beim allerersten Aufruf von `http://localhost:3000` erkennt das Panel, dass noch kein Benutzer existiert, und zeigt einen Einrichtungs-Assistenten zum Anlegen des ersten Admin-Accounts (Owner-Rolle mit allen Rechten). Dieser Endpunkt (`POST /api/auth/setup`) funktioniert serverseitig **nur, solange noch kein Benutzer in der Datenbank existiert** — danach ist er dauerhaft gesperrt, unabhängig davon, was das Frontend anzeigt.

Weitere Benutzer werden anschließend über **Admin → Benutzer** vom Owner/Admin angelegt, inklusive Rollenzuweisung und optionalem pro-Server-Zugriff (Voll- oder Nur-Lese-Zugriff je Server).

## Backups

Jeder Server hat unter **Server → Einstellungen → Backups** eine manuelle Backup-Funktion. Ein Backup ist ein `tar`-Archiv des kompletten Server-Datenverzeichnisses, gespeichert unter `data/backups/<serverId>/` — **außerhalb** des eigentlichen Server-Datenverzeichnisses, damit ein Restore nicht sein eigenes Quellarchiv überschreiben kann.

- **Erstellen**: jederzeit möglich, auch während der Server läuft (Weltdaten können dabei theoretisch inkonsistent sein, wenn der Server währenddessen schreibt — für unterbrechungsfreien Betrieb vor dem Backup kurz stoppen).
- **Wiederherstellen**: erfordert einen gestoppten Server; ersetzt das komplette Datenverzeichnis durch den Inhalt des Backups.
- **Löschen**: entfernt nur die Archivdatei, nie das Live-Datenverzeichnis.

Für Offsite-Sicherung empfiehlt es sich zusätzlich, den gesamten `data/`-Ordner regelmäßig extern zu sichern (z. B. per `rsync`/`restic` auf dem Host) — die eingebaute Backup-Funktion ersetzt keine externe 3-2-1-Sicherung. Da auch die SQLite-Datenbank (`data/db.sqlite`, inkl. `-wal`/`-shm`-Begleitdateien im WAL-Modus) in diesem Ordner liegt, sichert eine externe `data/`-Sicherung automatisch Benutzer, Rollen, Audit-Log und Server-Metadaten mit — dafür idealerweise den API-Container kurz stoppen, damit die SQLite-Dateien währenddessen nicht beschrieben werden.

## Updates

```bash
git pull
docker compose build api
docker compose up -d
```

Datenbankmigrationen werden automatisch beim Start des `api`-Containers über `prisma migrate deploy` angewendet (siehe [`docker/entrypoint.sh`](docker/entrypoint.sh)) — kein manueller Migrationsschritt nötig. Laufende Minecraft-Server-Container sind von einem Panel-Update nicht betroffen, da sie eigenständige Container sind.

## Troubleshooting

**"EACCES" / Permission denied beim Schreiben in `data/`**
Der API-Container läuft mit fester UID/GID `1000:1000`. Falls der Host-Ordner `data/` andere Besitzrechte hat:
```bash
sudo chown -R 1000:1000 ./data
```

**Neu erstellte Server bleiben in "INSTALLING" hängen oder der Container findet keine Daten**
Meist ein falsch gesetztes `HOST_DATA_PATH` — siehe Erklärung oben. Prüfen mit `docker inspect <container>` und kontrollieren, ob der `Binds`-Eintrag auf einen tatsächlich existierenden Host-Pfad zeigt.

**Server-Erstellung schlägt mit "Provisioning failed unexpectedly" fehl, Logs zeigen `EACCES /var/run/docker.sock`**
Der `node`-User im Container hatte keinen Zugriff auf den (vom Host gemounteten) Docker-Socket, weil dessen Gruppen-GID auf dem Host nicht mit der GID im Container übereinstimmte — das Entrypoint-Skript erkennt die tatsächliche GID des Sockets jetzt automatisch beim Start und nimmt `node` in eine passende Gruppe auf (siehe `docker/entrypoint.sh`), dafür ist keine manuelle Aktion nötig. Tritt der Fehler trotzdem noch auf: Container neu bauen (`docker compose build api`) — ein altes Image ohne diesen Fix enthält den Fix noch nicht.

**Server-Erstellung schlägt mit "Port already used" fehl**
Der gewählte oder automatisch zugewiesene Port ist bereits durch einen anderen Server belegt, oder `MC_PORT_RANGE_MIN`/`MAX` ist zu eng gewählt für die Anzahl geplanter Server.

**Live-Konsole zeigt nichts an / Befehle kommen nicht an**
Der Server muss vollständig hochgefahren sein (Status "Running"); Befehle werden über RCON gesendet, das erst nach dem vollständigen Boot des Minecraft-Prozesses reagiert (siehe [Architektur](#architektur)).

**"database is locked" / SQLITE_BUSY in den Logs**
Kommt bei SQLite unter kurzzeitig gleichzeitigen Schreibzugriffen vor. Das Panel aktiviert beim Start automatisch WAL-Modus und einen 5s-`busy_timeout`, wodurch das in der Praxis so gut wie nie auftritt — falls doch (z. B. bei sehr vielen parallelen Anfragen), API-Container neu starten. Für ernsthafte Mehrbenutzer-Last mit vielen gleichzeitigen Schreibzugriffen ist SQLite grundsätzlich nicht das richtige Werkzeug.

## Architektur

```
apps/
  api/      Fastify + TypeScript + Prisma (SQLite) — REST-API, WebSockets, Docker-Orchestrierung
  web/      React + Vite + TypeScript + Tailwind — SPA, wird von der API mit ausgeliefert
packages/
  shared/   Gemeinsame Zod-Schemas, TypeScript-Typen und die RBAC-Permission-Logik
```

- **Datenbank**: SQLite statt eines separaten DB-Servers — bewusste Entscheidung für dieses Deployment-Profil (ein Admin/kleines Team, single-tenant, Docker Compose ohne Zusatzkonfiguration). Das Panel selbst erzeugt keine nennenswerte Schreiblast; WAL-Modus + `busy_timeout` (siehe `plugins/prisma.ts`) machen kurzzeitige gleichzeitige Schreibzugriffe robust. Bei echtem Mehrbenutzer-Betrieb mit hoher Parallelität wäre PostgreSQL die richtigere Wahl — dank Prisma ist ein späterer Wechsel im Wesentlichen ein Schema-Provider-Wechsel plus neue Migration, keine Anwendungslogik-Änderung.
- **Ein Container pro Minecraft-Server.** Die API erstellt/startet/stoppt Container über den Docker-Socket (`dockerode`) und nutzt dafür ausschließlich `itzg/docker-minecraft-server`-kompatible Images — kein selbstgeschriebener Installer für Vanilla/Paper/Fabric/Forge/NeoForge, da dieses Image die Installationslogik bereits robust abdeckt.
- **Konsole**: Logs werden per Docker-Log-Stream (`follow: true`) live gelesen; Befehle werden **nicht** über stdin-Attach gesendet (das ist mit diesem Image nachweislich unzuverlässig), sondern über einen selbst implementierten Source-RCON-Client. Das RCON-Passwort jedes Servers wird deterministisch aus `SESSION_SECRET` + Server-ID abgeleitet (HMAC-SHA256) statt separat gespeichert zu werden.
- **Netzwerk**: Minecraft-Container laufen in einem eigenen Docker-Netzwerk (`minecraftpanel_mc_net`), dem auch der API-Container beitritt — RCON ist so über Container-DNS erreichbar, ohne den Port jemals auf dem Host zu veröffentlichen.
- **RBAC**: Zugriffsrechte bestehen aus zwei Ebenen — globale, rollenbasierte Permissions (z. B. `servers.create`, `users.edit`) **und** pro-Server-Zugriffsstufen (`FULL` / `VIEW_ONLY` / kein Zugriff). Beide werden serverseitig in jedem Request geprüft (`requirePermission` / `requireServerAccess`), nicht nur im Frontend versteckt.
- **WebSocket**: Ein gemultiplexter Socket pro Server-Detailansicht (`/ws/servers/:id`) für Status, Live-Stats, Konsolen-Zeilen und Befehle.
- **Versions-Provider**: Vanilla (Mojang Piston-Meta), Paper (PaperMC `fill.papermc.io/v3`), Fabric (`meta.fabricmc.net`), Forge und NeoForge — jeweils in `apps/api/src/minecraft/providers/`.
- **Modrinth-Integration**: Suche, Projekt-/Versionsdetails und Installation laufen über die offizielle Modrinth-API v2. Heruntergeladene Dateien werden vor dem Speichern per SHA-1/SHA-512 gegen den von Modrinth gemeldeten Hash verifiziert.

## Security-Hinweise

Dieses Panel gewährt dem API-Container Zugriff auf den Docker-Socket des Hosts — das ist **funktional gleichbedeutend mit Root-Rechten auf dem Host**, falls der API-Prozess kompromittiert wird. Entsprechend gilt:

- Nur in einer vertrauenswürdigen, **single-tenant** Umgebung betreiben (ein Betreiber, eine Organisation) — nicht als Multi-Tenant-SaaS ohne zusätzliche Isolation (z. B. eigene VM pro Kunde).
- Das Panel selbst hinter einen TLS-terminierenden Reverse Proxy stellen (`COOKIE_SECURE=true`), nicht direkt unverschlüsselt exponieren.
- `SESSION_SECRET` wie ein Root-Passwort behandeln.

Umgesetzte Absicherungen (Auszug, geprüft gegen OWASP-Top-10-relevante Kategorien):

| Bereich | Umsetzung |
|---|---|
| Authentifizierung | Argon2id-Passwort-Hashing, zeitkonstanter Login-Vergleich (Dummy-Hash bei unbekanntem Benutzer, verhindert User-Enumeration per Timing), signierte httpOnly-Session-Cookies mit Sliding Expiration |
| Autorisierung / RBAC | Jede Route prüft serverseitig Permission und ggf. pro-Server-Zugriffsstufe; Privilege-Escalation-Schutz verhindert, dass Nicht-Owner die Owner-Rolle vergeben oder Rechte gewähren können, die sie selbst nicht besitzen (siehe `roles.service.ts`/`users.service.ts` + zugehörige Tests) |
| CSRF | `@fastify/csrf-protection`, Token an ein separates Secret-Cookie gebunden (nicht an die Session), auf allen mutierenden `/api`-Routen erzwungen |
| Path Traversal | Jeder Dateizugriff läuft über `safeResolve()` — Syntax-Check gegen `../`/absolute Pfade **plus** eine Laufzeitprüfung gegen Symlink-Escapes via `fs.realpath` |
| ZIP-Uploads | Schutz gegen Zip-Slip (jeder Eintragspfad wird gegen das Zielverzeichnis geprüft) und Dekompressionsbomben (Obergrenzen für Eintragsanzahl und Gesamtgröße) |
| Command Injection | Spielernamen/Konsolenbefehle werden validiert bzw. von Zeilenumbrüchen bereinigt, bevor sie an RCON übergeben werden; RCON ist ein Binärprotokoll, kein Shell-Aufruf |
| SSRF | Datei-Downloads von Modrinth sind serverseitig auf `https://cdn.modrinth.com` beschränkt (Hostname-Allowlist), bevor ein Fetch überhaupt ausgeführt wird |
| Docker-API-Missbrauch | Minecraft-Container laufen mit `no-new-privileges`, festem `PidsLimit`, expliziten Memory-/CPU-Limits und Dockers bereits eingeschränktem Default-Capability-Set (kein zusätzliches `CapDrop: ALL` — `itzg/docker-minecraft-server` braucht für seinen eigenen Root→minecraft-User-Wechsel im Entrypoint u. a. `CAP_CHOWN`/`CAP_SETUID`/`CAP_SETGID`; das Capability für Capability gegen ein unbekanntes drittes Image nachzujagen erwies sich als zerbrechlich, siehe Code-Kommentar in `DockerMinecraftRuntime.ts` — der eigentliche Minecraft-Prozess läuft am Ende trotzdem non-root, nur über den eigenen Mechanismus des Images statt unseren). Das Frontend hat keinen direkten Docker-API-Zugriff, nur die API-Schicht |
| SQL Injection | Ausschließlich über Prisma (parametrisierte Queries), keine rohen SQL-Strings mit Benutzereingaben |
| Rate Limiting | Login-Endpunkt ist rate-limitiert, um Brute-Force zu erschweren |

Bekannte, bewusst akzeptierte Restrisiken:
- Der Docker-Socket-Zugriff selbst (siehe oben) — architektonisch notwendig für die Kernfunktion des Panels, nicht weiter reduzierbar ohne Docker-in-Docker- oder Remote-API-Komplexität, die dem Ziel "einfach und wartbar" widersprechen würde.
- Monaco Web Worker sind aus Build-Kompatibilitätsgründen deaktiviert (siehe Code-Kommentar in `CodeEditor.tsx`) — reine Funktionseinbuße (kein erweitertes IntelliSense), kein Sicherheitsrisiko.

## Development Setup

Für lokale Entwicklung ohne vollständigen Docker-Rebuild bei jeder Änderung:

**Voraussetzungen**: Node.js ≥ 20, npm, und ein lokaler Docker-Daemon für die Minecraft-Container-Funktionalität. Keine separate Datenbank nötig — SQLite läuft eingebettet.

```bash
npm install
cp .env.example .env
echo 'DATABASE_URL=file:./prisma/dev.db' >> .env   # nur fürs lokale Dev nötig, siehe .env-Kommentar
npm run prisma:migrate -w apps/api
npm run dev
```

`npm run dev` startet `packages/shared` im Watch-Modus, die API (`tsx watch`) und das Vite-Dev-Frontend parallel. Das Frontend läuft dann auf seinem eigenen Vite-Port und proxyt API-Requests zur lokal laufenden API.

Nützliche Skripte (aus dem Repo-Root, wirken auf alle Workspaces):

| Befehl | Zweck |
|---|---|
| `npm run typecheck` | TypeScript-Prüfung aller Workspaces (baut zuerst `packages/shared`) |
| `npm run test` | Alle Vitest-Suiten (shared, api, web) |
| `npm run test:api` | Nur die API-Testsuite |
| `npm run build` | Produktions-Build aller Workspaces |
| `npm run lint` | ESLint für API und Web |
| `npm run prisma:studio` | Prisma Studio zum Inspizieren der Datenbank |

Tests laufen vollständig ohne echte Datenbank oder Docker-Daemon (Prisma- und Docker-Aufrufe sind in den jeweiligen Unit-Tests durch Fakes/Mocks ersetzt) — siehe `apps/api/src/**/*.test.ts`.
