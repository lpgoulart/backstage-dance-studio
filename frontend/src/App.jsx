import { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider, RequireRole } from './lib/auth.jsx';
import { ToastProvider, Loading } from './components/ui.jsx';
import SiteLayout from './components/SiteLayout.jsx';
import Home from './pages/site/Home.jsx';
import About from './pages/site/About.jsx';
import Projects from './pages/site/Projects.jsx';
import Events from './pages/site/Events.jsx';
import Schedule from './pages/site/Schedule.jsx';
import Contact from './pages/site/Contact.jsx';
import Login from './pages/Login.jsx';
import { t, rich } from './i18n/index.jsx';

// The management apps are split into their own chunks
const PortalLayout = lazy(() => import('./pages/portal/PortalLayout.jsx'));
const PortalHome = lazy(() => import('./pages/portal/PortalHome.jsx'));
const PortalAgenda = lazy(() => import('./pages/portal/PortalAgenda.jsx'));
const PortalJourney = lazy(() => import('./pages/portal/PortalJourney.jsx'));
const PortalEvents = lazy(() => import('./pages/portal/PortalEvents.jsx'));
const PortalFinance = lazy(() => import('./pages/portal/PortalFinance.jsx'));
const PortalNotices = lazy(() => import('./pages/portal/PortalNotices.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Students = lazy(() => import('./pages/admin/Students.jsx'));
const Classes = lazy(() => import('./pages/admin/Classes.jsx'));
const Teachers = lazy(() => import('./pages/admin/Teachers.jsx'));
const Diaries = lazy(() => import('./pages/admin/Diaries.jsx'));
const WeekSchedule = lazy(() => import('./pages/admin/WeekSchedule.jsx'));
const Attendance = lazy(() => import('./pages/admin/Attendance.jsx'));
const Payments = lazy(() => import('./pages/admin/Payments.jsx'));
const SiteEditor = lazy(() => import('./pages/admin/SiteEditor.jsx'));
const Messages = lazy(() => import('./pages/admin/Messages.jsx'));
const TeacherLayout = lazy(() => import('./pages/teacher/TeacherLayout.jsx'));
const TeacherHome = lazy(() => import('./pages/teacher/TeacherHome.jsx'));
const TeacherClasses = lazy(() => import('./pages/teacher/TeacherClasses.jsx'));
const TeacherDiary = lazy(() => import('./pages/teacher/TeacherDiary.jsx'));
const TeacherProfile = lazy(() => import('./pages/teacher/TeacherProfile.jsx'));

function NotFound() {
  return (
    <section className="page-hero" style={{ minHeight: '70vh' }}>
      <div className="container">
        <span className="eyebrow">{t('Erro 404')}</span>
        <h1>{rich(t('Esta cena *não existe*.'))}</h1>
        <p>{t('A página que você procura saiu de cena. Que tal voltar ao início?')}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 30 }}>{t('Voltar ao início')}</Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route index element={<Home />} />
                <Route path="sobre" element={<About />} />
                <Route path="projetos" element={<Projects />} />
                <Route path="eventos" element={<Events />} />
                <Route path="horarios" element={<Schedule />} />
                <Route path="contato" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="entrar" element={<Login />} />
              <Route path="portal" element={<RequireRole roles={['guardian', 'student']}><PortalLayout /></RequireRole>}>
                <Route index element={<PortalHome />} />
                <Route path="agenda" element={<PortalAgenda />} />
                <Route path="jornada" element={<PortalJourney />} />
                <Route path="eventos" element={<PortalEvents />} />
                <Route path="financeiro" element={<PortalFinance />} />
                <Route path="avisos" element={<PortalNotices />} />
              </Route>
              <Route path="professor" element={<RequireRole roles={['teacher']}><TeacherLayout /></RequireRole>}>
                <Route index element={<TeacherHome />} />
                <Route path="turmas" element={<TeacherClasses />} />
                <Route path="chamada" element={<Attendance base="/teacher" />} />
                <Route path="diario" element={<TeacherDiary />} />
                <Route path="perfil" element={<TeacherProfile />} />
              </Route>
              <Route path="gestao" element={<RequireRole roles={['manager']}><AdminLayout /></RequireRole>}>
                <Route index element={<Dashboard />} />
                <Route path="alunos" element={<Students />} />
                <Route path="turmas" element={<Classes />} />
                <Route path="professores" element={<Teachers />} />
                <Route path="diarios" element={<Diaries />} />
                <Route path="grade" element={<WeekSchedule />} />
                <Route path="chamada" element={<Attendance />} />
                <Route path="financeiro" element={<Payments />} />
                <Route path="site" element={<SiteEditor />} />
                <Route path="mensagens" element={<Messages />} />
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
