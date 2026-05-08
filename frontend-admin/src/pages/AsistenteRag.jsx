import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Divider, Input, List, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined, SendOutlined, ReloadOutlined, LinkOutlined, RobotOutlined } from '@ant-design/icons';
import { ragAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const KNOWLEDGE_ACCEPT = '.pdf,.doc,.docx,.txt,.md,.csv,image/*';

function getKnowledgeLabel(sourceType = '') {
  const normalized = String(sourceType || '').toLowerCase();
  return {
    pdf: 'PDF',
    word: 'Word',
    image: 'Imagen',
    text: 'Texto',
  }[normalized] || 'Documento';
}

function getKnowledgeTagColor(sourceType = '') {
  const normalized = String(sourceType || '').toLowerCase();
  return {
    pdf: 'volcano',
    word: 'geekblue',
    image: 'orange',
    text: 'green',
  }[normalized] || 'blue';
}

function formatKnowledgeStorage(storage = {}) {
  const parts = [
    storage.documentCollection,
    storage.chunkCollection,
    storage.runtimeCollection,
  ].map((value) => String(value || '').trim()).filter(Boolean);

  if (!parts.length) {
    return '';
  }

  return ` Guardado en: ${parts.join(', ')}.`;
}

function createConversationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadConversationId() {
  const stored = sessionStorage.getItem('admin_rag_conversation_id');
  if (stored) return stored;
  const next = createConversationId();
  sessionStorage.setItem('admin_rag_conversation_id', next);
  return next;
}

export default function AsistenteRag() {
  const [conversationId, setConversationId] = useState(loadConversationId);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingKnowledge, setUploadingKnowledge] = useState(false);
  const [knowledgeFile, setKnowledgeFile] = useState(null);
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeText, setKnowledgeText] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hola. Puedo responder con memoria persistente, datos del tenant y contexto recuperado. Escribe tu consulta para empezar.',
      meta: { label: 'Sistema' },
    },
  ]);
  const [sources, setSources] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState(null);
  const [knowledgeStatus, setKnowledgeStatus] = useState(null);
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  const tenantId = localStorage.getItem('tenantId') || '';
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');

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

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setDocumentsLoading(true);
    try {
      const response = await ragAPI.documents({ limit: 12 });
      const payload = response.data || {};
      setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
    } catch (error) {
      console.error('Error cargando documentos de conocimiento:', error);
    } finally {
      setDocumentsLoading(false);
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  }

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
      const response = await ragAPI.speakText({
        text,
        voice: 'nova',
      });
      const payload = response.data || {};

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
      console.error('Error generando voz:', error);
      audioPlayerRef.current = null;
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
          const payload = response.data || {};

          const transcript = String(payload.text || '').trim();
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
          console.error('Error transcribiendo audio:', error);
          setVoiceStatus(error.response?.data?.error || 'No se pudo transcribir el audio.');
          setVoiceBusy(false);
        }
      };

      recorder.start();
      setRecording(true);
      setVoiceStatus('Grabando... presiona de nuevo para detener.');
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      setVoiceStatus(error.response?.data?.error || 'No se pudo acceder al micrófono.');
      setRecording(false);
    }
  }

  const appendMessage = (role, content, meta = {}) => {
    setMessages((prev) => [...prev, { role, content, meta }]);
  };

  const handleKnowledgeUpload = async () => {
    const cleanText = knowledgeText.trim();
    const hasText = Boolean(cleanText);
    const hasFile = Boolean(knowledgeFile);

    if (!hasText && !hasFile) {
      setKnowledgeStatus({ type: 'warning', text: 'Agrega un archivo o pega texto antes de indexar.' });
      return;
    }

    if (hasText && hasFile) {
      setKnowledgeStatus({ type: 'warning', text: 'Usa solo archivo o solo texto en cada carga.' });
      return;
    }

    if (hasFile && knowledgeFile.size > MAX_UPLOAD_SIZE_BYTES) {
      setKnowledgeStatus({ type: 'error', text: 'El archivo supera el tamaño máximo de 20 MB.' });
      return;
    }

    setUploadingKnowledge(true);
    setKnowledgeStatus(null);

    try {
      const requestPayload = {
        title: knowledgeTitle.trim() || (hasFile ? knowledgeFile.name.replace(/\.[^.]+$/, '') : 'Conocimiento'),
        channel: 'web',
      };

      if (hasText) {
        requestPayload.rawText = cleanText;
      }

      if (hasFile) {
        const dataUrl = await fileToDataUrl(knowledgeFile);
        requestPayload.base64Data = dataUrl.split(',')[1] || '';
        requestPayload.fileName = knowledgeFile.name;
        requestPayload.mimeType = knowledgeFile.type || '';
      }

      const response = await ragAPI.uploadKnowledge(requestPayload);

      const responsePayload = response.data || {};
      const storageNote = formatKnowledgeStorage(responsePayload.document?.storage);
      const successText = responsePayload.message || `${getKnowledgeLabel(responsePayload.document?.sourceType)} indexado correctamente (${responsePayload.chunksImported || 0} fragmentos).`;
      setKnowledgeStatus({
        type: 'success',
        text: `${successText}${storageNote}`,
      });
      setKnowledgeFile(null);
      setKnowledgeTitle('');
      setKnowledgeText('');
      await loadDocuments();
    } catch (error) {
      console.error('Error subiendo conocimiento:', error);
      setKnowledgeStatus({
        type: 'error',
        text: error.response?.data?.error || 'No se pudo indexar el documento.',
      });
    } finally {
      setUploadingKnowledge(false);
    }
  };

  const handleSubmit = async (overrideQuestion = '') => {
    const cleanQuestion = String(overrideQuestion || question).trim();
    if (!cleanQuestion) {
      message.warning('Escribe una pregunta para consultar.');
      return;
    }

    setLoading(true);
    setStatus(null);
    appendMessage('user', cleanQuestion, { label: user.nombre || 'Tu' });
    setQuestion('');
    setVoiceStatus('');

    try {
      const response = await ragAPI.chat({
        message: cleanQuestion,
        conversationId,
        channel: 'web',
      });

      const payload = response.data || {};

      appendMessage('assistant', payload.answer || 'No se obtuvo respuesta.', {
        label: 'Asistente',
        memorySaved: payload.memoryStored,
        fallback: payload.fallbackMode,
      });

      setSources(Array.isArray(payload.sources) ? payload.sources : []);
      setFollowUps(Array.isArray(payload.followUpQuestions) ? payload.followUpQuestions : []);

      setStatus({
        type: payload.memoryStored ? 'success' : 'info',
        text: payload.memoryStored
          ? 'Memoria actualizada con esta interaccion.'
          : 'Respuesta generada sin guardar una preferencia duradera.',
      });

      if (autoSpeak && payload.answer) {
        playAssistantAudio(payload.answer);
      }
    } catch (error) {
      console.error('Error consultando RAG:', error);
      appendMessage('assistant', error.response?.data?.error || 'No pude consultar el asistente en este momento.', {
        label: 'Asistente',
      });
      setStatus({
        type: 'error',
        text: 'Hubo un problema al consultar el servicio RAG.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = (value) => {
    setQuestion(value);
  };

  const resetConversation = () => {
    const nextConversationId = createConversationId();
    sessionStorage.setItem('admin_rag_conversation_id', nextConversationId);
    setConversationId(nextConversationId);
    setQuestion('');
    setSources([]);
    setFollowUps([]);
    setStatus(null);
    setMessages([
      {
        role: 'assistant',
        content: 'Hola. Puedo responder con memoria persistente, datos del tenant y contexto recuperado. Escribe tu consulta para empezar.',
        meta: { label: 'Sistema' },
      },
    ]);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card
        style={{
          border: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
        }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space align="center" size={10}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1d4ed8, #0f766e)',
                color: '#fff',
              }}
            >
              <RobotOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Asistente RAG
              </Title>
              <Text type="secondary">
                Memoria de largo plazo, contexto del tenant y recuperacion semantica en una sola capa.
              </Text>
            </div>
          </Space>

          <Space wrap>
            <Tag color="blue">Tenant: {tenantId || 'global'}</Tag>
            <Tag color="geekblue">Usuario: {user.nombre || user.email || 'admin'}</Tag>
            <Tag color="cyan">Conversacion: {conversationId.slice(0, 8)}</Tag>
          </Space>
        </Space>
      </Card>

      <Card
        title="Cargar conocimiento al RAG"
        extra={
          <Space>
            <Button onClick={loadDocuments} loading={documentsLoading}>
              Actualizar documentos
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Paragraph style={{ marginBottom: 0 }}>
            Sube PDF, Word, imagen o pega texto plano. El sistema lo convierte en conocimiento recuperable para el asistente dentro de este tenant.
          </Paragraph>

          <TextArea
            value={knowledgeText}
            onChange={(e) => setKnowledgeText(e.target.value)}
            placeholder="Pega aqui texto plano, contenido copiado de Word o notas operativas para indexarlas directamente."
            autoSize={{ minRows: 4, maxRows: 8 }}
          />

          <Space wrap style={{ width: '100%' }}>
            <Input
              value={knowledgeTitle}
              onChange={(e) => setKnowledgeTitle(e.target.value)}
              placeholder="Titulo opcional para el conocimiento"
              style={{ maxWidth: 360 }}
            />
            <input
              type="file"
              accept={KNOWLEDGE_ACCEPT}
              onChange={(e) => setKnowledgeFile(e.target.files?.[0] || null)}
            />
            <Button
              type="primary"
              onClick={handleKnowledgeUpload}
              loading={uploadingKnowledge}
              disabled={!knowledgeFile && !knowledgeText.trim()}
            >
              Indexar conocimiento
            </Button>
          </Space>

          {knowledgeFile && (
            <Tag color="blue">
              Archivo: {knowledgeFile.name} ({Math.round(knowledgeFile.size / 1024)} KB)
            </Tag>
          )}

          {knowledgeText.trim() && (
            <Tag color="green">
              Texto pegado listo para indexar
            </Tag>
          )}

          {knowledgeStatus && (
            <Alert
              type={knowledgeStatus.type}
              showIcon
              message={knowledgeStatus.text}
            />
          )}

          <Divider style={{ margin: '4px 0 0' }} />

          <div>
            <Text strong>Documentos indexados</Text>
            <div style={{ marginTop: 12 }}>
              {documents.length ? (
                <List
                  dataSource={documents}
                  renderItem={(item) => (
                    <List.Item key={`${item.tenantId || 'global'}-${item.sourceId}`}>
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Text strong>{item.title}</Text>
                            <Tag color={item.tenantId ? 'geekblue' : 'gold'}>
                              {item.tenantId || 'global'}
                            </Tag>
                            <Tag color={getKnowledgeTagColor(item.sourceType)}>
                              {getKnowledgeLabel(item.sourceType)}
                            </Tag>
                            <Tag color="blue">{item.chunkCount} fragmentos</Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text type="secondary">
                              {item.fileName || item.originalTitle || 'Documento'}{item.uploadedBy ? ` · ${item.uploadedBy}` : ''}
                            </Text>
                            <Text style={{ whiteSpace: 'pre-wrap' }}>{item.preview}</Text>
                            <Text type="secondary">
                              Actualizado: {item.updatedAt ? new Date(item.updatedAt).toLocaleString('es-CO') : 'sin fecha'}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">
                  Aun no has cargado conocimiento para este tenant.
                </Text>
              )}
            </div>
          </div>
        </Space>
      </Card>

      {status && (
        <Alert
          type={status.type}
          showIcon
          message={status.text}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title="Chat"
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={resetConversation}
              >
                Reiniciar
              </Button>
            }
            style={{ minHeight: 680 }}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <div
                style={{
                  maxHeight: 420,
                  overflow: 'auto',
                  paddingRight: 6,
                }}
              >
                <List
                  dataSource={messages}
                  renderItem={(item, index) => (
                    <List.Item key={`${item.role}-${index}`} style={{ border: 'none', padding: 0, marginBottom: 12 }}>
                      <div
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '92%',
                            padding: '14px 16px',
                            borderRadius: 16,
                            background: item.role === 'user' ? 'linear-gradient(135deg, #dbeafe, #eff6ff)' : '#f8fafc',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 8px 18px rgba(15,23,42,0.04)',
                          }}
                        >
                          <Space direction="vertical" size={6} style={{ width: '100%' }}>
                            <Space size={8} wrap>
                              <Tag color={item.role === 'user' ? 'blue' : 'green'} style={{ margin: 0 }}>
                                {item.meta?.label || (item.role === 'user' ? 'Tu' : 'Asistente')}
                              </Tag>
                              {item.meta?.memorySaved ? <Tag color="purple">Memoria guardada</Tag> : null}
                              {item.meta?.fallback ? <Tag color="orange">Fallback</Tag> : null}
                            </Space>
                            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.content}</Paragraph>
                          </Space>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
                <div ref={bottomRef} />
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <TextArea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ej: Dame un resumen de cartera de la oficina, o recuerda que prefiero respuestas breves."
                autoSize={{ minRows: 3, maxRows: 6 }}
                disabled={loading}
              />

              <Space>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSubmit}
                  loading={loading}
                >
                  Consultar
                </Button>
                <Button
                  onClick={() => setQuestion('')}
                  disabled={loading}
                >
                  Limpiar
                </Button>
                <Button
                  onClick={() => setAutoSpeak((value) => !value)}
                  disabled={loading || voiceBusy}
                >
                  {autoSpeak ? 'Voz activa' : 'Voz apagada'}
                </Button>
                <Button
                  type={recording ? 'primary' : 'default'}
                  danger={recording}
                  icon={recording ? <AudioMutedOutlined /> : <AudioOutlined />}
                  onClick={startVoiceRecording}
                  disabled={loading || voiceBusy}
                >
                  {recording ? 'Detener' : 'Hablar'}
                </Button>
              </Space>

              {voiceStatus && (
                <Alert
                  type="info"
                  showIcon
                  message={voiceStatus}
                  style={{ marginTop: 12 }}
                />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card title="Fuentes recuperadas" style={{ marginBottom: 16, minHeight: 320 }}>
            {sources.length ? (
              <List
                dataSource={sources}
                renderItem={(item) => (
                  <List.Item key={item.id} style={{ padding: '10px 0' }}>
                    <div style={{ width: '100%' }}>
                      <Space size={8} wrap style={{ marginBottom: 6 }}>
                        <Tag color="blue" icon={<LinkOutlined />}>
                          {item.type}
                        </Tag>
                        <Text strong>{item.title}</Text>
                      </Space>
                      <Paragraph style={{ margin: 0, color: '#475569', whiteSpace: 'pre-wrap' }}>
                        {item.snippet}
                      </Paragraph>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">Cuando hagas una consulta, aqui veras el contexto que recupero el modelo.</Text>
            )}
          </Card>

          <Card title="Siguientes preguntas">
            {followUps.length ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {followUps.map((item) => (
                  <Button
                    key={item}
                    type="dashed"
                    block
                    onClick={() => handleFollowUp(item)}
                  >
                    {item}
                  </Button>
                ))}
              </Space>
            ) : (
              <Text type="secondary">El modelo sugerira preguntas de seguimiento cuando lo considere util.</Text>
            )}
          </Card>
        </Col>
      </Row>

      {loading && (
        <Card>
          <Spin />
          <Text style={{ marginLeft: 12 }}>Procesando consulta...</Text>
        </Card>
      )}
    </div>
  );
}
