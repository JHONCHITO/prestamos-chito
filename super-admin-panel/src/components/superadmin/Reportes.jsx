import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  message,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  BellOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FundOutlined,
  ReloadOutlined,
  SafetyOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  enviarRecordatorioPago,
  getDetalleOficina,
  getEmpresasMorosas,
  getOficinas,
} from '../../api/superadmin';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CO');

const baseCardStyle = {
  borderRadius: 20,
  border: '1px solid #d9e2ec',
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.06)',
};

const reportLabels = {
  oficinas: 'Reporte de oficinas',
  prestamos: 'Reporte de cartera y préstamos',
  cobradores: 'Reporte de cobradores',
  financiero: 'Reporte financiero',
};

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const withinSelectedRange = (value, range) => {
  if (!range || range.length !== 2 || !value) return true;
  const current = new Date(value).getTime();
  const start = range[0].startOf('day').valueOf();
  const end = range[1].endOf('day').valueOf();
  return current >= start && current <= end;
};

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const buildCsv = (columns, rows) => {
  const headers = columns.map((column) => column.title);
  const keys = columns.map((column) => column.dataIndex || column.key);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      keys
        .map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ];

  return `\uFEFF${lines.join('\n')}`;
};

const buildPrintHtml = (title, columns, rows) => {
  const headerHtml = columns.map((column) => `<th>${column.title}</th>`).join('');
  const rowHtml = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const key = column.dataIndex || column.key;
          return `<td>${row[key] ?? ''}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin-bottom:8px}p{color:#475569;margin-bottom:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:12px}th{background:#e2e8f0}tr:nth-child(even){background:#f8fafc}</style></head><body><h1>${title}</h1><p>Generado el ${new Date().toLocaleString('es-CO')}</p><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody></table></body></html>`;
};

const Reportes = () => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('oficinas');
  const [fechasReporte, setFechasReporte] = useState(null);
  const [oficinas, setOficinas] = useState([]);
  const [detalleOficinas, setDetalleOficinas] = useState([]);
  const [empresasMorosas, setEmpresasMorosas] = useState([]);
  const [reporteData, setReporteData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarBase();
  }, []);

  const cargarBase = async () => {
    try {
      setLoading(true);
      setError(null);

      const [oficinasData, morosasData] = await Promise.all([
        getOficinas(),
        getEmpresasMorosas().catch(() => []),
      ]);

      const oficinasList = Array.isArray(oficinasData) ? oficinasData : [];
      setOficinas(oficinasList);
      setEmpresasMorosas(Array.isArray(morosasData) ? morosasData : []);

      if (oficinasList.length === 0) {
        setDetalleOficinas([]);
        setReporteData([]);
        return;
      }

      const detalleList = await Promise.all(
        oficinasList.map(async (oficina) => getDetalleOficina(oficina._id))
      );

      setDetalleOficinas(detalleList);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const detallesFiltrados = useMemo(
    () =>
      detalleOficinas.filter((detalle) =>
        withinSelectedRange(detalle?.tenant?.fechaCreacion, fechasReporte)
      ),
    [detalleOficinas, fechasReporte]
  );

  const generarFilas = () => {
    switch (tipoReporte) {
      case 'oficinas':
        return detallesFiltrados.map((detalle) => ({
          key: detalle.tenant._id,
          oficina: detalle.tenant.nombre,
          tenantId: detalle.tenant.tenantId,
          estado: detalle.tenant.estado ? 'Activa' : 'Inactiva',
          fechaCreacion: new Date(detalle.tenant.fechaCreacion).toLocaleDateString('es-CO'),
          clientes: formatNumber(detalle.stats.clientes),
          cobradores: formatNumber(detalle.stats.cobradores),
          prestamos: formatNumber(detalle.stats.totalPrestamos),
          carteraActual: formatCurrency(detalle.stats.carteraActual),
          totalRecaudado: formatCurrency(detalle.stats.totalRecaudado),
        }));
      case 'prestamos':
        return detallesFiltrados.map((detalle) => ({
          key: detalle.tenant._id,
          oficina: detalle.tenant.nombre,
          totalPrestamos: formatNumber(detalle.stats.totalPrestamos),
          activos: formatNumber(detalle.stats.prestamosActivos),
          pagados: formatNumber(detalle.stats.prestamosPagados),
          vencidos: formatNumber(detalle.stats.prestamosVencidos),
          capitalColocado: formatCurrency(detalle.stats.capitalColocado),
          promedioPrestamo: formatCurrency(detalle.stats.promedioPrestamo),
          carteraActual: formatCurrency(detalle.stats.carteraActual),
        }));
      case 'cobradores':
        return detallesFiltrados.flatMap((detalle) =>
          detalle.cobradores.map((cobrador) => ({
            key: `${detalle.tenant._id}-${cobrador._id}`,
            nombre: cobrador.nombre,
            oficina: detalle.tenant.nombre,
            cedula: cobrador.cedula,
            telefono: cobrador.telefono,
            email: cobrador.email,
            zona: cobrador.zona || 'Sin zona',
            estado: cobrador.estado === 'activo' ? 'Activo' : 'Inactivo',
            clientesAsignados: formatNumber(cobrador.clientesAsignados),
            prestamosActivos: formatNumber(cobrador.prestamosActivos),
            carteraActiva: formatCurrency(cobrador.carteraActiva),
            totalRecaudado: formatCurrency(cobrador.totalRecaudado),
          }))
        );
      case 'financiero':
        return detallesFiltrados.map((detalle) => ({
          key: detalle.tenant._id,
          oficina: detalle.tenant.nombre,
          recaudo: formatCurrency(detalle.stats.totalRecaudado),
          carteraActual: formatCurrency(detalle.stats.carteraActual),
          capitalColocado: formatCurrency(detalle.stats.capitalColocado),
          totalProgramado: formatCurrency(detalle.stats.totalProgramado),
          efectividadCobro: `${Math.round(detalle.stats.efectividadCobro || 0)}%`,
          ticketPromedio: formatCurrency(detalle.stats.promedioPrestamo),
        }));
      default:
        return [];
    }
  };

  const generarReporte = () => {
    try {
      setGenerating(true);

      if (detalleOficinas.length === 0) {
        setReporteData([]);
        message.info('Aún no hay oficinas suficientes para generar reportes.');
        return;
      }

      setReporteData(generarFilas());
      message.success(`${reportLabels[tipoReporte]} generado correctamente`);
    } catch (err) {
      message.error('No se pudo generar el reporte');
    } finally {
      setGenerating(false);
    }
  };

  const getColumns = () => {
    switch (tipoReporte) {
      case 'oficinas':
        return [
          { title: 'Oficina', dataIndex: 'oficina', key: 'oficina', fixed: 'left', width: 170 },
          { title: 'Tenant', dataIndex: 'tenantId', key: 'tenantId', width: 150 },
          { title: 'Estado', dataIndex: 'estado', key: 'estado', width: 110, render: (value) => <Tag color={value === 'Activa' ? 'green' : 'default'}>{value}</Tag> },
          { title: 'Creación', dataIndex: 'fechaCreacion', key: 'fechaCreacion', width: 130 },
          { title: 'Clientes', dataIndex: 'clientes', key: 'clientes', width: 110 },
          { title: 'Cobradores', dataIndex: 'cobradores', key: 'cobradores', width: 120 },
          { title: 'Préstamos', dataIndex: 'prestamos', key: 'prestamos', width: 120 },
          { title: 'Cartera actual', dataIndex: 'carteraActual', key: 'carteraActual', width: 150 },
          { title: 'Recaudado', dataIndex: 'totalRecaudado', key: 'totalRecaudado', width: 150 },
        ];
      case 'prestamos':
        return [
          { title: 'Oficina', dataIndex: 'oficina', key: 'oficina', fixed: 'left', width: 180 },
          { title: 'Total préstamos', dataIndex: 'totalPrestamos', key: 'totalPrestamos', width: 140 },
          { title: 'Activos', dataIndex: 'activos', key: 'activos', width: 110 },
          { title: 'Pagados', dataIndex: 'pagados', key: 'pagados', width: 110 },
          { title: 'Vencidos', dataIndex: 'vencidos', key: 'vencidos', width: 110 },
          { title: 'Capital colocado', dataIndex: 'capitalColocado', key: 'capitalColocado', width: 160 },
          { title: 'Promedio préstamo', dataIndex: 'promedioPrestamo', key: 'promedioPrestamo', width: 160 },
          { title: 'Cartera actual', dataIndex: 'carteraActual', key: 'carteraActual', width: 150 },
        ];
      case 'cobradores':
        return [
          { title: 'Cobrador', dataIndex: 'nombre', key: 'nombre', fixed: 'left', width: 180 },
          { title: 'Oficina', dataIndex: 'oficina', key: 'oficina', width: 170 },
          { title: 'Cédula', dataIndex: 'cedula', key: 'cedula', width: 150 },
          { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono', width: 130 },
          { title: 'Email', dataIndex: 'email', key: 'email', width: 220 },
          { title: 'Zona', dataIndex: 'zona', key: 'zona', width: 140 },
          { title: 'Estado', dataIndex: 'estado', key: 'estado', width: 110, render: (value) => <Tag color={value === 'Activo' ? 'green' : 'default'}>{value}</Tag> },
          { title: 'Clientes', dataIndex: 'clientesAsignados', key: 'clientesAsignados', width: 110 },
          { title: 'Préstamos activos', dataIndex: 'prestamosActivos', key: 'prestamosActivos', width: 150 },
          { title: 'Cartera activa', dataIndex: 'carteraActiva', key: 'carteraActiva', width: 150 },
          { title: 'Recaudado', dataIndex: 'totalRecaudado', key: 'totalRecaudado', width: 150 },
        ];
      case 'financiero':
        return [
          { title: 'Oficina', dataIndex: 'oficina', key: 'oficina', fixed: 'left', width: 180 },
          { title: 'Recaudo total', dataIndex: 'recaudo', key: 'recaudo', width: 150 },
          { title: 'Cartera actual', dataIndex: 'carteraActual', key: 'carteraActual', width: 150 },
          { title: 'Capital colocado', dataIndex: 'capitalColocado', key: 'capitalColocado', width: 160 },
          { title: 'Total programado', dataIndex: 'totalProgramado', key: 'totalProgramado', width: 160 },
          { title: 'Efectividad', dataIndex: 'efectividadCobro', key: 'efectividadCobro', width: 120 },
          { title: 'Ticket promedio', dataIndex: 'ticketPromedio', key: 'ticketPromedio', width: 150 },
        ];
      default:
        return [];
    }
  };

  const exportarExcel = () => {
    if (reporteData.length === 0) {
      message.info('Genera el reporte antes de exportar.');
      return;
    }

    const csv = buildCsv(getColumns(), reporteData);
    downloadBlob(csv, `reporte-${tipoReporte}-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    message.success('Archivo CSV listo para abrir en Excel.');
  };

  const exportarPDF = () => {
    if (reporteData.length === 0) {
      message.info('Genera el reporte antes de exportar.');
      return;
    }

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      message.error('El navegador bloqueó la ventana de impresión.');
      return;
    }

    reportWindow.document.write(buildPrintHtml(reportLabels[tipoReporte], getColumns(), reporteData));
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
    message.success('Vista de impresión abierta para exportar PDF.');
  };

  const enviarRecordatorio = async (empresa) => {
    try {
      await enviarRecordatorioPago({
        tenantId: empresa.tenantId,
        empresa: empresa.nombre,
        monto: empresa.montoPendiente,
        diasAtraso: empresa.diasAtraso,
        fechaVencimiento: empresa.fechaVencimiento,
      });
      message.success(`Recordatorio enviado a ${empresa.nombre}`);
    } catch (err) {
      message.error('No se pudo enviar el recordatorio');
    }
  };

  const resumen = useMemo(
    () =>
      detalleOficinas.reduce(
        (acc, detalle) => ({
          cartera: acc.cartera + (detalle.stats.carteraActual || 0),
          recaudo: acc.recaudo + (detalle.stats.totalRecaudado || 0),
          activos: acc.activos + (detalle.stats.prestamosActivos || 0),
          cobradores: acc.cobradores + (detalle.stats.cobradores || 0),
        }),
        { cartera: 0, recaudo: 0, activos: 0, cobradores: 0 }
      ),
    [detalleOficinas]
  );

  const totalPendiente = empresasMorosas.reduce((sum, empresa) => sum + (empresa.montoPendiente || 0), 0);
  const promedioAtraso = empresasMorosas.length
    ? Math.round(empresasMorosas.reduce((sum, empresa) => sum + (empresa.diasAtraso || 0), 0) / empresasMorosas.length)
    : 0;

  const morososColumns = [
    {
      title: 'Empresa',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (value, record) => (
        <Space>
          <WarningOutlined style={{ color: record.diasAtraso > 30 ? '#b91c1c' : '#d97706' }} />
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{value}</span>
        </Space>
      ),
    },
    { title: 'Tenant', dataIndex: 'tenantId', key: 'tenantId' },
    { title: 'Vencimiento', dataIndex: 'fechaVencimiento', key: 'fechaVencimiento' },
    { title: 'Atraso', dataIndex: 'diasAtraso', key: 'diasAtraso', render: (value) => <Tag color={value > 30 ? 'red' : value > 15 ? 'orange' : 'gold'}>{value} días</Tag> },
    { title: 'Monto', dataIndex: 'montoPendiente', key: 'montoPendiente', render: (value) => <span style={{ color: '#b91c1c', fontWeight: 700 }}>{formatCurrency(value)}</span> },
    { title: 'Contacto', dataIndex: 'contacto', key: 'contacto' },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<BellOutlined />}
          onClick={() => enviarRecordatorio(record)}
          style={{ borderRadius: 10, background: record.diasAtraso > 30 ? '#b91c1c' : '#0f766e', borderColor: record.diasAtraso > 30 ? '#b91c1c' : '#0f766e' }}
        >
          Enviar aviso
        </Button>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: 40 }}><Alert message="Cargando módulo de reportes..." type="info" showIcon /></div>;
  }

  if (error) {
    return <Alert type="error" showIcon message="No se pudieron cargar los reportes" description={error} />;
  }

  return (
    <div>
      <Card style={{ ...baseCardStyle, marginBottom: 24, background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)' }} styles={{ body: { padding: 28 } }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={16}>
            <Tag bordered={false} style={{ marginBottom: 14, padding: '6px 12px', borderRadius: 999, background: '#dbeafe', color: '#0f172a', fontWeight: 600 }}>
              Centro de reportes
            </Tag>
            <Title level={2} style={{ margin: 0, color: '#0f172a' }}>Reportes globales del superadmin</Title>
            <Text style={{ display: 'block', marginTop: 10, color: '#475569', fontSize: 15 }}>
              Genera cortes operativos por oficina, cartera, cobradores y desempeño financiero con datos reales del sistema.
            </Text>
          </Col>
          <Col xs={24} lg={8}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Button icon={<ReloadOutlined />} onClick={cargarBase} style={{ height: 42, borderRadius: 12, borderColor: '#cbd5e1', color: '#0f172a', fontWeight: 600 }}>
                Actualizar fuentes
              </Button>
              <Text style={{ color: '#64748b' }}>{oficinas.length} oficinas conectadas · {empresasMorosas.length} alertas de pago</Text>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12} xl={6}>
          <Card style={baseCardStyle}>
            <Statistic title="Cartera actual" value={resumen.cartera} formatter={(value) => formatCurrency(value)} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={baseCardStyle}>
            <Statistic title="Recaudado" value={resumen.recaudo} formatter={(value) => formatCurrency(value)} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={baseCardStyle}>
            <Statistic title="Préstamos activos" value={resumen.activos} formatter={(value) => formatNumber(value)} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={baseCardStyle}>
            <Statistic title="Cobradores activos" value={resumen.cobradores} formatter={(value) => formatNumber(value)} />
          </Card>
        </Col>
      </Row>

      <Card style={{ ...baseCardStyle, marginBottom: 24 }} styles={{ body: { padding: 24 } }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#0f172a' }}>Tipo de reporte</Text>
            <Select
              value={tipoReporte}
              onChange={setTipoReporte}
              style={{ width: '100%' }}
              size="large"
              options={[
                { value: 'oficinas', label: 'Oficinas' },
                { value: 'prestamos', label: 'Cartera y préstamos' },
                { value: 'cobradores', label: 'Cobradores' },
                { value: 'financiero', label: 'Financiero' },
              ]}
            />
          </Col>
          <Col xs={24} md={10}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#0f172a' }}>Filtrar por fecha de creación de oficina</Text>
            <RangePicker
              value={fechasReporte}
              onChange={setFechasReporte}
              style={{ width: '100%' }}
              size="large"
              placeholder={['Desde', 'Hasta']}
            />
          </Col>
          <Col xs={24} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: 'transparent' }}>Acción</Text>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={generating}
              onClick={generarReporte}
              style={{ width: '100%', height: 40, borderRadius: 12, background: '#0f172a', borderColor: '#0f172a', fontWeight: 600 }}
            >
              Generar
            </Button>
          </Col>
        </Row>

        <Space size={12} style={{ marginTop: 18 }}>
          <Button icon={<FileExcelOutlined />} onClick={exportarExcel} style={{ height: 40, borderRadius: 12, borderColor: '#0f766e', color: '#0f766e', fontWeight: 600 }}>
            Exportar Excel
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={exportarPDF} style={{ height: 40, borderRadius: 12, borderColor: '#1d4ed8', color: '#1d4ed8', fontWeight: 600 }}>
            Exportar PDF
          </Button>
        </Space>
      </Card>

      <Card
        title={<span style={{ color: '#0f172a', fontWeight: 700 }}>{reportLabels[tipoReporte]}</span>}
        extra={<Text style={{ color: '#64748b' }}>{reporteData.length} filas</Text>}
        style={{ ...baseCardStyle, marginBottom: 24 }}
      >
        {reporteData.length > 0 ? (
          <Table columns={getColumns()} dataSource={reporteData} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} rowKey="key" />
        ) : (
          <Empty description="Genera un reporte para visualizar resultados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      <Card
        title={
          <Space>
            <SafetyOutlined style={{ color: '#9a3412' }} />
            <span style={{ color: '#0f172a', fontWeight: 700 }}>Control de pagos pendientes</span>
            <Badge count={empresasMorosas.length} style={{ backgroundColor: '#9a3412' }} />
          </Space>
        }
        style={{ ...baseCardStyle, marginBottom: 24 }}
      >
        {empresasMorosas.length > 0 ? (
          <>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Seguimiento requerido"
              description={`Hay ${empresasMorosas.length} oficina(s) con cuota pendiente. Desde aquí puedes revisar el atraso y disparar un recordatorio.`}
            />
            <Table columns={morososColumns} dataSource={empresasMorosas} rowKey={(record) => record.id || record.tenantId} pagination={{ pageSize: 5 }} scroll={{ x: 960 }} />
          </>
        ) : (
          <Alert type="success" showIcon message="Sin pagos pendientes" description="No hay oficinas morosas reportadas por el backend en este momento." />
        )}
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={8}>
          <Card style={baseCardStyle}>
            <Statistic title="Total pendiente" value={totalPendiente} prefix={<FundOutlined style={{ color: '#9a3412' }} />} formatter={(value) => formatCurrency(value)} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={baseCardStyle}>
            <Statistic title="Promedio de atraso" value={promedioAtraso} suffix="días" prefix={<WarningOutlined style={{ color: '#b91c1c' }} />} formatter={(value) => formatNumber(value)} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={baseCardStyle}>
            <Statistic title="Oficinas críticas" value={empresasMorosas.filter((empresa) => empresa.diasAtraso > 30).length} prefix={<TeamOutlined style={{ color: '#334155' }} />} formatter={(value) => formatNumber(value)} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reportes;
