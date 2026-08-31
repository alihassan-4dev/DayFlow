import React from 'react';
import {
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from 'react-native';
import { layout } from '../theme/themes';

/** A form scroll container that keeps focused fields above the keyboard. */
export function FormScrollView({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  return (
    <ScrollView
      {...props}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: layout.space.xxl,
  },
});
