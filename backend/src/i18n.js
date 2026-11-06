/**
 * Minimal API i18n. Portuguese is the source language.
 * - req.lang is 'en' when the client sends `Accept-Language: en…` or `?lang=en`, else 'pt'.
 * - Every JSON `{ error }` response is translated for English clients.
 * User-entered content (site texts, events, classes…) is never translated: it is shown as typed.
 */

const ERRORS = {
  'Não autenticado': 'Not authenticated',
  'Sessão expirada. Faça login novamente.': 'Session expired. Please sign in again.',
  'Acesso negado': 'Access denied',
  'Rota não encontrada': 'Route not found',
  'Erro interno do servidor': 'Internal server error',
  'E-mail ou senha incorretos': 'Incorrect email or password',
  'Usuário não encontrado': 'User not found',
  'Senha atual incorreta': 'Current password is incorrect',
  'A nova senha precisa de ao menos 6 caracteres': 'The new password must have at least 6 characters',
  'A senha precisa de ao menos 6 caracteres': 'The password must have at least 6 characters',
  'Perfil inválido': 'Invalid role',
  'Já existe uma conta com este e-mail': 'An account with this email already exists',
  'Você não pode excluir a própria conta': 'You cannot delete your own account',
  'Aluno não encontrado': 'Student not found',
  'Aluno não encontrado nesta conta': 'Student not found in this account',
  'Aluno não está matriculado nesta turma': 'Student is not enrolled in this class',
  'Aluno não pertence a esta turma': 'Student does not belong to this class',
  'classIds deve ser uma lista': 'classIds must be a list',
  'records deve ser uma lista': 'records must be a list',
  'Turma não encontrada': 'Class not found',
  'Turma não encontrada entre as suas': 'Class not found among yours',
  'Professor não encontrado': 'Teacher not found',
  'Este professor já está desligado': 'This teacher has already been dismissed',
  'Este professor já está ativo': 'This teacher is already active',
  'Este professor não tem acesso ao sistema': 'This teacher has no system access',
  'Esta conta não está vinculada a um professor': 'This account is not linked to a teacher',
  'Acesso de professor desativado': 'Teacher access is disabled',
  'Horário inválido: informe weekday (0-6), start_time e end_time (HH:MM) com fim após o início':
    'Invalid schedule: provide weekday (0-6), start_time and end_time (HH:MM) with the end after the start',
  'Informe classId': 'classId is required',
  'Status de presença inválido': 'Invalid attendance status',
  'Status inválido': 'Invalid status',
  'month deve estar no formato YYYY-MM': 'month must be in YYYY-MM format',
  'date deve estar no formato YYYY-MM-DD': 'date must be in YYYY-MM-DD format',
  'Cobrança não encontrada': 'Charge not found',
  'Não é possível fazer chamada de uma data futura': 'You cannot take attendance for a future date',
  'Registro não encontrado': 'Entry not found',
  'Informe e-mail ou telefone para retornarmos o contato': 'Please provide an email or phone so we can get back to you',
  'Mensagem muito longa': 'Message is too long',
  'Evento não encontrado': 'Event not found',
  'Projeto não encontrado': 'Project not found',
  'Aviso não encontrado': 'Notice not found',
  'Mensagem não encontrada': 'Message not found',
  'Envie { "value": ... }': 'Send { "value": ... }',
  'JSON inválido': 'Invalid JSON',
  'Conquista não encontrada': 'Achievement not found',
  'Métrica inválida': 'Invalid metric',
  'A meta deve ser um número inteiro maior que zero': 'The target must be a whole number greater than zero',
  'Ícone inválido': 'Invalid icon',
};

const PATTERNS = [
  [/^Campos obrigatórios: (.+)$/, (m) => `Required fields: ${m[1]}`],
  [/^Chave inválida\. Use: (.+)$/, (m) => `Invalid key. Use: ${m[1]}`],
  [/^(.+) está desligado\(a\) e não pode assumir turmas$/, (m) => `${m[1]} has been dismissed and cannot take classes`],
  [/^Professor substituto inválido para a turma (.+)$/, (m) => `Invalid replacement teacher for class ${m[1]}`],
];

export function translateError(msg) {
  if (ERRORS[msg]) return ERRORS[msg];
  for (const [re, fn] of PATTERNS) { const m = msg.match(re); if (m) return fn(m); }
  return msg;
}

export function langMiddleware(req, res, next) {
  const q = String(req.query.lang || '').toLowerCase();
  const h = String(req.headers['accept-language'] || '').toLowerCase();
  req.lang = q === 'en' || (!q && h.startsWith('en')) ? 'en' : 'pt';
  if (req.lang === 'en') {
    const json = res.json.bind(res);
    res.json = (body) => json(body && typeof body.error === 'string' ? { ...body, error: translateError(body.error) } : body);
  }
  next();
}
