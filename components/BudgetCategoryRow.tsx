import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  swipeViewportWidth: number;
  swipeRailWidth: number;
  icon: string;
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
  onEdit: () => void;
};

export const BudgetCategoryRow = memo(function BudgetCategoryRow({
  swipeViewportWidth,
  swipeRailWidth,
  icon,
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
  onEdit,
}: Props) {
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
      <Pressable
        style={[
          styles.row,
          {
            width: swipeViewportWidth,
            backgroundColor: palette.surface,
            borderColor: palette.divider,
          },
        ]}
        onPress={onOpen}
      >
        <View style={styles.header}>
          <View style={styles.lead}>
            <View style={[styles.iconWrap, { backgroundColor: palette.bubble }]}>
              <Text style={[styles.iconText, { color: palette.bubbleText }]}>{icon}</Text>
            </View>

            <View style={styles.copy}>
              <Text style={[styles.name, { color: palette.text }]}>{name}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>{spentText}</Text>
            </View>
          </View>

          <View style={styles.amountBlock}>
            <Text
              style={[
                styles.amount,
                { color: palette.text },
                isLeftNegative && { color: palette.alertText },
              ]}
            >
              {leftText}
            </Text>
            <Text style={[styles.amountMeta, { color: palette.textMuted }]}>{leftLabel}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text style={[styles.detail, { color: palette.textMuted }]}>{detailText}</Text>
            {compareText ? (
              <Text style={[styles.compare, { color: palette.accentText }]}>{compareText}</Text>
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

      <View style={[styles.swipeRail, { width: swipeRailWidth }]}>
        <Pressable
          style={[
            styles.swipeRailButton,
            {
              backgroundColor: palette.accentSoft,
              borderColor: palette.accentBorder,
            },
          ]}
          onPress={onAdd}
        >
          <Text style={[styles.swipeRailButtonTextPrimary, { color: palette.accentText }]}>Add</Text>
        </Pressable>
        <Pressable
          style={[styles.swipeRailButton, { backgroundColor: palette.surfaceStrong }]}
          onPress={onEdit}
        >
          <Text style={[styles.swipeRailButtonText, { color: palette.accentText }]}>Edit</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  swipeRowShell: {
    width: '100%',
  },
  row: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 14,
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
    fontSize: 12,
    lineHeight: 15,
  },
  amountBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
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
    alignItems: 'center',
    gap: 10,
  },
  metaLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detail: {
    fontSize: 10,
    fontWeight: '700',
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
  swipeRailButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  swipeRailButtonTextPrimary: {
    fontSize: 11,
    fontWeight: '800',
  },
});
