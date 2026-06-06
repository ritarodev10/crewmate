// =============================================================================
// prisma/seed.ts
//
// Idempotent demo seed. All IDs are fixed so re-running is safe.
// Run via: pnpm prisma db seed
// =============================================================================

import { PrismaClient, JobStatus, WorkerStatus, UserRole, WorkerKind, AssigneeKind, CancelCode } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return d
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const OPERATOR_ID = 'op-001'

const JOB_TYPE_DEFS = [
  { id: 'jt-01', name: 'HVAC_REPAIR',      label: 'HVAC Repair',      clientRatePerHour: 7200, estimatedHours: 3.0 },
  { id: 'jt-02', name: 'HVAC_MAINTENANCE', label: 'HVAC Maintenance',  clientRatePerHour: 5800, estimatedHours: 2.0 },
  { id: 'jt-03', name: 'AC_INSTALLATION',  label: 'AC Installation',   clientRatePerHour: 8000, estimatedHours: 4.0 },
  { id: 'jt-04', name: 'ELECTRICAL_PANEL', label: 'Electrical Panel',  clientRatePerHour: 8500, estimatedHours: 3.5 },
  { id: 'jt-05', name: 'PIPE_REPAIR',      label: 'Pipe Repair',       clientRatePerHour: 6800, estimatedHours: 2.5 },
  { id: 'jt-06', name: 'DRAIN_CLEANING',   label: 'Drain Cleaning',    clientRatePerHour: 5000, estimatedHours: 1.5 },
  { id: 'jt-07', name: 'LIGHTING_INSTALL', label: 'Lighting Install',  clientRatePerHour: 6200, estimatedHours: 2.0 },
  { id: 'jt-08', name: 'GENERATOR_REPAIR', label: 'Generator Repair',  clientRatePerHour: 9200, estimatedHours: 4.5 },
]

// Build photo URL arrays for each job type
function makeJobTypePhotos(name: string): { customerPhotos: string[]; workerPhotos: string[] } {
  const slug = name.toLowerCase().replace(/_/g, '-')
  return {
    customerPhotos: [
      `https://picsum.photos/seed/${slug}-before-1/400/300`,
      `https://picsum.photos/seed/${slug}-before-2/400/300`,
    ],
    workerPhotos: [
      `https://picsum.photos/seed/${slug}-after-1/400/300`,
      `https://picsum.photos/seed/${slug}-after-2/400/300`,
    ],
  }
}

const USER_DEFS = [
  { id: 'u-01', email: 'admin@crewmate.demo',     name: 'Admin System',    role: UserRole.SUPER_ADMIN },
  { id: 'u-02', email: 'marco.b@crewmate.demo',   name: 'Marco Bianchi',   role: UserRole.MANAGER    },
  { id: 'u-03', email: 'luca.f@crewmate.demo',    name: 'Luca Ferrari',    role: UserRole.TEAM_LEAD  },
  { id: 'u-04', email: 'sofia.c@crewmate.demo',   name: 'Sofia Conti',     role: UserRole.WORKER     },
  { id: 'u-05', email: 'davide.r@crewmate.demo',  name: 'Davide Russo',    role: UserRole.WORKER     },
  { id: 'u-06', email: 'elena.m@crewmate.demo',   name: 'Elena Moretti',   role: UserRole.WORKER     },
  { id: 'u-07', email: 'antonio.r@crewmate.demo', name: 'Antonio Ricci',   role: UserRole.WORKER     },
  { id: 'u-08', email: 'giulia.ro@crewmate.demo', name: 'Giulia Romano',   role: UserRole.WORKER     },
  { id: 'u-09', email: 'matteo.g@crewmate.demo',  name: 'Matteo Gallo',    role: UserRole.WORKER     },
  { id: 'u-10', email: 'chiara.m@crewmate.demo',  name: 'Chiara Marino',   role: UserRole.WORKER     },
  { id: 'u-11', email: 'roberto.c@crewmate.demo', name: 'Roberto Costa',   role: UserRole.WORKER     },
]

const WORKER_DEFS = [
  { id: 'w-01', userId: 'u-03', name: 'Luca Ferrari',  kind: WorkerKind.TEAM_LEAD,   hourlyRate: 3400, phone: '+39 333 100 0001', currentLat: 45.484, currentLng: 9.192, status: WorkerStatus.ON_JOB,  rating: 4.9 },
  { id: 'w-02', userId: 'u-04', name: 'Sofia Conti',   kind: WorkerKind.TEAM_MEMBER, hourlyRate: 2500, phone: '+39 333 100 0002', currentLat: 45.453, currentLng: 9.176, status: WorkerStatus.ON_JOB,  rating: 4.7 },
  { id: 'w-03', userId: 'u-05', name: 'Davide Russo',  kind: WorkerKind.TEAM_MEMBER, hourlyRate: 2500, phone: '+39 333 100 0003', currentLat: 45.470, currentLng: 9.179, status: WorkerStatus.ON_JOB,  rating: 4.6 },
  { id: 'w-04', userId: 'u-06', name: 'Elena Moretti', kind: WorkerKind.TEAM_MEMBER, hourlyRate: 2500, phone: '+39 333 100 0004', currentLat: 45.478, currentLng: 9.228, status: WorkerStatus.IDLE,    rating: 4.8 },
  { id: 'w-05', userId: 'u-07', name: 'Antonio Ricci', kind: WorkerKind.SOLO,        hourlyRate: 3000, phone: '+39 333 100 0005', currentLat: 45.464, currentLng: 9.190, status: WorkerStatus.ON_JOB,  rating: 5.0 },
  { id: 'w-06', userId: 'u-08', name: 'Giulia Romano', kind: WorkerKind.SOLO,        hourlyRate: 2800, phone: '+39 333 100 0006', currentLat: 45.472, currentLng: 9.186, status: WorkerStatus.ON_JOB,  rating: 4.8 },
  { id: 'w-07', userId: 'u-09', name: 'Matteo Gallo',  kind: WorkerKind.SOLO,        hourlyRate: 2600, phone: '+39 333 100 0007', currentLat: 45.499, currentLng: 9.212, status: WorkerStatus.IDLE,    rating: 4.3 },
  { id: 'w-08', userId: 'u-10', name: 'Chiara Marino', kind: WorkerKind.SOLO,        hourlyRate: 2900, phone: '+39 333 100 0008', currentLat: 45.511, currentLng: 9.190, status: WorkerStatus.ON_JOB,  rating: 4.9 },
  { id: 'w-09', userId: 'u-11', name: 'Roberto Costa', kind: WorkerKind.SOLO,        hourlyRate: 2500, phone: '+39 333 100 0009', currentLat: 45.457, currentLng: 9.183, status: WorkerStatus.IDLE,    rating: 4.5 },
]

const CUSTOMER_DEFS = [
  { id: 'c-01', name: 'UniCredit Tower',           address: 'Piazza Gae Aulenti 3',        contactName: 'Francesca Sala',     lat: 45.484, lng: 9.192 },
  { id: 'c-02', name: 'Politecnico di Milano',     address: 'Via Ponzio 34',               contactName: 'Prof. Andrea Neri',  lat: 45.478, lng: 9.228 },
  { id: 'c-03', name: 'Castello Sforzesco Offices',address: 'Via Beltrami 3',              contactName: 'Roberta Esposito',   lat: 45.470, lng: 9.179 },
  { id: 'c-04', name: 'Darsena Office Park',       address: 'Via Vigevano 10',             contactName: 'Giovanni Mazza',     lat: 45.453, lng: 9.176 },
  { id: 'c-05', name: 'Pinacoteca di Brera',       address: 'Via Brera 28',                contactName: 'Carla Ferragamo',    lat: 45.472, lng: 9.186 },
  { id: 'c-06', name: 'Lambrate Business Hub',     address: 'Via Conte Rosso 14',          contactName: 'Sergio Fontana',     lat: 45.477, lng: 9.237 },
  { id: 'c-07', name: 'Fieramilanocity',           address: 'Via Teodorico 10',            contactName: 'Lucia Gentile',      lat: 45.479, lng: 9.150 },
  { id: 'c-08', name: 'Niguarda Hospital Admin',   address: 'Piazza Ospedale Maggiore 3',  contactName: 'Dott. Mario Tosi',   lat: 45.511, lng: 9.190 },
  { id: 'c-09', name: 'Porta Romana Tech Hub',     address: 'Corso di Porta Romana 68',   contactName: 'Valentina Riva',     lat: 45.451, lng: 9.200 },
  { id: 'c-10', name: 'Meazza Stadium Facilities', address: 'Via Piccolomini 5',           contactName: 'Piero Zanetti',      lat: 45.478, lng: 9.124 },
  { id: 'c-11', name: 'Bovisa Campus',             address: 'Via Durando 38',              contactName: 'Marta Calvino',      lat: 45.503, lng: 9.159 },
  { id: 'c-12', name: 'Portello Shopping Center',  address: 'Via Colleoni 1',              contactName: 'Daniele Marini',     lat: 45.485, lng: 9.151 },
  { id: 'c-13', name: 'Palazzo Pirelli',           address: 'Via Fabio Filzi 22',          contactName: 'Ing. Simone Riva',   lat: 45.486, lng: 9.205 },
  { id: 'c-14', name: 'Fondazione Catella',        address: 'Via Sebenico 21',             contactName: 'Alessia Bucci',      lat: 45.490, lng: 9.191 },
  { id: 'c-15', name: 'QT8 Residences',            address: 'Via Quirino Majorana 100',    contactName: 'Paola Fabbri',       lat: 45.484, lng: 9.138 },
]

// ---------------------------------------------------------------------------
// Build a lookup map for job types by id (populated after upsert)
// ---------------------------------------------------------------------------
type JobTypeData = {
  id: string
  estimatedHours: number
  clientRatePerHour: number
  customerPhotos: string[]
  workerPhotos: string[]
}

type CustomerData = {
  id: string
  lat: number
  lng: number
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Starting seed...')

  // -------------------------------------------------------------------------
  // 1. Upsert Operator
  // -------------------------------------------------------------------------
  await prisma.operator.upsert({
    where: { id: OPERATOR_ID },
    update: { name: 'CrewMate Demo SpA', slug: 'crewmate-demo' },
    create: { id: OPERATOR_ID, name: 'CrewMate Demo SpA', slug: 'crewmate-demo' },
  })
  console.log('Operator upserted')

  // -------------------------------------------------------------------------
  // 2. Upsert JobTypes
  // -------------------------------------------------------------------------
  for (const jt of JOB_TYPE_DEFS) {
    const { customerPhotos, workerPhotos } = makeJobTypePhotos(jt.name)
    await prisma.jobType.upsert({
      where: { id: jt.id },
      update: {
        name: jt.name,
        label: jt.label,
        clientRatePerHour: jt.clientRatePerHour,
        estimatedHours: jt.estimatedHours,
        customerPhotos,
        workerPhotos,
      },
      create: {
        id: jt.id,
        operatorId: OPERATOR_ID,
        name: jt.name,
        label: jt.label,
        clientRatePerHour: jt.clientRatePerHour,
        estimatedHours: jt.estimatedHours,
        customerPhotos,
        workerPhotos,
      },
    })
  }
  console.log('JobTypes upserted')

  // -------------------------------------------------------------------------
  // 3. Upsert Users
  // -------------------------------------------------------------------------
  const passwordHash = await bcrypt.hash('demo1234', 10)

  for (const u of USER_DEFS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, name: u.name, role: u.role },
      create: {
        id: u.id,
        operatorId: OPERATOR_ID,
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
      },
    })
  }
  console.log('Users upserted')

  // -------------------------------------------------------------------------
  // 4. Upsert Workers
  // -------------------------------------------------------------------------
  for (const w of WORKER_DEFS) {
    // Find the user's email to use as worker email
    const userDef = USER_DEFS.find((u) => u.id === w.userId)!
    await prisma.worker.upsert({
      where: { id: w.id },
      update: {
        name: w.name,
        email: userDef.email,
        phone: w.phone,
        hourlyRate: w.hourlyRate,
        status: w.status,
        kind: w.kind,
        rating: w.rating,
        currentLat: w.currentLat,
        currentLng: w.currentLng,
      },
      create: {
        id: w.id,
        operatorId: OPERATOR_ID,
        userId: w.userId,
        name: w.name,
        email: userDef.email,
        phone: w.phone,
        hourlyRate: w.hourlyRate,
        status: w.status,
        kind: w.kind,
        rating: w.rating,
        currentLat: w.currentLat,
        currentLng: w.currentLng,
      },
    })
  }
  console.log('Workers upserted')

  // -------------------------------------------------------------------------
  // 5. Upsert Team + TeamMembers
  // -------------------------------------------------------------------------
  await prisma.team.upsert({
    where: { id: 'tm-01' },
    update: { name: 'Team Alfa', leadId: 'w-01' },
    create: {
      id: 'tm-01',
      operatorId: OPERATOR_ID,
      name: 'Team Alfa',
      leadId: 'w-01',
    },
  })

  const teamMemberIds = ['w-01', 'w-02', 'w-03', 'w-04']
  for (const workerId of teamMemberIds) {
    await prisma.teamMember.upsert({
      where: { workerId },
      update: { teamId: 'tm-01' },
      create: { teamId: 'tm-01', workerId },
    })
  }
  console.log('Team + TeamMembers upserted')

  // -------------------------------------------------------------------------
  // 6. Upsert Customers
  // -------------------------------------------------------------------------
  for (const c of CUSTOMER_DEFS) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        contactName: c.contactName,
      },
      create: {
        id: c.id,
        operatorId: OPERATOR_ID,
        name: c.name,
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        contactName: c.contactName,
      },
    })
  }
  console.log('Customers upserted')

  // -------------------------------------------------------------------------
  // Lookup helpers
  // -------------------------------------------------------------------------
  const jobTypeMap = new Map<string, JobTypeData>(
    JOB_TYPE_DEFS.map((jt) => {
      const { customerPhotos, workerPhotos } = makeJobTypePhotos(jt.name)
      return [
        jt.id,
        {
          id: jt.id,
          estimatedHours: jt.estimatedHours,
          clientRatePerHour: jt.clientRatePerHour,
          customerPhotos,
          workerPhotos,
        },
      ]
    }),
  )

  const customerMap = new Map<string, CustomerData>(
    CUSTOMER_DEFS.map((c) => [c.id, { id: c.id, lat: c.lat, lng: c.lng }]),
  )

  // -------------------------------------------------------------------------
  // 7. Upsert Today's Jobs
  // -------------------------------------------------------------------------
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  interface TodayJobDef {
    id: string
    customerId: string
    jobTypeId: string
    status: JobStatus
    progressPct: number
    schedHour: number
    schedMin: number
    assigneeKind: AssigneeKind
    workerId: string | null
    teamId: string | null
    customerRating?: number
    customerTestimony?: string
    cancelCode?: CancelCode
  }

  const todayJobs: TodayJobDef[] = [
    // Team Alfa jobs
    { id: 'J-001', customerId: 'c-01', jobTypeId: 'jt-03', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 7,  schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', customerRating: 5, customerTestimony: 'Excellent team, arrived early and left everything spotless.' },
    { id: 'J-002', customerId: 'c-02', jobTypeId: 'jt-02', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 7,  schedMin: 30, assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', customerRating: 5, customerTestimony: 'Sofia was professional and thorough. Very satisfied.' },
    { id: 'J-003', customerId: 'c-03', jobTypeId: 'jt-04', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 8,  schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', customerRating: 4, customerTestimony: 'Good work, clean finish. Slight delay but communicated well.' },
    { id: 'J-004', customerId: 'c-04', jobTypeId: 'jt-06', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 8,  schedMin: 30, assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', customerRating: 5, customerTestimony: 'Fast and efficient. Drain works perfectly now.' },
    { id: 'J-005', customerId: 'c-05', jobTypeId: 'jt-07', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 9,  schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', customerRating: 5, customerTestimony: 'Beautiful result. The new lighting transforms the gallery.' },
    { id: 'J-006', customerId: 'c-06', jobTypeId: 'jt-05', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 9,  schedMin: 15, assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', customerRating: 4, customerTestimony: 'Problem fixed correctly. Would use again.' },
    { id: 'J-007', customerId: 'c-07', jobTypeId: 'jt-01', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 9,  schedMin: 30, assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', customerRating: 5, customerTestimony: 'Diagnosed the issue quickly. System running perfectly.' },
    { id: 'J-008', customerId: 'c-08', jobTypeId: 'jt-08', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 10, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', customerRating: 5, customerTestimony: 'Critical work done with precision. Generator is fully operational.' },
    { id: 'J-009', customerId: 'c-09', jobTypeId: 'jt-04', status: JobStatus.IN_PROGRESS, progressPct: 75,  schedHour: 11, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-010', customerId: 'c-10', jobTypeId: 'jt-02', status: JobStatus.IN_PROGRESS, progressPct: 50,  schedHour: 11, schedMin: 30, assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-011', customerId: 'c-11', jobTypeId: 'jt-05', status: JobStatus.IN_PROGRESS, progressPct: 25,  schedHour: 12, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-012', customerId: 'c-12', jobTypeId: 'jt-06', status: JobStatus.IN_PROGRESS, progressPct: 50,  schedHour: 12, schedMin: 30, assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-013', customerId: 'c-13', jobTypeId: 'jt-07', status: JobStatus.IN_PROGRESS, progressPct: 75,  schedHour: 13, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-014', customerId: 'c-14', jobTypeId: 'jt-01', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 14, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-015', customerId: 'c-15', jobTypeId: 'jt-03', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 14, schedMin: 30, assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-016', customerId: 'c-01', jobTypeId: 'jt-06', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 15, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-017', customerId: 'c-02', jobTypeId: 'jt-08', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 15, schedMin: 30, assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-018', customerId: 'c-04', jobTypeId: 'jt-05', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 16, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01' },
    { id: 'J-019', customerId: 'c-05', jobTypeId: 'jt-04', status: JobStatus.CANCELLED,   progressPct: 0,   schedHour: 10, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', cancelCode: CancelCode.CUSTOMER_CANCELLED },
    { id: 'J-020', customerId: 'c-06', jobTypeId: 'jt-02', status: JobStatus.CANCELLED,   progressPct: 0,   schedHour: 11, schedMin: 0,  assigneeKind: AssigneeKind.TEAM, workerId: null, teamId: 'tm-01', cancelCode: CancelCode.EQUIPMENT_UNAVAILABLE },
    // Solo jobs
    { id: 'J-021', customerId: 'c-07', jobTypeId: 'jt-01', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 7,  schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-05', teamId: null, customerRating: 5, customerTestimony: 'Antonio solved a tricky HVAC fault in under 3 hours. Impressive.' },
    { id: 'J-022', customerId: 'c-08', jobTypeId: 'jt-05', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 7,  schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-06', teamId: null, customerRating: 5, customerTestimony: 'Quick and clean. No mess left behind, critical for a hospital.' },
    { id: 'J-023', customerId: 'c-01', jobTypeId: 'jt-06', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 7,  schedMin: 30, assigneeKind: AssigneeKind.SOLO, workerId: 'w-07', teamId: null, customerRating: 4, customerTestimony: 'Drain cleared, no issues. Standard but solid work.' },
    { id: 'J-024', customerId: 'c-09', jobTypeId: 'jt-07', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 8,  schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-08', teamId: null, customerRating: 5, customerTestimony: 'Great job! The new lighting looks fantastic in our office.' },
    { id: 'J-025', customerId: 'c-10', jobTypeId: 'jt-04', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 8,  schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-09', teamId: null, customerRating: 4, customerTestimony: 'Competent work. Panel upgraded without any disruption to operations.' },
    { id: 'J-026', customerId: 'c-11', jobTypeId: 'jt-03', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 9,  schedMin: 30, assigneeKind: AssigneeKind.SOLO, workerId: 'w-05', teamId: null, customerRating: 5, customerTestimony: 'Full AC install done properly. Very happy with the result.' },
    { id: 'J-027', customerId: 'c-12', jobTypeId: 'jt-02', status: JobStatus.COMPLETED,   progressPct: 100, schedHour: 10, schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-06', teamId: null, customerRating: 5, customerTestimony: 'Giulia is always reliable. System running better than ever.' },
    { id: 'J-028', customerId: 'c-03', jobTypeId: 'jt-08', status: JobStatus.IN_PROGRESS, progressPct: 75,  schedHour: 11, schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-08', teamId: null },
    { id: 'J-029', customerId: 'c-04', jobTypeId: 'jt-01', status: JobStatus.IN_PROGRESS, progressPct: 50,  schedHour: 12, schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-05', teamId: null },
    { id: 'J-030', customerId: 'c-05', jobTypeId: 'jt-05', status: JobStatus.IN_PROGRESS, progressPct: 25,  schedHour: 12, schedMin: 30, assigneeKind: AssigneeKind.SOLO, workerId: 'w-06', teamId: null },
    { id: 'J-031', customerId: 'c-14', jobTypeId: 'jt-06', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 13, schedMin: 30, assigneeKind: AssigneeKind.SOLO, workerId: 'w-07', teamId: null },
    { id: 'J-032', customerId: 'c-15', jobTypeId: 'jt-07', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 14, schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-09', teamId: null },
    { id: 'J-033', customerId: 'c-13', jobTypeId: 'jt-02', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 14, schedMin: 30, assigneeKind: AssigneeKind.SOLO, workerId: 'w-05', teamId: null },
    { id: 'J-034', customerId: 'c-06', jobTypeId: 'jt-04', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 15, schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-06', teamId: null },
    { id: 'J-035', customerId: 'c-02', jobTypeId: 'jt-05', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 15, schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-07', teamId: null },
    { id: 'J-036', customerId: 'c-08', jobTypeId: 'jt-03', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 15, schedMin: 30, assigneeKind: AssigneeKind.SOLO, workerId: 'w-08', teamId: null },
    { id: 'J-037', customerId: 'c-07', jobTypeId: 'jt-06', status: JobStatus.SCHEDULED,   progressPct: 0,   schedHour: 16, schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-09', teamId: null },
    { id: 'J-038', customerId: 'c-10', jobTypeId: 'jt-08', status: JobStatus.CANCELLED,   progressPct: 0,   schedHour: 9,  schedMin: 0,  assigneeKind: AssigneeKind.SOLO, workerId: 'w-05', teamId: null, cancelCode: CancelCode.WORKER_NO_SHOW },
    { id: 'J-039', customerId: 'c-09', jobTypeId: 'jt-01', status: JobStatus.CANCELLED,   progressPct: 0,   schedHour: 10, schedMin: 30, assigneeKind: AssigneeKind.SOLO, workerId: 'w-07', teamId: null, cancelCode: CancelCode.ACCESS_DENIED },
    { id: 'J-040', customerId: 'c-11', jobTypeId: 'jt-07', status: JobStatus.CANCELLED,   progressPct: 0,   schedHour: 11, schedMin: 30, assigneeKind: AssigneeKind.SOLO, workerId: 'w-09', teamId: null, cancelCode: CancelCode.DUPLICATE_JOB },
  ]

  for (const job of todayJobs) {
    const scheduledFor = setTime(today, job.schedHour, job.schedMin)
    const jt = jobTypeMap.get(job.jobTypeId)!
    const cust = customerMap.get(job.customerId)!

    let startedAt: Date | null = null
    let completedAt: Date | null = null
    let cancelledAt: Date | null = null
    let cancelledBy: string | null = null
    let cancelReasonCode: CancelCode | null = null

    if (job.status === JobStatus.COMPLETED) {
      startedAt = addMinutes(scheduledFor, 5)
      completedAt = addHours(startedAt, jt.estimatedHours)
    } else if (job.status === JobStatus.IN_PROGRESS) {
      startedAt = addMinutes(scheduledFor, 5)
    } else if (job.status === JobStatus.CANCELLED) {
      cancelledAt = addMinutes(scheduledFor, -30)
      cancelledBy = 'u-01'
      cancelReasonCode = job.cancelCode ?? null
    }

    await prisma.job.upsert({
      where: { id: job.id },
      update: {
        status: job.status,
        progressPct: job.progressPct,
        scheduledFor,
        startedAt,
        completedAt,
        cancelledAt,
        cancelledBy,
        cancelReasonCode,
        cancelReasonNote: null,
        customerRating: job.customerRating ?? null,
        customerTestimony: job.customerTestimony ?? null,
        workerId: job.workerId,
        teamId: job.teamId,
        assigneeKind: job.assigneeKind,
        customerPhotoUrls: jt.customerPhotos,
        workerPhotoUrls: jt.workerPhotos,
        lat: cust.lat,
        lng: cust.lng,
      },
      create: {
        id: job.id,
        operatorId: OPERATOR_ID,
        customerId: job.customerId,
        jobTypeId: job.jobTypeId,
        assigneeKind: job.assigneeKind,
        workerId: job.workerId,
        teamId: job.teamId,
        status: job.status,
        progressPct: job.progressPct,
        scheduledFor,
        startedAt,
        completedAt,
        cancelledAt,
        cancelledBy,
        cancelReasonCode,
        cancelReasonNote: null,
        estimatedHours: jt.estimatedHours,
        clientRatePerHour: jt.clientRatePerHour,
        customerPhotoUrls: jt.customerPhotos,
        workerPhotoUrls: jt.workerPhotos,
        lat: cust.lat,
        lng: cust.lng,
        customerRating: job.customerRating ?? null,
        customerTestimony: job.customerTestimony ?? null,
      },
    })
  }
  console.log("Today's jobs upserted")

  // -------------------------------------------------------------------------
  // 8. Upsert JobStatusEvents for today's jobs
  // -------------------------------------------------------------------------

  // Delete existing status events for today's 40 jobs so we can re-create them cleanly
  await prisma.jobStatusEvent.deleteMany({
    where: { jobId: { in: todayJobs.map((j) => j.id) } },
  })

  const statusEventsToCreate: {
    jobId: string
    actorUserId: string
    fromStatus: JobStatus | null
    toStatus: JobStatus
    occurredAt: Date
  }[] = []

  for (const job of todayJobs) {
    const scheduledFor = setTime(today, job.schedHour, job.schedMin)
    const jt = jobTypeMap.get(job.jobTypeId)!

    if (job.status === JobStatus.COMPLETED) {
      const startedAt = addMinutes(scheduledFor, 5)
      const completedAt = addHours(startedAt, jt.estimatedHours)

      statusEventsToCreate.push({
        jobId: job.id,
        actorUserId: 'u-01',
        fromStatus: JobStatus.SCHEDULED,
        toStatus: JobStatus.IN_PROGRESS,
        occurredAt: startedAt,
      })
      statusEventsToCreate.push({
        jobId: job.id,
        actorUserId: 'u-01',
        fromStatus: JobStatus.IN_PROGRESS,
        toStatus: JobStatus.COMPLETED,
        occurredAt: completedAt,
      })
    } else if (job.status === JobStatus.IN_PROGRESS) {
      const startedAt = addMinutes(scheduledFor, 5)
      statusEventsToCreate.push({
        jobId: job.id,
        actorUserId: 'u-01',
        fromStatus: JobStatus.SCHEDULED,
        toStatus: JobStatus.IN_PROGRESS,
        occurredAt: startedAt,
      })
    } else if (job.status === JobStatus.CANCELLED) {
      const cancelledAt = addMinutes(scheduledFor, -30)
      statusEventsToCreate.push({
        jobId: job.id,
        actorUserId: 'u-01',
        fromStatus: JobStatus.SCHEDULED,
        toStatus: JobStatus.CANCELLED,
        occurredAt: cancelledAt,
      })
    }
    // SCHEDULED jobs: no events yet
  }

  await prisma.jobStatusEvent.createMany({ data: statusEventsToCreate })
  console.log('JobStatusEvents created for today\'s jobs')

  // -------------------------------------------------------------------------
  // 9. Historical Jobs (days -7 through -1)
  // -------------------------------------------------------------------------

  // Delete all existing historical jobs first for idempotency
  const historicalPrefix = 'JH-'
  await prisma.jobStatusEvent.deleteMany({
    where: { job: { id: { startsWith: historicalPrefix } } },
  })
  await prisma.job.deleteMany({
    where: { id: { startsWith: historicalPrefix } },
  })

  // Config per day: [dayOffset, jobCount]
  const historicalDays: [number, number][] = [
    [-7, 28],
    [-6, 31],
    [-5, 27],
    [-4, 34],
    [-3, 32],
    [-2, 30],
    [-1, 36],
  ]

  // Rotating lists for historical jobs
  const histJobTypes = ['jt-01', 'jt-02', 'jt-03', 'jt-04', 'jt-05', 'jt-06', 'jt-07', 'jt-08']
  const histCustomers = ['c-01', 'c-02', 'c-03', 'c-04', 'c-05', 'c-06', 'c-07', 'c-08', 'c-09', 'c-10', 'c-11', 'c-12', 'c-13', 'c-14', 'c-15']
  const histWorkers = ['w-05', 'w-06', 'w-07', 'w-08', 'w-09']

  const historicalJobsToCreate: {
    id: string
    operatorId: string
    customerId: string
    jobTypeId: string
    assigneeKind: AssigneeKind
    workerId: string
    teamId: null
    status: JobStatus
    progressPct: number
    scheduledFor: Date
    startedAt: Date
    completedAt: Date
    cancelledAt: null
    cancelledBy: null
    cancelReasonCode: null
    cancelReasonNote: null
    estimatedHours: number
    clientRatePerHour: number
    customerPhotoUrls: string[]
    workerPhotoUrls: string[]
    lat: number
    lng: number
    customerRating: number
    customerTestimony: null
  }[] = []

  const historicalEventsToCreate: {
    jobId: string
    actorUserId: string
    fromStatus: JobStatus
    toStatus: JobStatus
    occurredAt: Date
  }[] = []

  let globalJobIndex = 0

  for (const [dayOffset, count] of historicalDays) {
    const dayBase = addDays(today, dayOffset)

    for (let n = 0; n < count; n++) {
      const jobId = `JH-${Math.abs(dayOffset)}-${String(n + 1).padStart(3, '0')}`
      const jtId = histJobTypes[globalJobIndex % histJobTypes.length]!
      const custId = histCustomers[globalJobIndex % histCustomers.length]!
      const workerId = histWorkers[globalJobIndex % histWorkers.length]!

      const jt = jobTypeMap.get(jtId)!
      const cust = customerMap.get(custId)!

      // Spread jobs through the working day (7am to 4pm)
      const startHour = 7 + (n % 9)
      const scheduledFor = setTime(dayBase, startHour, 0)
      const startedAt = addMinutes(scheduledFor, 5)
      const completedAt = addHours(startedAt, jt.estimatedHours)

      historicalJobsToCreate.push({
        id: jobId,
        operatorId: OPERATOR_ID,
        customerId: custId,
        jobTypeId: jtId,
        assigneeKind: AssigneeKind.SOLO,
        workerId,
        teamId: null,
        status: JobStatus.COMPLETED,
        progressPct: 100,
        scheduledFor,
        startedAt,
        completedAt,
        cancelledAt: null,
        cancelledBy: null,
        cancelReasonCode: null,
        cancelReasonNote: null,
        estimatedHours: jt.estimatedHours,
        clientRatePerHour: jt.clientRatePerHour,
        customerPhotoUrls: jt.customerPhotos,
        workerPhotoUrls: jt.workerPhotos,
        lat: cust.lat,
        lng: cust.lng,
        customerRating: 4 + (globalJobIndex % 2),
        customerTestimony: null,
      })

      historicalEventsToCreate.push(
        {
          jobId,
          actorUserId: 'u-01',
          fromStatus: JobStatus.SCHEDULED,
          toStatus: JobStatus.IN_PROGRESS,
          occurredAt: startedAt,
        },
        {
          jobId,
          actorUserId: 'u-01',
          fromStatus: JobStatus.IN_PROGRESS,
          toStatus: JobStatus.COMPLETED,
          occurredAt: completedAt,
        },
      )

      globalJobIndex++
    }
  }

  // Batch create all historical jobs
  await prisma.job.createMany({ data: historicalJobsToCreate })
  await prisma.jobStatusEvent.createMany({ data: historicalEventsToCreate })

  console.log('Historical jobs created')
  console.log('Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
