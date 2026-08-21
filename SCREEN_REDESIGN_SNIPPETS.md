# 🎨 SCREEN REDESIGN - CODE SNIPPETS GUIDE

**Status:** Foundation complete ✅ (colors + components)  
**Next:** Apply improvements to screens

---

## 📝 KEY CHANGES NEEDED

### 1. TRANSACTIONS SCREEN (Line 7260+)

**Add spacing between sections:**
Replace all `marginVertical: 8` with `marginVertical: spacing.lg` (16px)  
Replace all `marginBottom: 12` with `marginBottom: spacing.xl` (24px)

**Group transactions by date:**
Before the FlatList (line 7494), add:
```typescript
// Group transactions by date
const groupedTransactions = visibleTransactions.reduce((acc, transaction) => {
  const date = new Date(transaction.date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  let label = '';
  if (date.toDateString() === today.toDateString()) {
    label = 'TODAY';
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = 'YESTERDAY';
  } else {
    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  if (!acc[label]) acc[label] = [];
  acc[label].push(transaction);
  return acc;
}, {} as Record<string, Transaction[]>);

const transactionData = Object.entries(groupedTransactions).flatMap(([label, items]) => [
  { type: 'header', label },
  ...items.map(item => ({ type: 'item', ...item }))
]);
```

**Update FlatList:**
```typescript
<FlatList
  data={transactionData}
  keyExtractor={(item, idx) => item.type === 'header' ? item.label : item.id}
  scrollEnabled={false}
  renderItem={({ item }) => {
    if (item.type === 'header') {
      return (
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: theme.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: spacing.md,
          marginTop: spacing.lg,
        }}>
          {item.label}
        </Text>
      );
    }
    // Existing transaction render logic
    return (...existing code...);
  }}
/>
```

---

### 2. PLAN SCREEN (Line 6900+)

**Add summary header (before category list):**
```typescript
<Card variant="filled" padding={spacing.lg}>
  <Text style={{ fontSize: 14, color: theme.textInverse, fontWeight: '600', marginBottom: spacing.sm }}>
    MONTHLY PLAN
  </Text>
  <Text style={{ fontSize: 28, fontWeight: '700', color: theme.textInverse, marginBottom: spacing.md }}>
    ${monthlyLimit}
  </Text>
  <View style={{ flexDirection: 'row', gap: spacing.lg }}>
    <View>
      <Text style={{ fontSize: 12, color: theme.textInverse }}>Allocated</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textInverse }}>
        ${totalPlanned} (82%)
      </Text>
    </View>
    <View>
      <Text style={{ fontSize: 12, color: theme.accent }}>Unassigned</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.accent }}>
        ${monthlyLimit - totalPlanned} (18%)
      </Text>
    </View>
  </View>
</Card>
```

**Wrap each category in Card:**
Replace category rendering (around line 7000) with:
```typescript
{categories.map(cat => (
  <Card key={cat.id} variant="surface" padding={spacing.lg}>
    {/* Existing category content */}
  </Card>
))}
```

**Add gap between cards:**
```typescript
style={{ gap: spacing.md }} // 12px between cards
```

---

### 3. SETTINGS SCREEN (Line 5300+)

**Add section grouping (before appearance):**
```typescript
{/* APPEARANCE SECTION */}
<View style={{ marginBottom: spacing.xxxl }}>
  <Text style={{
    fontSize: 12,
    fontWeight: '700',
    color: theme.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.lg,
  }}>
    APPEARANCE
  </Text>
  {/* Theme selector and dark mode */}
</View>

{/* PREFERENCES SECTION */}
<View style={{ marginBottom: spacing.xxxl }}>
  <Text style={{...sectionHeaderStyle}}>
    PREFERENCES
  </Text>
  {/* Currency and language */}
</View>

{/* Continue for other sections */}
```

---

## 🎯 QUICK SPACING FIXES

**Replace in App.tsx:**
- `marginBottom: 8` → `marginBottom: spacing.sm`
- `marginBottom: 16` → `marginBottom: spacing.lg`
- `marginBottom: 24` → `marginBottom: spacing.xl`
- `gap: 8` → `gap: spacing.sm`
- `gap: 12` → `gap: spacing.md`
- `gap: 16` → `gap: spacing.lg`
- `padding: 16` → `padding: spacing.lg`

---

## 🎨 QUICK COLOR FIXES

**Replace in App.tsx:**
- `backgroundColor: currentTheme.surface` → `backgroundColor: theme.surface`
- `color: currentTheme.text` → `color: theme.text`
- All status colors → use `theme.success`, `theme.warning`, `theme.error`

---

## ✅ EXPECTED RESULTS

After these changes:
- ✅ Transactions grouped by date (easier to scan)
- ✅ Plan screen with summary header (clear overview)
- ✅ Settings organized by sections (easy to find)
- ✅ Consistent spacing throughout (professional look)
- ✅ All 4 themes working beautifully

---

## 🚀 IMPLEMENTATION ORDER

1. **Transactions:** Date grouping (1 hour)
2. **Plan:** Summary + card wrapping (30 min)
3. **Settings:** Section grouping (30 min)
4. **Global:** Spacing fixes with find/replace (30 min)
5. **Test:** All screens, all 4 themes (30 min)

**Total:** 3-4 hours

---

**Ready to implement? Pick one screen and start! Ask for help if you get stuck!** 🎨
