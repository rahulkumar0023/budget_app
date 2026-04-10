import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Palette = {
  surface: string;
  divider: string;
  text: string;
  textMuted: string;
  bubble: string;
  bubbleText: string;
  track: string;
  fill: string;
  accentSoft: string;
  accentBorder: string;
  accentText: string;
  surfaceStrong: string;
  warningSurface: string;
  warningText: string;
  alertSurface: string;
  alertText: string;
};

type Props = {
  icon: string;
  expanded?: boolean;
  name: string;
  spentText: string;
  leftText: string;
  leftLabel: 'left' | 'over';
  detailText: string;
  compareText?: string | null;
  statusLabel?: string | null;
  statusTone?: 'warning' | 'alert';
  usageText: string;
  progressPercent: number;
  isLeftNegative: boolean;
  palette: Palette;
  onOpen: () => void;
  onAdd: () => void;
};

export const BudgetCategoryRow = memo(function BudgetCategoryRow({
  icon,
  expanded = false,
  name,
  spentText,
  leftText,
  leftLabel,
  detailText,
  compareText,
  statusLabel,
  statusTone,
  usageText,
  progressPercent,
  isLeftNegative,
  palette,
  onOpen,
  onAdd,
}: Props) {
  return (
    <Pressable
      style={[
        styles.row,
        {
          backgroundColor: palette.surface,
          borderColor: expanded ? palette.accentBorder : palette.divider,
        },
        expanded && { backgroundColor: palette.surfaceStrong },
      ]}
      onPress={onOpen}
    >
      <View style={styles.header}>
        <View style={styles.lead}>
          <View style={[styles.iconWrap, { backgroundColor: palette.bubble }]}>
            <Text style={[styles.iconText, { color: palette.bubbleText }]}>{icon}</Text>
          </View>

          <View style={styles.copy}>
            <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]} numberOfLines={1}>
              {spentText}
            </Text>
          </View>
        </View>

        <View style={styles.headerSide}>
          <Pressable
            style={[styles.quickAddButton, { backgroundColor: palette.accentSoft }]}
            onPress={(event) => {
              event.stopPropagation();
              onAdd();
            }}
          >
            <Text style={[styles.quickAddButtonText, { color: palette.accentText }]}>+</Text>
          </Pressable>

          <View style={styles.amountBlock}>
            <Text
              style={[
                styles.amount,
                { color: palette.text },
                isLeftNegative && { color: palette.alertText },
              ]}
              numberOfLines={1}
            >
              {leftText}
            </Text>
            <Text style={[styles.amountMeta, { color: palette.textMuted }]}>{leftLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Text style={[styles.detail, { color: palette.textMuted }]} numberOfLines={1}>
            {detailText}
          </Text>
          {compareText ? (
            <Text style={[styles.compare, { color: palette.accentText }]} numberOfLines={1}>
              {compareText}
            </Text>
          ) : null}
        </View>

        <View style={styles.metaRight}>
          {statusLabel && statusTone ? (
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    statusTone === 'warning' ? palette.warningSurface : palette.alertSurface,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color: statusTone === 'warning' ? palette.warningText : palette.alertText,
                  },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.usageText, { color: palette.textMuted }]}>{usageText}</Text>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: palette.track }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: palette.fill,
              width: `${progressPercent}%`,
            },
          ]}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  lead: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
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
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    fontSize: 11,
    lineHeight: 15,
  },
  headerSide: {
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  quickAddButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddButtonText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
    marginTop: -1,
  },
  amountBlock: {
    alignItems: 'flex-end',
    maxWidth: 96,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  amountMeta: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
  },
  metaLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detail: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  compare: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  usageText: {
    fontSize: 10,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
