import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { Avatar, Loading, useToast } from '../../components/ui.jsx';
import { WEEKDAYS, parseDate, todayStr, fmtLongDate } from '../../lib/format.js';
import { t } from '../../i18n/index.jsx';

const OPTS = [['present', 'P'], ['late', 'A'], ['absent', 'F']];

/** base = '/admin' (gestão, todas as turmas) ou '/teacher' (somente as turmas do professor) */
export default function Attendance({ base = '/admin' }) {
  const toast = useToast();
  const outlet = useOutletContext();
  const [params, setParams] = useSearchParams();
  const classes = useFetch(`${base}/classes`);
  const classId = Number(params.get('classId')) || null;
  const [date, setDate] = useState(params.get('date') || todayStr());
  const roster = useFetch(classId ? `${base}/attendance?classId=${classId}&date=${date}` : null);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  // Default to the first class happening today
  useEffect(() => {
    if (classId || !classes.data?.length) return;
    const wd = new Date().getDay();
    const c = classes.data.find((x) => x.schedules.some((s) => s.weekday === wd)) || classes.data[0];
    if (c) setParams({ classId: String(c.id) }, { replace: true });
  }, [classes.data, classId, setParams]);

  useEffect(() => {
    if (roster.data) setMarks(Object.fromEntries(roster.data.roster.map((r) => [r.student_id, r.status || null])));
  }, [roster.data]);

  const cls = classes.data?.find((c) => c.id === classId);
  const wd = parseDate(date).getDay();
  const scheduledToday = cls?.schedules.some((s) => s.weekday === wd);
  const counts = useMemo(() => Object.values(marks).reduce((a, v) => ({ ...a, [v || 'none']: (a[v || 'none'] || 0) + 1 }), {}), [marks]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`${base}/attendance`, { classId, date, records: Object.entries(marks).map(([studentId, status]) => ({ studentId: Number(studentId), status })) });
      toast(t('Chamada salva'));
      roster.reload();
      outlet?.reloadDash?.();
    } catch (e) { toast(e.message, 'err'); } finally { setSaving(false); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>{t('Chamada')}</h1><p>{fmtLongDate(date)}</p></div>
      </div>
      <div className="toolbar">
        <select className="select" style={{ width: 'auto', minWidth: 240 }} value={classId || ''} onChange={(e) => setParams({ classId: e.target.value, date })}>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.schedules.map((s) => WEEKDAYS[s.weekday].slice(0, 3)).join('/')}</option>)}
        </select>
        <input className="input" type="date" style={{ width: 'auto' }} value={date} max={todayStr()} onChange={(e) => { setDate(e.target.value); setParams({ classId: String(classId), date: e.target.value }); }} />
        {cls && !scheduledToday && <span className="badge warn">{t('Esta turma não tem aula neste dia da semana')}</span>}
      </div>

      {!roster.data ? <Loading /> : (
        <div className="grid g-3">
          <div className="card span-2" style={{ padding: 0 }}>
            <div className="card-head" style={{ padding: '18px 16px 0' }}>
              <h2>{cls?.name} · {t('{n} alunos', { n: roster.data.roster.length })}</h2>
              <button className="btn btn-sm" onClick={() => setMarks(Object.fromEntries(roster.data.roster.map((r) => [r.student_id, 'present'])))}><CheckCheck size={15} />{t(' Todos presentes')}</button>
            </div>
            {roster.data.roster.map((r) => (
              <div className="att-row" key={r.student_id}>
                <div className="person"><Avatar name={r.name} /><div>{r.name}<small>{t(r.level)}</small></div></div>
                <div className="att-opts" role="radiogroup" aria-label={t('Presença de {name}', { name: r.name })}>
                  {OPTS.map(([k, l]) => (
                    <button key={k} className={`${k} ${marks[r.student_id] === k ? 'on' : ''}`} role="radio" aria-checked={marks[r.student_id] === k}
                      title={t({ present: 'Presente', late: 'Atrasado', absent: 'Falta' }[k])}
                      onClick={() => setMarks({ ...marks, [r.student_id]: marks[r.student_id] === k ? null : k })}>{t(l)}</button>
                  ))}
                </div>
              </div>
            ))}
            {roster.data.roster.length === 0 && <div className="empty">{t('Nenhum aluno ativo nesta turma.')}</div>}
          </div>
          <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 84 }}>
            <div className="card-head"><h2>{t('Resumo')}</h2></div>
            <div className="list-row"><span>{t('Presentes')}</span><span className="badge ok">{counts.present || 0}</span></div>
            <div className="list-row"><span>{t('Atrasados')}</span><span className="badge warn">{counts.late || 0}</span></div>
            <div className="list-row"><span>{t('Faltas')}</span><span className="badge bad">{counts.absent || 0}</span></div>
            <div className="list-row"><span>{t('Sem marcação')}</span><span className="badge">{counts.none || 0}</span></div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} onClick={save} disabled={saving}>{saving ? t('Salvando…') : t('Salvar chamada')}</button>
            <p className="dim" style={{ fontSize: 12.5, marginTop: 10 }}>{t('P = presente · A = atrasado · F = falta. A presença alimenta a jornada e as conquistas do aluno no portal.')}</p>
          </div>
        </div>
      )}
    </>
  );
}
