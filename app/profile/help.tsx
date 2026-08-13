import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { config } from '@/constants/config';
import { Button, Card, Divider, Pressable, Screen, ScreenHeader, Text } from '@/components/ui';
import { useTheme } from '@/theme';

const FAQS = [
  {
    q: 'Do I pay anything to book?',
    a: 'No. Mesa does not take payment and does not hold a card. You pay the restaurant on the night, exactly as you would if you had phoned them.',
  },
  {
    q: 'How late can I cancel?',
    a: 'Up to two hours before the sitting, free of charge, from the booking screen. Inside two hours the app locks changes and you should call the restaurant directly — they can usually still help, and it means the table does not sit empty.',
  },
  {
    q: 'What does “awaiting venue” mean?',
    a: 'Parties of seven or more, and any private-room booking, go to the restaurant to accept rather than confirming instantly. They normally reply within an hour, and you get a notification either way.',
  },
  {
    q: 'Is my seating preference guaranteed?',
    a: 'No, and no honest booking app will tell you otherwise. Restaurants seat by what is free on the night. A preference is passed on and usually honoured, but the terrace fills up.',
  },
  {
    q: 'The restaurant has my note, right?',
    a: 'Yes. Anything in the booking note — allergies, access needs, a high chair — goes to the venue with the reservation. For a severe allergy, still mention it when you arrive.',
  },
  {
    q: 'Why is a restaurant showing as closed when it is open?',
    a: 'Opening hours come from the restaurant and occasionally lag reality, particularly around holidays. Calling is the fastest way to be sure.',
  },
];

export default function HelpScreen() {
  const theme = useTheme();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen>
      <ScreenHeader title="Help and support" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
        }}
      >
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          {FAQS.map((faq, index) => (
            <React.Fragment key={faq.q}>
              <Pressable
                onPress={() => setOpen(open === index ? null : index)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open === index }}
                accessibilityLabel={faq.q}
                scaleTo={0.995}
                style={[styles.question, { paddingVertical: theme.spacing.base }]}
              >
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {faq.q}
                </Text>
                <Ionicons
                  name={open === index ? 'chevron-up' : 'chevron-down'}
                  size={17}
                  color={theme.colors.inkFaint}
                />
              </Pressable>

              {open === index ? (
                <Text
                  variant="body"
                  tone="muted"
                  style={{ paddingBottom: theme.spacing.base, lineHeight: 22 }}
                >
                  {faq.a}
                </Text>
              ) : null}

              {index < FAQS.length - 1 ? <Divider /> : null}
            </React.Fragment>
          ))}
        </Card>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="faint">
            Still stuck
          </Text>
          <Button
            label="Email support"
            variant="secondary"
            fullWidth
            icon="mail-outline"
            onPress={() =>
              Linking.openURL(`mailto:${config.support.email}?subject=Mesa%20support`).catch(() => {})
            }
          />
          <Button
            label="Call us"
            variant="secondary"
            fullWidth
            icon="call-outline"
            onPress={() => Linking.openURL(`tel:${config.support.phone}`).catch(() => {})}
          />
        </View>

        <Text variant="caption" tone="faint">
          This is a demo build. Support contacts are placeholders and no message is delivered.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
});
