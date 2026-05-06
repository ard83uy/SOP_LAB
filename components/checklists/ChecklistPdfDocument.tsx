"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ── Types ───────────────────────────────────────────────────────────────────

export type PdfTask = {
  id: string;
  title: string;
  description: string | null;
  time_slot: string;
  frequency: string;
  days_of_week: number[];
  sort_order: number;
  points: number;
};

export type PdfChecklist = {
  id: string;
  name: string;
  description: string | null;
  tasks: PdfTask[];
};

type Props = {
  checklists: PdfChecklist[];
  profileName: string;
  restaurantName?: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const TIME_SLOT_LABELS: Record<string, string> = {
  ALL_DAY: "Dia todo",
  OPENING: "Abertura",
  MIDDAY: "Meio do Dia",
  CLOSING: "Fechamento",
};

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getFrequencyLabel(task: PdfTask): string {
  if (task.frequency === "DAILY") return "Diário";
  if (task.days_of_week.length === 0) return "Dias específicos";
  return task.days_of_week.map((d) => DAY_NAMES[d]).join(", ");
}

// ── Styles ───────────────────────────────────────────────────────────────────

const PRIMARY = "#e07b2a";
const LIGHT_ORANGE = "#fff7f0";
const DARK = "#1a1a1a";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    color: DARK,
    fontSize: 10,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: GRAY,
  },
  headerBadge: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  headerBadgeText: {
    fontSize: 9,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },

  // ── Instructions banner ──
  instructionsBanner: {
    backgroundColor: LIGHT_ORANGE,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    padding: 10,
    marginBottom: 20,
    borderRadius: 2,
  },
  instructionsTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  instructionsText: {
    fontSize: 8.5,
    color: "#5a3a1a",
    lineHeight: 1.5,
  },

  // ── Checklist block ──
  checklistBlock: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: "hidden",
  },
  checklistHeader: {
    backgroundColor: DARK,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checklistName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    flex: 1,
  },
  checklistDescription: {
    fontSize: 8.5,
    color: "#aaaaaa",
    marginTop: 1,
  },
  taskCountBadge: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
  },
  taskCountText: {
    fontSize: 8,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
  },

  // ── Column headers ──
  columnHeaders: {
    flexDirection: "row",
    backgroundColor: LIGHT_GRAY,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  colCheck: { width: 28 },
  colNum: { width: 24, textAlign: "center" },
  colTask: { flex: 1 },
  colPeriod: { width: 72, textAlign: "center" },
  colFreq: { width: 80, textAlign: "center" },
  columnHeaderText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // ── Task row ──
  taskRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: "flex-start",
    minHeight: 32,
  },
  taskRowAlt: {
    backgroundColor: "#fafafa",
  },
  checkBox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 2,
    marginTop: 1,
    marginRight: 14,
  },
  taskNumber: {
    width: 24,
    fontSize: 8,
    color: GRAY,
    textAlign: "center",
    paddingTop: 1,
  },
  taskContent: {
    flex: 1,
    paddingRight: 8,
  },
  taskTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 1,
  },
  taskDesc: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.4,
  },
  taskPeriod: {
    width: 72,
    textAlign: "center",
    fontSize: 8,
    color: GRAY,
    paddingTop: 1,
  },
  taskFreq: {
    width: 80,
    textAlign: "center",
    fontSize: 8,
    color: GRAY,
    paddingTop: 1,
  },
  taskPeriodBadge: {
    alignSelf: "center",
    backgroundColor: LIGHT_GRAY,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },

  // ── Empty state ──
  emptyRow: {
    padding: 14,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 8.5,
    color: GRAY,
    fontFamily: "Helvetica-Oblique",
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerLeft: {
    fontSize: 7.5,
    color: GRAY,
  },
  footerRight: {
    fontSize: 7.5,
    color: GRAY,
  },

  // ── Page number ──
  pageNum: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7.5,
    color: GRAY,
  },

  // ── Summary ──
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 5,
    padding: 10,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 7.5,
    color: GRAY,
    textAlign: "center",
  },

  // ── Signature ──
  signatureSection: {
    flexDirection: "row",
    marginTop: 8,
    gap: 12,
  },
  signatureField: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 7.5,
    color: GRAY,
  },
});

// ── Component ────────────────────────────────────────────────────────────────

export function ChecklistPdfDocument({ checklists, profileName, restaurantName }: Props) {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalTasks = checklists.reduce((sum, cl) => sum + cl.tasks.length, 0);

  return (
    <Document
      title={`Checklist — ${profileName}`}
      author="SOP Mobile"
      subject={`Checklists operacionais para ${profileName}`}
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              {restaurantName ? `${restaurantName} · ` : ""}Checklist Operacional
            </Text>
            <Text style={styles.headerSubtitle}>
              Perfil: {profileName} · {today}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>SOP MOBILE</Text>
          </View>
        </View>

        {/* ── Summary cards ── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{checklists.length}</Text>
            <Text style={styles.summaryLabel}>
              {checklists.length === 1 ? "Checklist" : "Checklists"}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalTasks}</Text>
            <Text style={styles.summaryLabel}>
              {totalTasks === 1 ? "Tarefa" : "Tarefas"}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{profileName}</Text>
            <Text style={styles.summaryLabel}>Perfil</Text>
          </View>
        </View>

        {/* ── How-to banner ── */}
        <View style={styles.instructionsBanner}>
          <Text style={styles.instructionsTitle}>📋 Como usar este checklist</Text>
          <Text style={styles.instructionsText}>
            Execute cada tarefa na ordem indicada. Marque o quadrado (☐) ao concluir. Em caso de
            dúvida, consulte seu supervisor antes de prosseguir. Mantenha este documento visível
            durante o turno e entregue ao gerente ao final.
          </Text>
        </View>

        {/* ── Checklists ── */}
        {checklists.map((cl) => (
          <View key={cl.id} style={styles.checklistBlock} wrap={false}>
            {/* Checklist header */}
            <View style={styles.checklistHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.checklistName}>{cl.name}</Text>
                {cl.description && (
                  <Text style={styles.checklistDescription}>{cl.description}</Text>
                )}
              </View>
              <View style={styles.taskCountBadge}>
                <Text style={styles.taskCountText}>
                  {cl.tasks.length} {cl.tasks.length === 1 ? "tarefa" : "tarefas"}
                </Text>
              </View>
            </View>

            {/* Column headers */}
            <View style={styles.columnHeaders}>
              <View style={styles.colCheck}>
                <Text style={styles.columnHeaderText}>✓</Text>
              </View>
              <Text style={[styles.columnHeaderText, styles.colNum]}>#</Text>
              <Text style={[styles.columnHeaderText, styles.colTask]}>Tarefa</Text>
              <Text style={[styles.columnHeaderText, styles.colPeriod]}>Período</Text>
              <Text style={[styles.columnHeaderText, styles.colFreq]}>Frequência</Text>
            </View>

            {/* Tasks */}
            {cl.tasks.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>Nenhuma tarefa neste checklist</Text>
              </View>
            ) : (
              cl.tasks.map((task, idx) => (
                <View
                  key={task.id}
                  style={[styles.taskRow, idx % 2 === 1 ? styles.taskRowAlt : {}]}
                >
                  <View style={styles.colCheck}>
                    <View style={styles.checkBox} />
                  </View>
                  <Text style={styles.taskNumber}>{idx + 1}</Text>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    {task.description && (
                      <Text style={styles.taskDesc}>{task.description}</Text>
                    )}
                  </View>
                  <Text style={styles.taskPeriod}>
                    {TIME_SLOT_LABELS[task.time_slot] ?? task.time_slot}
                  </Text>
                  <Text style={styles.taskFreq}>{getFrequencyLabel(task)}</Text>
                </View>
              ))
            )}
          </View>
        ))}

        {/* ── Signature section ── */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Colaborador — Assinatura</Text>
          </View>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Supervisor — Assinatura</Text>
          </View>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Data / Turno</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            Gerado por SOP Mobile · {profileName}
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
