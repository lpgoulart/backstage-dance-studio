import bcrypt from 'bcryptjs';
import { all, get, run, tx, ymd, today } from './db.js';

/** Demo credentials (development only) — see README */
export const DEMO = {
  manager: { email: 'admin@backstage.com', password: 'backstage123' },
  guardian: { email: 'responsavel@backstage.com', password: 'backstage123' },
  student: { email: 'aluna@backstage.com', password: 'backstage123' },
  teacher: { email: 'professora@backstage.com', password: 'backstage123' },
};

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLASSES = [
  // name, style, level, teacher, room, capacity, color, ages [min,max], schedules [[weekday,start,end]], description
  ['Baby Class', 'Ballet', 'Baby (3 a 5 anos)', 'Prof.ª Ana Beatriz', 'Sala Palco', 12, '#f2a7c3', [3, 5], [[2, '15:00', '15:50'], [4, '15:00', '15:50']], 'Primeiro contato com a dança através do lúdico, musicalidade e coordenação.'],
  ['Ballet Infantil', 'Ballet', 'Infantil (6 a 10 anos)', 'Prof.ª Ana Beatriz', 'Sala Palco', 16, '#ec8fb3', [6, 10], [[1, '16:00', '17:00'], [3, '16:00', '17:00']], 'Base clássica, postura e expressão para os pequenos bailarinos.'],
  ['Ballet Juvenil', 'Ballet', 'Juvenil (11 a 16 anos)', 'Prof.ª Carolina Reis', 'Sala Palco', 16, '#d9688f', [11, 16], [[1, '17:10', '18:30'], [3, '17:10', '18:30']], 'Técnica clássica aprofundada, pontas e repertório.'],
  ['Jazz Kids', 'Jazz', 'Infantil (6 a 10 anos)', 'Prof. Rafael Monteiro', 'Sala Coxia', 18, '#e8b04b', [6, 10], [[2, '16:00', '17:00'], [4, '16:00', '17:00']], 'Energia, giros e saltos com muita musicalidade.'],
  ['Jazz Teen & Adulto', 'Jazz', 'Intermediário', 'Prof. Rafael Monteiro', 'Sala Coxia', 20, '#f0c36d', [13, 60], [[2, '19:00', '20:20'], [4, '19:00', '20:20']], 'Jazz contemporâneo com coreografias para os palcos.'],
  ['Dança Contemporânea', 'Contemporâneo', 'Intermediário / Avançado', 'Prof.ª Carolina Reis', 'Sala Palco', 16, '#9db4ff', [14, 60], [[1, '19:00', '20:30'], [3, '19:00', '20:30']], 'Pesquisa de movimento, chão, improvisação e criação.'],
  ['Hip Hop Kids', 'Hip Hop', 'Infantil (6 a 12 anos)', 'Prof. Lucas Andrade', 'Sala Coxia', 20, '#7fd6b0', [6, 12], [[6, '09:00', '10:00']], 'Grooves, fundamentos e muita atitude para a criançada.'],
  ['Street Dance', 'Hip Hop', 'Todos os níveis', 'Prof. Lucas Andrade', 'Sala Coxia', 24, '#4fbf8f', [13, 60], [[1, '20:30', '21:30'], [5, '19:00', '20:00']], 'Danças urbanas: hip hop, house e locking.'],
  ['K-Pop Dance', 'K-Pop', 'Teen', 'Prof.ª Júlia Tavares', 'Sala Coxia', 20, '#c79bff', [11, 25], [[5, '17:00', '18:20'], [6, '10:15', '11:30']], 'Coreografias dos grupos que você ama, com técnica e sincronia.'],
  ['Heels', 'Heels', 'Adulto', 'Prof.ª Júlia Tavares', 'Sala Palco', 14, '#ff8a7a', [18, 60], [[5, '20:15', '21:30']], 'Dança no salto: autoconfiança, presença e expressão.'],
  ['Sapateado', 'Sapateado', 'Todos os níveis', 'Prof.ª Helena Duarte', 'Sala Camarim', 12, '#d9c4a0', [7, 60], [[6, '11:00', '12:00']], 'Ritmo nos pés: sapateado americano.'],
  ['Ritmos & Fit Dance', 'Ritmos', 'Adulto', 'Prof. Rafael Monteiro', 'Sala Coxia', 25, '#ffb36b', [18, 70], [[1, '07:00', '08:00'], [3, '07:00', '08:00'], [5, '07:00', '08:00']], 'Aula animada de ritmos para condicionamento e diversão.'],
];

const TEACHERS = [
  // name, email, phone, specialties, bio, hourly rate (R$), hired N months ago, status, dismissal reason
  ['Ana Beatriz', 'ana.beatriz@backstagestudio.com.br', '(92) 99101-2001', 'Ballet Clássico, Baby Class', 'Bailarina clássica com formação pelo método Royal Academy; leciona no Backstage desde a fundação.', 70, 214, 'active'],
  ['Carolina Reis', 'carolina.reis@backstagestudio.com.br', '(92) 99101-2002', 'Ballet Juvenil, Dança Contemporânea', 'Coreógrafa e pesquisadora de movimento, responsável pelas montagens contemporâneas das mostras.', 75, 96, 'active'],
  ['Rafael Monteiro', 'rafael.monteiro@backstagestudio.com.br', '(92) 99101-2003', 'Jazz, Ritmos', 'Bailarino de jazz com passagem por companhias e festivais nacionais.', 65, 72, 'active'],
  ['Lucas Andrade', 'lucas.andrade@backstagestudio.com.br', '(92) 99101-2004', 'Hip Hop, Street Dance', 'Dançarino de danças urbanas, integrante de crews de Manaus.', 60, 40, 'active'],
  ['Júlia Tavares', 'julia.tavares@backstagestudio.com.br', '(92) 99101-2005', 'K-Pop, Heels', 'Especialista em coreografias de K-Pop e dança no salto.', 60, 22, 'active'],
  ['Helena Duarte', 'helena.duarte@backstagestudio.com.br', '(92) 99101-2006', 'Sapateado', 'Sapateadora com formação em sapateado americano.', 60, 30, 'active'],
  ['Marcos Vieira', 'marcos.vieira@exemplo.com', '(92) 99101-2007', 'Hip Hop, Breaking', 'Ex-professor de breaking das turmas teen.', 55, 50, 'inactive', 'Mudança de cidade'],
];

const FIRST_F = ['Sofia', 'Alice', 'Helena', 'Valentina', 'Laura', 'Manuela', 'Beatriz', 'Lívia', 'Giovanna', 'Isabela', 'Lara', 'Cecília', 'Yasmin', 'Maria Clara', 'Luana', 'Ana Júlia', 'Rebeca', 'Ester', 'Clara', 'Emanuelly', 'Kauane', 'Raíssa', 'Bianca', 'Nicole', 'Fernanda', 'Camila', 'Juliana', 'Débora', 'Thaís', 'Priscila'];
const FIRST_M = ['Miguel', 'Arthur', 'Davi', 'Gabriel', 'Pedro', 'Heitor', 'Enzo', 'Lucas', 'Samuel', 'Kauã', 'Rafael', 'Thiago', 'Matheus', 'João'];
const LAST = ['Albuquerque', 'Souza', 'Lima', 'Batista', 'Ferreira', 'Barros', 'Cavalcante', 'Nascimento', 'Pinheiro', 'Freitas', 'Monteiro', 'Brito', 'Teixeira', 'Rocha', 'Castro', 'Magalhães', 'Pantoja', 'Sarmento', 'Bentes', 'Cordeiro', 'Tavares', 'Gonçalves'];
const GUARDIAN_F = ['Mariana', 'Patrícia', 'Aline', 'Renata', 'Cláudia', 'Simone', 'Luciana', 'Vanessa', 'Adriana', 'Kátia', 'Gisele', 'Elaine'];

const LEVELS = ['Iniciante', 'Iniciante', 'Intermediário', 'Intermediário', 'Avançado'];

export function seed() {
  const R = rng(2008);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const hash = bcrypt.hashSync(DEMO.manager.password, 10);
  const now = new Date();
  const t = today();
  const addDays = (n) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.');

  tx(() => {
    const user = (name, email, role, phone) =>
      Number(run(`INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)`, name, email, hash, role, phone).lastInsertRowid);

    user('Direção Backstage', DEMO.manager.email, 'manager', '(92) 99999-0000');

    // Teachers
    const teacherIds = {};
    for (const [name, email, phone, specialties, bio, rate, monthsAgo, status, reason] of TEACHERS) {
      const hired = ymd(new Date(now.getFullYear(), now.getMonth() - monthsAgo, 3));
      const dismissed = status === 'inactive' ? addDays(-120) : null;
      teacherIds[name] = Number(run(`INSERT INTO teachers (name, email, phone, specialties, bio, hourly_rate, status, hired_at, dismissed_at, dismissal_reason, show_on_site)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`, name, email, phone, specialties, bio, rate, status, hired, dismissed, reason, status === 'active' ? 1 : 0).lastInsertRowid);
    }
    // Demo teacher login (Carolina Reis)
    const demoT = user('Carolina Reis', DEMO.teacher.email, 'teacher', '(92) 99101-2002');
    run(`UPDATE teachers SET user_id = ? WHERE id = ?`, demoT, teacherIds['Carolina Reis']);

    // Classes
    const classIds = CLASSES.map((c) => {
      const tName = c[3].replace(/^Prof\.?(ª|a)?\s+/i, '');
      const id = Number(run(`INSERT INTO classes (name, style, level, teacher_id, teacher, room, capacity, color, description) VALUES (?,?,?,?,?,?,?,?,?)`,
        c[0], c[1], c[2], teacherIds[tName], tName, c[4], c[5], c[6], c[9]).lastInsertRowid);
      for (const [w, s, e] of c[8]) run(`INSERT INTO class_schedules (class_id, weekday, start_time, end_time) VALUES (?,?,?,?)`, id, w, s, e);
      return { id, ages: c[7], style: c[1], schedules: c[8].map((x) => x[0]) };
    });

    const birthFor = (age) => ymd(new Date(now.getFullYear() - age, Math.floor(R() * 12), 1 + Math.floor(R() * 27)));
    const joinedRandom = () => {
      // Concentrate sign-ups near semester starts (Feb/Aug), spread over 3 years
      if (R() < 0.06) return addDays(-Math.floor(R() * 4));
      const monthsAgo = Math.floor(R() * 34);
      const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1 + Math.floor(R() * 27));
      if (R() < 0.45) d.setMonth(d.getMonth() < 6 ? 1 : 7);
      return d > now ? addDays(-3) : ymd(d);
    };

    const students = [];
    const addStudent = ({ name, age, guardianId = null, userId = null, joined, classes, level, fee, email, phone, status = 'active' }) => {
      const j = joined || joinedRandom();
      const id = Number(run(`INSERT INTO students (name, birth_date, email, phone, level, status, guardian_id, user_id, monthly_fee, joined_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`, name, birthFor(age), email, phone, level || pick(LEVELS), status, guardianId, userId,
        fee || (classes.length > 1 ? 260 : 180), j).lastInsertRowid);
      for (const cid of classes) run(`INSERT INTO enrollments (student_id, class_id, enrolled_at) VALUES (?,?,?)`, id, cid, j);
      students.push({ id, propensity: 0.7 + R() * 0.28, classes, joined: j, status });
      return id;
    };

    const fitting = (age) => classIds.filter((c) => age >= c.ages[0] && age <= c.ages[1]);
    const chooseClasses = (age) => {
      const opts = fitting(age);
      const first = pick(opts);
      const res = [first.id];
      if (R() < 0.35) { const other = pick(opts.filter((o) => o.style !== first.style)); if (other) res.push(other.id); }
      return res;
    };

    // Demo guardian with two kids
    const demoG = user('Mariana Albuquerque', DEMO.guardian.email, 'guardian', '(92) 98123-4567');
    addStudent({ name: 'Sofia Albuquerque', age: 8, guardianId: demoG, joined: addDays(-540), classes: [classIds[1].id, classIds[3].id], level: 'Intermediário', fee: 260 });
    addStudent({ name: 'Miguel Albuquerque', age: 11, guardianId: demoG, joined: addDays(-200), classes: [classIds[6].id], level: 'Iniciante', fee: 180 });

    // Demo adult student with own login
    const demoS = user('Larissa Mendes', DEMO.student.email, 'student', '(92) 99234-5678');
    addStudent({ name: 'Larissa Mendes', age: 24, userId: demoS, joined: addDays(-820), classes: [classIds[5].id, classIds[9].id, classIds[4].id],
      level: 'Avançado', fee: 320, email: DEMO.student.email, phone: '(92) 99234-5678' });

    // Families
    let gi = 0;
    for (let f = 0; f < 40; f++) {
      const last = pick(LAST);
      const gName = `${GUARDIAN_F[gi++ % GUARDIAN_F.length]} ${last}`;
      const gid = user(gName, `${slug(gName)}${f}@exemplo.com`, 'guardian', `(92) 9${8000 + f}-${1000 + Math.floor(R() * 8999)}`);
      const kids = R() < 0.3 ? 2 : 1;
      for (let k = 0; k < kids; k++) {
        const age = 3 + Math.floor(R() * 14);
        const isBoy = R() < 0.25;
        const name = `${isBoy ? pick(FIRST_M) : pick(FIRST_F)} ${last}`;
        addStudent({ name, age, guardianId: gid, classes: chooseClasses(age), status: R() < 0.08 ? 'inactive' : 'active' });
      }
    }
    // Adults
    for (let a = 0; a < 44; a++) {
      const age = 18 + Math.floor(R() * 30);
      const name = `${R() < 0.2 ? pick(FIRST_M) : pick(FIRST_F)} ${pick(LAST)}`;
      addStudent({ name, age, classes: chooseClasses(age), email: `${slug(name)}${a}@exemplo.com`, phone: `(92) 99${100 + a}-${1000 + Math.floor(R() * 8999)}`,
        status: R() < 0.1 ? 'inactive' : 'active' });
    }

    // Attendance — last 84 days for each enrollment
    const schedByClass = Object.fromEntries(classIds.map((c) => [c.id, c.schedules]));
    for (const s of students) {
      if (s.status !== 'active') continue;
      for (let i = 84; i >= 1; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const date = ymd(d);
        if (date < s.joined) continue;
        for (const cid of s.classes) {
          if (!schedByClass[cid].includes(d.getDay())) continue;
          const x = R();
          const status = x < s.propensity ? (R() < 0.1 ? 'late' : 'present') : 'absent';
          run(`INSERT OR IGNORE INTO attendance (student_id, class_id, date, status) VALUES (?,?,?,?)`, s.id, cid, date, status);
        }
      }
    }

    // Leave the latest Contemporâneo session without a roll call, so the teacher dashboard shows a pending one
    const lastContemp = get(`SELECT MAX(date) d FROM attendance WHERE class_id = ?`, classIds[5].id).d;
    if (lastContemp) run(`DELETE FROM attendance WHERE class_id = ? AND date = ?`, classIds[5].id, lastContemp);

    // Class diary entries for the demo teacher
    const carol = teacherIds['Carolina Reis'];
    const logDates = all(`SELECT DISTINCT class_id, date FROM attendance WHERE class_id IN (?, ?) ORDER BY date DESC LIMIT 6`, classIds[2].id, classIds[5].id);
    const LOGS = [
      ['Coreografia da Mostra — 2º bloco', 'Passamos a transição do 2º bloco duas vezes. Ainda falta limpar os braços na diagonal. Próxima aula: contagem do final.'],
      ['Aquecimento + pontas', 'Trabalho de pés e relevés. Três alunas prontas para subir na ponta no próximo semestre.'],
      ['Improvisação guiada', 'Exercício de chão com foco em peso e queda. Turma respondeu muito bem; repetir com música ao vivo.'],
      ['Ensaio com figurino', 'Prova de figurino da Mostra. Ajustar tamanho de duas saias.'],
      ['Revisão técnica', 'Revisão de piruetas e chainés. Sugerir aula extra para quem faltou.'],
      ['Montagem nova', 'Início da coreografia nova: primeiros 32 tempos.'],
    ];
    logDates.forEach((r, i) => run(`INSERT INTO class_logs (class_id, teacher_id, date, title, content) VALUES (?,?,?,?,?)`, r.class_id, carol, r.date, LOGS[i][0], LOGS[i][1]));

    // A couple of entries for the other teachers' classes
    const OTHER_LOGS = [
      ['Aquecimento e base técnica', 'Revisão dos fundamentos da modalidade e alongamento guiado. Turma concentrada.'],
      ['Coreografia da Mostra', 'Montagem dos primeiros oito tempos da coreografia de fim de ano. Repetir a entrada na próxima aula.'],
    ];
    for (const c of classIds) {
      const cls = get(`SELECT teacher_id FROM classes WHERE id = ?`, c.id);
      if (!cls.teacher_id || cls.teacher_id === carol) continue;
      const dates = all(`SELECT DISTINCT date FROM attendance WHERE class_id = ? ORDER BY date DESC LIMIT 2`, c.id);
      dates.forEach((d, i) => run(`INSERT INTO class_logs (class_id, teacher_id, date, title, content) VALUES (?,?,?,?,?)`,
        c.id, cls.teacher_id, d.date, OTHER_LOGS[i][0], OTHER_LOGS[i][1]));
    }

    // Payments — last 6 months
    for (const s of students) {
      const fee = get(`SELECT monthly_fee f FROM students WHERE id = ?`, s.id).f;
      for (let m = 5; m >= 0; m--) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const ref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ref < s.joined.slice(0, 7)) continue;
        if (s.status === 'inactive' && m < 2) continue;
        const due = `${ref}-10`;
        let status = 'paid';
        if (m === 0) status = due < t ? (R() < 0.78 ? 'paid' : 'overdue') : (R() < 0.45 ? 'paid' : 'pending');
        else if (m === 1) status = R() < 0.92 ? 'paid' : 'overdue';
        else status = R() < 0.98 ? 'paid' : 'overdue';
        const paidAt = status === 'paid' ? `${ref}-${String(3 + Math.floor(R() * 8)).padStart(2, '0')}` : null;
        run(`INSERT INTO payments (student_id, reference_month, amount, due_date, status, paid_at) VALUES (?,?,?,?,?,?)`, s.id, ref, fee, due, status, paidAt);
      }
    }

    // Events (relative to today so the demo never gets stale)
    const ev = (title, description, date, time, location, category, published = 1) =>
      Number(run(`INSERT INTO events (title, description, date, time, location, category, published) VALUES (?,?,?,?,?,?,?)`,
        title, description, date, time, location, category, published).lastInsertRowid);
    const e1 = ev('Mostra de Fim de Ano — "Bastidores"', 'Nosso grande espetáculo de encerramento: todas as turmas no palco celebrando 18 anos de Backstage. Ingressos com a recepção.', addDays(32), '19:00', 'Teatro Amazonas', 'Espetáculo');
    const e2 = ev('Aulão Aberto de Natal', 'Aula aberta para alunos, familiares e amigos. Traga um brinquedo para doação!', addDays(18), '09:30', 'Backstage Studio', 'Aula aberta');
    ev('Workshop de Heels com convidada', 'Intensivo de 3 horas focado em presença de palco e técnica no salto.', addDays(9), '15:00', 'Sala Palco', 'Workshop');
    ev('Matrículas 2027.1', 'Rematrícula para alunos com desconto até o fim do mês e aulas experimentais gratuitas para novos alunos.', addDays(48), '08:00', 'Recepção Backstage', 'Matrículas');
    ev('Ensaio geral — Mostra de Fim de Ano', 'Ensaio obrigatório para todas as turmas que vão se apresentar.', addDays(29), '14:00', 'Teatro Amazonas', 'Ensaio');
    ev('Mostra Semestral 2026.1', 'Apresentação de meio de ano com coreografias de todas as turmas.', addDays(-140), '19:00', 'Teatro da Instalação', 'Espetáculo');
    ev('Festival Dança Manaus', 'Participação das turmas de Jazz e Contemporâneo com duas coreografias premiadas.', addDays(-95), '18:00', 'Centro de Convenções', 'Competição');
    ev('Aula especial K-Pop', 'Aula temática com coreografias de grupos convidados pela turma.', addDays(-40), '16:00', 'Sala Coxia', 'Aula especial');

    // RSVPs for demo kids
    run(`INSERT INTO event_rsvps (event_id, student_id, status) VALUES (?,?,?)`, e1, students[0].id, 'going');
    run(`INSERT INTO event_rsvps (event_id, student_id, status) VALUES (?,?,?)`, e2, students[2].id, 'maybe');
    for (const s of students.slice(3, 40)) if (R() < 0.6) run(`INSERT INTO event_rsvps (event_id, student_id, status) VALUES (?,?,?)`, e1, s.id, R() < 0.8 ? 'going' : 'maybe');

    // Projects / past works
    const proj = (title, year, category, description, color, highlight, order) =>
      run(`INSERT INTO projects (title, year, category, description, color, highlight, sort_order) VALUES (?,?,?,?,?,?,?)`,
        title, year, category, description, color, highlight, order);
    proj("Disney 25'", 2025, 'Espetáculo', 'Uma viagem pelos clássicos Disney com mais de 150 bailarinos em cena, figurinos autorais e trilha ao vivo.', '#7aa2ff', 1, 1);
    proj('Mostra 2026.1', 2026, 'Mostra semestral', 'A mostra de meio de ano reuniu todas as turmas em um espetáculo sobre recomeços.', '#e8b04b', 1, 2);
    proj('Mostra 2025.2 — Raízes', 2025, 'Mostra semestral', 'Coreografias inspiradas na cultura amazônica, do carimbó ao contemporâneo.', '#4fbf8f', 1, 3);
    proj('Aulas Especiais', 2026, 'Formação', 'Encontros com coreógrafos convidados de Manaus e de outros estados.', '#c79bff', 0, 4);
    proj('Mostra 2024.2 — Bastidores', 2024, 'Mostra semestral', 'O espetáculo que revelou ao público o que acontece por trás das cortinas.', '#ff8a7a', 0, 5);
    proj('Festivais & Competições', 2025, 'Competição', 'Grupos de Jazz e Contemporâneo representando o estúdio em festivais regionais.', '#f2a7c3', 0, 6);
    proj('Mostra 2023.2 — 15 Anos', 2023, 'Mostra semestral', 'Celebração de 15 anos de história, com ex-alunos voltando ao palco.', '#d9c4a0', 0, 7);

    // Announcements
    const ann = (title, body, audience, pinned) => run(`INSERT INTO announcements (title, body, audience, pinned) VALUES (?,?,?,?)`, title, body, audience, pinned);
    ann('Aulas experimentais gratuitas', 'Agende sua aula experimental em qualquer modalidade. Vagas limitadas por turma.', 'public', 1);
    ann('Figurinos da Mostra', 'As medidas para os figurinos da Mostra de Fim de Ano serão tiradas durante as aulas desta semana.', 'students', 1);
    ann('Recesso de fim de ano', 'O estúdio estará em recesso entre 22/12 e 06/01. As aulas retornam normalmente em janeiro.', 'public', 0);
    ann('Ensaio geral obrigatório', 'Confirmem presença no ensaio geral pelo portal. Chegar 30 minutos antes, já com coque.', 'students', 0);

    // Contact messages
    const msg = (name, email, phone, interest, message, status, daysAgo) =>
      run(`INSERT INTO contact_messages (name, email, phone, interest, message, status, created_at) VALUES (?,?,?,?,?,?, datetime('now','localtime', ?))`,
        name, email, phone, interest, message, status, `-${daysAgo} days`);
    msg('Paula Sarmento', 'paula.s@exemplo.com', '(92) 98877-1122', 'Ballet', 'Olá! Gostaria de saber se há vaga no Ballet Infantil para minha filha de 7 anos.', 'new', 1);
    msg('Bruno Pantoja', 'bruno.p@exemplo.com', null, 'Street Dance', 'Quero agendar uma aula experimental de Street Dance no sábado.', 'new', 2);
    msg('Renata Bentes', null, '(92) 99111-2233', 'Heels', 'Qual o valor da mensalidade da turma de Heels?', 'read', 6);

    // Site content
    const content = (key, value) => run(`INSERT INTO site_content (key, value) VALUES (?, ?)`, key, JSON.stringify(value));
    content('hero', {
      eyebrow: 'Manaus · AM · desde 2008',
      title: 'Onde a dança começa nos bastidores.',
      subtitle: 'Há 18 anos impactando vidas, realizando sonhos e construindo amizades através da dança.',
      ctaLabel: 'Agende uma aula experimental',
      ctaLink: '/contato',
    });
    content('banner', { enabled: true, text: 'Matrículas 2027.1 abertas — aula experimental gratuita', link: '/contato' });
    content('about', {
      title: 'Mais que um estúdio, uma família que dança.',
      text: 'O Backstage nasceu em Manaus com uma ideia simples: o palco é consequência — o que transforma está nos bastidores. Nas salas de aula, nos ensaios, nas amizades e na disciplina que a dança constrói. Desde 2008 formamos bailarinos de todas as idades, do Baby Class ao adulto, em um ambiente acolhedor e exigente na medida certa.',
      mission: 'Formar pessoas através da dança, com técnica, sensibilidade e afeto.',
      values: ['Acolhimento', 'Disciplina com leveza', 'Arte como transformação', 'Amizade dentro e fora do palco'],
    });
    content('stats', [
      { value: 18, suffix: '', label: 'anos de história' },
      { value: 12, suffix: '', label: 'modalidades e turmas' },
      { value: 2000, suffix: '+', label: 'alunos formados' },
      { value: 30, suffix: '+', label: 'espetáculos produzidos' },
    ]);
    content('styles', [
      { name: 'Ballet Clássico', description: 'Do Baby Class às pontas: a base de tudo.' },
      { name: 'Jazz', description: 'Energia, giros e saltos com musicalidade.' },
      { name: 'Contemporâneo', description: 'Pesquisa de movimento e expressão.' },
      { name: 'Hip Hop & Street', description: 'Danças urbanas com atitude.' },
      { name: 'K-Pop', description: 'Coreografias, sincronia e performance.' },
      { name: 'Heels', description: 'Presença e autoconfiança no salto.' },
      { name: 'Sapateado', description: 'O ritmo mora nos pés.' },
      { name: 'Ritmos', description: 'Dance para se divertir e se cuidar.' },
    ]);
    content('contact', {
      address: 'Manaus, Amazonas',
      phone: '(92) 99999-0000',
      whatsapp: '5592999990000',
      email: 'contato@backstagestudio.com.br',
      instagram: 'backstage_studiodedanca',
      linktree: 'https://linktr.ee/backstagestudiodedanca',
      hours: 'Seg a Sex · 7h às 21h30 — Sáb · 8h às 12h',
      mapQuery: 'Manaus, AM',
    });
    content('timeline', [
      { year: '2008', text: 'Abrimos as portas com duas turmas de ballet e muito sonho.' },
      { year: '2013', text: 'Chegam o Jazz e as Danças Urbanas; primeira mostra em teatro.' },
      { year: '2018', text: '10 anos e a primeira participação em festivais competitivos.' },
      { year: '2023', text: 'Mostra de 15 anos reúne ex-alunos e novas gerações no palco.' },
      { year: '2025', text: "Disney 25': nosso maior espetáculo até hoje." },
      { year: '2026', text: '18 anos impactando vidas — e a história continua.' },
    ]);
    content('testimonials', [
      { quote: 'Minha filha entrou tímida no Baby Class e hoje é a primeira a pedir para ir ao estúdio.', author: 'Mãe de aluna do Ballet Infantil' },
      { quote: 'O Backstage virou minha segunda casa. As amizades que fiz aqui vão para a vida.', author: 'Aluna de Contemporâneo' },
      { quote: 'Profissionalismo de companhia com o carinho de família.', author: 'Pai de aluno do Hip Hop Kids' },
    ]);
  });
}

export function seedIfEmpty() {
  if (get(`SELECT COUNT(*) n FROM users`).n === 0) {
    seed();
    console.log('🌱 Banco de dados populado com dados de demonstração');
  }
}
