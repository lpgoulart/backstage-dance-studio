/**
 * OpenAPI 3.0 specification for the Backstage API.
 * Served as JSON at /api/openapi.json and rendered by Swagger UI at /api/docs.
 */

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const arr = (items) => ({ type: 'array', items });
const json = (schema) => ({ 'application/json': { schema } });
const idParam = (name = 'id', description = 'Identificador') => ({ name, in: 'path', required: true, schema: { type: 'integer' }, description });
const q = (name, schema, description) => ({ name, in: 'query', required: false, schema, description });

const ERR = {
  400: { description: 'Requisição inválida', content: json(ref('Error')) },
  401: { description: 'Não autenticado', content: json(ref('Error')) },
  403: { description: 'Sem permissão para este perfil', content: json(ref('Error')) },
  404: { description: 'Recurso não encontrado', content: json(ref('Error')) },
};

/** Builds an operation with sane defaults */
function op(tag, summary, { description, auth = true, params = [], body, ok = 200, res, resDesc = 'Sucesso', errors = [], produces } = {}) {
  const o = { tags: [tag], summary, parameters: params, responses: {} };
  if (description) o.description = description;
  if (!auth) o.security = [];
  if (body) o.requestBody = { required: true, content: json(body) };
  o.responses[ok] = ok === 204
    ? { description: 'Sem conteúdo' }
    : { description: resDesc, ...(res ? { content: produces ? { [produces]: { schema: res } } : json(res) } : {}) };
  for (const e of [...(auth ? [401] : []), ...errors]) o.responses[e] = ERR[e];
  return o;
}

/** Standard CRUD block for a resource */
function crud(base, tag, name, schema, input, label) {
  return {
    [base]: {
      get: op(tag, `Listar ${label}`, { res: arr(ref(schema)), errors: [403] }),
      post: op(tag, `Criar ${name}`, { body: ref(input), ok: 201, res: ref(schema), errors: [400, 403] }),
    },
    [`${base}/{id}`]: {
      get: op(tag, `Detalhar ${name}`, { params: [idParam()], res: ref(schema), errors: [403, 404] }),
      put: op(tag, `Atualizar ${name}`, { params: [idParam()], body: ref(input), res: ref(schema), errors: [400, 403, 404], description: 'Atualização parcial: campos omitidos são mantidos.' }),
      delete: op(tag, `Excluir ${name}`, { params: [idParam()], ok: 204, errors: [403, 404] }),
    },
  };
}

const T = {
  auth: 'Autenticação',
  pub: 'Site público',
  portal: 'Portal do aluno / responsável',
  teacherArea: 'Área do professor',
  students: 'Gestão · Alunos',
  users: 'Gestão · Contas de acesso',
  classes: 'Gestão · Turmas e grade',
  teachers: 'Gestão · Professores',
  attendance: 'Gestão · Chamada',
  payments: 'Gestão · Financeiro',
  cms: 'Gestão · Conteúdo do site',
  analytics: 'Gestão · Analytics',
};

const schedule = {
  type: 'object',
  required: ['weekday', 'start_time', 'end_time'],
  properties: {
    id: { type: 'integer', readOnly: true },
    weekday: { type: 'integer', minimum: 0, maximum: 6, description: '0 = domingo … 6 = sábado', example: 1 },
    start_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '19:00' },
    end_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '20:30' },
  },
};

const schemas = {
  Error: { type: 'object', properties: { error: { type: 'string', example: 'Campos obrigatórios: name' } } },
  Ok: { type: 'object', properties: { ok: { type: 'boolean', example: true } } },

  User: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['manager', 'guardian', 'student', 'teacher'] }, phone: { type: 'string', nullable: true },
      created_at: { type: 'string' },
    },
  },
  UserInput: {
    type: 'object', required: ['name', 'email', 'password', 'role'],
    properties: {
      name: { type: 'string', example: 'Patrícia Lima' }, email: { type: 'string', format: 'email', example: 'patricia@exemplo.com' },
      password: { type: 'string', minLength: 6, example: 'segredo123' }, role: { type: 'string', enum: ['manager', 'guardian', 'student', 'teacher'] },
      phone: { type: 'string', example: '(92) 98888-7777' },
    },
  },
  LoginRequest: {
    type: 'object', required: ['email', 'password'],
    properties: { email: { type: 'string', example: 'admin@backstage.com' }, password: { type: 'string', example: 'backstage123' } },
  },
  LoginResponse: { type: 'object', properties: { token: { type: 'string', description: 'JWT válido por 7 dias' }, user: ref('User') } },

  Schedule: schedule,
  ClassSummary: {
    type: 'object',
    properties: { id: { type: 'integer' }, name: { type: 'string' }, style: { type: 'string' }, color: { type: 'string' } },
  },
  Class: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, name: { type: 'string', example: 'Dança Contemporânea' }, style: { type: 'string', example: 'Contemporâneo' },
      level: { type: 'string' }, teacher_id: { type: 'integer', nullable: true }, teacher: { type: 'string', nullable: true, description: 'Nome do professor (somente leitura)' },
      room: { type: 'string' }, capacity: { type: 'integer' },
      color: { type: 'string', example: '#9db4ff' }, description: { type: 'string' }, active: { type: 'boolean' },
      enrolled: { type: 'integer', description: 'Alunos ativos matriculados' }, schedules: arr(ref('Schedule')),
      students: { ...arr({ type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, level: { type: 'string' }, status: { type: 'string' } } }), description: 'Somente no detalhe' },
    },
  },
  ClassInput: {
    type: 'object', required: ['name', 'style'],
    properties: {
      name: { type: 'string', example: 'Jazz Kids' }, style: { type: 'string', example: 'Jazz' }, level: { type: 'string', example: 'Infantil' },
      teacher_id: { type: 'integer', nullable: true, example: 3, description: 'Professor ativo responsável (null = sem professor)' }, room: { type: 'string', example: 'Sala Coxia' },
      capacity: { type: 'integer', example: 18 }, color: { type: 'string', example: '#e8b04b' }, description: { type: 'string' },
      active: { type: 'boolean', example: true }, schedules: arr(ref('Schedule')),
    },
  },
  WeeklySession: {
    type: 'object',
    properties: {
      schedule_id: { type: 'integer' }, weekday: { type: 'integer' }, start_time: { type: 'string' }, end_time: { type: 'string' },
      class_id: { type: 'integer' }, name: { type: 'string' }, style: { type: 'string' }, level: { type: 'string' }, teacher: { type: 'string' },
      room: { type: 'string' }, color: { type: 'string' }, capacity: { type: 'integer' }, enrolled: { type: 'integer' },
    },
  },

  Teacher: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, name: { type: 'string', example: 'Carolina Reis' }, email: { type: 'string' }, phone: { type: 'string' },
      specialties: { type: 'string', example: 'Ballet Juvenil, Dança Contemporânea' }, bio: { type: 'string' },
      hourly_rate: { type: 'number', example: 75, description: 'Valor da hora-aula (R$)' },
      status: { type: 'string', enum: ['active', 'inactive'] }, hired_at: { type: 'string', format: 'date' },
      dismissed_at: { type: 'string', format: 'date', nullable: true }, dismissal_reason: { type: 'string', nullable: true },
      show_on_site: { type: 'boolean', description: 'Aparece na seção Equipe do site' }, notes: { type: 'string' },
      class_count: { type: 'integer' }, weekly_sessions: { type: 'integer' }, weekly_hours: { type: 'number' },
      student_count: { type: 'integer', description: 'Alunos ativos distintos nas turmas' },
      monthly_cost: { type: 'number', description: 'Estimativa: horas semanais × 4,33 × hora-aula' },
    },
  },
  TeacherDetail: {
    allOf: [ref('Teacher'), { type: 'object', properties: { login_email: { type: 'string', nullable: true, description: 'E-mail de acesso à Área do professor' }, classes: arr(ref('Class')), attendance_rate: { type: 'integer', nullable: true, description: '% de presença nas turmas (30 dias)' } } }],
  },
  TeacherInput: {
    type: 'object', required: ['name'],
    properties: {
      name: { type: 'string', example: 'Bianca Souza' }, email: { type: 'string' }, phone: { type: 'string' }, specialties: { type: 'string', example: 'Jazz, Contemporâneo' },
      bio: { type: 'string' }, hourly_rate: { type: 'number', example: 60 }, hired_at: { type: 'string', format: 'date' },
      show_on_site: { type: 'boolean' }, notes: { type: 'string' },
      classIds: { ...arr({ type: 'integer' }), description: 'Turmas que passam a ser deste professor' },
      login: { type: 'object', description: 'Opcional: cria o acesso à Área do professor', properties: { email: { type: 'string' }, password: { type: 'string' } } },
    },
  },
  TeacherLoginInput: {
    type: 'object', required: ['email'],
    properties: { email: { type: 'string', example: 'bianca@backstagestudio.com.br' }, password: { type: 'string', minLength: 6, description: 'Obrigatória ao criar; opcional ao alterar (redefine a senha)' } },
  },
  ClassLog: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, class_id: { type: 'integer' }, class_name: { type: 'string' }, color: { type: 'string' }, teacher_id: { type: 'integer' },
      date: { type: 'string', format: 'date' }, title: { type: 'string', example: 'Coreografia da Mostra — 2º bloco' }, content: { type: 'string' }, created_at: { type: 'string' },
    },
  },
  ClassLogInput: {
    type: 'object', required: ['classId', 'date', 'content'],
    properties: { classId: { type: 'integer', example: 6 }, date: { type: 'string', format: 'date' }, title: { type: 'string' }, content: { type: 'string', example: 'Passamos o 2º bloco da coreografia.' } },
  },
  RosterStudent: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, name: { type: 'string' }, age: { type: 'integer', nullable: true }, birth_date: { type: 'string' }, level: { type: 'string' },
      notes: { type: 'string', nullable: true, description: 'Observações (alergias, restrições…)' }, phone: { type: 'string', nullable: true },
      guardian_name: { type: 'string', nullable: true }, guardian_phone: { type: 'string', nullable: true }, enrolled_at: { type: 'string' },
      total_present: { type: 'integer' }, rate30: { type: 'integer', nullable: true }, last: { ...arr({ type: 'string', enum: ['present', 'late', 'absent'] }), description: 'Últimas 5 chamadas' },
    },
  },
  TeacherClassDetail: {
    allOf: [ref('Class'), { type: 'object', properties: {
      students: arr(ref('RosterStudent')),
      stats: { type: 'object', properties: { avg_age: { type: 'number' }, attendance_rate: { type: 'integer' }, sessions_given: { type: 'integer' }, levels: { type: 'object', additionalProperties: { type: 'integer' } } } },
    } }],
  },
  TeacherDashboard: {
    type: 'object',
    properties: {
      teacher: ref('Teacher'),
      today: arr({ type: 'object', properties: { class_id: { type: 'integer' }, class_name: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, room: { type: 'string' }, enrolled: { type: 'integer' }, state: { type: 'string', enum: ['upcoming', 'live', 'done'] }, attendance_taken: { type: 'boolean' } } }),
      next: ref('UpcomingSession'),
      pending: { ...arr({ type: 'object', properties: { class_id: { type: 'integer' }, class_name: { type: 'string' }, date: { type: 'string' }, start_time: { type: 'string' } } }), description: 'Aulas dos últimos 14 dias sem chamada' },
      classes: arr({ type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, enrolled: { type: 'integer' }, capacity: { type: 'integer' }, attendance_rate: { type: 'integer', nullable: true } } }),
      totals: { type: 'object', properties: { students: { type: 'integer' }, classes: { type: 'integer' }, attendance_rate: { type: 'integer' }, month_sessions: { type: 'integer' }, month_hours: { type: 'number' }, month_earnings: { type: 'number', description: 'Estimativa: horas dadas no mês × hora-aula' } } },
      birthdays: arr({ type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, date: { type: 'string' }, in_days: { type: 'integer' }, turning: { type: 'integer' } } }),
      atRisk: arr({ type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, class_name: { type: 'string' }, rate: { type: 'integer' } } }),
      trend: arr({ type: 'object', properties: { week: { type: 'string' }, taxa: { type: 'integer' } } }),
      events: arr(ref('Event')), logs: arr(ref('ClassLog')),
    },
  },
  DismissInput: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date', example: '2026-11-05' }, reason: { type: 'string', example: 'Fim de contrato' },
      reassign: { type: 'object', additionalProperties: { type: 'integer', nullable: true }, example: { 4: 2, 5: null }, description: 'Mapa turma → novo professor. Turmas fora do mapa ficam sem professor.' },
    },
  },

  Student: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, name: { type: 'string' }, birth_date: { type: 'string', format: 'date' }, email: { type: 'string' },
      phone: { type: 'string' }, level: { type: 'string', example: 'Intermediário' }, status: { type: 'string', enum: ['active', 'inactive'] },
      guardian_id: { type: 'integer', nullable: true }, guardian_name: { type: 'string', nullable: true }, guardian_email: { type: 'string', nullable: true },
      user_id: { type: 'integer', nullable: true, description: 'Conta de acesso do próprio aluno' }, login_email: { type: 'string', nullable: true },
      monthly_fee: { type: 'number', example: 180 }, notes: { type: 'string' }, joined_at: { type: 'string', format: 'date' },
      classes: arr(ref('ClassSummary')),
    },
  },
  StudentDetail: {
    allOf: [ref('Student'), {
      type: 'object',
      properties: {
        classes: arr(ref('Class')), stats: ref('AttendanceStats'), payments: arr(ref('Payment')),
        recentAttendance: arr({ type: 'object', properties: { date: { type: 'string' }, status: { type: 'string' }, class_name: { type: 'string' } } }),
      },
    }],
  },
  StudentInput: {
    type: 'object', required: ['name'],
    properties: {
      name: { type: 'string', example: 'Helena Barros' }, birth_date: { type: 'string', format: 'date', example: '2017-04-12' },
      email: { type: 'string' }, phone: { type: 'string' }, level: { type: 'string', example: 'Iniciante' },
      status: { type: 'string', enum: ['active', 'inactive'] }, monthly_fee: { type: 'number', example: 180 }, notes: { type: 'string' },
      joined_at: { type: 'string', format: 'date' },
      classIds: { ...arr({ type: 'integer' }), example: [2, 4], description: 'Turmas em que o aluno fica matriculado (substitui as atuais)' },
      guardian_id: { type: 'integer', description: 'Vincular a um responsável existente' },
      guardian: {
        type: 'object', description: 'Ou criar/vincular responsável por e-mail',
        properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, phone: { type: 'string' } },
      },
      login: {
        type: 'object', description: 'Cria uma conta de acesso para o próprio aluno (adultos)',
        properties: { email: { type: 'string' }, password: { type: 'string' } },
      },
    },
  },

  AttendanceStats: {
    type: 'object',
    properties: {
      total: { type: 'integer' }, present: { type: 'integer' }, late: { type: 'integer' }, absent: { type: 'integer' },
      rate30: { type: 'integer', nullable: true, description: '% de presença nos últimos 30 dias' },
      streakWeeks: { type: 'integer', description: 'Semanas consecutivas com presença' }, bestOnTimeRun: { type: 'integer' },
    },
  },
  AttendanceRoster: {
    type: 'object',
    properties: {
      classId: { type: 'integer' }, date: { type: 'string', format: 'date' },
      roster: arr({ type: 'object', properties: { student_id: { type: 'integer' }, name: { type: 'string' }, level: { type: 'string' }, status: { type: 'string', nullable: true, enum: ['present', 'absent', 'late', null] } } }),
    },
  },
  AttendanceInput: {
    type: 'object', required: ['classId', 'date', 'records'],
    properties: {
      classId: { type: 'integer', example: 2 }, date: { type: 'string', format: 'date', example: '2026-11-04' },
      records: {
        ...arr({ type: 'object', properties: { studentId: { type: 'integer' }, status: { type: 'string', enum: ['present', 'absent', 'late'], nullable: true, description: 'null remove o registro' } } }),
        example: [{ studentId: 1, status: 'present' }, { studentId: 5, status: 'late' }],
      },
    },
  },

  Payment: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, student_id: { type: 'integer' }, student_name: { type: 'string' }, reference_month: { type: 'string', example: '2026-11' },
      amount: { type: 'number' }, due_date: { type: 'string', format: 'date' }, status: { type: 'string', enum: ['paid', 'pending', 'overdue'] },
      paid_at: { type: 'string', nullable: true },
    },
  },

  Event: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, title: { type: 'string' }, description: { type: 'string' }, date: { type: 'string', format: 'date' },
      time: { type: 'string', example: '19:00' }, location: { type: 'string' }, category: { type: 'string', example: 'Espetáculo' },
      image_url: { type: 'string', nullable: true }, published: { type: 'boolean' },
      going_count: { type: 'integer' }, maybe_count: { type: 'integer' },
    },
  },
  EventInput: {
    type: 'object', required: ['title', 'date'],
    properties: {
      title: { type: 'string', example: 'Mostra de Fim de Ano' }, description: { type: 'string' }, date: { type: 'string', format: 'date', example: '2026-12-12' },
      time: { type: 'string', example: '19:00' }, location: { type: 'string', example: 'Teatro Amazonas' }, category: { type: 'string', example: 'Espetáculo' },
      image_url: { type: 'string' }, published: { type: 'boolean', example: true },
    },
  },
  PortalEvent: {
    allOf: [ref('Event'), { type: 'object', properties: { rsvp: { type: 'string', nullable: true, enum: ['going', 'maybe', 'not_going', null] } } }],
  },
  RsvpInput: {
    type: 'object', required: ['studentId', 'status'],
    properties: { studentId: { type: 'integer', example: 1 }, status: { type: 'string', enum: ['going', 'maybe', 'not_going'] } },
  },

  Project: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, title: { type: 'string', example: "Disney 25'" }, year: { type: 'integer', example: 2025 },
      category: { type: 'string' }, description: { type: 'string' }, image_url: { type: 'string', nullable: true },
      color: { type: 'string' }, highlight: { type: 'boolean', description: 'Aparece em destaque na home' }, sort_order: { type: 'integer' },
    },
  },
  ProjectInput: {
    type: 'object', required: ['title'],
    properties: {
      title: { type: 'string' }, year: { type: 'integer' }, category: { type: 'string' }, description: { type: 'string' },
      image_url: { type: 'string' }, color: { type: 'string' }, highlight: { type: 'boolean' }, sort_order: { type: 'integer' },
    },
  },

  Announcement: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, title: { type: 'string' }, body: { type: 'string' },
      audience: { type: 'string', enum: ['public', 'students'], description: 'public = site e portal; students = só portal' },
      pinned: { type: 'boolean' }, published: { type: 'boolean' }, created_at: { type: 'string' },
    },
  },
  AnnouncementInput: {
    type: 'object', required: ['title'],
    properties: {
      title: { type: 'string', example: 'Recesso de fim de ano' }, body: { type: 'string' },
      audience: { type: 'string', enum: ['public', 'students'] }, pinned: { type: 'boolean' }, published: { type: 'boolean' },
    },
  },

  SiteContent: {
    type: 'object',
    description: 'Blocos dinâmicos exibidos no site. Cada chave guarda um JSON livre.',
    properties: {
      hero: { type: 'object', properties: { eyebrow: { type: 'string' }, title: { type: 'string' }, subtitle: { type: 'string' }, ctaLabel: { type: 'string' }, ctaLink: { type: 'string' } } },
      banner: { type: 'object', properties: { enabled: { type: 'boolean' }, text: { type: 'string' }, link: { type: 'string' } } },
      about: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' }, mission: { type: 'string' }, values: arr({ type: 'string' }) } },
      stats: arr({ type: 'object', properties: { value: { type: 'number' }, suffix: { type: 'string' }, label: { type: 'string' } } }),
      styles: arr({ type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } }),
      contact: { type: 'object', properties: { address: { type: 'string' }, phone: { type: 'string' }, whatsapp: { type: 'string' }, email: { type: 'string' }, instagram: { type: 'string' }, hours: { type: 'string' } } },
      team: arr({ type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' } } }),
      timeline: arr({ type: 'object', properties: { year: { type: 'string' }, text: { type: 'string' } } }),
      testimonials: arr({ type: 'object', properties: { quote: { type: 'string' }, author: { type: 'string' } } }),
    },
  },

  ContactInput: {
    type: 'object', required: ['name', 'message'],
    properties: {
      name: { type: 'string', example: 'Paula Sarmento' }, email: { type: 'string', example: 'paula@exemplo.com' },
      phone: { type: 'string', example: '(92) 98877-1122' }, interest: { type: 'string', example: 'Ballet' },
      message: { type: 'string', example: 'Gostaria de agendar uma aula experimental.' },
    },
    description: 'Informe e-mail ou telefone.',
  },
  ContactMessage: {
    type: 'object',
    properties: {
      id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, interest: { type: 'string' },
      message: { type: 'string' }, status: { type: 'string', enum: ['new', 'read', 'answered'] }, created_at: { type: 'string' },
    },
  },

  UpcomingSession: {
    type: 'object',
    properties: {
      class_id: { type: 'integer' }, class_name: { type: 'string' }, style: { type: 'string' }, teacher: { type: 'string' }, room: { type: 'string' },
      color: { type: 'string' }, date: { type: 'string', format: 'date' }, weekday: { type: 'integer' }, start_time: { type: 'string' },
      end_time: { type: 'string' }, starts_at: { type: 'string', format: 'date-time' }, in_progress: { type: 'boolean' },
    },
  },
  Journey: {
    type: 'object',
    description: 'Gamificação: XP acumulado por presenças e sequências, com níveis inspirados em passos de ballet.',
    properties: {
      xp: { type: 'integer' }, level: { type: 'integer' }, levelName: { type: 'string', example: 'Pirouette' }, description: { type: 'string' },
      next: { type: 'string', nullable: true }, nextAt: { type: 'integer', nullable: true }, progress: { type: 'integer', description: '% até o próximo nível' },
    },
  },
  Achievement: {
    type: 'object',
    properties: {
      id: { type: 'string' }, icon: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
      current: { type: 'integer' }, target: { type: 'integer' }, unlocked: { type: 'boolean' },
    },
  },
  PortalOverview: {
    type: 'object',
    properties: {
      student: ref('Student'), classes: arr(ref('Class')), upcoming: arr(ref('UpcomingSession')), stats: ref('AttendanceStats'),
      journey: ref('Journey'), achievements: arr(ref('Achievement')),
      payments: { type: 'object', properties: { open: arr(ref('Payment')), openTotal: { type: 'number' }, last: ref('Payment') } },
      events: arr(ref('PortalEvent')), announcements: arr(ref('Announcement')),
    },
  },

  Analytics: {
    type: 'object',
    properties: {
      kpis: {
        type: 'object',
        properties: {
          activeStudents: { type: 'integer' }, inactiveStudents: { type: 'integer' }, newThisMonth: { type: 'integer' }, classes: { type: 'integer' },
          weeklySessions: { type: 'integer' }, occupancy: { type: 'integer', description: '% de vagas ocupadas' },
          attendanceRate: { type: 'integer', description: '% de presença (30 dias)' }, attendanceRatePrev: { type: 'integer', description: '% dos 30 dias anteriores' },
          revenueMonth: { type: 'number' }, expectedMonth: { type: 'number' }, overdueCount: { type: 'integer' }, overdueTotal: { type: 'number' },
          newMessages: { type: 'integer' },
        },
      },
      byStyle: arr({ type: 'object', properties: { name: { type: 'string' }, value: { type: 'integer' } } }),
      newByMonth: arr({ type: 'object', properties: { month: { type: 'string' }, novos: { type: 'integer' }, total: { type: 'integer' } } }),
      revenue: arr({ type: 'object', properties: { month: { type: 'string' }, recebido: { type: 'number' }, pendente: { type: 'number' }, atrasado: { type: 'number' } } }),
      attendanceWeekly: arr({ type: 'object', properties: { week: { type: 'string' }, taxa: { type: 'integer' }, aulas: { type: 'integer' } } }),
      weekdayLoad: arr({ type: 'object', properties: { day: { type: 'string' }, aulas: { type: 'integer' }, alunos: { type: 'integer' } } }),
      ageGroups: arr({ type: 'object', properties: { name: { type: 'string' }, value: { type: 'integer' } } }),
      occupancy: arr({ type: 'object', properties: { name: { type: 'string' }, enrolled: { type: 'integer' }, capacity: { type: 'integer' }, pct: { type: 'integer' } } }),
      atRisk: arr({ type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, rate: { type: 'integer' }, classes: { type: 'integer' } } }),
      upcomingEvents: arr({ type: 'object', properties: { id: { type: 'integer' }, title: { type: 'string' }, date: { type: 'string' }, going: { type: 'integer' } } }),
    },
  },
};

const sid = idParam('id', 'ID do aluno (precisa pertencer à conta logada)');

const paths = {
  /* Auth */
  '/auth/login': { post: op(T.auth, 'Entrar no sistema', { auth: false, body: ref('LoginRequest'), res: ref('LoginResponse'), errors: [400, 401],
    description: 'Retorna um JWT. Use o botão **Authorize** com `Bearer <token>` para testar as rotas protegidas.\n\nContas de demonstração: `admin@backstage.com`, `professora@backstage.com`, `responsavel@backstage.com`, `aluna@backstage.com` — senha `backstage123`.' }) },
  '/auth/me': { get: op(T.auth, 'Usuário logado', { res: ref('User') }) },
  '/auth/me/password': { put: op(T.auth, 'Alterar a própria senha', { body: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } } }, res: ref('Ok'), errors: [400] }) },

  /* Public */
  '/health': { get: op(T.pub, 'Status da API', { auth: false, res: { type: 'object', properties: { status: { type: 'string' }, time: { type: 'string' } } } }) },
  '/public/content': { get: op(T.pub, 'Conteúdo dinâmico do site', { auth: false, res: ref('SiteContent'), description: 'Hero, faixa de aviso, sobre, números, modalidades, contato, equipe, linha do tempo e depoimentos — editáveis pelo gestor.' }) },
  '/public/events': { get: op(T.pub, 'Eventos publicados', { auth: false, params: [q('when', { type: 'string', enum: ['upcoming', 'past', 'all'] }, 'Filtro temporal')], res: arr(ref('Event')) }) },
  '/public/projects': { get: op(T.pub, 'Trabalhos e projetos realizados', { auth: false, res: arr(ref('Project')) }) },
  '/public/announcements': { get: op(T.pub, 'Avisos públicos', { auth: false, res: arr(ref('Announcement')) }) },
  '/public/schedule': { get: op(T.pub, 'Grade pública de turmas e horários', { auth: false, res: arr(ref('Class')) }) },
  '/public/contact': { post: op(T.pub, 'Enviar mensagem / agendar aula experimental', { auth: false, body: ref('ContactInput'), ok: 201, res: { type: 'object', properties: { id: { type: 'integer' }, ok: { type: 'boolean' } } }, errors: [400] }) },

  /* Portal */
  '/portal/students': { get: op(T.portal, 'Alunos vinculados à conta', { res: arr(ref('Student')), errors: [403], description: 'Responsáveis veem seus dependentes; alunos adultos veem a si mesmos.' }) },
  '/portal/students/{id}/overview': { get: op(T.portal, 'Painel completo do aluno', { params: [sid], res: ref('PortalOverview'), errors: [403, 404], description: 'Próximas aulas, jornada (XP e nível), conquistas, financeiro, eventos e avisos em uma única chamada.' }) },
  '/portal/students/{id}/schedule': { get: op(T.portal, 'Agenda semanal e próximas aulas', { params: [sid], res: { type: 'object', properties: { classes: arr(ref('Class')), upcoming: arr(ref('UpcomingSession')) } }, errors: [403, 404] }) },
  '/portal/students/{id}/attendance': { get: op(T.portal, 'Histórico de frequência', { params: [sid], res: { type: 'object', properties: { stats: ref('AttendanceStats'), records: arr({ type: 'object', properties: { date: { type: 'string' }, status: { type: 'string' }, class_name: { type: 'string' }, color: { type: 'string' } } }) } }, errors: [403, 404] }) },
  '/portal/students/{id}/achievements': { get: op(T.portal, 'Jornada e conquistas', { params: [sid], res: { type: 'object', properties: { journey: ref('Journey'), achievements: arr(ref('Achievement')) } }, errors: [403, 404] }) },
  '/portal/students/{id}/payments': { get: op(T.portal, 'Mensalidades do aluno', { params: [sid], res: arr(ref('Payment')), errors: [403, 404] }) },
  '/portal/students/{id}/calendar.ics': { get: op(T.portal, 'Exportar agenda (iCalendar)', { params: [sid], res: { type: 'string' }, produces: 'text/calendar', errors: [403, 404], description: 'Arquivo .ics com eventos recorrentes semanais para importar no Google Agenda, Apple Calendar ou Outlook.' }) },
  '/portal/events': { get: op(T.portal, 'Próximos eventos com status de presença', { params: [{ ...q('studentId', { type: 'integer' }, 'ID do aluno'), required: true }], res: arr(ref('PortalEvent')), errors: [403, 404] }) },
  '/portal/events/{eventId}/rsvp': { put: op(T.portal, 'Confirmar presença em evento', { params: [idParam('eventId', 'ID do evento')], body: ref('RsvpInput'), res: { type: 'object', properties: { event_id: { type: 'integer' }, student_id: { type: 'integer' }, status: { type: 'string' } } }, errors: [400, 403, 404] }) },
  '/portal/announcements': { get: op(T.portal, 'Mural de avisos (públicos e exclusivos para alunos)', { res: arr(ref('Announcement')), errors: [403] }) },

  /* Teacher area */
  '/teacher/me': {
    get: op(T.teacherArea, 'Meu perfil', { res: ref('Teacher'), errors: [403], description: 'Somente para contas com perfil teacher vinculadas a um professor ativo.' }),
    put: op(T.teacherArea, 'Atualizar meus dados', { body: { type: 'object', properties: { phone: { type: 'string' }, email: { type: 'string' }, bio: { type: 'string' }, specialties: { type: 'string' } } }, res: ref('Teacher'), errors: [403] }),
  },
  '/teacher/dashboard': { get: op(T.teacherArea, 'Painel do professor', { res: ref('TeacherDashboard'), errors: [403], description: 'Aulas de hoje, chamadas pendentes, turmas, aniversariantes, alunos em risco, frequência semanal, horas e ganhos estimados do mês.' }) },
  '/teacher/calendar.ics': { get: op(T.teacherArea, 'Exportar minhas aulas (iCalendar)', { res: { type: 'string' }, produces: 'text/calendar', errors: [403] }) },
  '/teacher/classes': { get: op(T.teacherArea, 'Minhas turmas', { res: arr(ref('Class')), errors: [403] }) },
  '/teacher/classes/{id}': { get: op(T.teacherArea, 'Turma com lista de alunos e estatísticas', { params: [idParam()], res: ref('TeacherClassDetail'), errors: [403, 404] }) },
  '/teacher/attendance': {
    get: op(T.teacherArea, 'Lista de chamada de uma turma minha', { params: [{ ...q('classId', { type: 'integer' }, 'Turma'), required: true }, q('date', { type: 'string', format: 'date' }, 'Data (padrão: hoje)')], res: ref('AttendanceRoster'), errors: [400, 403, 404] }),
    post: op(T.teacherArea, 'Salvar chamada', { body: ref('AttendanceInput'), res: { type: 'object', properties: { ok: { type: 'boolean' }, saved: { type: 'integer' } } }, errors: [400, 403, 404], description: 'Não aceita datas futuras nem alunos de fora da turma.' }),
  },
  '/teacher/logs': {
    get: op(T.teacherArea, 'Diário de aula', { params: [q('classId', { type: 'integer' }, 'Filtrar por turma')], res: arr(ref('ClassLog')), errors: [403, 404] }),
    post: op(T.teacherArea, 'Registrar aula no diário', { body: ref('ClassLogInput'), ok: 201, res: ref('ClassLog'), errors: [400, 403, 404] }),
  },
  '/teacher/logs/{id}': {
    put: op(T.teacherArea, 'Editar registro do diário', { params: [idParam()], body: ref('ClassLogInput'), res: ref('ClassLog'), errors: [400, 403, 404] }),
    delete: op(T.teacherArea, 'Excluir registro do diário', { params: [idParam()], ok: 204, errors: [403, 404] }),
  },

  /* Admin: users */
  '/admin/users': {
    get: op(T.users, 'Listar contas', { params: [q('role', { type: 'string', enum: ['manager', 'guardian', 'student'] }, 'Filtrar por perfil')], res: arr(ref('User')), errors: [403] }),
    post: op(T.users, 'Criar conta de acesso', { body: ref('UserInput'), ok: 201, res: ref('User'), errors: [400, 403] }),
  },
  '/admin/users/{id}': { delete: op(T.users, 'Excluir conta', { params: [idParam()], ok: 204, errors: [400, 403, 404] }) },

  /* Admin: students */
  '/admin/students': {
    get: op(T.students, 'Listar alunos', {
      params: [q('search', { type: 'string' }, 'Nome, e-mail ou responsável'), q('status', { type: 'string', enum: ['active', 'inactive'] }), q('classId', { type: 'integer' }, 'Somente alunos desta turma')],
      res: arr(ref('Student')), errors: [403],
    }),
    post: op(T.students, 'Cadastrar aluno', { body: ref('StudentInput'), ok: 201, res: ref('StudentDetail'), errors: [400, 403], description: 'Pode criar o responsável e/ou a conta do aluno na mesma requisição e já matricular nas turmas.' }),
  },
  '/admin/students/{id}': {
    get: op(T.students, 'Ficha do aluno', { params: [idParam()], res: ref('StudentDetail'), errors: [403, 404] }),
    put: op(T.students, 'Atualizar aluno', { params: [idParam()], body: ref('StudentInput'), res: ref('StudentDetail'), errors: [400, 403, 404] }),
    delete: op(T.students, 'Excluir aluno', { params: [idParam()], ok: 204, errors: [403, 404] }),
  },
  '/admin/students/{id}/classes': {
    put: op(T.students, 'Definir matrículas do aluno', { params: [idParam()], body: { type: 'object', required: ['classIds'], properties: { classIds: { ...arr({ type: 'integer' }), example: [1, 3] } } }, res: arr(ref('Class')), errors: [400, 403, 404] }),
  },

  /* Admin: classes */
  ...crud('/admin/classes', T.classes, 'turma', 'Class', 'ClassInput', 'turmas'),
  '/admin/classes/{id}/students': {
    post: op(T.classes, 'Matricular aluno na turma', { params: [idParam()], body: { type: 'object', required: ['studentId'], properties: { studentId: { type: 'integer', example: 12 } } }, ok: 201, res: ref('Class'), errors: [400, 403, 404] }),
  },
  '/admin/classes/{id}/students/{studentId}': {
    delete: op(T.classes, 'Remover aluno da turma', { params: [idParam(), idParam('studentId', 'ID do aluno')], res: ref('Class'), errors: [403, 404] }),
  },

  /* Admin: teachers */
  '/admin/teachers': {
    get: op(T.teachers, 'Listar professores', { params: [q('status', { type: 'string', enum: ['active', 'inactive'] }, 'Ativos ou desligados')], res: arr(ref('Teacher')), errors: [403], description: 'Inclui carga horária semanal, número de turmas e alunos e custo mensal estimado.' }),
    post: op(T.teachers, 'Contratar professor', { body: ref('TeacherInput'), ok: 201, res: ref('TeacherDetail'), errors: [400, 403] }),
  },
  '/admin/teachers/{id}': {
    get: op(T.teachers, 'Ficha do professor', { params: [idParam()], res: ref('TeacherDetail'), errors: [403, 404] }),
    put: op(T.teachers, 'Atualizar professor', { params: [idParam()], body: ref('TeacherInput'), res: ref('TeacherDetail'), errors: [400, 403, 404] }),
    delete: op(T.teachers, 'Excluir cadastro do professor', { params: [idParam()], ok: 204, errors: [403, 404], description: 'Remove o registro definitivamente; as turmas ficam sem professor. Para encerrar o vínculo mantendo o histórico, use /dismiss.' }),
  },
  '/admin/teachers/{id}/dismiss': {
    post: op(T.teachers, 'Desligar professor', { params: [idParam()], body: ref('DismissInput'), res: { type: 'object', properties: { teacher: ref('TeacherDetail'), classes: arr({ type: 'object', properties: { class_id: { type: 'integer' }, class_name: { type: 'string' }, teacher_id: { type: 'integer', nullable: true }, teacher: { type: 'string', nullable: true } } }) } }, errors: [400, 403, 404], description: 'Marca como desligado, tira do site e repassa cada turma para outro professor ativo.' }),
  },
  '/admin/teachers/{id}/login': {
    put: op(T.teachers, 'Criar/alterar acesso do professor', { params: [idParam()], body: ref('TeacherLoginInput'), res: ref('TeacherDetail'), errors: [400, 403, 404], description: 'Cria a conta de acesso (perfil teacher) ou altera e-mail/senha.' }),
    delete: op(T.teachers, 'Revogar acesso do professor', { params: [idParam()], res: ref('TeacherDetail'), errors: [400, 403, 404] }),
  },
  '/admin/teachers/{id}/rehire': {
    post: op(T.teachers, 'Recontratar professor', { params: [idParam()], body: { type: 'object', properties: { date: { type: 'string', format: 'date' } } }, res: ref('TeacherDetail'), errors: [400, 403, 404] }),
  },
  '/admin/logs': {
    get: op(T.teachers, 'Diários de aula dos professores, agrupados por turma', {
      params: [q('teacherId', { type: 'integer' }, 'Somente registros deste professor'), q('classId', { type: 'integer' }, 'Somente esta turma'),
        q('from', { type: 'string', format: 'date' }, 'A partir de'), q('to', { type: 'string', format: 'date' }, 'Até'), q('search', { type: 'string' }, 'Busca no título/conteúdo')],
      res: { type: 'object', properties: { total: { type: 'integer' }, classes: arr({ type: 'object', properties: {
        class_id: { type: 'integer' }, class_name: { type: 'string' }, color: { type: 'string' }, style: { type: 'string' }, count: { type: 'integer' },
        last_date: { type: 'string', format: 'date' }, teachers: arr({ type: 'string' }),
        entries: arr({ allOf: [ref('ClassLog'), { type: 'object', properties: { teacher_name: { type: 'string', nullable: true } } }] }),
      } }) } },
      errors: [403], description: 'Somente leitura para a gestão. Os registros são escritos pelos professores na Área do professor.',
    }),
  },
  '/admin/schedule/week': { get: op(T.classes, 'Grade semanal completa', { res: arr(ref('WeeklySession')), errors: [403], description: 'Todas as aulas por dia da semana e horário, com ocupação.' }) },

  /* Admin: attendance */
  '/admin/attendance': {
    get: op(T.attendance, 'Lista de chamada', { params: [{ ...q('classId', { type: 'integer' }, 'Turma'), required: true }, q('date', { type: 'string', format: 'date' }, 'Data (padrão: hoje)')], res: ref('AttendanceRoster'), errors: [400, 403] }),
    post: op(T.attendance, 'Salvar chamada', { body: ref('AttendanceInput'), res: { type: 'object', properties: { ok: { type: 'boolean' }, saved: { type: 'integer' } } }, errors: [400, 403] }),
  },

  /* Admin: payments */
  '/admin/payments': { get: op(T.payments, 'Listar mensalidades', { params: [q('month', { type: 'string', example: '2026-11' }, 'YYYY-MM'), q('status', { type: 'string', enum: ['paid', 'pending', 'overdue'] })], res: arr(ref('Payment')), errors: [403] }) },
  '/admin/payments/generate': { post: op(T.payments, 'Gerar cobranças do mês', { body: { type: 'object', required: ['month'], properties: { month: { type: 'string', example: '2026-12' }, dueDay: { type: 'integer', example: 10 } } }, ok: 201, res: { type: 'object', properties: { month: { type: 'string' }, created: { type: 'integer' } } }, errors: [400, 403], description: 'Cria uma cobrança pendente para cada aluno ativo que ainda não tem cobrança no mês.' }) },
  '/admin/payments/{id}': { patch: op(T.payments, 'Atualizar status/valor da mensalidade', { params: [idParam()], body: { type: 'object', properties: { status: { type: 'string', enum: ['paid', 'pending', 'overdue'] }, amount: { type: 'number' } } }, res: ref('Payment'), errors: [400, 403, 404] }) },

  /* Admin: CMS */
  '/admin/content': { get: op(T.cms, 'Ler todos os blocos de conteúdo', { res: ref('SiteContent'), errors: [403] }) },
  '/admin/content/{key}': {
    put: op(T.cms, 'Atualizar um bloco de conteúdo', {
      params: [{ name: 'key', in: 'path', required: true, schema: { type: 'string', enum: ['hero', 'banner', 'about', 'stats', 'styles', 'contact', 'team', 'timeline', 'testimonials'] } }],
      body: { type: 'object', required: ['value'], properties: { value: { description: 'JSON do bloco (ver SiteContent)' } }, example: { value: { enabled: true, text: 'Matrículas abertas!', link: '/contato' } } },
      res: { type: 'object', properties: { key: { type: 'string' }, value: {} } }, errors: [400, 403],
    }),
  },
  ...crud('/admin/events', T.cms, 'evento', 'Event', 'EventInput', 'eventos'),
  '/admin/events/{id}/rsvps': { get: op(T.cms, 'Confirmações de presença do evento', { params: [idParam()], res: arr({ type: 'object', properties: { student_id: { type: 'integer' }, name: { type: 'string' }, status: { type: 'string' }, updated_at: { type: 'string' } } }), errors: [403] }) },
  ...crud('/admin/projects', T.cms, 'projeto', 'Project', 'ProjectInput', 'projetos'),
  ...crud('/admin/announcements', T.cms, 'aviso', 'Announcement', 'AnnouncementInput', 'avisos'),
  '/admin/messages': { get: op(T.cms, 'Caixa de mensagens do site', { params: [q('status', { type: 'string', enum: ['new', 'read', 'answered'] })], res: arr(ref('ContactMessage')), errors: [403] }) },
  '/admin/messages/{id}': {
    patch: op(T.cms, 'Marcar mensagem', { params: [idParam()], body: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['new', 'read', 'answered'] } } }, res: ref('ContactMessage'), errors: [400, 403, 404] }),
    delete: op(T.cms, 'Excluir mensagem', { params: [idParam()], ok: 204, errors: [403, 404] }),
  },

  /* Admin: analytics */
  '/admin/analytics': { get: op(T.analytics, 'Indicadores do estúdio', { res: ref('Analytics'), errors: [403], description: 'KPIs, distribuição por modalidade e idade, evolução de matrículas, receita, frequência semanal, ocupação por turma e alunos em risco de evasão.' }) },
};

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Backstage Studio de Dança — API',
    version: '1.0.0',
    description: 'API do site e do sistema de gestão do **Backstage Studio de Dança** (Manaus/AM).\n\n' +
      '- **Site público**: conteúdo dinâmico, eventos, projetos, grade e contato.\n' +
      '- **Portal**: responsáveis e alunos acompanham agenda, frequência, conquistas, mensalidades e eventos.\n' +
      '- **Área do professor**: painel, turmas próprias, chamada e diário de aula.\n' +
      '- **Gestão**: alunos, turmas, grade semanal, chamada, financeiro, CMS do site e analytics.\n\n' +
      'Autentique em `POST /auth/login` e clique em **Authorize** informando o token.',
  },
  servers: [{ url: '/api', description: 'Servidor atual' }],
  tags: Object.values(T).map((name) => ({ name })),
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas,
  },
  security: [{ bearerAuth: [] }],
  paths,
};
