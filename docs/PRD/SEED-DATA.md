# CrewMate — Seed Data Tables

> All pre-seeded data. Each table is independent. Seed script should load in this order:
> Operator → JobTypes → Users → Workers → Teams → Customers → Jobs → JobStatusEvents → HistoricalJobs

---

## Table 1: Operator

| id | name | slug |
|---|---|---|
| op-001 | CrewMate Demo SpA | crewmate-demo |

---

## Table 2: Job Types

Client rate = billed per worker per hour. Photos are fixed per type — all jobs of same type share the same photo set.

| id | name | label | clientRate/hr (€) | estHours | customerPhotoKeyword | workerPhotoKeyword |
|---|---|---|---|---|---|---|
| jt-01 | HVAC_REPAIR | HVAC Repair | 72 | 3.0 | hvac,broken | hvac,repaired |
| jt-02 | HVAC_MAINTENANCE | HVAC Maintenance | 58 | 2.0 | hvac,unit | hvac,clean |
| jt-03 | AC_INSTALLATION | AC Installation | 80 | 4.0 | aircon,old | aircon,install |
| jt-04 | ELECTRICAL_PANEL | Electrical Panel | 85 | 3.5 | electrical,panel | electrical,fixed |
| jt-05 | PIPE_REPAIR | Pipe Repair | 68 | 2.5 | pipe,leak | pipe,repair |
| jt-06 | DRAIN_CLEANING | Drain Cleaning | 50 | 1.5 | drain,blocked | drain,clean |
| jt-07 | LIGHTING_INSTALL | Lighting Install | 62 | 2.0 | lighting,old | lighting,new |
| jt-08 | GENERATOR_REPAIR | Generator Repair | 92 | 4.5 | generator,fault | generator,running |

**Photo URLs** (use Picsum with deterministic seed per type):
```
customerPhoto: https://picsum.photos/seed/{typeName}-before/400/300
workerPhoto:   https://picsum.photos/seed/{typeName}-after/400/300
```

**Revenue examples (computed, not stored):**
- HVAC Repair, solo worker €28/hr: client €216, worker €84, profit €132 (61%)
- AC Installation, team of 4 (lead €34, members €25): client €1,280, workers €436, profit €844 (66%)
- Generator Repair, solo worker €30/hr: client €414, worker €135, profit €279 (67%)

---

## Table 3: Users

| id | name | email | password | role | avatarUrl |
|---|---|---|---|---|---|
| u-01 | Admin System | admin@crewmate.demo | demo1234 | SUPER_ADMIN | — |
| u-02 | Marco Bianchi | marco.b@crewmate.demo | demo1234 | MANAGER | avatar-marco.jpg |
| u-03 | Luca Ferrari | luca.f@crewmate.demo | demo1234 | TEAM_LEAD | avatar-luca.jpg |
| u-04 | Sofia Conti | sofia.c@crewmate.demo | demo1234 | WORKER | avatar-sofia.jpg |
| u-05 | Davide Russo | davide.r@crewmate.demo | demo1234 | WORKER | avatar-davide.jpg |
| u-06 | Elena Moretti | elena.m@crewmate.demo | demo1234 | WORKER | avatar-elena.jpg |
| u-07 | Antonio Ricci | antonio.r@crewmate.demo | demo1234 | WORKER | avatar-antonio.jpg |
| u-08 | Giulia Romano | giulia.ro@crewmate.demo | demo1234 | WORKER | avatar-giulia.jpg |
| u-09 | Matteo Gallo | matteo.g@crewmate.demo | demo1234 | WORKER | avatar-matteo.jpg |
| u-10 | Chiara Marino | chiara.m@crewmate.demo | demo1234 | WORKER | avatar-chiara.jpg |
| u-11 | Roberto Costa | roberto.c@crewmate.demo | demo1234 | WORKER | avatar-roberto.jpg |

---

## Table 4: Workers

hourlyRate = personal net contractor rate. Team lead's higher rate IS the "bonus" — no separate calculation.

| id | userId | name | kind | hourlyRate (€) | phone | currentLat | currentLng | status |
|---|---|---|---|---|---|---|---|---|
| w-01 | u-03 | Luca Ferrari | TEAM_LEAD | 34 | +39 333 100 0001 | 45.484 | 9.192 | ON_JOB |
| w-02 | u-04 | Sofia Conti | TEAM_MEMBER | 25 | +39 333 100 0002 | 45.453 | 9.176 | ON_JOB |
| w-03 | u-05 | Davide Russo | TEAM_MEMBER | 25 | +39 333 100 0003 | 45.470 | 9.179 | ON_JOB |
| w-04 | u-06 | Elena Moretti | TEAM_MEMBER | 25 | +39 333 100 0004 | 45.478 | 9.228 | IDLE |
| w-05 | u-07 | Antonio Ricci | SOLO | 30 | +39 333 100 0005 | 45.464 | 9.190 | ON_JOB |
| w-06 | u-08 | Giulia Romano | SOLO | 28 | +39 333 100 0006 | 45.472 | 9.186 | ON_JOB |
| w-07 | u-09 | Matteo Gallo | SOLO | 26 | +39 333 100 0007 | 45.499 | 9.212 | IDLE |
| w-08 | u-10 | Chiara Marino | SOLO | 29 | +39 333 100 0008 | 45.511 | 9.190 | ON_JOB |
| w-09 | u-11 | Roberto Costa | SOLO | 25 | +39 333 100 0009 | 45.457 | 9.183 | IDLE |

---

## Table 5: Teams

| id | name | leadWorkerId |
|---|---|---|
| tm-01 | Team Alfa | w-01 |

## Table 6: Team Members

| id | teamId | workerId |
|---|---|---|
| tm-01 | tm-01 | w-01 (lead) |
| tm-02 | tm-01 | w-02 |
| tm-03 | tm-01 | w-03 |
| tm-04 | tm-01 | w-04 |

---

## Table 7: Customers

| id | name | address | contactName | lat | lng |
|---|---|---|---|---|---|
| c-01 | UniCredit Tower | Piazza Gae Aulenti 3, Porta Nuova | Francesca Sala | 45.484 | 9.192 |
| c-02 | Politecnico di Milano | Via Ponzio 34, Città Studi | Prof. Andrea Neri | 45.478 | 9.228 |
| c-03 | Castello Sforzesco Offices | Via Beltrami 3, Sempione | Roberta Esposito | 45.470 | 9.179 |
| c-04 | Darsena Office Park | Via Vigevano 10, Navigli | Giovanni Mazza | 45.453 | 9.176 |
| c-05 | Pinacoteca di Brera | Via Brera 28, Brera | Carla Ferragamo | 45.472 | 9.186 |
| c-06 | Lambrate Business Hub | Via Conte Rosso 14, Lambrate | Sergio Fontana | 45.477 | 9.237 |
| c-07 | Fieramilanocity | Via Teodorico 10, Fiera | Lucia Gentile | 45.479 | 9.150 |
| c-08 | Niguarda Hospital Admin | Piazza Ospedale Maggiore 3 | Dott. Mario Tosi | 45.511 | 9.190 |
| c-09 | Porta Romana Tech Hub | Corso di Porta Romana 68 | Valentina Riva | 45.451 | 9.200 |
| c-10 | Meazza Stadium Facilities | Via Piccolomini 5, San Siro | Piero Zanetti | 45.478 | 9.124 |
| c-11 | Bovisa Campus | Via Durando 38, Bovisa | Marta Calvino | 45.503 | 9.159 |
| c-12 | Portello Shopping Center | Via Colleoni 1, Portello | Daniele Marini | 45.485 | 9.151 |
| c-13 | Palazzo Pirelli | Via Fabio Filzi 22, Centrale | Ing. Simone Riva | 45.486 | 9.205 |
| c-14 | Fondazione Catella | Via Sebenico 21, Isola | Alessia Bucci | 45.490 | 9.191 |
| c-15 | QT8 Residences | Via Quirino Majorana 100, QT8 | Paola Fabbri | 45.484 | 9.138 |

---

## Table 8: Today's Jobs (40 jobs — reset nightly)

> Date reference: TODAY. scheduledFor times in Europe/Rome. All jobs belong to op-001.
> `assigneeKind`: TEAM for Team Alfa jobs, SOLO for individual workers.

> Photos are derived from JobType (same URL per type). Rating + testimony only on COMPLETED jobs.

### Team Alfa Jobs (Luca leads — 20 jobs)

| id | customer | jobType | worker | status | pct | sched | rating | testimony |
|---|---|---|---|---|---|---|---|---|
| J-001 | UniCredit Tower | AC_INSTALLATION | w-01 Luca | COMPLETED | 100 | 07:00 | 5 | "Excellent team, arrived early and left everything spotless." |
| J-002 | Politecnico | HVAC_MAINTENANCE | w-02 Sofia | COMPLETED | 100 | 07:30 | 5 | "Sofia was professional and thorough. Very satisfied." |
| J-003 | Castello Offices | ELECTRICAL_PANEL | w-03 Davide | COMPLETED | 100 | 08:00 | 4 | "Good work, clean finish. Slight delay but communicated well." |
| J-004 | Darsena Office | DRAIN_CLEANING | w-04 Elena | COMPLETED | 100 | 08:30 | 5 | "Fast and efficient. Drain works perfectly now." |
| J-005 | Brera Pinacoteca | LIGHTING_INSTALL | w-01 Luca | COMPLETED | 100 | 09:00 | 5 | "Beautiful result. The new lighting transforms the gallery." |
| J-006 | Lambrate Hub | PIPE_REPAIR | w-02 Sofia | COMPLETED | 100 | 09:15 | 4 | "Problem fixed correctly. Would use again." |
| J-007 | Fieramilanocity | HVAC_REPAIR | w-03 Davide | COMPLETED | 100 | 09:30 | 5 | "Diagnosed the issue quickly. System running perfectly." |
| J-008 | Niguarda Hospital | GENERATOR_REPAIR | w-04 Elena | COMPLETED | 100 | 10:00 | 5 | "Critical work done with precision. Generator is fully operational." |
| J-009 | Porta Romana | ELECTRICAL_PANEL | w-01 Luca | IN_PROGRESS | 75 | 11:00 | — | — |
| J-010 | Meazza Stadium | HVAC_MAINTENANCE | w-02 Sofia | IN_PROGRESS | 50 | 11:30 | — | — |
| J-011 | Bovisa Campus | PIPE_REPAIR | w-03 Davide | IN_PROGRESS | 25 | 12:00 | — | — |
| J-012 | Portello Center | DRAIN_CLEANING | w-04 Elena | IN_PROGRESS | 50 | 12:30 | — | — |
| J-013 | Palazzo Pirelli | LIGHTING_INSTALL | w-01 Luca | IN_PROGRESS | 75 | 13:00 | — | — |
| J-014 | Fondazione Catella | HVAC_REPAIR | w-02 Sofia | SCHEDULED | 0 | 14:00 | — | — |
| J-015 | QT8 Residences | AC_INSTALLATION | w-03 Davide | SCHEDULED | 0 | 14:30 | — | — |
| J-016 | UniCredit Tower | DRAIN_CLEANING | w-04 Elena | SCHEDULED | 0 | 15:00 | — | — |
| J-017 | Politecnico | GENERATOR_REPAIR | w-01 Luca | SCHEDULED | 0 | 15:30 | — | — |
| J-018 | Darsena Office | PIPE_REPAIR | w-02 Sofia | SCHEDULED | 0 | 16:00 | — | — |
| J-019 | Brera Pinacoteca | ELECTRICAL_PANEL | w-03 Davide | CANCELLED | 0 | 10:00 | — | — |
| J-020 | Lambrate Hub | HVAC_MAINTENANCE | w-04 Elena | CANCELLED | 0 | 11:00 | — | — |

Cancellation reasons: J-019 = CUSTOMER_CANCELLED, J-020 = EQUIPMENT_UNAVAILABLE

---

### Solo Worker Jobs (Antonio, Giulia, Matteo, Chiara, Roberto — 20 jobs)

| id | customer | jobType | worker | status | pct | sched | rating | testimony |
|---|---|---|---|---|---|---|---|---|
| J-021 | Fieramilanocity | HVAC_REPAIR | w-05 Antonio | COMPLETED | 100 | 07:00 | 5 | "Antonio solved a tricky HVAC fault in under 3 hours. Impressive." |
| J-022 | Niguarda Hospital | PIPE_REPAIR | w-06 Giulia | COMPLETED | 100 | 07:00 | 5 | "Quick and clean. No mess left behind, critical for a hospital." |
| J-023 | UniCredit Tower | DRAIN_CLEANING | w-07 Matteo | COMPLETED | 100 | 07:30 | 4 | "Drain cleared, no issues. Standard but solid work." |
| J-024 | Porta Romana | LIGHTING_INSTALL | w-08 Chiara | COMPLETED | 100 | 08:00 | 5 | "Great job! The new lighting looks fantastic in our office." |
| J-025 | Meazza Stadium | ELECTRICAL_PANEL | w-09 Roberto | COMPLETED | 100 | 08:00 | 4 | "Competent work. Panel upgraded without any disruption to operations." |
| J-026 | Bovisa Campus | AC_INSTALLATION | w-05 Antonio | COMPLETED | 100 | 09:30 | 5 | "Full AC install done properly. Very happy with the result." |
| J-027 | Portello Center | HVAC_MAINTENANCE | w-06 Giulia | COMPLETED | 100 | 10:00 | 5 | "Giulia is always reliable. System running better than ever." |
| J-028 | Castello Offices | GENERATOR_REPAIR | w-08 Chiara | IN_PROGRESS | 75 | 11:00 | — | — |
| J-029 | Darsena Office | HVAC_REPAIR | w-05 Antonio | IN_PROGRESS | 50 | 12:00 | — | — |
| J-030 | Brera Pinacoteca | PIPE_REPAIR | w-06 Giulia | IN_PROGRESS | 25 | 12:30 | — | — |
| J-031 | Fondazione Catella | DRAIN_CLEANING | w-07 Matteo | SCHEDULED | 0 | 13:30 | — | — |
| J-032 | QT8 Residences | LIGHTING_INSTALL | w-09 Roberto | SCHEDULED | 0 | 14:00 | — | — |
| J-033 | Palazzo Pirelli | HVAC_MAINTENANCE | w-05 Antonio | SCHEDULED | 0 | 14:30 | — | — |
| J-034 | Lambrate Hub | ELECTRICAL_PANEL | w-06 Giulia | SCHEDULED | 0 | 15:00 | — | — |
| J-035 | Politecnico | PIPE_REPAIR | w-07 Matteo | SCHEDULED | 0 | 15:00 | — | — |
| J-036 | Niguarda Hospital | AC_INSTALLATION | w-08 Chiara | SCHEDULED | 0 | 15:30 | — | — |
| J-037 | Fieramilanocity | DRAIN_CLEANING | w-09 Roberto | SCHEDULED | 0 | 16:00 | — | — |
| J-038 | Meazza Stadium | GENERATOR_REPAIR | w-05 Antonio | CANCELLED | 0 | 09:00 | — | — |
| J-039 | Porta Romana | HVAC_REPAIR | w-07 Matteo | CANCELLED | 0 | 10:30 | — | — |
| J-040 | Bovisa Campus | LIGHTING_INSTALL | w-09 Roberto | CANCELLED | 0 | 11:30 | — | — |

Cancellation reasons: J-038 = WORKER_NO_SHOW, J-039 = ACCESS_DENIED, J-040 = DUPLICATE_JOB

---

## Table 8b: Customer Ratings Reference

All 15 completed jobs have a rating (1–5) and testimony. Average worker ratings:

| Worker | Avg Rating | Completed Today | Total Lifetime Rating |
|---|---|---|---|
| Luca Ferrari | 4.9 ⭐ | 8 | 4.8 (187 jobs) |
| Sofia Conti | 4.7 ⭐ | 3 | 4.6 (185 jobs) |
| Davide Russo | 4.6 ⭐ | 3 | 4.5 (181 jobs) |
| Elena Moretti | 4.8 ⭐ | 2 | 4.7 (179 jobs) |
| Antonio Ricci | 5.0 ⭐ | 3 | 4.8 (248 jobs) |
| Giulia Romano | 4.8 ⭐ | 2 | 4.7 (220 jobs) |
| Matteo Gallo | 4.3 ⭐ | 2 | 4.4 (201 jobs) |
| Chiara Marino | 4.9 ⭐ | 2 | 4.8 (232 jobs) |
| Roberto Costa | 4.5 ⭐ | 1 | 4.4 (178 jobs) |

Worker average rating is shown on their worker card (manager view) and on their profile in the worker app.

---

## Today's Summary (computed from above)

| Metric | Value |
|---|---|
| Total Jobs | 40 |
| Completed | 15 |
| In Progress | 8 |
| Scheduled | 12 |
| Cancelled | 5 |
| Active Workers | 8 (all with IN_PROGRESS jobs) |
| On-Time (< 15 min late) | 22 / 23 started = 95.6% |
| Total Revenue (completed jobs) | computed from job types × hours |
| Total Profit (system share) | computed from revenue × systemSharePct |

---

## Table 9: Job Templates (for "New Job" form)

Photos are inherited from JobType — no separate photo field needed on template.

| id | name | jobTypeId | customerId | defaultNotes | estHours | clientRate/hr (€) |
|---|---|---|---|---|---|---|
| tpl-01 | HVAC Quick Check | jt-02 | c-02 (Politecnico) | Routine quarterly maintenance | 2.0 | 58 |
| tpl-02 | Drain Emergency | jt-06 | c-04 (Darsena) | Blocked drain, urgent | 1.5 | 50 |
| tpl-03 | Pipe Leak | jt-05 | c-09 (Porta Romana) | Reported water leak under sink | 2.5 | 68 |
| tpl-04 | Lights Replacement | jt-07 | c-05 (Brera) | Replace ceiling lighting grid | 2.0 | 62 |
| tpl-05 | AC Full Install | jt-03 | c-01 (UniCredit) | New AC unit, full install | 4.0 | 80 |

---

## Table 10: Historical Jobs (last 7 days, for revenue trend chart)

> Only totals needed per day — seed script can generate these as COMPLETED jobs in the past.
> Use same job types and workers, just with past dates.

| Day | Jobs Created | Jobs Completed | Total Revenue (€) | Total Profit (€) |
|---|---|---|---|---|
| Today - 7 | 32 | 28 | 5,240 | 980 |
| Today - 6 | 35 | 31 | 5,890 | 1,102 |
| Today - 5 | 30 | 27 | 4,960 | 924 |
| Today - 4 | 38 | 34 | 6,320 | 1,210 |
| Today - 3 | 36 | 32 | 6,080 | 1,148 |
| Today - 2 | 34 | 30 | 5,620 | 1,058 |
| Yesterday | 40 | 36 | 7,020 | 1,340 |
| **Today** | **40** | **15 (live)** | **2,890 (live)** | **552 (live)** |

Seed these as pre-created COMPLETED Job rows with `scheduledFor` set to past dates.
Revenue/profit are derived, not stored — the historical jobs just need to be there so the queries return the right numbers.

---

## Table 11: Worker Earnings Summary (seed context for weekly/monthly tabs)

> These represent historical completed jobs that give each worker a realistic earnings history.
> Not stored as separate rows — derived from historical job rows.

| Worker | This Week (€) | Last Week (€) | This Month (€) | Lifetime (€) | Lifetime Jobs |
|---|---|---|---|---|---|
| Luca Ferrari (Lead) | 1,280 | 1,140 | 4,820 | 28,400 | 187 |
| Sofia Conti (Member) | 720 | 680 | 2,760 | 14,200 | 185 |
| Davide Russo (Member) | 680 | 720 | 2,680 | 13,800 | 181 |
| Elena Moretti (Member) | 700 | 660 | 2,700 | 12,600 | 179 |
| Antonio Ricci (Solo) | 940 | 880 | 3,560 | 21,200 | 248 |
| Giulia Romano (Solo) | 860 | 900 | 3,240 | 18,900 | 220 |
| Matteo Gallo (Solo) | 780 | 820 | 2,980 | 17,400 | 201 |
| Chiara Marino (Solo) | 920 | 860 | 3,480 | 20,100 | 232 |
| Roberto Costa (Solo) | 700 | 740 | 2,680 | 15,200 | 178 |

---

## Photo URL Convention

All photos are **pre-seeded at the JobType level** using Picsum with deterministic seeds.
Every job of the same type shows the same photos — intentional for demo simplicity.

```
customerPhotos (2 per job type — "Before"):
  https://picsum.photos/seed/hvac-repair-before-1/400/300
  https://picsum.photos/seed/hvac-repair-before-2/400/300

workerPhotos (2 per job type — "After", shown only on COMPLETED):
  https://picsum.photos/seed/hvac-repair-after-1/400/300
  https://picsum.photos/seed/hvac-repair-after-2/400/300
```

Pattern: `https://picsum.photos/seed/{jobTypeName}-{before|after}-{1|2}/400/300`

Seed loads these from the JobType table — no job-level photo logic needed.
Worker photos become visible in the UI when job.status transitions to COMPLETED (already in DB, just hidden).

---

## Demo Reset Behavior

`POST /demo/reset` does:
1. Set all jobs: `status = SCHEDULED, progressPct = 0, startedAt = null, completedAt = null, cancelReasonCode = null`
2. Restore cancel status for J-019, J-020, J-038, J-039, J-040 (these are always cancelled)
3. Set all workers: `status = IDLE`
4. Delete all JobStatusEvents created after seed
5. Does NOT touch historical jobs (past dates), customers, workers, users, or job types
