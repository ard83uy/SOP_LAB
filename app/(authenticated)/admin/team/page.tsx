"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  profile_id: string | null;
  profile: Profile | null;
  status: "ACTIVE" | "INACTIVE" | "ONBOARDING";
};

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  profile_id: z.string().uuid("Selecione um perfil"),
});

const editSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  profile_id: z.string().uuid("Selecione um perfil"),
  password: z.string().min(8, "Mínimo 8 caracteres").or(z.literal("")).optional(),
});

// ── Status display ──────────────────────────────────────────────────────────

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

// ── Profile Select ──────────────────────────────────────────────────────────

function ProfileSelect({
  profiles,
  value,
  onChange,
}: {
  profiles: Profile[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select onValueChange={(v) => { if (v) onChange(v); }} value={value}>
      <SelectTrigger className="h-12">
        <SelectValue placeholder="Selecione o perfil" />
      </SelectTrigger>
      <SelectContent>
        {profiles.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

function CreateUserDialog({
  open,
  onOpenChange,
  profiles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profiles: Profile[];
}) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "", profile_id: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof createSchema>) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar usuário");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      toast.success("Usuário criado com sucesso!");
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Funcionário</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input className="h-12" placeholder="João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input className="h-12" type="email" placeholder="joao@restaurante.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        className="h-12 pr-10"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profile_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <FormControl>
                    <ProfileSelect
                      profiles={profiles}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12" disabled={mutation.isPending}>
              {mutation.isPending ? "Criando..." : "Criar Funcionário"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditUserDialog({
  user,
  onClose,
  profiles,
}: {
  user: User;
  onClose: () => void;
  profiles: Profile[];
}) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user.name,
      profile_id: user.profile_id ?? "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof editSchema>) => {
      const body: Record<string, unknown> = {
        name: data.name,
        profile_id: data.profile_id,
      };
      if (data.password) body.password = data.password;
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao atualizar usuário");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      toast.success("Usuário atualizado!");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar — {user.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input className="h-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profile_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <FormControl>
                    <ProfileSelect
                      profiles={profiles}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha <span className="text-muted-foreground font-normal">(deixe em branco para não alterar)</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        className="h-12 pr-10"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Aguarde..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "unsuspend" | "delete";
    user: User;
  } | null>(null);

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Falha ao carregar equipe");
      return res.json();
    },
  });

  const { data: profiles } = useQuery<Profile[]>({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const res = await fetch("/api/user-profiles");
      if (!res.ok) throw new Error("Falha ao carregar perfis");
      return (await res.json()).map((p: any) => ({ id: p.id, name: p.name }));
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao suspender usuário");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success(vars.suspended ? "Usuário suspenso." : "Usuário reativado.");
      setConfirmAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir usuário");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      toast.success("Usuário excluído.");
      setConfirmAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") {
      deleteMutation.mutate(confirmAction.user.id);
    } else {
      suspendMutation.mutate({
        id: confirmAction.user.id,
        suspended: confirmAction.type === "suspend",
      });
    }
  };

  const isPending = suspendMutation.isPending || deleteMutation.isPending;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader title="Equipe">
        <Button
          onClick={() => setCreateOpen(true)}
          size="icon"
          className="rounded-full shadow-lg h-14 w-14 fixed bottom-24 right-4 md:static md:w-auto md:h-11 md:rounded-md md:px-4 md:shadow-none z-40"
        >
          <UserPlus className="w-7 h-7 md:hidden" />
          <span className="hidden md:flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Novo Funcionário
          </span>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm">
          {(error as Error).message}
        </div>
      ) : !users || users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sua equipe está vazia"
          description="Crie o acesso dos colaboradores diretamente por aqui."
        />
      ) : (
        <div className="grid gap-3">
          {users.map((user) => (
            <Card key={user.id} className={user.status === "INACTIVE" ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base leading-tight">{user.name}</h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${statusBadgeClass[user.status] || ""}`}
                      >
                        {statusLabel[user.status] ?? user.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {user.profile?.name ?? "Sem perfil"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditUser(user)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setConfirmAction({
                          type: user.status === "INACTIVE" ? "unsuspend" : "suspend",
                          user,
                        })
                      }
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={user.status === "INACTIVE" ? "Reativar" : "Suspender"}
                    >
                      {user.status === "INACTIVE" ? (
                        <PlayCircle className="w-4 h-4" />
                      ) : (
                        <PauseCircle className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: "delete", user })}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        profiles={profiles ?? []}
      />

      {editUser && (
        <EditUserDialog
          user={editUser}
          onClose={() => setEditUser(null)}
          profiles={profiles ?? []}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          open
          title={
            confirmAction.type === "delete"
              ? "Excluir usuário"
              : confirmAction.type === "suspend"
              ? "Suspender usuário"
              : "Reativar usuário"
          }
          description={
            confirmAction.type === "delete"
              ? `Tem certeza que deseja excluir "${confirmAction.user.name}"? Esta ação é irreversível.`
              : confirmAction.type === "suspend"
              ? `"${confirmAction.user.name}" perderá o acesso ao sistema imediatamente.`
              : `"${confirmAction.user.name}" voltará a ter acesso ao sistema.`
          }
          confirmLabel={
            confirmAction.type === "delete"
              ? "Excluir"
              : confirmAction.type === "suspend"
              ? "Suspender"
              : "Reativar"
          }
          destructive={confirmAction.type === "delete" || confirmAction.type === "suspend"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
          loading={isPending}
        />
      )}
    </div>
  );
}
