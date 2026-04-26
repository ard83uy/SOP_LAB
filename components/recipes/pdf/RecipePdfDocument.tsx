import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ── Types ─────────────────────────────────────────────────────────────────────
// Designed for extensibility: add new optional sections to RecipePdfExtras
// without breaking existing exports.

export type RecipePdfExtras = {
  tools?: string[];      // Ferramentas / Utensílios
  attention?: string;    // Atenção
  chefs_tip?: string;    // Dica do Mestre
};

export type RecipePdfIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type RecipePdfStep = {
  step_number: number;
  instruction: string;
};

export type RecipePdfData = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  base_yield: number;
  yield_unit: string;
  photo_url?: string | null;
  created_at?: string;
  ingredients: RecipePdfIngredient[];
  steps: RecipePdfStep[];
  extras?: RecipePdfExtras;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  PRIMARY: "Primário",
  MANIPULATED: "Manipulado",
  INTERMEDIATE: "Intermediário",
  FINAL: "Final",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  PRIMARY:      { bg: "#d1fae5", text: "#065f46" },
  MANIPULATED:  { bg: "#dbeafe", text: "#1e40af" },
  INTERMEDIATE: { bg: "#fef3c7", text: "#92400e" },
  FINAL:        { bg: "#ede9fe", text: "#4c1d95" },
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 44,
    fontSize: 10,
    color: "#111827",
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
    paddingBottom: 8,
    marginBottom: 18,
  },
  headerLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    letterSpacing: 2,
  },
  headerDate: {
    fontSize: 8,
    color: "#6b7280",
  },

  // Recipe name + meta
  recipeName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
    marginBottom: 7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  categoryText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  yieldText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },

  // Description
  description: {
    fontSize: 10,
    color: "#6b7280",
    lineHeight: 1.6,
    fontStyle: "italic",
    marginBottom: 14,
  },

  // Photo
  photo: {
    width: "100%",
    height: 180,
    objectFit: "cover",
    borderRadius: 6,
    marginBottom: 18,
  },

  // Section
  section: {
    marginBottom: 20,
  },

  // Two-column layout (ingredients | tools + tip)
  twoCol: {
    flexDirection: "row",
    marginBottom: 20,
  },
  colLeft: {
    flex: 1,
    paddingRight: 12,
  },
  colRight: {
    flex: 1,
    paddingLeft: 12,
    borderLeftWidth: 0.75,
    borderLeftColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: "#e5e7eb",
    textTransform: "uppercase",
  },

  // Ingredients table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  colName: { flex: 4 },
  colQty:  { flex: 1.5, textAlign: "right" },
  colUnit: { flex: 1.5, textAlign: "right" },
  tableText: {
    fontSize: 10,
    color: "#111827",
  },
  tableMuted: {
    fontSize: 10,
    color: "#6b7280",
  },

  // Preparation steps
  stepRow: {
    flexDirection: "row",
    marginBottom: 9,
    alignItems: "flex-start",
  },
  stepBullet: {
    width: 20,
    height: 20,
    backgroundColor: "#111827",
    borderRadius: 100,
    marginRight: 10,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBulletText: {
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 4,
  },
  stepText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.65,
    color: "#111827",
    paddingTop: 3,
  },

  // ── Extras (future extensible sections) ───────────────────────────────────

  // Tools / Ferramentas
  toolsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  toolBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  toolBadgeText: {
    fontSize: 9,
    color: "#374151",
    fontFamily: "Helvetica-Bold",
  },

  // Attention / Atenção
  attentionBox: {
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    marginTop: 2,
  },
  attentionText: {
    fontSize: 10,
    color: "#78350f",
    lineHeight: 1.6,
  },

  // Chef's Tip / Dica do Mestre
  tipBox: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    marginTop: 2,
  },
  tipLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  tipText: {
    fontSize: 10,
    color: "#166534",
    lineHeight: 1.6,
    fontStyle: "italic",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
});

// ── Document component ────────────────────────────────────────────────────────

interface Props {
  recipes: RecipePdfData[];
  printDate: string;
}

export function RecipePdfDocument({ recipes, printDate }: Props) {
  return (
    <Document>
      {recipes.map((recipe) => {
        const cat = CATEGORY_COLORS[recipe.category] ?? { bg: "#f3f4f6", text: "#374151" };

        return (
          <Page key={recipe.id} size="A4" style={s.page}>

            {/* ── Header ── */}
            <View style={s.header}>
              <Text style={s.headerLabel}>FICHA TÉCNICA</Text>
              <Text style={s.headerDate}>Impresso em: {printDate}</Text>
            </View>

            {/* ── Recipe identification ── */}
            <Text style={s.recipeName}>{recipe.name}</Text>
            <View style={s.metaRow}>
              <View style={[s.categoryBadge, { backgroundColor: cat.bg }]}>
                <Text style={[s.categoryText, { color: cat.text }]}>
                  {CATEGORY_LABELS[recipe.category] ?? recipe.category}
                </Text>
              </View>
              <Text style={s.yieldText}>
                Rendimento base: {recipe.base_yield} {recipe.yield_unit}
              </Text>
            </View>

            {/* ── Description ── */}
            {recipe.description ? (
              <Text style={s.description}>{recipe.description}</Text>
            ) : null}

            {/* ── Photo ── */}
            {recipe.photo_url ? (
              <Image style={s.photo} src={recipe.photo_url} />
            ) : null}

            {/* ── Ingredients | Tools + Tip (two-column) ── */}
            <View style={s.twoCol}>

              {/* Left: Ingredients */}
              <View style={s.colLeft}>
                {recipe.ingredients.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Ingredientes</Text>
                    <View style={s.tableHeader}>
                      <Text style={[s.tableHeaderText, s.colName]}>Ingrediente</Text>
                      <Text style={[s.tableHeaderText, s.colQty]}>Qtd.</Text>
                      <Text style={[s.tableHeaderText, s.colUnit]}>Und.</Text>
                    </View>
                    {recipe.ingredients.map((ing, idx) => (
                      <View
                        key={idx}
                        style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
                      >
                        <Text style={[s.tableText, s.colName]}>{ing.name}</Text>
                        <Text style={[s.tableMuted, s.colQty]}>{ing.quantity}</Text>
                        <Text style={[s.tableMuted, s.colUnit]}>{ing.unit}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Right: Ferramentas (top) + Dica do Mestre (bottom) */}
              <View style={s.colRight}>
                {recipe.extras?.tools && recipe.extras.tools.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Ferramentas e Utensílios</Text>
                    <View style={s.toolsRow}>
                      {recipe.extras.tools.map((tool, idx) => (
                        <View key={idx} style={s.toolBadge}>
                          <Text style={s.toolBadgeText}>{tool}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {recipe.extras?.chefs_tip && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Dica do Mestre</Text>
                    <View style={s.tipBox}>
                      <Text style={s.tipLabel}>Chef</Text>
                      <Text style={s.tipText}>{recipe.extras.chefs_tip}</Text>
                    </View>
                  </View>
                )}
              </View>

            </View>

            {/* ── Preparation steps ── */}
            {recipe.steps.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Modo de Preparo</Text>
                {recipe.steps.map((step, idx) => (
                  <View key={idx} style={s.stepRow}>
                    <View style={s.stepBullet}>
                      <Text style={s.stepBulletText}>{step.step_number}</Text>
                    </View>
                    <Text style={s.stepText}>{step.instruction}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Atenção ── */}
            {recipe.extras?.attention && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Atenção</Text>
                <View style={s.attentionBox}>
                  <Text style={s.attentionText}>{recipe.extras.attention}</Text>
                </View>
              </View>
            )}

            {/* ── Footer ── */}
            <View style={s.footer} fixed>
              <Text style={s.footerText}>
                {recipe.created_at
                  ? `Criado em: ${new Date(recipe.created_at).toLocaleDateString("pt-BR")}`
                  : ""}
              </Text>
              <Text style={s.footerText}>ID: {recipe.id.slice(0, 8).toUpperCase()}</Text>
            </View>

          </Page>
        );
      })}
    </Document>
  );
}
