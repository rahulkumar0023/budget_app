import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Tone = 'good' | 'warning' | 'alert';

type Palette = {
  surface: string;
  divider: string;
  text: string;
  textMuted: string;
  bubble: string;
  bubbleText: string;
  chip: string;
  chipText: string;
  surfaceSoft: string;
  accentSoft: string;
  accentBorder: string;
  accentText: string;
  warningSurface: string;
  warningText: string;
  alertSurface: string;
  alertText: string;
  successSurface: string;
  successText: string;
};

type Props = {
  swipeViewportWidth: number;
  swipeRailWidth: number;
  icon: string;
  title: string;
  dateText: string;
  amountText: string;
  categoryLabel: string;
  subcategoryLabel?: string | null;
  accountLabel?: string | null;
  recurring: boolean;
  tone: Tone;
  toneLabel: string;
  palette: Palette;
  onEdit: () => void;
  onDelete: () => void;
};

export const TransactionListItem = memo(function TransactionListItem({
  swipeViewportWidth,
  swipeRailWidth,
  icon,
  title,
  dateText,
  amountText,
  categoryLabel,
  subcategoryLabel,
  accountLabel,
  recurring,
  tone,
  toneLabel,
  palette,
  onEdit,
  onDelete,
}: Props) {
  const toneBackground =
    tone === 'good'
      ? palette.successSurface
      : tone === 'warning'
        ? palette.warningSurface
        : palette.alertSurface;
  const toneText =
    tone === 'good'
      ? palette.successText
      : tone === 'warning'
        ? palette.warningText
        : palette.alertText;

  return (
    <ScrollView
      horizontal
      bounces={false}
      showsHorizontalScrollIndicator={false}
      directionalLockEnabled
      snapToOffsets={[0, swipeRailWidth]}
      decelerationRate="fast"
      contentContainerStyle={{ width: swipeViewportWidth + swipeRailWidth }}
      style={styles.swipeRowShell}
    >
      <View
        style={[
          styles.card,
          {
            width: swipeViewportWidth,
            backgroundColor: palette.surface,
            borderColor: palette.divider,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.lead}>
            <View style={[styles.iconWrap, { backgroundColor: palette.bubble }]}>
              <Text style={[styles.iconText, { color: palette.bubbleText }]}>{icon}</Text>
            </View>

            <View style={styles.copy}>
              <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>{dateText}</Text>
            </View>
          </View>

          <Text style={[styles.amount, { color: palette.text }]}>{amountText}</Text>
        </View>

        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: palette.chip }]}>
            <Text style={[styles.tagText, { color: palette.chipText }]}>{categoryLabel}</Text>
          </View>

          {subcategoryLabel ? (
            <View style={[styles.tag, { backgroundColor: palette.surfaceSoft }]}>
              <Text style={[styles.tagText, { color: palette.textMuted }]}>{subcategoryLabel}</Text>
            </View>
          ) : null}

          {accountLabel ? (
            <View style={[styles.tag, { backgroundColor: palette.surfaceSoft }]}>
              <Text style={[styles.tagText, { color: palette.textMuted }]}>{accountLabel}</Text>
            </View>
          ) : null}

          {recurring ? (
            <View style={[styles.tag, { backgroundColor: palette.surfaceSoft }]}>
              <Text style={[styles.tagText, { color: palette.textMuted }]}>Recurring</Text>
            </View>
          ) : null}

          <View style={[styles.tag, { backgroundColor: toneBackground }]}>
            <Text style={[styles.tagText, { color: toneText }]}>{toneLabel}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.swipeRail, { width: swipeRailWidth }]}>
        <Pressable
          style={[
            styles.swipeRailButton,
            {
              backgroundColor: palette.accentSoft,
              borderColor: palette.accentBorder,
            },
          ]}
          onPress={onEdit}
        >
          <Text style={[styles.swipeRailButtonTextPrimary, { color: palette.accentText }]}>Edit</Text>
        </Pressable>
        <Pressable
          style={[styles.swipeRailButton, { backgroundColor: palette.alertSurface, borderColor: palette.alertSurface }]}
          onPress={onDelete}
        >
          <Text style={[styles.swipeRailButtonTextDanger, { color: palette.alertText }]}>Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  swipeRowShell: {
    width: '100%',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  lead: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    lineHeight: 16,
  },
  amount: {
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'right',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  swipeRail: {
    gap: 6,
    justifyContent: 'center',
    paddingLeft: 6,
    paddingRight: 2,
  },
  swipeRailButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  swipeRailButtonTextPrimary: {
    fontSize: 11,
    fontWeight: '800',
  },
  swipeRailButtonTextDanger: {
    fontSize: 11,
    fontWeight: '800',
  },
});
