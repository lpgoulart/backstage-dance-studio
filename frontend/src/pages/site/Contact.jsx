import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Instagram, Mail, MapPin, MessageCircle, Phone, Clock, Send } from 'lucide-react';
import { Reveal, SplitHeading } from '../../components/motion.jsx';
import { api } from '../../lib/api.js';
import { t } from '../../i18n/index.jsx';

const INTERESTS = ['Aula experimental', 'Ballet', 'Jazz', 'Contemporâneo', 'Hip Hop / Street', 'K-Pop', 'Heels', 'Sapateado', 'Ritmos', 'Outro assunto'];

export default function Contact() {
  const { content } = useOutletContext();
  const c = content?.contact || {};
  const [form, setForm] = useState({ name: '', email: '', phone: '', interest: 'Aula experimental', message: '' });
  const [state, setState] = useState({ sending: false, sent: false, error: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ sending: true, sent: false, error: null });
    try {
      await api.post('/public/contact', form);
      setState({ sending: false, sent: true, error: null });
    } catch (err) {
      setState({ sending: false, sent: false, error: err.message });
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal><span className="eyebrow">{t('Contato')}</span></Reveal>
          <SplitHeading text={t('Vamos *dançar* juntos?')} delay={0.1} />
          <Reveal delay={0.4}><p>{t('Agende uma aula experimental, tire dúvidas sobre turmas e valores ou só venha nos conhecer.')}</p></Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container contact-grid">
          <Reveal>
            <div className="contact-list">
              {c.whatsapp && <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle /><div><small>{t('WhatsApp')}</small>{c.phone}</div></a>}
              {c.phone && <a href={`tel:${c.phone.replace(/\D/g, '')}`}><Phone /><div><small>{t('Telefone')}</small>{c.phone}</div></a>}
              {c.email && <a href={`mailto:${c.email}`}><Mail /><div><small>{t('E-mail')}</small>{c.email}</div></a>}
              {c.instagram && <a href={`https://www.instagram.com/${c.instagram}/`} target="_blank" rel="noreferrer"><Instagram /><div><small>{t('Instagram')}</small>@{c.instagram}</div></a>}
              {c.address && <div className="ci"><MapPin /><div><small>{t('Endereço')}</small>{c.address}</div></div>}
              {c.hours && <div className="ci"><Clock /><div><small>{t('Funcionamento')}</small>{c.hours}</div></div>}
            </div>
            <iframe className="map-frame" title={t('Mapa')} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(c.mapQuery || 'Manaus, AM')}&output=embed`} />
          </Reveal>

          <Reveal delay={0.15} className="form-card">
            <AnimatePresence mode="wait">
              {state.sent ? (
                <motion.div key="ok" className="success-box" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="check"><Check /></div>
                  <h3 className="serif" style={{ fontSize: 34, fontWeight: 400 }}>{t('Mensagem recebida!')}</h3>
                  <p className="muted" style={{ marginTop: 12 }}>{t('Nossa equipe vai responder em breve. Enquanto isso, que tal nos seguir no Instagram?')}</p>
                  <button className="btn" style={{ marginTop: 26 }} onClick={() => { setForm({ ...form, message: '' }); setState({ sending: false, sent: false, error: null }); }}>{t('Enviar outra mensagem')}</button>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={submit} className="form-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="serif" style={{ fontSize: 32, fontWeight: 400, marginBottom: 6 }}>{t('Fale com a gente')}</h3>
                  <div className="float-field">
                    <input id="c-name" placeholder=" " required value={form.name} onChange={set('name')} autoComplete="name" />
                    <label htmlFor="c-name">{t('Seu nome')}</label>
                  </div>
                  <div className="form-grid two">
                    <div className="float-field">
                      <input id="c-email" type="email" placeholder=" " value={form.email} onChange={set('email')} autoComplete="email" />
                      <label htmlFor="c-email">{t('E-mail')}</label>
                    </div>
                    <div className="float-field">
                      <input id="c-phone" placeholder=" " value={form.phone} onChange={set('phone')} autoComplete="tel" />
                      <label htmlFor="c-phone">{t('WhatsApp')}</label>
                    </div>
                  </div>
                  <div className="float-field">
                    <select id="c-int" value={form.interest} onChange={set('interest')}>
                      {INTERESTS.map((i) => <option key={i} value={i}>{t(i)}</option>)}
                    </select>
                    <label htmlFor="c-int">{t('Interesse')}</label>
                  </div>
                  <div className="float-field">
                    <textarea id="c-msg" placeholder=" " required value={form.message} onChange={set('message')} />
                    <label htmlFor="c-msg">{t('Mensagem')}</label>
                  </div>
                  {state.error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{state.error}</p>}
                  <div><button className="btn btn-primary" disabled={state.sending} style={{ marginTop: 10 }}>{state.sending ? t('Enviando…') : t('Enviar mensagem')} <Send /></button></div>
                </motion.form>
              )}
            </AnimatePresence>
          </Reveal>
        </div>
      </section>
    </>
  );
}
