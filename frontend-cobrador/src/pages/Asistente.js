import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ragAPI } from '../api/api';

function createConversationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cobrador-rag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadConversationId() {
  const stored = sessionStorage.getItem('cobrador_rag_conversation_id');
  if (stored) return stored;
  const next = createConversationId();
  sessionStorage.setItem('cobrador_rag_conversation_id', next);
  return next;
}

export default function Asistente({ user, onLogout }) {
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState(loadConversationId);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Puedo responder sobre clientes, creditos y memoria reciente. Pregunta lo que necesites.',
    },
  ]);
  const [sources, setSources] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [status, setStatus] = useState('');
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sources, followUps]);

  useEffect(() => () => {
    try {
      mediaRecorderRef.current?.stop?.();
    } catch (error) {
      // ignore
    }
    mediaStreamRef.current?.getTracks?.()?.forEach((track) => track.stop());
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
  }, []);

  const appendMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el audio'));
      reader.readAsDataURL(blob);
    });
  }

  async function playAssistantAudio(text) {
    if (!autoSpeak) {
      return;
    }

    try {
      setVoiceBusy(true);
      setVoiceStatus('Generando respuesta en voz...');
      const payload = await ragAPI.speakText({
        text,
        voice: 'nova',
      });

      const audioUrl = `data:${payload.mimeType || 'audio/mpeg'};base64,${payload.audioBase64 || ''}`;
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => {
        if (audioPlayerRef.current === audio) {
          audioPlayerRef.current = null;
        }
        setVoiceStatus('');
        setVoiceBusy(false);
      };
      audio.onerror = () => {
        if (audioPlayerRef.current === audio) {
          audioPlayerRef.current = null;
        }
        setVoiceStatus('No se pudo reproducir el audio de la respuesta.');
        setVoiceBusy(false);
      };

      await audio.play();
      setVoiceStatus('Reproduciendo respuesta...');
    } catch (error) {
      console.error('Error generando voz cobrador:', error);
      setVoiceStatus(error.response?.data?.error || 'No se pudo generar la voz de la respuesta.');
      setVoiceBusy(false);
    }
  }

  async function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }

  async function startVoiceRecording() {
    if (recording) {
      await stopVoiceRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceStatus('Tu navegador no soporta grabación de audio.');
      return;
    }

    try {
      setVoiceStatus('Solicitando permiso de micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordingChunksRef.current = [];

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : {};

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const chunks = recordingChunksRef.current.slice();
        recordingChunksRef.current = [];
        mediaStreamRef.current?.getTracks?.()?.forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setRecording(false);

        if (!chunks.length) {
          setVoiceStatus('No se capturó audio.');
          return;
        }

        try {
          setVoiceBusy(true);
          setVoiceStatus('Transcribiendo audio...');
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const dataUrl = await blobToDataUrl(blob);
          const response = await ragAPI.transcribeAudio({
            audioBase64: dataUrl.split(',')[1] || '',
            mimeType: blob.type || 'audio/webm',
            fileName: 'nota-de-voz.webm',
            language: 'es',
          });

          const transcript = String(response.text || '').trim();
          if (!transcript) {
            setVoiceStatus('No pude detectar un texto claro en el audio.');
            setVoiceBusy(false);
            return;
          }

          setVoiceStatus('Audio transcrito. Enviando consulta...');
          setQuestion(transcript);
          await handleSubmit(transcript);
          if (!autoSpeak) {
            setVoiceBusy(false);
          }
        } catch (error) {
          console.error('Error transcribiendo audio cobrador:', error);
          setVoiceStatus(error.response?.data?.error || 'No se pudo transcribir el audio.');
          setVoiceBusy(false);
        }
      };

      recorder.start();
      setRecording(true);
      setVoiceStatus('Grabando... presiona de nuevo para detener.');
    } catch (error) {
      console.error('Error iniciando grabación cobrador:', error);
      setVoiceStatus(error.response?.data?.error || 'No se pudo acceder al micrófono.');
      setRecording(false);
    }
  }

  const handleSubmit = async (overrideQuestion = '') => {
    const cleanQuestion = String(overrideQuestion || question).trim();
    if (!cleanQuestion) {
      setStatus('Escribe una pregunta para consultar.');
      return;
    }

    setLoading(true);
    setStatus('');
    appendMessage('user', cleanQuestion);
    setQuestion('');
    setVoiceStatus('');

    try {
      const response = await ragAPI.chat({
        message: cleanQuestion,
        conversationId,
        channel: 'web',
      });

      appendMessage('assistant', response.answer || 'No se obtuvo respuesta.');
      setSources(Array.isArray(response.sources) ? response.sources : []);
      setFollowUps(Array.isArray(response.followUpQuestions) ? response.followUpQuestions : []);
      setStatus(response.memoryStored ? 'Memoria actualizada.' : 'Respuesta generada.');

      if (autoSpeak && response.answer) {
        playAssistantAudio(response.answer);
      }
    } catch (error) {
      console.error('Error consultando asistente:', error);
      appendMessage('assistant', error.response?.data?.error || 'No pude consultar el asistente en este momento.');
      setStatus('Hubo un error al consultar el asistente.');
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    const nextConversationId = createConversationId();
    sessionStorage.setItem('cobrador_rag_conversation_id', nextConversationId);
    setConversationId(nextConversationId);
    setQuestion('');
    setMessages([
      {
        role: 'assistant',
        content: 'Puedo responder sobre clientes, creditos y memoria reciente. Pregunta lo que necesites.',
      },
    ]);
    setSources([]);
    setFollowUps([]);
    setStatus('');
  };

  const goBack = () => navigate('/menu');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #eef4ff 0%, #f8fafc 42%, #eef2f7 100%)',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '1180px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.96)',
        borderRadius: '28px',
        boxShadow: '0 16px 40px rgba(15,23,42,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%)',
          color: '#fff',
          padding: '22px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Gota a Gota</div>
              <h1 style={{ margin: 0, fontSize: '28px' }}>Asistente IA</h1>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '6px' }}>
                Memoria persistente para consultas de cartera, clientes y creditos.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={goBack} style={headerButtonStyle}>Volver al menu</button>
              <button
                onClick={() => {
                  if (onLogout) onLogout();
                  localStorage.clear();
                  window.location.href = '/';
                }}
                style={{ ...headerButtonStyle, background: 'rgba(255,255,255,0.16)' }}
              >
                Salir
              </button>
            </div>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Chip label={`Usuario: ${user?.nombre || 'Cobrador'}`} />
            <Chip label={`Tenant: ${user?.tenantId || localStorage.getItem('tenantId') || 'sin dato'}`} />
            <Chip label={`Conversacion: ${conversationId.slice(0, 8)}`} />
          </div>
        </div>

        <div style={{ padding: '18px' }}>
          {status && (
            <div style={{
              marginBottom: '16px',
              background: 'rgba(37,99,235,0.08)',
              border: '1px solid rgba(37,99,235,0.18)',
              borderRadius: '14px',
              padding: '12px 14px',
              color: '#1d4ed8',
              fontSize: '14px'
            }}>
              {status}
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.85fr)',
            gap: '16px',
          }}>
            <div style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Chat</h2>
                <button onClick={resetConversation} style={ghostButtonStyle}>Reiniciar</button>
              </div>

              <div style={{
                maxHeight: '430px',
                overflowY: 'auto',
                paddingRight: '6px',
              }}>
                {messages.map((item, index) => (
                  <div key={`${item.role}-${index}`} style={{
                    display: 'flex',
                    justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      maxWidth: '92%',
                      background: item.role === 'user'
                        ? 'linear-gradient(135deg, #dbeafe, #eff6ff)'
                        : '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow: '0 8px 18px rgba(15,23,42,0.04)',
                      whiteSpace: 'pre-wrap',
                      color: '#0f172a'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: item.role === 'user' ? '#1d4ed8' : '#16a34a', textTransform: 'uppercase', marginBottom: '6px' }}>
                        {item.role === 'user' ? 'Tu' : 'Asistente'}
                      </div>
                      <div style={{ fontSize: '15px', lineHeight: 1.55 }}>{item.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ej: Resume la cartera, dime cuales clientes tienen mas saldo o recuerda que prefiero respuestas breves."
                style={textareaStyle}
                disabled={loading}
              />

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button onClick={handleSubmit} disabled={loading} style={primaryButtonStyle}>
                  {loading ? 'Consultando...' : 'Consultar'}
                </button>
                <button onClick={() => setQuestion('')} disabled={loading} style={ghostButtonStyle}>
                  Limpiar
                </button>
                <button onClick={() => setAutoSpeak((value) => !value)} disabled={loading || voiceBusy} style={ghostButtonStyle}>
                  {autoSpeak ? 'Voz activa' : 'Voz apagada'}
                </button>
                <button
                  onClick={startVoiceRecording}
                  disabled={loading || voiceBusy}
                  style={{
                    ...primaryButtonStyle,
                    background: recording ? 'linear-gradient(135deg, #b91c1c, #ef4444)' : 'linear-gradient(135deg, #0f766e, #14b8a6)',
                  }}
                >
                  {recording ? 'Detener' : 'Hablar'}
                </button>
              </div>

              {voiceStatus && (
                <div style={{
                  marginTop: '12px',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  background: 'rgba(14,165,233,0.08)',
                  border: '1px solid rgba(14,165,233,0.16)',
                  color: '#0369a1',
                  fontSize: '14px',
                }}>
                  {voiceStatus}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={panelStyle}>
                <h2 style={{ marginTop: 0, marginBottom: '10px', fontSize: '18px', color: '#0f172a' }}>
                  Fuentes recuperadas
                </h2>
                {sources.length ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {sources.map((item) => (
                      <div key={item.id} style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={sourceBadgeStyle}>{item.type}</span>
                          <strong style={{ color: '#0f172a' }}>{item.title}</strong>
                        </div>
                        <div style={{ color: '#475569', whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.5 }}>
                          {item.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    Aqui veras el contexto recuperado para cada consulta.
                  </div>
                )}
              </div>

              <div style={panelStyle}>
                <h2 style={{ marginTop: 0, marginBottom: '10px', fontSize: '18px', color: '#0f172a' }}>
                  Siguientes preguntas
                </h2>
                {followUps.length ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {followUps.map((item) => (
                      <button key={item} onClick={() => setQuestion(item)} style={suggestionButtonStyle}>
                        {item}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    El sistema sugerira preguntas de seguimiento cuando detecte contexto util.
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading && (
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1d4ed8' }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #bfdbfe', borderTopColor: '#1d4ed8', animation: 'spin 0.8s linear infinite' }} />
              Procesando consulta...
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const headerButtonStyle = {
  border: 'none',
  borderRadius: '12px',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const panelStyle = {
  background: '#fff',
  borderRadius: '20px',
  padding: '18px',
  boxShadow: '0 14px 30px rgba(15,23,42,0.06)',
  border: '1px solid #e5e7eb',
};

const primaryButtonStyle = {
  border: 'none',
  borderRadius: '12px',
  padding: '12px 16px',
  background: 'linear-gradient(135deg, #1e40af, #2563eb)',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
};

const ghostButtonStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '12px',
  padding: '12px 16px',
  background: '#fff',
  color: '#0f172a',
  fontWeight: 700,
  cursor: 'pointer',
};

const textareaStyle = {
  width: '100%',
  minHeight: '110px',
  marginTop: '14px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  padding: '14px 16px',
  fontSize: '15px',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
};

const sourceBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: '999px',
  background: '#dbeafe',
  color: '#1d4ed8',
  fontSize: '11px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const suggestionButtonStyle = {
  border: '1px dashed #93c5fd',
  background: '#eff6ff',
  color: '#1d4ed8',
  borderRadius: '12px',
  padding: '12px 14px',
  textAlign: 'left',
  cursor: 'pointer',
  fontWeight: 700,
};

const Chip = ({ label }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.16)',
    fontSize: '13px',
  }}>
    {label}
  </span>
);
