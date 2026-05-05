import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Input, List, Space, Spin, Tag, Typography } from 'antd';
import { AudioOutlined, AudioMutedOutlined, LinkOutlined, ReloadOutlined, SendOutlined, RobotOutlined } from '@ant-design/icons';
import { ragAPI } from '../../api/api';

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

function createConversationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `super-rag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadConversationId() {
  const stored = sessionStorage.getItem('super_rag_conversation_id');
  if (stored) return stored;
  const next = createConversationId();
  sessionStorage.setItem('super_rag_conversation_id', next);
  return next;
}

export default function AsistenteRag() {
  const [conversationId, setConversationId] = useState(loadConversationId);
  const [question, setQuestion] = useState('');
  const [tenantScope, setTenantScope] = useState('');
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
      content: 'Puedo responder consultas globales o aterrizar el contexto en una oficina especifica. Si dejas el campo de tenant vacio, usare el contexto global.',
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

  const userName = localStorage.getItem('userName') || 'Super Admin';

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
      const payload = await ragAPI.documents({
        limit: 12,
        targetTenantId: tenantScope.trim() || undefined,
      });
      setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
    } catch (error) {
      console.error('Error cargando documentos de conocimiento superadmin:', error);
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
      console.error('Error generando voz superadmin:', error);
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
          console.error('Error transcribiendo audio superadmin:', error);
          setVoiceStatus(error.response?.data?.error || 'No se pudo transcribir el audio.');
          setVoiceBusy(false);
        }
      };

      recorder.start();
      setRecording(true);
      setVoiceStatus('Grabando... presiona de nuevo para detener.');
    } catch (error) {
      console.error('Error iniciando grabación superadmin:', error);
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

      if (tenantScope.trim()) {
        requestPayload.targetTenantId = tenantScope.trim();
      }

      if (hasText) {
        requestPayload.rawText = cleanText;
      }

      if (hasFile) {
        const dataUrl = await fileToDataUrl(knowledgeFile);
        requestPayload.base64Data = dataUrl.split(',')[1] || '';
        requestPayload.fileName = knowledgeFile.name;
        requestPayload.mimeType = knowledgeFile.type || '';
      }

      const payload = await ragAPI.uploadKnowledge(requestPayload);

      setKnowledgeStatus({
        type: 'success',
        text: payload.message || `${getKnowledgeLabel(payload.document?.sourceType)} indexado correctamente (${payload.chunksImported || 0} fragmentos).`,
      });
      setKnowledgeFile(null);
      setKnowledgeTitle('');
      setKnowledgeText('');
      await loadDocuments();
    } catch (error) {
      console.error('Error subiendo conocimiento superadmin:', error);
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
      setStatus({ type: 'warning', text: 'Escribe una pregunta para consultar.' });
      return;
    }

    setLoading(true);
    setStatus(null);
    appendMessage('user', cleanQuestion, { label: userName });
    setQuestion('');
    setVoiceStatus('');

    try {
      const payload = await ragAPI.chat({
        message: cleanQuestion,
        conversationId,
        channel: 'web',
        targetTenantId: tenantScope.trim() || undefined,
      });

      appendMessage('assistant', payload.answer || 'No se obtuvo respuesta.', {
        label: 'Asistente',
        memorySaved: payload.memoryStored,
        fallback: payload.fallbackMode,
      });

      setSources(Array.isArray(payload.sources) ? payload.sources : []);
      setFollowUps(Array.isArray(payload.followUpQuestions) ? payload.followUpQuestions : []);
      setStatus({
        type: payload.memoryStored ? 'success' : 'info',
        text: payload.memoryStored ? 'Memoria actualizada.' : 'Consulta procesada sin guardar una preferencia duradera.',
      });

      if (autoSpeak && payload.answer) {
        playAssistantAudio(payload.answer);
      }
    } catch (error) {
      console.error('Error consultando RAG superadmin:', error);
      appendMessage('assistant', error.response?.data?.error || 'No se pudo consultar el asistente.', {
        label: 'Asistente',
      });
      setStatus({
        type: 'error',
        text: 'Hubo un problema consultando el servicio RAG.',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    const nextConversationId = createConversationId();
    sessionStorage.setItem('super_rag_conversation_id', nextConversationId);
    setConversationId(nextConversationId);
    setQuestion('');
    setTenantScope('');
    setSources([]);
    setFollowUps([]);
    setStatus(null);
    setMessages([
      {
        role: 'assistant',
        content: 'Puedo responder consultas globales o aterrizar el contexto en una oficina especifica. Si dejas el campo de tenant vacio, usare el contexto global.',
        meta: { label: 'Sistema' },
      },
    ]);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(13,27,42,0.96), rgba(27,38,59,0.96))',
          color: '#fff',
          border: '1px solid rgba(79,195,247,0.18)',
          boxShadow: '0 16px 34px rgba(2,6,23,0.35)',
        }}
        bodyStyle={{ color: '#fff' }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space align="center" size={12}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #4fc3f7, #1565c0)',
                color: '#fff',
              }}
            >
              <RobotOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, color: '#fff' }}>
                Asistente RAG
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.72)' }}>
                Memoria de largo plazo y contexto multi-oficina para control operativo.
              </Text>
            </div>
          </Space>

          <Space wrap>
            <Tag color="blue">Conversacion: {conversationId.slice(0, 8)}</Tag>
            <Tag color="cyan">Operador: {userName}</Tag>
            <Tag color={tenantScope.trim() ? 'geekblue' : 'gold'}>
              Scope: {tenantScope.trim() || 'Global'}
            </Tag>
          </Space>
        </Space>
      </Card>

      <Card
        title="Cargar conocimiento al RAG"
        extra={
          <Button onClick={loadDocuments} loading={documentsLoading}>
            Actualizar documentos
          </Button>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Paragraph style={{ marginBottom: 0 }}>
            Sube PDF, Word, imagen o pega texto plano. En superadmin puedes dejar el scope vacio para conocimiento global o indicar un tenant especifico.
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
            <Input
              value={tenantScope}
              onChange={(e) => setTenantScope(e.target.value)}
              placeholder="Tenant ID para este conocimiento (deja vacio para global)"
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
                            <Tag color="cyan">{item.chunkCount} fragmentos</Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text type="secondary">
                              {item.fileName || item.originalTitle || 'Documento'}{item.uploadedBy ? ` · ${item.uploadedBy}` : ''}
                            </Text>
                            <Text style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>{item.preview}</Text>
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
                  Aun no hay conocimiento indexado en este scope.
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.9fr)', gap: 16 }}>
        <Card
          title="Chat"
          extra={
            <Button icon={<ReloadOutlined />} onClick={resetConversation}>
              Reiniciar
            </Button>
          }
          style={{ minHeight: 700 }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ maxHeight: 430, overflow: 'auto', paddingRight: 8 }}>
              <List
                dataSource={messages}
                renderItem={(item, index) => (
                  <List.Item key={`${item.role}-${index}`} style={{ border: 'none', padding: 0, marginBottom: 12 }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div
                        style={{
                          maxWidth: '94%',
                          padding: '14px 16px',
                          borderRadius: 16,
                          background: item.role === 'user' ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(148,163,184,0.16)',
                          color: '#fff',
                        }}
                      >
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space size={8} wrap>
                            <Tag color={item.role === 'user' ? 'blue' : 'green'} style={{ margin: 0 }}>
                              {item.meta?.label || (item.role === 'user' ? 'Tu' : 'Asistente')}
                            </Tag>
                            {item.meta?.memorySaved ? <Tag color="purple">Memoria</Tag> : null}
                            {item.meta?.fallback ? <Tag color="orange">Fallback</Tag> : null}
                          </Space>
                          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#fff' }}>
                            {item.content}
                          </Paragraph>
                        </Space>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
              <div ref={bottomRef} />
            </div>

            <TextArea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ej: Que oficinas tienen pagos pendientes o resume la cartera de la oficina popayan2."
              autoSize={{ minRows: 3, maxRows: 6 }}
              disabled={loading}
            />

            <Space>
              <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={loading}>
                Consultar
              </Button>
              <Button onClick={() => setQuestion('')} disabled={loading}>
                Limpiar
              </Button>
              <Button onClick={() => setAutoSpeak((value) => !value)} disabled={loading || voiceBusy}>
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

        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Fuentes recuperadas" style={{ minHeight: 320 }}>
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
              <Text type="secondary">Aqui apareceran las fuentes recuperadas para cada consulta.</Text>
            )}
          </Card>

          <Card title="Siguientes preguntas">
            {followUps.length ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {followUps.map((item) => (
                  <Button key={item} type="dashed" block onClick={() => setQuestion(item)}>
                    {item}
                  </Button>
                ))}
              </Space>
            ) : (
              <Text type="secondary">El sistema sugerira preguntas de seguimiento cuando detecte contexto util.</Text>
            )}
          </Card>

          {loading && (
            <Card>
              <Spin />
              <Text style={{ marginLeft: 12 }}>Procesando consulta...</Text>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
