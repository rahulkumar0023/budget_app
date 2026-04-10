import { Pressable, StyleSheet, Text, View } from 'react-native';

export type AppToastTone = 'info' | 'success' | 'error';

export type AppToastState = {
  id: number;
  message: string;
  tone: AppToastTone;
};

type Props = {
  toast: AppToastState | null;
  onDismiss: () => void;
  palette: {
    text: string;
    textMuted: string;
    surface: string;
    divider: string;
    successSurface: string;
    successText: string;
    alertSurface: string;
    alertText: string;
    accentSoft: string;
    accentText: string;
  };
};

export function AppToast({ toast, onDismiss, palette }: Props) {
  if (!toast) {
    return null;
  }

  const backgroundColor =
    toast.tone === 'success'
      ? palette.successSurface
      : toast.tone === 'error'
        ? palette.alertSurface
        : palette.accentSoft;
  const textColor =
    toast.tone === 'success'
      ? palette.successText
      : toast.tone === 'error'
        ? palette.alertText
        : palette.accentText;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor,
            borderColor: palette.divider,
          },
        ]}
        onPress={onDismiss}
      >
        <Text style={[styles.message, { color: textColor }]} numberOfLines={3}>
          {toast.message}
        </Text>
        <Text style={[styles.dismiss, { color: palette.textMuted }]}>Tap to dismiss</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 92,
    zIndex: 30,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  dismiss: {
    fontSize: 10,
    fontWeight: '700',
  },
});
