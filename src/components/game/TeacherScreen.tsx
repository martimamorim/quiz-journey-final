import { useEffect, useMemo, useState } from "react";
import { useGame } from "@/game/GameContext";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, MapPin, QrCode, Trash2, Edit3, Save, Copy, Loader2, BookOpen } from "lucide-react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { toast } from "sonner";

const DEFAULT_CENTER: [number, number] = [41.4119, -8.5256];

const pinIcon = L.divIcon({
  className: "th-pin",
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:linear-gradient(135deg,hsl(210 100% 56%),hsl(195 100% 60%));border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.5);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

type LocRow = {
  id: string;
  class_id: string;
  name: string;
  hint: string | null;
  qr_code: string;
  lat: number;
  lng: number;
  order_index: number;
};

const generateCode = (len = 6) => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => c[Math.floor(Math.random() * c.length)]).join("");
};

export const TeacherScreen = () => {
  const { go, classId, setActiveClass, reload } = useGame();
  const { user } = useAuth();
  const [classes, setClasses] = useState<{ id: string; name: string; join_code: string }[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [locs, setLocs] = useState<LocRow[]>([]);
  const [editLoc, setEditLoc] = useState<LocRow | null>(null);
  const [busy, setBusy] = useState(false);

  const loadClasses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("classes").select("id, name, join_code").eq("teacher_id", user.id).order("created_at");
    setClasses(data ?? []);
    if (!classId && data && data.length > 0) await setActiveClass(data[0].id);
  };

  const loadLocs = async () => {
    if (!classId) return setLocs([]);
    const { data } = await supabase
      .from("locations").select("*").eq("class_id", classId).order("order_index");
    setLocs((data ?? []) as LocRow[]);
  };

  useEffect(() => { loadClasses(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { loadLocs(); /* eslint-disable-next-line */ }, [classId]);

  const createClass = async () => {
    if (!newClassName.trim() || !user) return;
    setBusy(true);
    const code = generateCode();
    const { data, error } = await supabase
      .from("classes")
      .insert({ name: newClassName.trim(), teacher_id: user.id, join_code: code })
      .select("id, name, join_code").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Turma criada com código ${code}`);
    setNewClassName("");
    await loadClasses();
    if (data) await setActiveClass(data.id);
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Apagar esta turma e todos os dados?")) return;
    await supabase.from("classes").delete().eq("id", id);
    toast.success("Turma apagada");
    if (classId === id) localStorage.removeItem("th-active-class");
    await loadClasses();
  };

  const addLocationAt = async (lat: number, lng: number) => {
    if (!classId) return;
    if (locs.length >= 5) {
      toast.error("Máximo de 5 locais por turma");
      return;
    }
    const order = locs.length;
    const qr = `TH-${classId.slice(0, 6)}-${order + 1}`;
    const { data, error } = await supabase
      .from("locations")
      .insert({ class_id: classId, name: `Local ${order + 1}`, hint: "", qr_code: qr, lat, lng, order_index: order })
      .select("*").single();
    if (error) return toast.error(error.message);
    toast.success("Local adicionado");
    await loadLocs();
    setEditLoc(data as LocRow);
  };

  const deleteLoc = async (id: string) => {
    if (!confirm("Apagar este local e suas perguntas?")) return;
    await supabase.from("locations").delete().eq("id", id);
    await loadLocs();
    await reload();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  };

  const activeClass = classes.find((c) => c.id === classId);

  return (
    <div className="min-h-screen p-5 pb-32 flex flex-col gap-5 animate-fade-in">
      <header className="flex items-center gap-3">
        <Button onClick={() => go("home")} size="icon" variant="ghost" className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-black">Painel do Professor</h2>
          <p className="text-xs text-muted-foreground">Gere turmas, locais e perguntas</p>
        </div>
      </header>

      {/* Classes */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-bold flex items-center gap-2 mb-3"><BookOpen className="h-4 w-4 text-primary" /> Turmas</h3>
        <div className="flex gap-2 mb-3">
          <Input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Nome da nova turma"
            className="h-10 rounded-full"
          />
          <Button onClick={createClass} disabled={busy} className="rounded-full">
            <Plus className="h-4 w-4 mr-1" /> Criar
          </Button>
        </div>
        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem turmas. Cria a primeira acima.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {classes.map((c) => (
              <li key={c.id} className={`flex items-center gap-2 rounded-2xl border p-3 ${
                c.id === classId ? "border-primary bg-primary/10" : "border-border"
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <button
                    onClick={() => copyCode(c.join_code)}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    <span className="font-mono">{c.join_code}</span> <Copy className="h-3 w-3" />
                  </button>
                </div>
                <Button size="sm" variant={c.id === classId ? "default" : "outline"} onClick={() => setActiveClass(c.id)} className="rounded-full">
                  {c.id === classId ? "Ativa" : "Editar"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteClass(c.id)} className="rounded-full text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeClass && (
        <>
          {/* Map editor */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" /> Locais — {activeClass.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Toca no mapa onde está cada QR code para o adicionar.
            </p>
            <div className="rounded-2xl overflow-hidden border border-border h-[40vh] min-h-[280px]">
              <MapContainer center={locs[0] ? [locs[0].lat, locs[0].lng] : DEFAULT_CENTER} zoom={18} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; Esri' maxZoom={20}
                />
                <ClickToAdd onAdd={addLocationAt} />
                {locs.map((l) => (
                  <Marker key={l.id} position={[l.lat, l.lng]} icon={pinIcon} eventHandlers={{ click: () => setEditLoc(l) }} />
                ))}
              </MapContainer>
            </div>

            <ul className="mt-3 flex flex-col gap-2">
              {locs.map((l, i) => (
                <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-primary-foreground text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <QrCode className="h-3 w-3" /> {l.qr_code}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditLoc(l)} className="rounded-full">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteLoc(l.id)} className="rounded-full text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {editLoc && (
        <LocationEditor
          location={editLoc}
          onClose={async () => { setEditLoc(null); await loadLocs(); await reload(); }}
        />
      )}
    </div>
  );
};

const ClickToAdd = ({ onAdd }: { onAdd: (lat: number, lng: number) => void }) => {
  useMapEvents({ click: (e) => onAdd(e.latlng.lat, e.latlng.lng) });
  return null;
};

// ============ Location Editor (name, hint, QR + 5 questions) ============
type Q = {
  id?: string;
  text: string;
  options: string[];
  correct_index: number;
  points: number;
  order_index: number;
};

const blankQ = (i: number): Q => ({
  text: "",
  options: ["", "", "", ""],
  correct_index: 0,
  points: 10,
  order_index: i,
});

const LocationEditor = ({ location, onClose }: { location: LocRow; onClose: () => void }) => {
  const [name, setName] = useState(location.name);
  const [hint, setHint] = useState(location.hint ?? "");
  const [qrCode, setQrCode] = useState(location.qr_code);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("questions").select("*").eq("location_id", location.id).order("order_index");
      const existing = (data ?? []).map((q: any) => ({
        id: q.id,
        text: q.text,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options ?? "[]"),
        correct_index: q.correct_index,
        points: q.points,
        order_index: q.order_index,
      })) as Q[];
      // Ensure 5 slots
      const filled = [...existing];
      while (filled.length < 5) filled.push(blankQ(filled.length));
      setQuestions(filled.slice(0, 5));
      setLoading(false);
    })();
  }, [location.id]);

  const updateQ = (i: number, patch: Partial<Q>) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };

  const updateOption = (qi: number, oi: number, val: string) => {
    setQuestions((prev) => prev.map((q, idx) => idx === qi
      ? { ...q, options: q.options.map((o, j) => (j === oi ? val : o)) }
      : q));
  };

  const save = async () => {
    setSaving(true);
    // Update location
    const { error: locErr } = await supabase
      .from("locations").update({ name, hint, qr_code: qrCode }).eq("id", location.id);
    if (locErr) { setSaving(false); return toast.error(locErr.message); }

    // Validate questions: only save filled-in ones
    const valid = questions.filter((q) => q.text.trim() && q.options.every((o) => o.trim()));
    // Delete removed ones
    const { data: existing } = await supabase
      .from("questions").select("id").eq("location_id", location.id);
    const validIds = new Set(valid.filter((q) => q.id).map((q) => q.id!));
    const toDelete = (existing ?? []).filter((e: any) => !validIds.has(e.id)).map((e: any) => e.id);
    if (toDelete.length > 0) await supabase.from("questions").delete().in("id", toDelete);

    // Upsert
    for (let i = 0; i < valid.length; i++) {
      const q = valid[i];
      const payload: any = {
        location_id: location.id,
        text: q.text.trim(),
        options: q.options,
        correct_index: q.correct_index,
        points: q.points,
        order_index: i,
      };
      if (q.id) {
        await supabase.from("questions").update(payload).eq("id", q.id);
      } else {
        await supabase.from("questions").insert(payload);
      }
    }
    setSaving(false);
    toast.success("Local guardado");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar local</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pista</Label>
              <Textarea value={hint} onChange={(e) => setHint(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo do QR Code</Label>
              <Input value={qrCode} onChange={(e) => setQrCode(e.target.value)} className="font-mono" />
              <p className="text-xs text-muted-foreground">Imprime um QR com este texto e cola no local físico.</p>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-bold mb-2">5 Perguntas</h4>
              <div className="space-y-4">
                {questions.map((q, qi) => (
                  <div key={qi} className="rounded-2xl border border-border p-3 space-y-2 bg-card/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">Pergunta {qi + 1}</span>
                      <Input
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQ(qi, { points: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8 text-xs"
                        min={0}
                      />
                    </div>
                    <Textarea
                      value={q.text}
                      onChange={(e) => updateQ(qi, { text: e.target.value })}
                      placeholder="Texto da pergunta"
                      rows={2}
                    />
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`q-${qi}-correct`}
                          checked={q.correct_index === oi}
                          onChange={() => updateQ(qi, { correct_index: oi })}
                          className="accent-primary"
                        />
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Opção ${oi + 1}`}
                          className="h-9"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground">Marca o círculo da resposta correta.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
