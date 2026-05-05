import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Divider,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AudioMutedOutlined,
  AudioOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  LinkOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { ragAPI } from '../../api/api';
import { getOficinas } from '../../api/superadmin';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const KNOWLEDGE_ACCEPT = '.pdf,.doc,.docx,.txt,.md,.csv,image/*';
const CONVERSATION_STORAGE_KEY = 'super_workspace_conversation_id';

function getWelcomeMessages() {
  return [
    {
      role: 'assistant',
      content: 'Hola. Este espacio unifica sesiones, documentos, memoria y voz para que tengas control completo desde una sola pantalla.',
      meta: { label: 'Sistema' },
    },
  ];
}

function formatDate(value) {
  if (!value) return 'sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sin fecha';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function channelLabel(value = '') {
  const normalized = String(value || '').toLowerCase();
  return {
    telegram: 'Telegram',
    web: 'Web',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    messenger: 'Messenger',
    email: 'Email',
  }[normalized] || normalized || 'Canal';
}

function channelColor(value = '') {
  const normalized = String(value || '').toLowerCase();
  return {
    telegram: 'blue',
    web: 'green',
    whatsapp: 'geekblue',
    instagram: 'magenta',
    facebook: 'volcano',
    messenger: 'purple',
    email: 'gold',
  }[normalized] || 'default';
}

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
  return `workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadConversationId() {
  const stored = sessionStorage.getItem(CONVERSATION_STORAGE_KEY);
  if (stored) return stored;
  const next = createConversationId();
  sessionStorage.setItem(CONVERSATION_STORAGE_KEY, next);
  return next;
}

export default function EspacioIA() {
  const [conversationId, setConversationId] = useState(loadConversationId);
  const [question, setQuestion] = useState('');
  const [search, setSearch] = useState('');
  const [tenantScope, setTenantScope] = useState('');
  const [oficinas, setOficinas] = useState([]);
  const [loadingOficinas, setLoadingOficinas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [uploadingKnowledge, setUploadingKnowledge] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [knowledgeFile, setKnowledgeFile] = useState(null);
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeText, setKnowledgeText] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hola. Este espacio unifica sesiones, documentos, memoria y voz para que tengas control completo desde una sola pantalla.',
      meta: { label: 'Sistema' },
    },
  ]);
  const [sources, setSources] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [showArchivedDocuments, setShowArchivedDocuments] = useState(false);
  const [documentActionBusy, setDocumentActionBusy] = useState('');
  const [status, setStatus] = useState(null);
  const [knowledgeStatus, setKnowledgeStatus] = useState(null);
  const bottomRef = useRef(null);
  const initialTenantRef = useRef(true);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  const tenantId = tenantScope.trim() || '';
  const userName = localStorage.getItem('userName') || 'Super Admin';
  const userEmail = localStorage.getItem('userEmail') || 'admin@super.com';
  const currentConversation = useMemo(
    () => conversations.find((item) => item.conversationId === conversationId) || null,
    [conversations, conversationId],
  );
  const officeOptions = useMemo(() => {
    const extra = oficinas
      .filter((item) => item && item.tenantId)
      .map((item) => ({
        value: item.tenantId,
        label: `${item.nombre || 'Oficina'} (${item.tenantId})`,
      }));

    return extra;
  }, [oficinas]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sources, followUps]);

  useEffect(() => {
    loadOficinas();
    loadConversations();
    loadDocuments();
  }, []);

  useEffect(() => {
    if (initialTenantRef.current) {
      initialTenantRef.current = false;
      return;
    }

    resetConversation();
    loadConversations();
    loadDocuments();
  }, [tenantId]);

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
    const existsInList = conversations.some((item) => item.conversationId === conversationId);
    if (conversationId && existsInList) {
      loadMessages(conversationId);
    }
  }, [conversationId, conversations]);

  async function loadDocuments(includeInactive = showArchivedDocuments) {
    setLoadingDocuments(true);
    try {
      const payload = await ragAPI.documents({
        limit: 14,
        targetTenantId: tenantId || undefined,
        includeInactive: includeInactive ? 'true' : undefined,
      });
      setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function loadOficinas() {
    setLoadingOficinas(true);
    try {
      const payload = await getOficinas();
      setOficinas(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Error cargando oficinas:', error);
    } finally {
      setLoadingOficinas(false);
    }
  }

  async function loadConversations({ silent = false } = {}) {
    if (!silent) setLoadingConversations(true);
    try {
      const payload = await ragAPI.conversations({
        limit: 60,
        search: search.trim() || undefined,
        targetTenantId: tenantId || undefined,
      });
      setConversations(Array.isArray(payload.conversations) ? payload.conversations : []);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }

  async function loadMessages(id) {
    if (!id) return;

    setLoadingThread(true);
    try {
      const payload = await ragAPI.conversationMessages(id, {
        targetTenantId: tenantId || undefined,
      });
      setMessages(Array.isArray(payload.messages) && payload.messages.length
        ? payload.messages
        : [
            {
              role: 'assistant',
              content: 'Esta conversación no tiene mensajes cargados todavía.',
              meta: { label: 'Sistema' },
            },
          ]);
      setSources([]);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      setMessages([
        {
          role: 'assistant',
          content: error.response?.data?.error || 'No se pudo abrir la conversación.',
          meta: { label: 'Sistema' },
        },
      ]);
    } finally {
      setLoadingThread(false);
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

  const appendMessage = (role, content, meta = {}) => {
    setMessages((prev) => [...prev, { role, content, meta }]);
  };

  async function playAssistantAudio(text) {
    if (!autoSpeak) return;

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
          const payload = await ragAPI.transcribeAudio({
            audioBase64: dataUrl.split(',')[1] || '',
            mimeType: blob.type || 'audio/webm',
            fileName: 'nota-de-voz.webm',
            language: 'es',
          });
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
        targetTenantId: tenantId || undefined,
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

      const payload = await ragAPI.uploadKnowledge(requestPayload);

      setKnowledgeStatus({
        type: 'success',
        text: payload.message || `${getKnowledgeLabel(payload.document?.sourceType)} indexado correctamente (${payload.chunksImported || 0} fragmentos).`,
      });
      setKnowledgeFile(null);
      setKnowledgeTitle('');
      setKnowledgeText('');
      await loadDocuments(showArchivedDocuments);
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

  const refreshDocuments = async () => {
    await loadDocuments(showArchivedDocuments);
  };

  const updateDocumentState = async (item, action) => {
    if (!item?.sourceId) return;

    setDocumentActionBusy(item.sourceId);
    try {
      if (action === 'archive') {
        const payload = await ragAPI.archiveDocument(item.sourceId, {
          targetTenantId: tenantId || undefined,
        });
        message.success(payload.message || 'Documento archivado');
      } else if (action === 'restore') {
        const payload = await ragAPI.restoreDocument(item.sourceId, {
          targetTenantId: tenantId || undefined,
        });
        message.success(payload.message || 'Documento restaurado');
      } else if (action === 'delete') {
        const payload = await ragAPI.deleteDocument(item.sourceId, {
          targetTenantId: tenantId || undefined,
        });
        message.success(payload.message || 'Documento eliminado');
      }

      await refreshDocuments();
    } catch (error) {
      console.error('Error actualizando documento:', error);
      message.error(error.response?.data?.error || 'No se pudo actualizar el documento');
    } finally {
      setDocumentActionBusy('');
    }
  };

  const confirmDeleteDocument = (item) => {
    Modal.confirm({
      title: `Borrar documento "${item.title}"`,
      content: 'Esta acción eliminará todos los fragmentos asociados al documento. No se podrá recuperar.',
      okText: 'Borrar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: () => updateDocumentState(item, 'delete'),
    });
  };

  const handleSubmit = async (overrideQuestion = '') => {
    const cleanQuestion = String(overrideQuestion || question).trim();
    if (!cleanQuestion) {
      message.warning('Escribe una pregunta para consultar.');
      return;
    }

    setLoading(true);
    setStatus(null);
    appendMessage('user', cleanQuestion, { label: userName || 'Tu' });
    setQuestion('');
    setVoiceStatus('');

    try {
      const payload = await ragAPI.chat({
        message: cleanQuestion,
        conversationId,
        channel: 'web',
        targetTenantId: tenantId || undefined,
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
        text: payload.memoryStored
          ? 'Memoria actualizada con esta interacción.'
          : 'Respuesta generada sin guardar una preferencia duradera.',
      });

      await loadConversations({ silent: true });
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

  const openConversation = (id) => {
    setConversationId(id);
    sessionStorage.setItem(CONVERSATION_STORAGE_KEY, id);
  };

  const resetConversation = () => {
    const nextConversationId = createConversationId();
    sessionStorage.setItem(CONVERSATION_STORAGE_KEY, nextConversationId);
    setConversationId(nextConversationId);
    setQuestion('');
    setSources([]);
    setFollowUps([]);
    setStatus(null);
    setVoiceStatus('');
    setMessages(getWelcomeMessages());
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Card
        style={{
          border: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
        }}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space align="center" size={12} wrap>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f766e, #2563eb)',
                color: '#fff',
                boxShadow: '0 10px 26px rgba(37,99,235,0.18)',
              }}
            >
              <RobotOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Espacio IA
              </Title>
              <Text type="secondary">
                Explorador de sesiones, documentos, memoria y voz en una sola interfaz.
              </Text>
            </div>
          </Space>

          <Space wrap>
            <Tag color="blue">Tenant: {tenantId || 'global'}</Tag>
            <Tag color="geekblue">Usuario: {userName || userEmail || 'Super Admin'}</Tag>
            <Tag color="cyan">Sesión: {conversationId.slice(0, 8)}</Tag>
            <Tag color="gold">Documentos: {documents.length}</Tag>
            <Tag color="green">Hilos: {conversations.length}</Tag>
          </Space>

          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Text type="secondary">
              Selecciona una oficina para filtrar conversaciones y conocimiento.
            </Text>
            <AutoComplete
              value={tenantScope}
              options={officeOptions}
              onChange={(value) => setTenantScope(value || '')}
              onSelect={(value) => setTenantScope(value || '')}
              placeholder={loadingOficinas ? 'Cargando oficinas...' : 'Global o tenantId de oficina'}
              allowClear
              style={{ width: '100%' }}
            />
          </Space>
        </Space>
      </Card>

      {status && (
        <Alert
          type={status.type}
          showIcon
          message={status.text}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px minmax(0, 1fr) 360px',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Card
          title={<span style={{ color: '#e5e7eb' }}>Explorer</span>}
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadConversations();
                loadDocuments(showArchivedDocuments);
              }}
              loading={loadingConversations || loadingDocuments}
              style={{ borderColor: 'rgba(148,163,184,0.2)', color: '#e5e7eb', background: 'rgba(255,255,255,0.02)' }}
            >
              Refrescar
            </Button>
          }
          style={{
            minHeight: 760,
            background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
            border: '1px solid rgba(148,163,184,0.14)',
            color: '#fff',
          }}
          bodyStyle={{ color: '#fff', display: 'grid', gap: 16 }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => loadConversations()}
            placeholder="Buscar sesiones"
            prefix={<SearchOutlined />}
            allowClear
            style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(148,163,184,0.2)', color: '#fff' }}
          />

          <div>
            <Space align="center" size={8} style={{ marginBottom: 10 }}>
              <InboxOutlined style={{ color: '#93c5fd' }} />
              <Text strong style={{ color: '#fff' }}>
                Sesiones activas
              </Text>
            </Space>

            {loadingConversations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <Spin />
              </div>
            ) : conversations.length ? (
              <List
                dataSource={conversations}
                renderItem={(item) => {
                  const active = item.conversationId === conversationId;
                  return (
                    <List.Item
                      key={`${item.tenantId || 'global'}-${item.conversationId}`}
                      onClick={() => openConversation(item.conversationId)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 14,
                        padding: '12px 14px',
                        marginBottom: 10,
                        border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(148,163,184,0.12)',
                        background: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space align="center" wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                          <Text strong ellipsis style={{ maxWidth: 190, color: '#fff' }}>
                            {item.userName || item.title || item.preview || 'Conversación'}
                          </Text>
                          <Tag color={channelColor(item.channel)}>{channelLabel(item.channel)}</Tag>
                        </Space>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>
                          {item.preview}
                        </Text>
                        <Space wrap size={6}>
                          <Tag color="blue">{item.turnCount || 0} turnos</Tag>
                          <Tag color="default">{formatDate(item.updatedAt || item.createdAt)}</Tag>
                        </Space>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description={<span style={{ color: 'rgba(255,255,255,0.7)' }}>No hay sesiones aún</span>} />
            )}
          </div>

          <Divider style={{ borderColor: 'rgba(148,163,184,0.15)', margin: 0 }} />

          <div>
            <Space align="center" size={8} style={{ marginBottom: 10 }}>
              <FileTextOutlined style={{ color: '#93c5fd' }} />
              <Text strong style={{ color: '#fff' }}>
                Archivos indexados
              </Text>
              <Tag color={showArchivedDocuments ? 'geekblue' : 'green'}>
                {showArchivedDocuments ? 'Activos + archivados' : 'Solo activos'}
              </Tag>
              <Button
                size="small"
                onClick={async () => {
                  const next = !showArchivedDocuments;
                  setShowArchivedDocuments(next);
                  await loadDocuments(next);
                }}
                style={{ marginLeft: 'auto' }}
              >
                {showArchivedDocuments ? 'Ocultar archivados' : 'Ver archivados'}
              </Button>
            </Space>

            {loadingDocuments ? (
              <Spin />
            ) : documents.length ? (
              <List
                dataSource={documents}
                renderItem={(item) => (
                  <List.Item
                    key={`${item.tenantId || 'global'}-${item.sourceId}`}
                    style={{
                      border: '1px solid rgba(148,163,184,0.12)',
                      borderRadius: 12,
                      marginBottom: 10,
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space wrap size={6}>
                        <Tag color={item.tenantId ? 'geekblue' : 'gold'}>
                          {item.tenantId || 'global'}
                        </Tag>
                        <Tag color={getKnowledgeTagColor(item.sourceType)}>
                          {getKnowledgeLabel(item.sourceType)}
                        </Tag>
                        <Tag color="blue">{item.chunkCount} fragmentos</Tag>
                        <Tag color={item.isActive === false ? 'default' : 'green'}>
                          {item.isActive === false ? 'Archivado' : 'Activo'}
                        </Tag>
                      </Space>
                      <Text strong style={{ color: '#fff' }}>
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>
                        {item.preview}
                      </Text>
                      <Space wrap size={8} style={{ marginTop: 4 }}>
                        {item.isActive === false ? (
                          <Button
                            size="small"
                            icon={<CheckCircleOutlined />}
                            loading={documentActionBusy === item.sourceId}
                            onClick={() => updateDocumentState(item, 'restore')}
                          >
                            Restaurar
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            icon={<PauseCircleOutlined />}
                            loading={documentActionBusy === item.sourceId}
                            onClick={() => updateDocumentState(item, 'archive')}
                          >
                            Archivar
                          </Button>
                        )}
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          loading={documentActionBusy === item.sourceId}
                          onClick={() => confirmDeleteDocument(item)}
                        >
                          Borrar
                        </Button>
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Sin archivos indexados</span>} />
            )}
          </div>

          <Button
            icon={<ThunderboltOutlined />}
            onClick={resetConversation}
            style={{ borderColor: 'rgba(148,163,184,0.18)', color: '#fff', background: 'rgba(255,255,255,0.03)' }}
          >
            Nueva sesión
          </Button>
        </Card>

        <Card
          title={currentConversation?.title || 'Editor de conversación'}
          extra={
            <Space wrap>
              <Button onClick={resetConversation}>Reiniciar</Button>
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
          }
          style={{ minHeight: 760 }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ maxHeight: 480, overflow: 'auto', paddingRight: 8 }}>
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
                            {item.meta?.memorySaved ? <Tag color="purple">Memoria</Tag> : null}
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

            <TextArea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Escribe aquí o usa el micrófono para preguntar."
              autoSize={{ minRows: 3, maxRows: 6 }}
              disabled={loading}
            />

            <Space wrap>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleSubmit}
                loading={loading}
              >
                Consultar
              </Button>
              <Button onClick={() => setQuestion('')} disabled={loading}>
                Limpiar
              </Button>
            </Space>

            {voiceStatus && (
              <Alert
                type="info"
                showIcon
                message={voiceStatus}
              />
            )}
          </div>
        </Card>

        <Card title="Inspector">
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Contexto del hilo</Text>
              <div style={{ marginTop: 6, display: 'grid', gap: 8 }}>
                <Text><strong>Tenant:</strong> {currentConversation?.tenantId || tenantId || 'global'}</Text>
                <Text><strong>Canal:</strong> {currentConversation?.channel || 'web'}</Text>
                <Text><strong>Usuario:</strong> {currentConversation?.userName || 'Sin nombre'}</Text>
                <Text><strong>Turnos:</strong> {currentConversation?.turnCount || 0}</Text>
                <Text><strong>Actualizada:</strong> {formatDate(currentConversation?.updatedAt || currentConversation?.createdAt)}</Text>
              </div>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div>
              <Space align="center" size={8} style={{ marginBottom: 8 }}>
                <LinkOutlined />
                <Text strong>Fuentes recuperadas</Text>
              </Space>
              {sources.length ? (
                <List
                  dataSource={sources}
                  renderItem={(item) => (
                    <List.Item key={item.id} style={{ padding: '8px 0' }}>
                      <div style={{ width: '100%' }}>
                        <Space size={8} wrap style={{ marginBottom: 6 }}>
                          <Tag color="blue">{item.type}</Tag>
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
                <Text type="secondary">Aquí verás el contexto recuperado cuando consultes el asistente.</Text>
              )}
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div>
              <Text strong>Siguientes preguntas</Text>
              <div style={{ marginTop: 8 }}>
                {followUps.length ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {followUps.map((item) => (
                      <Button key={item} type="dashed" block onClick={() => setQuestion(item)}>
                        {item}
                      </Button>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">El sistema sugerirá preguntas de seguimiento cuando detecte contexto útil.</Text>
                )}
              </div>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div>
              <Space align="center" size={8} style={{ marginBottom: 8 }}>
                <CloudUploadOutlined />
                <Text strong>Cargar conocimiento</Text>
              </Space>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <TextArea
                  value={knowledgeText}
                  onChange={(e) => setKnowledgeText(e.target.value)}
                  placeholder="Pega aquí notas, contenido de Word o texto operativo."
                  autoSize={{ minRows: 4, maxRows: 8 }}
                />

                <Input
                  value={knowledgeTitle}
                  onChange={(e) => setKnowledgeTitle(e.target.value)}
                  placeholder="Título opcional"
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
                <Tag color="blue" style={{ marginTop: 10 }}>
                  Archivo: {knowledgeFile.name} ({Math.round(knowledgeFile.size / 1024)} KB)
                </Tag>
              )}

              {knowledgeText.trim() && (
                <Tag color="green" style={{ marginTop: 10 }}>
                  Texto listo para indexar
                </Tag>
              )}

              {knowledgeStatus && (
                <Alert
                  style={{ marginTop: 12 }}
                  type={knowledgeStatus.type}
                  showIcon
                  message={knowledgeStatus.text}
                />
              )}
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}
