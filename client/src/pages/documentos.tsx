import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowLeft, Camera, ImageIcon, FileText, Trash2, CheckCircle, Clock, XCircle, Upload, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const DOC_TYPES = [
  { value: 'cedula', label: '🪪 Cédula de identidad', desc: 'Foto del documento de identidad (frente y reverso)' },
  { value: 'comprobante', label: '🧾 Comprobante de pago', desc: 'Recibo o comprobante de transferencia' },
  { value: 'apelacion', label: '📋 Recurso de apelación', desc: 'Documento para apelar una decisión bancaria' },
  { value: 'inscripcion', label: '📝 Formulario de inscripción', desc: 'Documentos de registro o vinculación' },
  { value: 'rut', label: '📄 RUT / NIT', desc: 'Registro único tributario o documento fiscal' },
  { value: 'otro', label: '📁 Otro documento', desc: 'Cualquier otro documento requerido' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pendiente:  { label: 'En revisión',  icon: Clock,        color: 'bg-yellow-100 text-yellow-700' },
  revisado:   { label: 'Revisado',     icon: Eye,          color: 'bg-blue-100 text-blue-700' },
  aprobado:   { label: 'Aprobado',     icon: CheckCircle,  color: 'bg-green-100 text-green-700' },
  rechazado:  { label: 'Rechazado',    icon: XCircle,      color: 'bg-red-100 text-red-700' },
};

interface DocRecord {
  id: number;
  type: string;
  filename: string;
  mimeType: string;
  description?: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  hasData: boolean;
}

const DocumentosPage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Upload state
  const [docType, setDocType] = useState('cedula');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Preview dialog
  const [previewDialog, setPreviewDialog] = useState<{ src: string; filename: string } | null>(null);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading } = useQuery<DocRecord[]>({
    queryKey: ['/api/documents'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/documents/${id}`, undefined);
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({ title: 'Documento eliminado' });
    },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  const handleFileSelected = (file: File) => {
    if (file.size > 6 * 1024 * 1024) {
      toast({ title: 'Archivo muy grande', description: 'El máximo es 6MB.', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        const res = await apiRequest('POST', '/api/documents', {
          type: docType,
          filename: selectedFile.name,
          mimeType: selectedFile.type,
          data: base64,
          description: description.trim() || null,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Error al subir');
        }
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
        toast({ title: 'Documento enviado', description: 'El banco revisará tu documento pronto.' });
        clearSelection();
        setDescription('');
        setUploading(false);
      };
      reader.onerror = () => {
        toast({ title: 'Error al leer el archivo', variant: 'destructive' });
        setUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo subir el documento.', variant: 'destructive' });
      setUploading(false);
    }
  };

  const handleViewDoc = async (doc: DocRecord) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/data`, { credentials: 'include' });
      // Actually need a different approach - we download via admin endpoint
      // For user, we return data from the user's own document
      if (!res.ok) throw new Error();
      const data = await res.json();
      const src = `data:${data.mimeType};base64,${data.data}`;
      setPreviewDialog({ src, filename: data.filename });
    } catch {
      toast({ title: 'No se pudo cargar la vista previa', variant: 'destructive' });
    }
  };

  const typeLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label || type;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="hover:bg-red-700 p-1 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Enviar Documentos</h1>
        </div>
        <p className="text-xs text-red-200 mt-1 ml-9">Sube de forma segura tus documentos requeridos</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">Nuevo documento</h2>

          {/* Tipo */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de documento</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger data-testid="select-doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <span>{t.label}</span>
                      <p className="text-xs text-gray-400">{t.desc}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File picker - REAL inputs */}
          {/* Hidden inputs - triggers real OS gallery/camera */}
          <input
            ref={galleryRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleGalleryChange}
            data-testid="input-gallery-picker"
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraChange}
            data-testid="input-camera-picker"
          />

          {!selectedFile ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center mb-3">
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">Selecciona una imagen o PDF</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => galleryRef.current?.click()}
                  data-testid="button-open-gallery"
                  className="flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  Galería
                </button>
                <button
                  onClick={() => cameraRef.current?.click()}
                  data-testid="button-open-camera"
                  className="flex items-center gap-2 border border-red-200 text-red-600 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Cámara
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Máximo 6MB · Imágenes o PDF</p>
            </div>
          ) : (
            <div className="border border-green-200 bg-green-50 rounded-xl p-3 mb-3">
              <div className="flex items-start gap-3">
                {previewUrl && selectedFile.type.startsWith('image/') ? (
                  <img src={previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type}</p>
                  <button onClick={clearSelection} className="text-xs text-red-500 mt-1 flex items-center gap-1 hover:underline">
                    <Trash2 className="w-3 h-3" /> Cambiar archivo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción (opcional)</label>
            <Textarea
              placeholder="Ej: Cédula por los dos lados, comprobante de pago del 15 de abril..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              data-testid="input-doc-description"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
            data-testid="button-upload-document"
          >
            {uploading ? 'Enviando...' : 'Enviar documento'}
          </Button>
        </div>

        {/* Sent Documents */}
        <div>
          <h2 className="font-bold text-gray-700 mb-2 text-sm">Documentos enviados ({docs.length})</h2>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : docs.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-400 shadow-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aún no has enviado documentos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pendiente;
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={doc.id} className="bg-white rounded-xl shadow-sm p-3 flex items-start gap-3" data-testid={`card-doc-${doc.id}`}>
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{typeLabel(doc.type)}</p>
                      <p className="text-xs text-gray-500 truncate">{doc.filename}</p>
                      {doc.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.description}</p>}
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString('es-CO')}</span>
                      </div>
                      {doc.adminNote && (
                        <p className="text-xs text-blue-600 mt-1 bg-blue-50 rounded p-1.5">
                          💬 {doc.adminNote}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      className="text-gray-300 hover:text-red-500 flex-shrink-0"
                      data-testid={`button-delete-doc-${doc.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      {previewDialog && (
        <Dialog open onOpenChange={() => setPreviewDialog(null)}>
          <DialogContent className="max-w-[95vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-sm truncate">{previewDialog.filename}</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
              <img src={previewDialog.src} alt={previewDialog.filename} className="max-w-full rounded" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewDialog(null)}>Cerrar</Button>
              <a href={previewDialog.src} download={previewDialog.filename}>
                <Button className="bg-red-600 hover:bg-red-700 text-white">Descargar</Button>
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentosPage;
