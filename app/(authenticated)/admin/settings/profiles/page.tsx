"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Users,
  Check,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Types ────────────────────────────────────────────────────────────────────

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "ONBOARDING";
};

type UserProfile = {
  id: string;
  name: string;
  base_role: string;
  allowed_modules: Record<string, boolean>;
  created_at: string;
  users: ProfileUser[];
  _count: { users: number };
};

// ── Schema & constants ──────────────────────────────────────────────────────

const BASE_ROLES = [
  { value: "STAFF", label: "Funcionário (Contagem)" },
  { value: "PREP_KITCHEN", label: "Cozinha de Produção" },
  { value: "STATION_LEADER", label: "Líder de Praça" },
  { value: "MANAGER", label: "Gerente" },
  { value: "ADMIN", label: "Administrador" },
] as const;

const baseRoleLabel: Record<string, string> = Object.fromEntries(
  BASE_ROLES.map((r) => [r.value, r.label])
);

const MODULES = [
  { key: "stations",   label: "Praças" },
  { key: "handover",   label: "Contagem" },
  { key: "production", label: "Produção" },
  { key: "prep_items", label: "Insumos" },
  { key: "fichas",     label: "Fichas" },
  { key: "checklists", label: "Checklists" },
  { key: "settings",   label: "Configurações" },
] as const;

const profileSchema = z.object({
  name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres"),
  base_role: z.enum(["ADMIN", "MANAGER", "STATION_LEADER", "PREP_KITCHEN", "STAFF"]),
});

// ── Role / status display ───────────────────────────────────────────────────

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Gerente",
  STATION_LEADER: "Líder de Praça",
  PREP_KITCHEN: "Produção",
  STAFF: "Funcionário",
};

const statusBadgeClass: Record<string, string> = {
  ACTIVE: "border-green-500 text-green-700 dark:text-green-400",
  INACTIVE: "border-red-400 text-red-600 dark:text-red-400",
  ONBOARDING: "border-yellow-500 text-yellow-700 dark:text-yellow-400",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Suspenso",
  ONBOARDING: "Pendente",
};

// ── Inline Name Editor ──────────────────────────────────────────────────────

function InlineNameEditor({
  profile,
}: {
  profile: UserProfile;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const mutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch(`/api/user-profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao renomear perfil");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      toast.success("Perfil renomeado!");
      setEditing(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setName(profile.name);
    },
  });

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Nome deve ter no mínimo 2 caracteres");
      return;
    }
    if (trimmed === profile.name) {
      setEditing(false);
      return;
    }
    mutation.mutate(trimmed);
  };

  const handleCancel = () => {
    setName(profile.name);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="flex items-center gap-1.5 group/edit cursor-pointer"
        title="Editar nome"
      >
        <span className="font-bold text-base leading-tight">{profile.name}</span>
        <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity" />
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
        className="font-bold text-base leading-tight bg-muted rounded-md px-2 py-1 border border-border outline-none focus:ring-2 focus:ring-primary/50 w-48"
        disabled={mutation.isPending}
      />
      <span
        role="button"
        tabIndex={-1}
        onClick={handleSave}
        className="p-1 rounded-md text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
      >
        <Check className="w-4 h-4" />
      </span>
      <span
        role="button"
        tabIndex={-1}
        onClick={handleCancel}
        className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </span>
    </div>
  );
}

// ── Module Permissions ──────────────────────────────────────────────────────

function ModulePermissions({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (allowed_modules: Record<string, boolean>) => {
      const res = await fetch(`/api/user-profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed_modules }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar permissões");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Permissões atualizadas!");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggle = (key: string) => {
    const current = profile.allowed_modules ?? {};
    mutation.mutate({ ...current, [key]: !current[key] });
  };

  const modules = profile.allowed_modules ?? {};

  return (
    <div className="pt-3 border-t border-border mt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Módulos visíveis
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MODULES.map(({ key, label }) => {
          const enabled = !!modules[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              disabled={mutation.isPending}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${
                enabled
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                  enabled ? "bg-primary border-primary" : "border-muted-foreground/40"
                }`}
              >
                {enabled && (
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-primary-foreground" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Create Dialog ───────────────────────────────────────────────────────────

function CreateProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", base_role: "STAFF" as const },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const res = await fetch("/api/user-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar perfil");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      toast.success("Perfil criado!");
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Perfil</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Perfil</FormLabel>
                  <FormControl>
                    <Input
                      className="h-12"
                      placeholder="Ex: Cozinheiro, Garçom, Barista..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="base_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Acesso</FormLabel>
                  <Select onValueChange={(v) => { if (v) field.onChange(v); }} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BASE_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-12"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Criando..." : "Criar Perfil"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  profile,
  onClose,
}: {
  profile: UserProfile;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/user-profiles/${profile.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir perfil");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      toast.success("Perfil excluído.");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir perfil</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir o perfil &quot;{profile.name}&quot;?
          {profile._count.users > 0 && (
            <span className="block mt-2 text-destructive font-medium">
              Este perfil está atribuído a {profile._count.users} usuário(s) e
              não pode ser excluído.
            </span>
          )}
        </p>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || profile._count.users > 0}
          >
            {mutation.isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteProfile, setDeleteProfile] = useState<UserProfile | null>(null);

  const {
    data: profiles,
    isLoading,
    error,
  } = useQuery<UserProfile[]>({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const res = await fetch("/api/user-profiles");
      if (!res.ok) throw new Error("Falha ao carregar perfis");
      return res.json();
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/admin/settings"
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-sm text-muted-foreground font-medium">
          Configurações
        </span>
      </div>

      <PageHeader
        title="Perfis de Usuário"
        subtitle="Perfis controlam a visualização de praças, fichas técnicas, checklists e mais"
      >
        <Button
          onClick={() => setCreateOpen(true)}
          size="icon"
          className="rounded-full shadow-lg h-14 w-14 fixed bottom-24 right-4 md:static md:w-auto md:h-11 md:rounded-md md:px-4 md:shadow-none z-40"
        >
          <Plus className="w-7 h-7 md:hidden" />
          <span className="hidden md:flex items-center gap-2">
            <Plus className="w-5 h-5" /> Novo Perfil
          </span>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm">
          {(error as Error).message}
        </div>
      ) : !profiles || profiles.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Nenhum perfil criado"
          description="Crie perfis para organizar as permissões e visualizações dos colaboradores."
        />
      ) : (
        <Accordion className="space-y-2">
          {profiles.map((profile) => (
            <AccordionItem
              key={profile.id}
              className="border rounded-xl bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                    <UserCog className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <InlineNameEditor profile={profile} />
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {baseRoleLabel[profile.base_role] ?? profile.base_role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {profile._count.users}{" "}
                        {profile._count.users === 1 ? "usuário" : "usuários"}
                      </span>
                    </div>
                  </div>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteProfile(profile);
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                {profile.users.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    Nenhum usuário com este perfil
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {profile.users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-tight truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${statusBadgeClass[user.status] || ""}`}
                          >
                            {statusLabel[user.status] ?? user.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {roleLabel[user.role] ?? user.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <ModulePermissions profile={profile} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <CreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} />

      {deleteProfile && (
        <DeleteConfirmDialog
          profile={deleteProfile}
          onClose={() => setDeleteProfile(null)}
        />
      )}
    </div>
  );
}
