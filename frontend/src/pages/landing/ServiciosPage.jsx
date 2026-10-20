import { useState, useEffect } from 'react';
import { C, F, T, Section, SectionLabel, PageHeader, CheckItem } from './shared';
import api from '../../services/api';
import { S, whatsappLink } from '../../contenido';

// Tarifa mensual única por modalidad: se lee de la BD (la misma que se cobra). Respaldo si la API no responde.
const TARIFAS_RESPALDO = { autonomo: 120000, acompanado: 350000 };
const fmtPrecio = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const etiquetaPequena = (color) => ({ fontFamily: F.texto, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color, marginBottom: '6px' });

function NivelesSection() {
  const t = S.servicios.niveles;
  return (
    <Section>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <SectionLabel>{t.etiqueta}</SectionLabel>
        <h2 style={{ ...T.h2, marginBottom: '12px' }}>{t.titulo}</h2>
        <p style={{ ...T.body, maxWidth: '520px', margin: '0 auto' }}>{t.parrafo}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="niv-grid">
        <style>{`@media(max-width:900px){.niv-grid{grid-template-columns:1fr!important}}`}</style>
        {t.lista.map(n => (
          <div key={n.nombre} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '22px', background: `${n.color}10`, borderBottom: `1px solid ${n.color}20` }}>
              <div style={etiquetaPequena(n.color)}>{n.rango}</div>
              <h3 style={{ fontFamily: F.titulos, fontSize: '1.4rem', color: n.color, marginBottom: '10px' }}>{n.nombre}</h3>
              <p style={{ ...T.body, fontSize: '0.85rem', color: C.text3, fontStyle: 'italic' }}>{n.dolor}</p>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ ...T.body, fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.7, fontStyle: 'italic', color: C.text2 }}>"{n.pitch}"</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {n.incluye.map(i => <CheckItem key={i} color={n.color}>{i}</CheckItem>)}
              </div>
            </div>
          </div>
        ))}
      </div>

    </Section>
  );
}

function PlanesSection() {
  const t = S.servicios.planes;
  const [tarifas, setTarifas] = useState(TARIFAS_RESPALDO);
  useEffect(() => { api.getTarifas().then(setTarifas).catch(() => {}); }, []);
  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <Section>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <SectionLabel>{t.etiqueta}</SectionLabel>
          <h2 style={{ ...T.h2, marginBottom: '12px' }}>{t.titulo}</h2>
          <p style={{ ...T.body, maxWidth: '500px', margin: '0 auto' }}>{t.parrafo}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '820px', margin: '0 auto' }} className="planes-grid">
          <style>{`@media(max-width:640px){.planes-grid{grid-template-columns:1fr!important}}`}</style>
          {t.lista.map(p => (
            <div key={p.modalidad} style={{
              background: p.destacado ? C.sidebar : C.surfaceAlt,
              border: `1px solid ${p.destacado ? `${p.color}40` : C.border}`,
              borderRadius: '16px', padding: '28px', position: 'relative',
              boxShadow: p.destacado ? `0 0 40px ${p.color}12` : 'none',
            }}>
              {p.destacado && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: p.color, color: C.onAccent, padding: '4px 16px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, fontFamily: F.texto, whiteSpace: 'nowrap' }}>{t.insigniaDestacado}</div>}
              <div style={etiquetaPequena(p.color)}>{p.categoria}</div>
              <h3 style={{ fontFamily: F.titulos, fontSize: '1.3rem', color: C.text, marginBottom: '6px' }}>{p.nombre}</h3>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontFamily: F.titulos, fontSize: '1.7rem', color: p.color }}>{fmtPrecio(tarifas[p.modalidad])}</span>
                <div style={{ fontFamily: F.texto, fontSize: '0.78rem', color: C.text3, marginTop: '2px' }}>{p.periodo}</div>
              </div>
              <p style={{ ...T.body, fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.7 }}>{p.descripcion}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {p.incluye.map(i => <CheckItem key={i} color={p.color}>{i}</CheckItem>)}
              </div>
              <div style={{ width: '100%', textAlign: 'center', padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontFamily: F.texto, fontSize: '0.82rem', color: C.text2 }}>
                {p.pie}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: F.texto, fontSize: '0.85rem', color: C.text3 }}>
          {t.notaAntes} <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontWeight: 600 }}>{t.notaEnlace}</a> {t.notaDespues}
        </p>
      </Section>
    </div>
  );
}

export default function ServiciosPage() {
  const h = S.servicios.encabezado;
  return (
    <>
      <PageHeader label={h.etiqueta} title={h.titulo} subtitle={h.subtitulo} />
      <NivelesSection />
      <PlanesSection />
    </>
  );
}
