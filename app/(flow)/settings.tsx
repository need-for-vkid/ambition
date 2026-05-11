import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useSettingsStore } from '../../store/settings';
import { Locale } from '../../constants/strings';
import { useT } from '../../lib/i18n';
import { C } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

const LANGUAGE_OPTIONS: { value: Locale; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'ru', label: 'Russian', native: 'Русский' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const tr = useT();
  const { locale, setLocale } = useSettingsStore();

  const handleLocale = async (value: Locale) => {
    impact();
    await setLocale(value);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={() => {
              impact();
              router.back();
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={20} color={C.fgSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>{tr('settings.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Language section */}
          <Text style={styles.sectionLabel}>{tr('settings.language_section')}</Text>
          <View style={styles.optionGroup}>
            {LANGUAGE_OPTIONS.map((opt, i) => {
              const selected = locale === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [
                    styles.option,
                    i < LANGUAGE_OPTIONS.length - 1 && styles.optionBorder,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => handleLocale(opt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelActive]}>
                      {opt.native}
                    </Text>
                  </View>
                  {selected && <Check size={16} color={C.gold400} />}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>
            More settings coming soon.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.base800,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.base700,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: C.base600,
  },
  headerTitle: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.fgPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: S[5],
    paddingTop: S[6],
    paddingBottom: S[8],
  },
  sectionLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: S[3],
  },
  optionGroup: {
    backgroundColor: C.base700,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderDefault,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 56,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
  },
  optionPressed: {
    backgroundColor: C.base600,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: C.gold500,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.gold500,
  },
  optionLabel: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgSecondary,
  },
  optionLabelActive: {
    fontFamily: Font.bodyMedium,
    color: C.fgPrimary,
  },
  hint: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textAlign: 'center',
    marginTop: S[6],
    fontStyle: 'italic',
  },
});
